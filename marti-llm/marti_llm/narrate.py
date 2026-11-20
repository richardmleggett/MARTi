"""
Narrative analysis of one MARTi sample: a fixed set of analyses, one LLM call, automatic checks, narrative.json.

    python -m marti_llm.narrate --sample-dir <run>/marti/<sample> --provider anthropic --model <model>
    python -m marti_llm.narrate --sample-dir ... --provider openai-compatible --base-url http://localhost:1234/v1 --model <m>
    python -m marti_llm.narrate --sample-dir ... --dry-run          # analyses and prompt only, no LLM call
    python -m marti_llm.narrate --check --provider ... --model ...  # connection test

The API key is read from MARTI_LLM_API_KEY (or ANTHROPIC_API_KEY / OPENAI_API_KEY), never from the command line.
With --json-progress, progress and the result are printed as one JSON object per line, for the MARTi GUI.

Design: the model is given only pre-computed results (no tools, one request), so the narrative is cheap,
reproducible and works with small local models. Every organism, resistance gene and number in its answer is then
checked against the results and the sample's data, and anything unsupported is recorded in "validation".
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from . import analysis as A
from .data import Sample, _load
from .groups import metadata_date, metadata_keywords, metadata_location
from .providers import LLMConfig, ProviderError, check, complete

SCHEMA_VERSION = 1
GENERATOR = "marti-llm narrate 1"
PROFILE_DIR = Path(__file__).parent / "profiles" / "narrative"

PROFILES = {
    "general": {"title": "General", "screens": ["human_pathogens"]},
    "clinical": {"title": "Clinical", "screens": ["human_pathogens"]},
    "food_environment": {"title": "Food manufacturing environment",
                         "screens": ["human_pathogens", "food_spoilage", "hygiene_indicators"]},
    "environmental": {"title": "Environmental", "screens": ["human_pathogens", "hygiene_indicators"]},
    "outdoor_air": {"title": "Outdoor air",
                    "screens": ["human_pathogens", "plant_pathogens", "airborne_allergens", "low_biomass_contaminants"],
                    "composition": True},
}
# Metadata keywords that choose a profile (checked in this order; first match wins). Each keyword must start a
# word ("air" matches "air sampler" but not "hair" or "dairy"); a regular expression may follow, e.g. "air\\b"
# for the whole word only. A profile is skipped if any of its exclusions match.
PROFILE_KEYWORDS = [
    ("food_environment", ["food", "factory", "manufactur", "processing", "dairy", "meat", "abattoir", "kitchen",
                          "production", "drain", "surface", "hygiene", "ingredient", "product"], []),
    ("outdoor_air", ["air\\b", "airborne", "aerosol", "bioaerosol", "pollen", "spore trap", "aerobiolog",
                     "atmospher", "outdoor"], ["indoor"]),
    ("clinical", ["clinical", "patient", "hospital", "blood", "urine", "sputum", "wound", "stool", "faec", "fecal",
                  "feces", "faeces", "nasal", "throat", "infant", "gut", "airway"], []),
    ("environmental", ["water", "river", "lake", "wastewater", "sewage", "soil", "marine", "freshwater",
                       "environment", "sediment"], []),
]
SECTIONS = {
    "general": ["Overview", "Organisms of note", "Antimicrobial resistance", "Data quality and limitations"],
    "clinical": ["Overview", "Organisms of clinical relevance", "Antimicrobial resistance",
                 "Data quality and limitations"],
    "food_environment": ["Overview", "Pathogens", "Spoilage and hygiene indicators", "Antimicrobial resistance",
                         "Data quality and limitations"],
    "environmental": ["Overview", "Community", "Indicators and organisms of note", "Antimicrobial resistance",
                      "Data quality and limitations"],
    "outdoor_air": ["Overview", "Sources and composition", "Plant pathogens", "Allergens: fungal spores and pollen",
                    "Human health and antimicrobial resistance", "Data quality and limitations"],
}


# ------------------------------------------------------------------------------------------------ sample
def sample_from_dir(sample_dir: str | Path) -> Sample:
    """A Sample for one MARTi sample folder (the folder holding sample.json)."""
    json_dir = Path(sample_dir).expanduser().resolve()
    if not (json_dir / "sample.json").exists():
        raise FileNotFoundError(f"No sample.json in {json_dir}")
    run_dir = json_dir.parent.parent if json_dir.parent.name == "marti" else json_dir
    info = (_load(json_dir / "sample.json") or {}).get("sample", {})
    s = Sample(info.get("id") or json_dir.name, info.get("runId") or run_dir.name, json_dir, run_dir,
               run_dir.parent)
    s.display_name = (_load(run_dir / "ids.json") or {}).get(s.sample_id, "")
    return s


def choose_profile(s: Sample, requested: str | None = "auto") -> str:
    if requested and requested != "auto":
        if requested not in PROFILES:
            raise ValueError(f"Unknown profile '{requested}'. Use auto or one of: {', '.join(PROFILES)}.")
        return requested
    words = " ".join(metadata_keywords(s.metadata())).lower()
    has = lambda k: re.search(r"\b" + k, words) is not None
    for profile, keys, exclusions in PROFILE_KEYWORDS:
        if any(has(k) for k in keys) and not any(has(x) for x in exclusions):
            return profile
    return "general"


# ------------------------------------------------------------------------------------------------ facts
def _pick(d: dict, keys) -> dict:
    return {k: d[k] for k in keys if k in d and d[k] not in (None, [], {})}


def build_facts(s: Sample, profile: str, min_support: float = 0.1) -> dict:
    """The fixed set of analyses the narrative is based on, kept compact for small-context models."""
    ov = A.sample_overview(s)
    md = s.metadata() or {}
    info = s.info()
    facts = {
        "sample": {"name": s.name, "run": s.run_id,
                   "location": metadata_location(md) or None, "date": metadata_date(md) or None,
                   "keywords": metadata_keywords(md) or None,
                   **{name: str(md[key]).strip() for key, name in (("sampleTime", "time"),
                      ("temperature", "temperature"), ("humidity", "humidity")) if str(md.get(key) or "").strip()},
                   "sequencing_status": ov["sequencing_status"], "analysis_status": ov["marti_status"],
                   "run_still_in_progress": ov["still_running"]},
        "reads": {k: v for k, v in ov["reads"].items() if v is not None},
        "classification": _pick(ov.get("classification") or {}, ("tool", "database", "pipeline", "maxHits",
                                                                  "minIdentity", "minCombinedScore")),
        "profile": profile,
    }
    if not facts["classification"]:
        facts["classification"] = {"database": (info.get("analysis") or {}).get("classification")}
    for rank in ("species", "genus"):
        t = A.taxa_table(s, rank, min_support, top_n=12)
        facts[f"top_{rank}"] = {
            "min_support_percent": t["min_support"],
            "reads_not_resolved_to_this_rank": t["reads_not_resolved_to_this_rank"],
            "taxa": [_pick(r, ("name", "reads_in_clade", "pct_of_classified")) for r in t["taxa"]]}

    if PROFILES[profile].get("composition"):
        facts["composition"] = composition(s)

    facts["screens"] = {}
    for list_id in PROFILES[profile]["screens"]:
        sc = A.screen_samples([s], list_id, A.DEFAULT_SCREEN_MS, min_reads=1)
        hits = []
        for h in sc["results"][0]["hits"][:15]:
            e = _pick(h, ("taxon", "rank", "category", "hazard_group", "reads_in_clade", "pct_of_classified",
                          "notes"))
            if h.get("reads_only_resolved_to_genus", {}).get("reads"):
                e["further_reads_only_resolved_to_genus"] = h["reads_only_resolved_to_genus"]
            ident = h.get("blast_identity") or {}
            if ident.get("reads_found"):
                e["blast_identity"] = _pick(ident, ("best_identity_median", "fraction_best_identity_ge_95"))
            amr = [g for g in h.get("amr_genes_attributed") or [] if g.get("priority") in ("critical", "high",
                                                                                           "medium")]
            if amr:
                e["priority_amr_genes_attributed"] = [_pick(g, ("gene", "reads_attributed", "reads_on_plasmid",
                                                                "category")) for g in amr[:5]]
            hits.append(e)
        facts["screens"][list_id] = {"description": sc["list"]["description"][:300],
                                     "min_support_percent": "0.0 (unfiltered)", "hits": hits}

    amr = A.amr_summary(s, top_n=10)
    if amr.get("available"):
        pri = A.screen_amr([s])["results"][0]["hits"]
        facts["amr"] = {
            **{k: amr[k] for k in ("reads_with_amr_hits", "reads_with_host_identified",
                                    "reads_with_no_bacterial_hit") if amr.get(k) is not None},
            "n_genes": amr["n_genes"],
            "reads_by_drug_class": dict(list(amr["reads_by_drug_class"].items())[:8]),
            "top_genes": [{"gene": g["gene"], "drug_class": g["drug_class"], "reads": g["reads"],
                           "flag": (g["priority"] or {}).get("category")} for g in amr["genes"][:10]],
            "priority_genes": [{"gene": h["gene"], "category": h["category"], "priority": h["priority"],
                                "reads": h["reads"], "reads_on_plasmid": h["reads_on_plasmid"],
                                "hosts": [x["taxon"] for x in h["attributed_hosts"][:3]]} for h in pri[:12]],
        }
    else:
        facts["amr"] = {"available": False}

    ad = A.alpha_diversity([s], "species", min_support)["samples"][0]
    facts["diversity_species"] = _pick(ad, ("S", "shannon", "invSimpson", "pielou"))
    sat = A.sequencing_saturation(s, "species", min_support)
    if sat.get("available", True):
        facts["sequencing_saturation"] = _pick(sat, ("reads_analysed", "taxa_observed",
                                                     "new_taxa_in_last_20pct_of_reads", "likely_saturated"))
    alerts = s.alerts()[-5:]
    if alerts:
        facts["engine_alerts"] = [_pick(a, ("time", "type", "content", "message")) for a in alerts]
    return facts


FUNGI, PLANTS = 4751, 33090      # NCBI taxids: Fungi, Viridiplantae


def composition(s: Sample, top: int = 8) -> dict:
    """What the sample is made of: domains and kingdoms, and the main fungal genera and plant families (pollen),
    from the unfiltered tree so that minor groups are not lost."""
    t = s.tree(A._ms_or_lowest(s, A.DEFAULT_SCREEN_MS))
    classified = t.classified_reads or 1

    def rows(nodes):
        nodes = sorted((n for n in nodes if n.reads_clade > 0), key=lambda n: -n.reads_clade)[:top]
        return [{"name": n.name, "reads": n.reads_clade, "pct_of_classified": round(100 * n.reads_clade / classified, 3)}
                for n in nodes]

    def within(ancestor, rank):
        inside = t.descendants(ancestor) if ancestor in t.nodes else set()
        return [n for n in t.at_rank(rank) if n.taxid in inside]

    return {
        "min_support_percent": "0.0 (unfiltered)",
        "domains": rows(t.at_rank("domain")),
        "kingdoms": rows(t.at_rank("kingdom")),
        "top_fungal_genera": rows(within(FUNGI, "genus")),
        "top_plant_families": rows(within(PLANTS, "family")),
        "note": ("Kingdoms include NCBI's bacterial kingdoms (e.g. Pseudomonadati, Bacillati) alongside Fungi, "
                 "Viridiplantae (plants, mostly pollen in air) and Metazoa (animals, including humans). Reads are DNA "
                 "fragments, not cells, spores or pollen grains, so proportions are not concentrations."),
    }


# ------------------------------------------------------------------------------------------------ prompt
SYSTEM = """You write short, careful narrative analyses of metagenomic sequencing results from MARTi.

Rules:
- Use ONLY the analysis results provided. Never add organisms, genes, numbers or claims that are not in them.
- Quote read counts and percentages exactly as given (you may round percentages to one decimal place).
- Name organisms and genes exactly as written in the results.
- Taxonomic detection is evidence of DNA similarity, not of viable organisms, virulence, serotype or infection.
- Treat hits supported by few reads, or within groups that are hard to separate (e.g. E. coli/Shigella,
  Bacillus cereus group), as presumptive and say what would confirm them.
- Genes flagged "likely intrinsic / mutation model" or "variant-dependent" do not by themselves show acquired
  resistance; say so if you mention them.
- If the run is still in progress or sequencing has not saturated, say that absence of an organism is weak
  evidence.
- Be concise: plain sentences, no markdown, no headings inside the text, no bullet symbols.

Answer with JSON only, in exactly this form:
{"summary": "<two or three sentences>", "sections": [{"title": "<title>", "text": "<one short paragraph>"}]}"""


def build_prompt(facts: dict, profile: str) -> tuple[str, str]:
    guidance = (PROFILE_DIR / f"{profile}.md").read_text().strip()
    titles = SECTIONS[profile]
    user = (f"Sample type profile: {PROFILES[profile]['title']}\n{guidance}\n\n"
            f"Write these sections, in this order and with these titles: {json.dumps(titles)}.\n"
            "If a section has nothing to report, say so in one sentence.\n\n"
            f"Analysis results (JSON):\n{json.dumps(facts, separators=(',', ':'))}")
    return SYSTEM, user


def parse_answer(text: str) -> dict:
    """Extract {"summary", "sections"} from a model answer (tolerating code fences and reasoning tags)."""
    t = re.sub(r"<think>.*?</think>", "", text or "", flags=re.S).strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t.strip())
    start, end = t.find("{"), t.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in the answer")
    obj = json.loads(t[start:end + 1])
    summary = obj.get("summary")
    sections = obj.get("sections")
    if not isinstance(summary, str) or not summary.strip() or not isinstance(sections, list):
        raise ValueError("answer is missing 'summary' or 'sections'")
    clean = []
    for sec in sections:
        if isinstance(sec, dict) and isinstance(sec.get("title"), str) and isinstance(sec.get("text"), str):
            clean.append({"title": sec["title"].strip()[:120], "text": sec["text"].strip()[:4000]})
    return {"summary": summary.strip()[:2000], "sections": clean[:8]}


# ------------------------------------------------------------------------------------------------ checks
_BINOMIAL = re.compile(r"\b([A-Z][a-z]{2,})\s+([a-z]{3,})\b")
_ABBREV = re.compile(r"\b([A-Z])\.\s?([a-z]{3,})\b")
_WORD = re.compile(r"\b[A-Z][a-z]{3,}\b")
_GENE = re.compile(r"(?<![\w-])((?:bla)?(?:CTX-M|KPC|NDM|OXA|VIM|IMP|SHV|TEM|CMY|DHA|GES)-\d+[a-z]?|"
                   r"bla[A-Z][A-Za-z0-9-]*|(?:tet|erm|aph|aac|ant|sul|dfr)\([A-Za-z0-9'\"-]+\)|mcr-\d+(?:\.\d+)?|"
                   r"van[A-Z]\b|mec[A-C]\b|qnr[A-Z]\d*|cfr|optrA|poxtA|arm[A-Z]|rmt[A-H])")
_NUMBER = re.compile(r"(?<![\w.,\-/])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![\w\-])(\s?%)?")
# A lowercase word after a genus name is read as a species epithet only if it is a known epithet, or looks Latin
# and is not a common English word ("Listeria was", "Klebsiella dominates" are not species names).
_LATIN_END = re.compile(r"(?:us|um|ae|ii|ensis|oides|iae|ella|ica|ans|ens|is|a)$")
_ENGLISH = set("""also area data extra via versus thus plus minus status bonus focus various previous numerous serious
obvious continuous analysis basis this his axis emphasis diagnosis synthesis hypothesis spectrum maximum minimum
medium premium optimum means happens tens lens opens remains contains explains obtains sustains citizens
chickens screens seems formula criteria alpha media agenda dilemma quota extra camera idea delta cinema arena
genus census corpus campus virus viruses fungus fungi bacteria nonetheless otherwise however across within""".split())


def _numbers_in(obj, out: list[float]):
    if isinstance(obj, bool):
        return
    if isinstance(obj, (int, float)):
        out.append(float(obj))
    elif isinstance(obj, str):
        for m in re.finditer(r"\d+(?:\.\d+)?", obj):
            out.append(float(m.group()))
    elif isinstance(obj, dict):
        for v in obj.values():
            _numbers_in(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _numbers_in(v, out)


def _number_supported(text_value: str, values: list[float]) -> bool:
    x = float(text_value.replace(",", ""))
    decimals = len(text_value.split(".")[1]) if "." in text_value else 0
    tol = 0.5 * 10 ** -decimals + 1e-9
    for v in values:
        if abs(v - x) <= tol or (x >= 100 and abs(v - x) <= 0.01 * v):
            return True
    return False


def validate(narr: dict, facts: dict, s: Sample) -> dict:
    """Check organisms, genes and numbers in the narrative against the analysis results and the sample."""
    text = " ".join([narr["summary"]] + [sec["title"] + ". " + sec["text"] for sec in narr["sections"]])
    tree = s.tree(s.available_min_support()[0])
    present = {n.name.lower() for n in tree.nodes.values() if n.reads_clade > 0}
    ref_names: set[str] = set()
    for lst in A.available_lists():
        if lst["use_with"] == "screen_samples":
            for e in A.load_list(lst["id"])["entries"]:
                ref_names.add(e["name"].lower())
    genera = {n.split()[0] for n in present | ref_names if n and n[0].isalpha()}
    species_by_abbrev: dict[tuple[str, str], str] = {}
    epithets: set[str] = set()
    for n in present | ref_names:
        parts = n.split()
        if len(parts) >= 2:
            species_by_abbrev.setdefault((parts[0][0], parts[1]), n)
            epithets.add(parts[1])

    mentions: dict[str, str] = {}
    for g, sp in _BINOMIAL.findall(text):
        if g.lower() not in genera:
            continue
        if sp in epithets or (len(sp) >= 5 and sp not in _ENGLISH and _LATIN_END.search(sp)):
            mentions[f"{g} {sp}"] = f"{g} {sp}".lower()
    for initial, sp in _ABBREV.findall(text):
        full = species_by_abbrev.get((initial.lower(), sp))
        if full:
            mentions[f"{initial}. {sp}"] = full
    for w in _WORD.findall(text):
        if w.lower() in genera and not any(k.startswith(w + " ") for k in mentions):
            mentions[w] = w.lower()
    absent = sorted({label for label, full in mentions.items() if full not in present})

    sample_genes = {(g.get("gene") or "").lower() for g in (A._amr_genes(s) or [])}
    sample_genes |= {(g.get("short_name") or "").lower() for g in (A._amr_genes(s) or []) if g.get("short_name")}
    gene_mentions = sorted({m.group(1) for m in _GENE.finditer(text)})
    absent_genes = [g for g in gene_mentions
                    if g.lower() not in sample_genes and not any(g.lower() in sg for sg in sample_genes)]

    values: list[float] = []
    _numbers_in(facts, values)
    unverified = []
    for m in _NUMBER.finditer(text):
        t, pct = m.group(1), m.group(2)
        x = float(t.replace(",", ""))
        if not pct and "," not in t and "." not in t and (x <= 10 or 1900 <= x <= 2100):
            continue      # small counts in prose ("two of three"), years
        if not _number_supported(t, values):
            unverified.append(t + (pct or "").strip())
    unverified = sorted(set(unverified), key=unverified.index)
    return {"organisms_checked": len(mentions), "genes_checked": len(gene_mentions),
            "organisms_not_detected": absent, "genes_not_detected": absent_genes,
            "numbers_not_found": unverified[:20],
            "ok": not absent and not absent_genes and not unverified,
            "note": ("organisms_not_detected and genes_not_detected are named in the text but not found in this "
                     "sample's data: acceptable only if the text says they were not detected. numbers_not_found "
                     "could not be matched to the analysis results.")}


# ------------------------------------------------------------------------------------------------ generate
def write_atomic(path: Path, obj: dict) -> None:
    fd, tmp = tempfile.mkstemp(prefix=".narrative.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(obj, fh, indent=1, ensure_ascii=False)
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def generate(sample_dir, cfg: LLMConfig, profile: str = "auto", min_support: float = 0.1, progress=None,
             out_name: str = "narrative.json") -> dict:
    say = progress or (lambda stage, msg: None)
    s = sample_from_dir(sample_dir)
    if not os.access(s.json_dir, os.W_OK):
        raise PermissionError(f"Cannot write to {s.json_dir}; the narrative is saved in the sample folder, "
                              "so the GUI needs write access to it.")
    profile = choose_profile(s, profile)
    say("analysing", f"Running analyses ({PROFILES[profile]['title']} profile)")
    facts = build_facts(s, profile, min_support)
    system, user = build_prompt(facts, profile)
    say("calling_model", f"Asking {cfg.model}")
    text, usage = complete(cfg, system, user)
    try:
        narr = parse_answer(text)
    except (ValueError, json.JSONDecodeError):
        say("calling_model", "Answer was not in the expected format; asking again")
        text, usage2 = complete(cfg, system, user + "\n\nReturn ONLY the JSON object, with no other text.")
        usage = {k: (usage.get(k) or 0) + (usage2.get(k) or 0) for k in usage}
        try:
            narr = parse_answer(text)
        except (ValueError, json.JSONDecodeError) as e:
            raise ProviderError(f"The model's answer could not be read as a narrative ({e}).") from None
    say("checking", "Checking organisms, genes and numbers against the results")
    doc = _document(s, narr, facts, profile, min_support, cfg.provider, cfg.model, GENERATOR, usage)
    say("writing", "Saving narrative.json")
    write_atomic(s.json_dir / out_name, doc)
    return doc


def _document(s: Sample, narr: dict, facts: dict, profile: str, min_support: float, provider: str, model: str,
              generator: str, usage: dict | None = None) -> dict:
    info = s.info()
    return {"narrative": {
        "schemaVersion": SCHEMA_VERSION, "generator": generator, "status": "complete",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sample": {"id": s.sample_id, "runId": s.run_id},
        "basis": {"readsAnalysed": info.get("readsAnalysed"), "martiStatus": info.get("martiStatus"),
                  "sequencingStatus": info.get("sequencingStatus"), "minSupport": min_support,
                  "amrChunk": (s.amr() or {}).get("currentChunk")},
        "provider": provider, "model": model, "profile": profile,
        "summary": narr["summary"], "sections": narr["sections"],
        "validation": validate(narr, facts, s), "usage": usage or {}, "facts": facts,
    }}


# ------------------------------------------------------------------------------------------------ MCP clients
# A model in an MCP client (e.g. Claude in the Claude app) can write the narrative itself: it fetches exactly
# the inputs the generator would send (narrative_inputs), writes the text, and saves it (save_narrative), which
# runs the same checks. This uses the client's own model access instead of an API key.
MCP_GENERATOR = "marti-llm MCP save_narrative 1"


def profile_choice(s: Sample, requested: str | None, chosen: str) -> str:
    if requested and requested != "auto":
        return f"'{chosen}' was requested."
    kw = metadata_keywords(s.metadata())
    if chosen != "general":
        return f"'{chosen}' was chosen automatically from the sample's metadata keywords ({', '.join(kw)})."
    why = (f"none of its keywords ({', '.join(kw)})" if kw else "it has no metadata keywords") + \
        " match a sample type"
    return (f"'general' was used because {why}. If the user has said what kind of sample this is, call "
            "get_narrative_inputs again with the matching profile from other_profiles rather than adapting "
            "another profile's sections.")


def narrative_inputs(s: Sample, profile: str = "auto", min_support: float = 0.1) -> dict:
    requested = profile
    profile = choose_profile(s, profile)
    facts = build_facts(s, profile, min_support)
    rules = SYSTEM.split("\n\nAnswer with JSON only")[0]
    return {
        "sample": s.key, "profile": profile, "profile_title": PROFILES[profile]["title"],
        "profile_choice": profile_choice(s, requested, profile),
        "other_profiles": {k: v["title"] for k, v in PROFILES.items() if k != profile},
        "min_support": min_support,
        "instructions": rules + "\n\n" + (PROFILE_DIR / f"{profile}.md").read_text().strip(),
        "sections_to_write": SECTIONS[profile],
        "how_to_save": ("Write a summary of two or three sentences and one short paragraph per section, in the order "
                        "listed, then call save_narrative with the same sample and profile. It checks every "
                        "organism, gene and number against these results and saves narrative.json, which the "
                        "MARTi GUI shows on the sample's dashboard. If the checks flag anything, correct the text "
                        "and save again."),
        "analysis_results": facts,
    }


def save_narrative(s: Sample, summary: str, sections: list[dict], profile: str = "auto", min_support: float = 0.1,
                   model: str = "") -> dict:
    """Check a narrative written by an MCP client's model and save it as narrative.json."""
    if not os.access(s.json_dir, os.W_OK):
        raise PermissionError(f"Cannot write to {s.json_dir}: the MCP server needs write access to the sample "
                              "folder to save a narrative.")
    profile = choose_profile(s, profile)
    narr = parse_answer(json.dumps({"summary": summary, "sections": sections}))
    if not narr["sections"]:
        raise ValueError("Give at least one section, each with a title and text.")
    facts = build_facts(s, profile, min_support)     # recomputed: the checks use the data as it is now
    model = re.sub(r"[\x00-\x1f]", "", (model or "").strip())[:120] or "Model in an MCP client"
    doc = _document(s, narr, facts, profile, min_support, "mcp", model, MCP_GENERATOR)
    write_atomic(s.json_dir / "narrative.json", doc)
    n = doc["narrative"]
    return {"saved": str(s.json_dir / "narrative.json"), "sample": s.key, "profile": profile,
            "sections_saved": [sec["title"] for sec in n["sections"]], "validation": n["validation"],
            "next_step": ("The MARTi GUI will show it on the sample's dashboard within a few seconds."
                          if n["validation"]["ok"] else
                          "Saved, but the checks flagged the items in validation. If they are errors, correct the "
                          "text and call save_narrative again; organisms named only as not detected are fine.")}


# ------------------------------------------------------------------------------------------------ CLI
def _config_from(args) -> LLMConfig:
    key = os.environ.get("MARTI_LLM_API_KEY") or {
        "anthropic": os.environ.get("ANTHROPIC_API_KEY"), "openai": os.environ.get("OPENAI_API_KEY")}.get(
        args.provider) or ""
    return LLMConfig(args.provider, args.model, key, args.base_url or "", args.timeout)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Narrative analysis of a MARTi sample")
    ap.add_argument("--sample-dir", help="folder containing the sample's sample.json")
    ap.add_argument("--profile", default="auto", help="auto (from metadata keywords) or " + ", ".join(PROFILES))
    ap.add_argument("--min-support", type=float, default=0.1)
    ap.add_argument("--provider", choices=["anthropic", "openai", "openai-compatible"])
    ap.add_argument("--model")
    ap.add_argument("--base-url")
    ap.add_argument("--timeout", type=float, default=300.0)
    ap.add_argument("--dry-run", action="store_true", help="print the analyses and prompt; no LLM call, no file")
    ap.add_argument("--check", action="store_true", help="test the provider connection and exit")
    ap.add_argument("--json-progress", action="store_true", help="one JSON object per line (for the GUI)")
    args = ap.parse_args(argv)

    def emit(obj):
        if args.json_progress:
            print(json.dumps(obj), flush=True)

    def progress(stage, message):
        emit({"event": "progress", "stage": stage, "message": message})
        if not args.json_progress:
            print(message, file=sys.stderr)

    try:
        if args.check:
            res = check(_config_from(args))
            emit({"event": "check", **res})
            if not args.json_progress:
                print(res["message"])
            return 0
        if not args.sample_dir:
            ap.error("--sample-dir is required")
        if args.dry_run:
            s = sample_from_dir(args.sample_dir)
            profile = choose_profile(s, args.profile)
            facts = build_facts(s, profile, args.min_support)
            system, user = build_prompt(facts, profile)
            out = {"event": "dry-run", "profile": profile, "approx_prompt_tokens": (len(system) + len(user)) // 4,
                   "facts": facts}
            print(json.dumps(out, indent=None if args.json_progress else 1))
            return 0
        doc = generate(args.sample_dir, _config_from(args), args.profile, args.min_support, progress)["narrative"]
        emit({"event": "done", "summary": doc["summary"], "validation_ok": doc["validation"]["ok"]})
        if not args.json_progress:
            print(json.dumps(doc, indent=1))
        return 0
    except (ProviderError, PermissionError, FileNotFoundError, ValueError) as e:
        emit({"event": "error", "message": str(e)})
        if not args.json_progress:
            print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
