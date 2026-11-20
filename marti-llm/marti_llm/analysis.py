"""
Deterministic analyses over MARTi output. The LLM interprets these results; it should
never have to do arithmetic over raw abundance tables itself.

All functions return plain JSON-serialisable dicts, kept compact for LLM context.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

import numpy as np

from . import diversity as D
from . import groups as GR
from .data import RANK_NAME, MartiStore, Sample, TaxTree, norm_rank, rank_number
from .groups import metadata_date, metadata_keywords, metadata_location

LIST_DIR = Path(__file__).parent / "reference_lists"
DEFAULT_SCREEN_MS = "0.0"   # unfiltered tree: low-level hazards live below the 0.1% cut-off
DEFAULT_TABLE_MS = "0.1"    # GUI default; keeps tables small


def _pct(n: int, d: int) -> float:
    return round(100.0 * n / d, 4) if d else 0.0


def _ms_or_lowest(s: Sample, ms) -> str:
    """Use the requested threshold if present, otherwise the lowest available."""
    avail = s.available_min_support()
    if ms is not None:
        for a in avail:
            if abs(float(a) - float(ms)) < 1e-9:
                return a
    return avail[0]


def _sample_date(s: Sample) -> str | None:
    """Collection date from metadata.json (normalised to YYYY-MM-DD as the GUI does), else the sequencing date."""
    return metadata_date(s.metadata()) or s.info().get("sequencingDate")


# --------------------------------------------------------------------------------------
# Inventory
# --------------------------------------------------------------------------------------
def list_samples(store: MartiStore, project: str | None = None) -> dict:
    samples = store.project_samples(project) if project else store.samples()
    group_of, group_note = {}, None
    if project and "sampleGroups" in (store.projects().get(project) or {}):
        try:
            g = GR.resolve_groups(store, project=project, group_by="project")
            group_of = g.labels
        except ValueError as e:
            group_note = f"projects.json sampleGroups not usable: {e}"
    rows = []
    for s in samples:
        info = s.info()
        md = s.metadata() or {}
        row = {
            "key": s.key,
            "name": s.name,
            "barcode": info.get("barcode"),
            "date": _sample_date(s),
            "reads_analysed": info.get("readsAnalysed"),
            "status": f"sequencing={info.get('sequencingStatus')}, marti={info.get('martiStatus')}",
            "keywords": metadata_keywords(md) or None,
            "location": metadata_location(md) or None,
        }
        if group_of:
            row["group"] = group_of.get(s.key)
        rows.append(row)
    out = {"projects": sorted(store.projects()), "n_samples": len(rows), "samples": rows}
    if group_of:
        out["project_groups"] = sorted(set(group_of.values()))
    if group_note:
        out["note"] = group_note
    return out


def sample_overview(s: Sample) -> dict:
    info = s.info()
    analysis = info.get("analysis", {})
    tree = s.tree(_ms_or_lowest(s, DEFAULT_SCREEN_MS))
    alerts = s.alerts()
    return {
        "key": s.key,
        "name": s.name,
        "sequencing_status": info.get("sequencingStatus"),
        "marti_status": info.get("martiStatus"),
        "still_running": info.get("martiStatus") != "Complete",
        "sequencing_date": info.get("sequencingDate"),
        "analysis_date": info.get("analysisDate"),
        "reads": {
            "pass_basecall": info.get("readsPassBasecall"),
            "passed_filter": info.get("readsPassedFilter"),
            "analysed": info.get("readsAnalysed"),
            "classified": info.get("readsWithClassification"),
            "unclassified": info.get("readsUnclassified"),
            "assigned_only_to_root": tree.nodes[tree.root_id].reads_here,
        },
        "yield_gb": info.get("yieldGb"),
        "classification": analysis.get("classification"),
        "classification_database_note": (
            "Organisms absent from this database cannot be detected; absence of a taxon "
            "is only meaningful relative to the database used."),
        "amr_analysis": analysis.get("amr"),
        "min_support_thresholds_available": s.available_min_support(),
        "metadata": s.metadata(),
        "recent_alerts": alerts[-10:],
    }


# --------------------------------------------------------------------------------------
# Taxonomic tables
# --------------------------------------------------------------------------------------
def taxa_table(s: Sample, rank: str = "genus", min_support: str | float | None = DEFAULT_TABLE_MS,
               top_n: int = 30, min_reads: int = 1) -> dict:
    ms = _ms_or_lowest(s, min_support)
    tree = s.tree(ms)
    rank = RANK_NAME[rank_number(rank)]
    nodes = sorted(tree.at_rank(rank), key=lambda n: -n.reads_clade)
    at_rank_total = sum(n.reads_clade for n in nodes)
    rows = [{
        "taxid": n.taxid,
        "name": n.name,
        "ncbi_rank": n.rank,
        "reads_in_clade": n.reads_clade,
        "reads_assigned_exactly_here": n.reads_here,
        "pct_of_classified": _pct(n.reads_clade, tree.classified_reads),
        "pct_of_bases_classified": _pct(n.bases_clade, max(1, sum(
            c.bases_clade for c in tree.at_rank(rank)))),
    } for n in nodes if n.reads_clade >= min_reads]
    return {
        "sample": s.key,
        "rank": rank,
        "min_support": ms,
        "reads_analysed": tree.total_reads,
        "reads_classified": tree.classified_reads,
        "reads_not_resolved_to_this_rank": tree.classified_reads - at_rank_total,
        "n_taxa": len(rows),
        "shown": min(top_n, len(rows)),
        "taxa": rows[:top_n],
        "note": ("Taxa are selected by MARTi's simplified rank, as in the GUI (e.g. 'species group' nodes "
                 "count at genus). reads_in_clade includes descendants; reads_assigned_exactly_here are reads "
                 "whose LCA could not be resolved below this taxon."),
    }


def abundance_matrix(samples: list[Sample], rank: str, min_support) -> tuple[list[int], dict[int, str], np.ndarray]:
    """taxa x samples read-count matrix (reads_in_clade), taxa selected as on the GUI compare page."""
    rank = rank_number(rank)
    names: dict[int, str] = {}
    cols = []
    for s in samples:
        t = s.tree(_ms_or_lowest(s, min_support))
        col = {}
        for n in t.at_rank(rank):
            col[n.taxid] = n.reads_clade
            names[n.taxid] = n.name
        cols.append(col)
    taxa = sorted(names)
    m = np.array([[c.get(t, 0) for c in cols] for t in taxa], dtype=float).reshape(len(taxa), len(samples))
    return taxa, names, m


def clr(m: np.ndarray, pseudocount: float = 0.5) -> np.ndarray:
    """Centred log-ratio per sample (columns)."""
    lm = np.log(m + pseudocount)
    return lm - lm.mean(axis=0, keepdims=True)


# --------------------------------------------------------------------------------------
# Taxon lookups
# --------------------------------------------------------------------------------------
def _resolve_taxon(samples: list[Sample], query: str | int, ms) -> tuple[int, str] | None:
    for s in samples:
        n = s.tree(_ms_or_lowest(s, ms)).find(query)
        if n:
            return n.taxid, n.name
    return None


def search_taxa(samples: list[Sample], query: str, min_support=DEFAULT_SCREEN_MS, limit: int = 20) -> dict:
    """Name search across samples, like the GUI's taxon filter: exact, then prefix, then substring."""
    term = query.strip().lower()
    if len(term) < 2:
        return {"error": "Use at least 2 characters."}
    found: dict[int, dict] = {}
    for s in samples:
        t = s.tree(_ms_or_lowest(s, min_support))
        for n in t.nodes.values():
            if n.taxid > 0 and n.reads_clade > 0 and term in n.name.lower():
                e = found.setdefault(n.taxid, {"taxid": n.taxid, "name": n.name, "ncbi_rank": n.rank,
                                               "n_samples": 0, "max_reads": 0})
                e["n_samples"] += 1
                e["max_reads"] = max(e["max_reads"], n.reads_clade)

    def score(e):
        nm = e["name"].lower()
        return (0 if nm == term else 1 if nm.startswith(term) else 2, nm)

    hits = sorted(found.values(), key=score)
    return {"query": query, "n_samples_searched": len(samples), "n_matches": len(hits), "matches": hits[:limit]}


def taxon_across_samples(samples: list[Sample], query: str | int,
                         min_support=DEFAULT_SCREEN_MS, order_by_date: bool = True) -> dict:
    hit = _resolve_taxon(samples, query, min_support)
    if hit is None:
        return {"query": query, "found": False,
                "note": "Taxon not present in any selected sample at this threshold (or name not in taxonomy). "
                        "Try a taxid, a different spelling, or min_support=0.0."}
    taxid, name = hit
    rows = []
    for s in samples:
        ms = _ms_or_lowest(s, min_support)
        t = s.tree(ms)
        n = t.nodes.get(taxid)
        row = {"sample": s.key, "name": s.name, "date": _sample_date(s), "min_support": ms,
               "reads_analysed": t.total_reads}
        if n is None:
            row.update(reads_in_clade=0, pct_of_classified=0.0)
        else:
            parent = t.nodes.get(n.parent) if n.parent is not None else None
            kids = sorted((t.nodes[c] for c in n.children), key=lambda c: -c.reads_clade)[:5]
            row.update(
                reads_in_clade=n.reads_clade,
                reads_assigned_exactly_here=n.reads_here,
                pct_of_classified=_pct(n.reads_clade, t.classified_reads),
                top_children=[{"name": k.name, "rank": k.rank, "reads": k.reads_clade} for k in kids],
                unresolved_reads_at_parent=({"parent": parent.name, "rank": parent.rank, "reads": parent.reads_here}
                                            if parent else None),
            )
        rows.append(row)
    if order_by_date:
        rows.sort(key=lambda r: (r["date"] is None, str(r["date"])))
    present = [r for r in rows if r["reads_in_clade"] > 0]
    lineage = [f"{n.rank}:{n.name}" for n in samples[0].tree(_ms_or_lowest(samples[0], min_support)).lineage(taxid)] \
        if taxid in samples[0].tree(_ms_or_lowest(samples[0], min_support)).nodes else None
    return {"query": query, "found": True, "taxid": taxid, "name": name, "lineage": lineage,
            "present_in": f"{len(present)}/{len(rows)} samples", "samples": rows}


# --------------------------------------------------------------------------------------
# Screening against curated lists
# --------------------------------------------------------------------------------------
def available_lists(store: MartiStore | None = None) -> list[dict]:
    out = []
    for p in sorted(LIST_DIR.glob("*.json")):
        d = json.loads(p.read_text())
        out.append({"id": d["id"], "title": d["title"], "description": d["description"],
                    "n_entries": len(d["entries"]), "source": "marti-llm curated list",
                    "use_with": "screen_amr" if d.get("kind") == "amr" else "screen_samples"})
    if store is not None:
        for key, p in store.heatmap_presets().items():
            out.append({"id": key, "title": p.get("name", p["id"]),
                        "description": f"Heatmap taxa preset defined for project '{p['project']}' in projects.json",
                        "n_entries": len(p["taxa"]), "source": "projects.json heatmapTaxaPresets",
                        "use_with": "screen_samples"})
    return out


def load_list(list_id: str, store: MartiStore | None = None) -> dict:
    if list_id.startswith("project:"):
        presets = store.heatmap_presets() if store else {}
        if list_id not in presets:
            raise KeyError(f"Unknown preset '{list_id}'. Available: {sorted(presets)}")
        p = presets[list_id]
        return {"id": list_id, "title": p.get("name", p["id"]),
                "description": f"Project '{p['project']}' heatmap preset from projects.json.",
                "denominator_taxid": int(p["denominatorTaxonId"]) if str(p.get("denominatorTaxonId", "")).isdigit() else None,
                "minimum_root_percent": p.get("minimumRootPercent"),
                "entries": [{"taxid": int(t["id"]), "name": t["name"], "category": "project preset", "notes": ""}
                            for t in p["taxa"] if str(t.get("id", "")).isdigit()]}
    p = LIST_DIR / f"{list_id}.json"
    if not p.exists():
        raise KeyError(f"Unknown list '{list_id}'. Available: {[l['id'] for l in available_lists(store)]}")
    d = json.loads(p.read_text())
    if d.get("kind") == "amr":
        raise ValueError(f"'{list_id}' is a list of AMR genes - use screen_amr instead of screen_samples.")
    return d


def screen_samples(samples: list[Sample], list_id: str, min_support=DEFAULT_SCREEN_MS,
                   min_reads: int = 1, with_read_identity: bool = True, store: MartiStore | None = None,
                   include_amr: bool = True) -> dict:
    ref = load_list(list_id, store)
    denom_id = ref.get("denominator_taxid")
    results = []
    warnings = []
    for s in samples:
        ms = _ms_or_lowest(s, min_support)
        t = s.tree(ms)
        hits = []
        for e in ref["entries"]:
            node = t.nodes.get(e["taxid"])
            matched_by = "taxid"
            if node is not None and node.name.lower() != e["name"].lower():
                # Same genus: most likely a renamed or reclassified taxon, so keep it but say so. A different
                # genus means the list's taxid is wrong; ignore it rather than report the wrong organism.
                if node.name.split()[0].lower() == e["name"].split()[0].lower():
                    warnings.append(f"taxid {e['taxid']}: list says '{e['name']}', taxonomy says '{node.name}'")
                else:
                    warnings.append(f"taxid {e['taxid']} is '{node.name}' in this taxonomy, not '{e['name']}': "
                                    "ignored; check the list")
                    node = None
            if node is None:
                alt = t.find(e["name"])
                if alt is not None:
                    node, matched_by = alt, "name (taxid differs - check list)"
                    warnings.append(f"'{e['name']}' matched by name with taxid {alt.taxid}, list has {e['taxid']}")
            if node is None or node.reads_clade < min_reads:
                continue
            hit = {
                "taxon": node.name, "taxid": node.taxid, "rank": node.rank,
                "category": e.get("category"), "hazard_group": e.get("hazard_group"), "notes": e.get("notes"),
                "reads_in_clade": node.reads_clade,
                "reads_assigned_exactly_here": node.reads_here,
                "pct_of_classified": _pct(node.reads_clade, t.classified_reads),
                "pct_of_all_reads": _pct(node.reads_clade, t.total_reads),
                "matched_by": matched_by,
            }
            if denom_id is not None:
                dn = t.nodes.get(denom_id)
                hit["pct_of_preset_denominator"] = _pct(node.reads_clade, dn.reads_clade) if dn else None
                if ref.get("minimum_root_percent") is not None:
                    hit["meets_preset_minimum_root_percent"] = (
                        _pct(node.reads_clade, t.total_reads) >= float(ref["minimum_root_percent"]))
            if node.rank in ("genus", "family"):
                kids = [t.nodes[d] for d in t.descendants(node.taxid, include_self=False)
                        if t.nodes[d].rank == "species" and t.nodes[d].reads_clade > 0]
                hit["species_breakdown"] = [{"name": k.name, "reads": k.reads_clade}
                                            for k in sorted(kids, key=lambda k: -k.reads_clade)[:8]]
            else:
                genus = t.nearest_ancestor_at(node.taxid, "genus")
                if genus is not None:
                    hit["reads_only_resolved_to_genus"] = {"genus": genus.name, "reads": genus.reads_here}
            if include_amr and s.amr():
                hit["amr_genes_attributed"] = _amr_for_taxon(s, t.descendants(node.taxid))[:10]
            if with_read_identity:
                ident = s.read_identities(t.descendants(node.taxid))
                if ident is not None:
                    hit["blast_identity"] = ident
            hits.append(hit)
        hits.sort(key=lambda h: -h["reads_in_clade"])
        results.append({"sample": s.key, "name": s.name, "min_support": ms,
                        "reads_classified": t.classified_reads,
                        "still_running": s.info().get("martiStatus") != "Complete",
                        "n_hits": len(hits), "hits": hits})
    return {
        "list": {"id": ref["id"], "title": ref["title"], "description": ref["description"]},
        "min_reads": min_reads,
        "interpretation_notes": [
            "A taxonomic hit indicates sequence similarity, not viability or pathogenicity.",
            "Species-level LCA calls from long reads can be unreliable within closely related groups "
            "(e.g. E. coli/Shigella, B. cereus group, Y. pestis/pseudotuberculosis).",
            "Hits supported by very few reads should be treated as presumptive and confirmed by other methods.",
            "Consider negative/extraction controls before interpreting low-level hits.",
            "amr_genes_attributed lists AMR genes whose reads were classified to this taxon or its descendants. "
            "Genes on reads classified only to a higher rank (e.g. genus or family) are not included, so absence "
            "here does not mean the organism lacks resistance genes.",
        ],
        "list_validation_warnings": sorted(set(warnings)),
        "results": results,
    }


# --------------------------------------------------------------------------------------
# Comparisons
# --------------------------------------------------------------------------------------
def compare_samples(a: Sample, b: Sample, rank: str = "genus", min_support=DEFAULT_TABLE_MS,
                    top_n: int = 15, pseudocount: float = 0.5) -> dict:
    taxa, names, m = abundance_matrix([a, b], rank, min_support)
    if not taxa:
        return {"error": f"No taxa at rank {rank}"}
    z = clr(m, pseudocount)
    diff = z[:, 1] - z[:, 0]
    tot = m.sum(axis=0)

    def row(i):
        return {"taxon": names[taxa[i]], "taxid": taxa[i],
                "reads_a": int(m[i, 0]), "reads_b": int(m[i, 1]),
                "pct_a": _pct(m[i, 0], tot[0]), "pct_b": _pct(m[i, 1], tot[1]),
                "clr_difference_b_minus_a": round(float(diff[i]), 2)}

    order = np.argsort(diff)
    only_a = [names[taxa[i]] for i in range(len(taxa)) if m[i, 0] >= 5 and m[i, 1] == 0]
    only_b = [names[taxa[i]] for i in range(len(taxa)) if m[i, 1] >= 5 and m[i, 0] == 0]
    shared = int(((m[:, 0] > 0) & (m[:, 1] > 0)).sum())
    return {
        "a": a.key, "b": b.key, "rank": RANK_NAME[rank_number(rank)], "min_support": min_support,
        "n_taxa_a": int((m[:, 0] > 0).sum()), "n_taxa_b": int((m[:, 1] > 0).sum()), "n_shared": shared,
        "bray_curtis_dissimilarity": round(float(np.abs(m[:, 0] / tot[0] - m[:, 1] / tot[1]).sum() / 2), 3),
        "aitchison_distance": round(float(np.linalg.norm(z[:, 0] - z[:, 1])), 2),
        "higher_in_b": [row(i) for i in order[::-1][:top_n] if diff[i] > 0],
        "higher_in_a": [row(i) for i in order[:top_n] if diff[i] < 0],
        "only_in_a_ge5_reads": only_a[:30],
        "only_in_b_ge5_reads": only_b[:30],
        "note": ("CLR differences are log-ratio changes relative to each sample's geometric mean, "
                 "appropriate for compositional data. Single-sample comparisons have no replication; "
                 "treat as descriptive, not statistically tested."),
    }


def unusual_features(target: Sample, reference: list[Sample], rank: str = "genus",
                     min_support=DEFAULT_TABLE_MS, top_n: int = 15, pseudocount: float = 0.5) -> dict:
    """What distinguishes `target` from a reference set (e.g. previous samples from the same site)."""
    reference = [r for r in reference if r.key != target.key]
    if len(reference) < 2:
        return {"error": "Need at least 2 reference samples."}
    samples = [target] + reference
    taxa, names, m = abundance_matrix(samples, rank, min_support)
    z = clr(m, pseudocount)
    ref = z[:, 1:]
    mu, sd = ref.mean(axis=1), ref.std(axis=1, ddof=1)
    sd = np.maximum(sd, 0.5)  # floor: avoid huge z-scores for taxa that are constant in the reference
    zscore = (z[:, 0] - mu) / sd
    tot = m.sum(axis=0)
    ref_pct = (m[:, 1:] / tot[1:]) * 100

    def row(i):
        return {"taxon": names[taxa[i]], "taxid": taxa[i], "reads_target": int(m[i, 0]),
                "pct_target": _pct(m[i, 0], tot[0]),
                "pct_reference_median": round(float(np.median(ref_pct[i])), 4),
                "pct_reference_max": round(float(ref_pct[i].max()), 4),
                "present_in_reference": f"{int((m[i, 1:] > 0).sum())}/{len(reference)}",
                "z_score": round(float(zscore[i]), 2)}

    order = np.argsort(zscore)
    novel = [row(i) for i in np.argsort(-m[:, 0]) if m[i, 0] >= 5 and (m[i, 1:] == 0).all()][:top_n]
    missing = [row(i) for i in np.argsort(-m[:, 1:].min(axis=1))
               if m[i, 0] == 0 and (m[i, 1:] >= 5).all()][:top_n]
    zt = z[:, 0]
    dists = [float(np.linalg.norm(zt - z[:, j])) for j in range(1, len(samples))]
    ref_pair = [float(np.linalg.norm(z[:, i] - z[:, j])) for i in range(1, len(samples))
                for j in range(i + 1, len(samples))]
    return {
        "target": target.key, "reference": [r.key for r in reference],
        "rank": RANK_NAME[rank_number(rank)], "min_support": min_support,
        "overall": {
            "median_aitchison_distance_target_to_reference": round(float(np.median(dists)), 2),
            "median_aitchison_distance_within_reference": round(float(np.median(ref_pair)), 2) if ref_pair else None,
            "interpretation": "If the first number is much larger than the second, the target is an outlier overall.",
        },
        "elevated_vs_reference": [row(i) for i in order[::-1][:top_n] if zscore[i] > 2],
        "depleted_vs_reference": [row(i) for i in order[:top_n] if zscore[i] < -2],
        "present_only_in_target_ge5_reads": novel,
        "absent_from_target_but_in_all_reference_ge5_reads": missing,
        "note": "z-scores are on CLR-transformed abundances with a floor on reference SD; descriptive only.",
    }


def cooccurrence(samples: list[Sample], rank: str = "genus", min_support=DEFAULT_TABLE_MS,
                 method: str = "proportionality", min_prevalence: float = 0.3, top_n: int = 20,
                 pseudocount: float = 0.5, min_total_reads: int = 20) -> dict:
    """Taxa that occur together across samples.

    method="proportionality": rho on CLR data (Lovell et al. 2015); compositionally sound (default).
    method="jaccard": presence/absence network, as the GUI's Co-occurrence tab (defaults: presence >= 1 read,
        top 12 taxa by prevalence, >= 2 shared samples, Jaccard >= 0.5, up to 30 links).
    method="spearman"/"pearson": correlation of relative abundances, as the GUI's Taxon correlation tab
        (top 15 taxa by mean relative abundance).
    """
    rank_n = rank_number(rank)
    if len(samples) < (3 if method in ("jaccard", "spearman", "pearson") else 5):
        return {"error": f"Too few samples ({len(samples)}) for {method}: need at least "
                         f"{3 if method != 'proportionality' else 5}."}
    taxa, names, m = abundance_matrix(samples, rank_n, min_support)
    groups = sorted({", ".join(metadata_keywords(s.metadata())) or s.run_id.split("_")[0] for s in samples})
    common = {"method": method, "n_samples": len(samples), "rank": RANK_NAME[rank_n], "min_support": min_support,
              "sample_groups": groups}
    confound = ("If the samples span different sample types or sites, apparent co-occurrence mostly reflects that "
                "grouping - run within a homogeneous set (e.g. one project/site) for genuine associations.")

    if method == "jaccard":
        present = m >= 1
        prev = present.sum(axis=1)
        rel_mean = (m / np.maximum(m.sum(axis=0, keepdims=True), 1)).mean(axis=1)
        order = sorted(range(len(taxa)), key=lambda i: (-prev[i], -rel_mean[i], taxa[i]))[:12]
        edges = []
        for a_i, i in enumerate(order):
            for j in order[a_i + 1:]:
                both = int((present[i] & present[j]).sum())
                if both < 2:
                    continue
                jac = both / (prev[i] + prev[j] - both)
                if jac >= 0.5:
                    edges.append({"taxon_1": names[taxa[i]], "taxon_2": names[taxa[j]],
                                  "shared_samples": both, "jaccard": round(float(jac), 3)})
        edges.sort(key=lambda e: (-e["jaccard"], -e["shared_samples"]))
        return {**common, "taxa": [{"taxon": names[taxa[i]], "prevalence": int(prev[i])} for i in order],
                "links": edges[:30],
                "note": "Matches the GUI Co-occurrence network with default settings. Presence/absence only. "
                        + confound}

    if method in ("spearman", "pearson"):
        rel = m / np.maximum(m.sum(axis=0, keepdims=True), 1)
        order = sorted(range(len(taxa)), key=lambda i: (-rel[i].mean(), taxa[i]))[:15]
        order = [i for i in order if rel[i].std() > 0]
        vec = rel[order]
        if method == "spearman":
            vec = np.array([D.average_ranks(v) for v in vec])
        c = np.corrcoef(vec)
        pairs = [(float(c[a, b]), a, b) for a in range(len(order)) for b in range(a + 1, len(order))]
        pairs.sort(key=lambda p: -abs(p[0]))
        fmt = lambda p: {"taxon_1": names[taxa[order[p[1]]]], "taxon_2": names[taxa[order[p[2]]]],
                         "r": round(p[0], 3)}
        return {**common, "taxa": [names[taxa[i]] for i in order],
                "strongest_positive": [fmt(p) for p in pairs if p[0] > 0][:top_n],
                "strongest_negative": [fmt(p) for p in pairs if p[0] < 0][:top_n],
                "note": "Matches the GUI Taxon correlation matrix (top 15 taxa by mean relative abundance). "
                        "Correlations of relative abundances can be spurious for compositional data; "
                        "compare with method='proportionality'. " + confound}

    if method != "proportionality":
        return {"error": "method must be proportionality, jaccard, spearman or pearson"}
    keep = ((m > 0).mean(axis=1) >= min_prevalence) & (m.sum(axis=1) >= min_total_reads)
    taxa = [t for t, k in zip(taxa, keep) if k]
    m = m[keep]
    if len(taxa) < 3:
        return {**common, "error": "Too few taxa pass the prevalence filter."}
    lg = np.log(m + pseudocount)
    z = lg - lg.mean(axis=0, keepdims=True)
    var = z.var(axis=1, ddof=1)
    pairs = []
    for i in range(len(taxa)):
        for j in range(i + 1, len(taxa)):
            denom = var[i] + var[j]
            if denom > 1e-9:
                pairs.append((float(1 - np.var(z[i] - z[j], ddof=1) / denom), i, j))
    pairs.sort(key=lambda p: -p[0])
    fmt = lambda p: {"taxon_1": names[taxa[p[1]]], "taxon_2": names[taxa[p[2]]], "rho": round(p[0], 3)}
    return {**common, "n_taxa_tested": len(taxa), "n_pairs": len(pairs),
            "most_proportional": [fmt(p) for p in pairs[:top_n] if p[0] > 0.6],
            "most_anti_proportional": [fmt(p) for p in pairs[::-1][:top_n] if p[0] < -0.3],
            "note": "rho is the proportionality coefficient on CLR data (Lovell et al. 2015). With few samples many "
                    "high values arise by chance. " + confound}


def beta_diversity(samples: list[Sample], method: str = "brayCurtis", rank: str = "genus",
                   min_support=DEFAULT_TABLE_MS, min_prevalence: int = 1, pseudocount: float = 0.5,
                   grouping: "GR.Grouping | None" = None) -> dict:
    """Between-sample distances, PCoA and UPGMA clustering - identical to the GUI's Ordination, Dendrogram and
    Distance matrix tabs (gui/UI/services/ordination.js), including its defaults."""
    rank_n = rank_number(rank)
    if rank_n > 9:
        return {"error": "Choose a single taxonomic rank (domain to subspecies)."}
    if len(samples) > 160:
        return {"error": "No more than 160 samples (the GUI's limit)."}
    taxa, names, m = abundance_matrix(samples, rank_n, min_support)
    prev = (m > 0).sum(axis=1)
    keep = prev >= int(min_prevalence)
    vals = m[keep].T
    totals = vals.sum(axis=1)
    included = [i for i in range(len(samples)) if totals[i] > 0]
    if len(included) < 2:
        return {"error": "Fewer than two samples have reads in the retained taxa."}
    vals = vals[included]
    inc = [samples[i] for i in included]
    root = [s.tree(_ms_or_lowest(s, min_support)).total_reads for s in inc]
    d = D.distance_matrix(vals, method, pseudocount)
    labels = [s.name for s in inc]
    out = {
        "method": method, "rank": RANK_NAME[rank_n], "min_support": min_support,
        "min_prevalence": int(min_prevalence), "pseudocount": pseudocount if method == "aitchison" else None,
        "n_taxa_retained": int(keep.sum()),
        "samples": [{"sample": s.key, "name": s.name, "date": _sample_date(s),
                     "coverage_percent": round(100 * float(vals[k].sum()) / r, 1) if r else 0}
                    for k, (s, r) in enumerate(zip(inc, root))],
        "excluded_samples": [samples[i].key for i in range(len(samples)) if i not in included],
        "distance_matrix": [[round(float(x), 4) for x in row] for row in d],
        "nearest_neighbour": {labels[i]: {"sample": labels[int(np.argsort(d[i])[1])],
                                          "distance": round(float(np.sort(d[i])[1]), 4)}
                              for i in range(len(labels))},
        "upgma_newick": D.upgma_newick(d, labels),
    }
    if len(inc) >= 3:
        try:
            p = D.pcoa(d, method)
            out["pcoa"] = {"axis_percent_variance": p["axis_percent"], "lingoes_constant": round(p["lingoes_constant"], 6),
                           "coordinates": {labels[i]: [round(float(x), 4) for x in p["coords"][i]]
                                           for i in range(len(labels))}}
        except ValueError as e:
            out["pcoa"] = {"error": str(e)}
    if grouping is not None:
        for row in out["samples"]:
            row["group"] = grouping.labels.get(row["sample"], "Ungrouped")
        pos, lab, order = _labels_for(inc, grouping)
        if len(order) >= 2:
            design = _test_design(lab, order)
            sub = d[np.ix_(pos, pos)]
            out["group_separation"] = {"grouping": grouping.source, "power": design["info"],
                                       **_separation(sub, lab, order, design["labs"])}
        else:
            out["group_separation"] = {"error": "Fewer than two groups among the included samples."}
    out["note"] = ("Same calculation and defaults as the MARTi GUI compare page (Bray-Curtis on relative abundance, "
                   "or Aitchison on CLR with pseudocount 0.5), so results can be checked there. coverage_percent is "
                   "the share of each sample's reads in the retained taxa; low coverage means many reads were not "
                   "resolved to this rank. Distances describe composition only; with few samples, clustering is "
                   "descriptive, not a statistical test.")
    return out


# --------------------------------------------------------------------------------------
# Groups
# --------------------------------------------------------------------------------------
GROUP_NOTE = ("Group tests permute group labels, so they assume nothing about distributions and are valid for "
              "small groups, but with few samples per group only large, consistent differences can be detected. "
              "Relative abundances are compositional: a taxon can look higher in one group because others fell.")


def _labels_for(samples: list[Sample], grouping: "GR.Grouping") -> tuple[list[int], np.ndarray, list[str]]:
    """Positions of grouped samples within `samples`, their group indices, and group order (groups present)."""
    pos = [i for i, s in enumerate(samples) if s.key in grouping.labels]
    order = [g for g in grouping.order if any(grouping.labels[samples[i].key] == g for i in pos)]
    lab = np.array([order.index(grouping.labels[samples[i].key]) for i in pos], dtype=int)
    return pos, lab, order


def _test_design(lab: np.ndarray, order: list[str]) -> dict:
    """Permutations shared by every test in one call, and how small a p-value they allow."""
    from collections import Counter
    labs, exact = GR.labelings(lab)
    sizes = [int((lab == g).sum()) for g in range(len(order))]
    total = GR._n_labelings(sizes)
    equivalent = math.prod(math.factorial(c) for c in Counter(sizes).values())   # renaming equal-sized groups
    smallest = equivalent / total if exact else 1 / len(labs)
    return {"labs": labs, "exact": exact, "info": {
        "group_sizes": dict(zip(order, sizes)),
        "test": "exact: every relabelling of the samples" if exact else f"{len(labs) - 1} random relabellings",
        "smallest_possible_p": round(max(smallest, 1 / total), 5)}}


def _by_group(values: np.ndarray, lab: np.ndarray, order: list[str], fn) -> dict:
    return {g: fn(values[lab == i]) for i, g in enumerate(order)}


def _separation(d: np.ndarray, lab: np.ndarray, order: list[str], labs: np.ndarray) -> dict:
    k, n = len(order), len(lab)
    if n <= k:
        return {"error": "Need more samples than groups to test separation."}
    pf, r2 = GR.permanova(d, labs, k)
    z = GR.distance_to_centroid(d, lab, k)
    fz = GR.anova_f(z[None, :], labs, k)[:, 0]
    iu = np.triu_indices(n, 1)
    same = lab[iu[0]] == lab[iu[1]]
    med = lambda v: round(float(np.median(v)), 4) if len(v) else None
    return {
        "permanova": {"pseudo_F": round(float(pf[0]), 3), "R2": round(r2, 3), "p": round(float(GR.p_value(pf)), 5)},
        "dispersion": {"mean_distance_to_group_centroid": _by_group(z, lab, order, lambda v: round(float(v.mean()), 4)),
                       "F": round(float(fz[0]), 3), "p": round(float(GR.p_value(fz)), 5)},
        "median_distance_within_groups": med(d[iu][same]),
        "median_distance_between_groups": med(d[iu][~same]),
        "interpretation": ("PERMANOVA R2 is the share of between-sample variation explained by the groups. If the "
                           "dispersion test is also significant, part of that result may come from the groups "
                           "differing in spread rather than in average composition."),
    }


def compare_groups(grouping: "GR.Grouping", rank: str = "genus", min_support=DEFAULT_TABLE_MS,
                   method: str = "brayCurtis", pseudocount: float = 0.5, min_total_reads: int = 10,
                   top_n: int = 15, include_amr: bool = True) -> dict:
    """How groups of samples differ: overall separation (PERMANOVA, dispersion), taxa that differ (CLR,
    permutation ANOVA, Benjamini-Hochberg q), taxa found in only one group, diversity and AMR by group."""
    samples = grouping.samples
    rank_n = rank_number(rank)
    if rank_n > 9:
        return {"error": "Choose a single taxonomic rank (domain to subspecies)."}
    pos, lab, order = _labels_for(samples, grouping)
    design = _test_design(lab, order)
    labs = design["labs"]
    k = len(order)
    taxa, names, m = abundance_matrix(samples, rank_n, min_support)
    totals = np.maximum(m.sum(axis=0), 1)
    rel = 100 * m / totals
    out = {"grouping": grouping.summary(), "rank": RANK_NAME[rank_n], "min_support": min_support,
           "power": design["info"]}

    d = D.distance_matrix(m.T, method, pseudocount)
    out["separation"] = {"method": method, **_separation(d, lab, order, labs)}

    # ---- taxa
    present = m > 0
    tested = (m.sum(axis=1) >= min_total_reads) & (present.sum(axis=1) >= 2)
    z = clr(m, pseudocount)
    rows = []
    if tested.any():
        f = GR.anova_f(z[tested], labs, k)
        p = GR.p_value(f)
        q = GR.bh_fdr(p)
        for j, i in enumerate(np.where(tested)[0]):
            means = _by_group(rel[i], lab, order, lambda v: round(float(v.mean()), 4))
            row = {"taxon": names[taxa[i]], "taxid": taxa[i],
                   "mean_pct_by_group": means,
                   "prevalence_by_group": _by_group(present[i], lab, order, lambda v: f"{int(v.sum())}/{len(v)}"),
                   "highest_in": max(means, key=means.get), "p": round(float(p[j]), 5), "q": round(float(q[j]), 5)}
            cm = _by_group(z[i], lab, order, lambda v: float(v.mean()))
            if k == 2:
                row[f"log_ratio_{order[1]}_vs_{order[0]}"] = round(cm[order[1]] - cm[order[0]], 3)
            else:
                row["log_ratio_range"] = round(max(cm.values()) - min(cm.values()), 3)
            rows.append(row)
        rows.sort(key=lambda r: (r["p"], -abs(r.get(f"log_ratio_{order[1]}_vs_{order[0]}", r.get("log_ratio_range", 0)))))
    n_sig = sum(r["q"] < 0.05 for r in rows)
    smallest = design["info"]["smallest_possible_p"]
    out["taxa"] = {
        "n_tested": int(tested.sum()),
        "n_q_below_0.05": n_sig,
        "differing": rows[:top_n],
        "note": ("log_ratio is the difference in mean centred-log-ratio abundance (natural log; 0.69 = twofold). "
                 "q is the p-value corrected for testing many taxa (Benjamini-Hochberg)."
                 + (f" With groups this small the smallest possible p is {smallest}, so no test can reach "
                    "p < 0.05: read the list as a ranking, not as findings." if smallest > 0.05 else
                    f" No taxon reached q < 0.05; with these group sizes (smallest possible p {smallest}) only "
                    "large, consistent differences could. Read the list as a ranking, not as findings."
                    if n_sig == 0 else "")),
    }
    only = []
    for i in range(len(taxa)):
        for gi, g in enumerate(order):
            ing = lab == gi
            if (m[i, ing] >= 5).sum() >= max(1, math.ceil(ing.sum() / 2)) and not present[i, ~ing].any():
                only.append({"taxon": names[taxa[i]], "group": g,
                             "found_in": f"{int(present[i, ing].sum())}/{int(ing.sum())}",
                             "max_reads": int(m[i, ing].max())})
    only.sort(key=lambda r: -r["max_reads"])
    out["only_in_one_group"] = only[:top_n]

    # ---- diversity by group (species level, as usual for diversity)
    ad = alpha_diversity(samples, "species", min_support, grouping=grouping)
    out["diversity_by_group"] = ad.get("group_summary")

    # ---- AMR
    if include_amr:
        out["amr"] = _amr_by_group(samples, grouping)
    out["note"] = GROUP_NOTE
    return out


def _amr_by_group(samples: list[Sample], grouping: "GR.Grouping") -> dict:
    have = [s for s in samples if s.amr()]
    missing = [s.key for s in samples if not s.amr()]
    if not have:
        return {"available": False, "note": "No amr.json in these samples - AMR analysis was not enabled."}
    pos, lab, order = _labels_for(have, grouping)
    if len(order) < 2:
        return {"available": False, "note": "AMR results exist for fewer than two groups."}
    sub = [have[i] for i in pos]
    labs = _test_design(lab, order)["labs"]
    match = _amr_priority_matcher()
    classes: dict[str, np.ndarray] = {}
    priority: dict[str, dict] = {}
    for j, s in enumerate(sub):
        depth = s.info().get("readsAnalysed") or 0
        for g in _amr_genes(s) or []:
            for c in (g["drug_class"] or "unknown").split(";"):
                c = c.strip()
                classes.setdefault(c, np.zeros(len(sub)))[j] += g["reads"] * 1e6 / depth if depth else 0
            pm = match(g)
            if pm and pm["priority"] in ("critical", "high", "medium") and g["reads"] > 0:
                e = priority.setdefault(g["gene"], {"gene": g["gene"], **pm, "present": np.zeros(len(sub), bool)})
                e["present"][j] = True
    names = sorted(classes, key=lambda c: -classes[c].sum())
    rows = []
    if names:
        x = np.log10(np.array([classes[c] for c in names]) + 1)
        p = GR.p_value(GR.anova_f(x, labs, len(order)))
        q = GR.bh_fdr(p)
        for i, c in enumerate(names):
            v = classes[c]
            rows.append({"drug_class": c,
                         "mean_reads_per_million_by_group": _by_group(v, lab, order, lambda a: round(float(a.mean()), 1)),
                         "prevalence_by_group": _by_group(v > 0, lab, order, lambda a: f"{int(a.sum())}/{len(a)}"),
                         "p": round(float(p[i]), 5), "q": round(float(q[i]), 5)})
        rows.sort(key=lambda r: r["p"])
    pri = [{"gene": e["gene"], "category": e["category"], "priority": e["priority"],
            "prevalence_by_group": _by_group(e["present"], lab, order, lambda a: f"{int(a.sum())}/{len(a)}")}
           for e in priority.values()]
    return {"available": True, "samples_without_amr_analysis": missing,
            "drug_classes": rows[:15], "priority_genes": pri,
            "note": ("Reads per million reads analysed, compared on a log scale. Gene presence does not establish "
                     "expression or resistance, and many classes are dominated by intrinsic genes (see get_amr).")}


# --------------------------------------------------------------------------------------
# Diversity, saturation, AMR
# --------------------------------------------------------------------------------------
def alpha_diversity(samples: list[Sample], rank: str = "species", min_support=DEFAULT_TABLE_MS,
                    unit: str = "reads", grouping: "GR.Grouping | None" = None) -> dict:
    """Within-sample diversity computed exactly as MARTi (engine DiversityStats, GUI diversity.js): taxa are
    counted with the accumulation-curve rule, so a lineage stopping above the rank counts as one taxon.
    unit="bases" uses the yield-based tree, as the GUI's bases option. Adds rarefied richness at a common
    depth (the GUI's compare-page column), and, where the engine stored them (MARTi >= 1.0), how the
    metrics changed during the run."""
    rank_n = rank_number(rank)
    use_yield = unit == "bases"
    rows, read_counts = [], []
    for s in samples:
        ms = _ms_or_lowest(s, min_support)
        chao_ok = (not use_yield) and float(ms) == 0.0   # engine: Chao1 only for read counts at min support 0
        stats, _ = D.tree_diversity(s.tree(ms, yield_based=use_yield), rank_n, use_yield, chao_ok)
        _, rc = D.tree_diversity(s.tree(ms), rank_n, False, False)
        read_counts.append(rc)
        row = {"sample": s.key, "name": s.name, "date": _sample_date(s), "min_support": ms,
               **{k: (round(v, 4) if isinstance(v, float) else v) for k, v in stats.items()}}
        acc = s.accumulation(ms) or {}
        series = (acc.get(RANK_NAME[rank_n]) or {}).get("diversity") or []
        pts = [p for p in series if p.get(unit)]
        if pts:
            first, last = pts[0], pts[-1]
            mid = pts[len(pts) // 2]
            row["during_run"] = {
                "points": len(pts),
                "shannon_at_reads": [[p["readsAnalysed"], round(p[unit]["shannon"], 3)]
                                     for p in (first, mid, last) if p[unit].get("shannon") is not None],
                "S_at_reads": [[p["readsAnalysed"], p[unit]["S"]] for p in (first, mid, last)],
                "engine_final_matches_tree": (last[unit].get("S") == stats["S"] and last[unit].get("N") == stats["N"]),
            }
        rows.append(row)
    depth = min((sum(c) for c in read_counts), default=0) if len(samples) > 1 else 0
    if depth > 0:
        for row, c in zip(rows, read_counts):
            row["rarefied_richness"] = round(D.rarefied_richness(c, depth), 2)
    has_series = any("during_run" in r for r in rows)
    group_summary = None
    if grouping is not None:
        for r in rows:
            r["group"] = grouping.labels.get(r["sample"], "Ungrouped")
        pos, lab, order = _labels_for(samples, grouping)
        if len(order) >= 2:
            labs = _test_design(lab, order)["labs"]
            group_summary = {"grouping": grouping.source, "groups": {}}
            for metric in ("S", "rarefied_richness", "shannon", "pielou", "simpson", "invSimpson"):
                vals = [rows[i].get(metric) for i in pos]
                if any(v is None for v in vals):
                    continue
                v = np.array(vals, dtype=float)
                entry = _by_group(v, lab, order, lambda a: {"mean": round(float(a.mean()), 4),
                                                            "min": round(float(a.min()), 4),
                                                            "max": round(float(a.max()), 4)})
                for g in order:
                    group_summary["groups"].setdefault(g, {"n": int((lab == order.index(g)).sum())})[metric] = entry[g]
                if metric in ("rarefied_richness", "shannon", "invSimpson") and len(lab) > len(order):
                    group_summary.setdefault("p", {})[metric] = round(float(GR.p_value(
                        GR.anova_f(v[None, :], labs, len(order)))[0]), 5)
            group_summary["note"] = ("Group mean, min and max, as on the GUI's Compare diversity plot. p is a "
                                     "permutation test of differences between group means; compare richness with "
                                     "rarefied_richness, not S.")
    return {
        "rank": RANK_NAME[rank_n], "unit": unit,
        "rarefaction_depth_reads": depth or None,
        **({"group_summary": group_summary} if group_summary else {}),
        "samples": rows,
        "definitions": {
            "N": f"{'bases' if use_yield else 'reads'} assigned to the counted taxa (not organisms)",
            "S": "taxa counted (richness); lineages stopping above the rank count once",
            "shannon": "Shannon H' (natural log)", "pielou": "evenness J' = H'/ln S",
            "simpson": "Gini-Simpson 1-D", "invSimpson": "1/D (effective number of dominant taxa)",
            "simpsonEvenness": "(1/D)/S",
            "chao1": "estimated richness; only valid for read counts at min_support 0, else null",
            "rarefied_richness": "expected S at a common read depth (Hurlbert) - use this, not S, to compare "
                                 "richness between samples of different depth",
        },
        "note": ("Matches the MARTi engine and GUI exactly. Richness depends strongly on depth and min_support; "
                 "compare samples with rarefied_richness and the same settings."
                 + ("" if has_series else " No per-chunk diversity in these outputs (MARTi < 1.0); values are "
                    "computed from the final tree.")),
    }


def sequencing_saturation(s: Sample, rank: str = "species", min_support=DEFAULT_TABLE_MS) -> dict:
    acc = s.accumulation(_ms_or_lowest(s, min_support)) or {}
    rd = acc.get(RANK_NAME[rank_number(rank)]) or {}
    series = rd.get("reads") or []
    if len(series) < 2:
        return {"sample": s.key, "rank": rank, "available": False}
    # MARTi >= 1.0: "reads" counts only taxa present at the end of the run (by first-seen chunk), so it never
    # decreases; the older behaviour is kept as "rawReads". Older outputs only have the raw curve as "reads".
    curve_type = "final-taxa (MARTi >= 1.0)" if "rawReads" in rd else "raw (pre-1.0 output)"
    reads = [p[0] for p in series]
    taxa = [p[1] for p in series]
    cut = reads[-1] * 0.8
    before = next((t for r, t in reversed(list(zip(reads, taxa))) if r <= cut), taxa[0])
    new_last20 = taxa[-1] - before
    out = {
        "sample": s.key, "rank": RANK_NAME[rank_number(rank)], "curve": curve_type,
        "reads_analysed": reads[-1], "taxa_observed": taxa[-1],
        "new_taxa_in_last_20pct_of_reads": new_last20,
        "likely_saturated": new_last20 <= max(1, 0.02 * taxa[-1]),
        "curve_tail": series[-5:],
    }
    div = [p for p in rd.get("diversity") or [] if (p.get("reads") or {}).get("shannon") is not None]
    if len(div) >= 2:
        before_d = next((p for p in reversed(div) if p["readsAnalysed"] <= cut), div[0])
        out["shannon_change_in_last_20pct"] = round(div[-1]["reads"]["shannon"] - before_d["reads"]["shannon"], 3)
    out["note"] = ("If not saturated, more sequencing would likely reveal more taxa - absence of a low-abundance "
                   "organism is weak evidence. A stable Shannon index with rising richness means new taxa are rare.")
    return out


# --------------------------------------------------------------------------------------
# AMR
# --------------------------------------------------------------------------------------
AMR_NOTE = ("Counts are reads at the latest chunk (amr.json counts are cumulative and sparse). Host attribution comes "
            "from each read's taxonomic assignment, often only to genus or above. Many CARD models are intrinsic or "
            "mutation-based (efflux pumps, rpoB, porins): presence alone does not imply acquired resistance.")


def _amr_read_counts(amr: dict) -> dict:
    """Reads with AMR hits. Older engines wrote one total (readsWithAMRHits); newer ones split it into reads whose
    host could be identified from flanking sequence (readsWithAMRHitsAndWalkout) and reads with no bacterial hit
    (readsWithAMRHitsOnly)."""
    if "readsWithAMRHits" in amr:
        return {"reads_with_amr_hits": amr.get("readsWithAMRHits")}
    with_host, only = amr.get("readsWithAMRHitsAndWalkout"), amr.get("readsWithAMRHitsOnly")
    if with_host is None and only is None:
        return {"reads_with_amr_hits": None}
    return {"reads_with_amr_hits": (with_host or 0) + (only or 0),
            "reads_with_host_identified": with_host, "reads_with_no_bacterial_hit": only}


def _latest(d: dict) -> int:
    """Value at the highest chunk number. Chunk keys are strings, so compare them as integers."""
    return int(d[max(d, key=int)]) if d else 0


def _amr_genes(s: Sample) -> list[dict] | None:
    """Normalised gene records from amr.json, or None when AMR analysis was not run."""
    amr = s.amr()
    if not amr:
        return None
    genes = []
    for g in amr.get("geneList", []):
        sp = g.get("species", [])
        if isinstance(sp, dict):   # older amr.json: {"name": {chunk: count}}
            hosts = [{"taxon": k, "taxid": None, "rank_code": None, "reads": _latest(v), "on_plasmid_reads": None}
                     for k, v in sp.items()]
        else:
            hosts = [{"taxon": h.get("name"), "taxid": h.get("ncbiID"), "rank_code": h.get("rank"),
                      "reads": _latest(h.get("chunkCounts", {})),
                      "on_plasmid_reads": _latest(h.get("chunkPlasmidCounts", {}))} for h in sp]
        acc = g.get("averageAccuracy", {})
        card = g.get("cardId") or ""
        genes.append({
            "gene": g.get("name"), "short_name": g.get("shortName"), "card_id": card,
            "aro": card.split(":")[1] if ":" in card else card,
            "drug_class": g.get("drugClass"), "mechanism": g.get("resistanceMechanism"),
            "family": g.get("geneFamily"), "description": g.get("description"),
            "reads": _latest(g.get("count", {})),
            "mean_identity": acc.get(max(acc, key=int)) if acc else None,
            "hosts": sorted((h for h in hosts if h["reads"] > 0), key=lambda h: -h["reads"]),
        })
    return genes


def _amr_priority_matcher():
    ref = json.loads((LIST_DIR / "amr_priority_genes.json").read_text())
    rules = [(e, re.compile(e["name_regex"]) if "name_regex" in e else None) for e in ref["entries"]]
    rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "interpret with caution": 4}

    def match(g: dict) -> dict | None:
        fam = (g.get("family") or "").lower()
        names = [g.get("gene") or "", g.get("short_name") or ""]
        hits = [e for e, rx in rules
                if (rx is not None and any(rx.search(n) for n in names))
                or ("family" in e and e["family"].lower() in fam)]
        if not hits:
            return None
        e = min(hits, key=lambda h: rank.get(h["priority"], 9))
        return {"category": e["category"], "priority": e["priority"], "notes": e["notes"]}
    return match


def _plasmid_reads(g: dict) -> int | None:
    vals = [h["on_plasmid_reads"] for h in g["hosts"] if h["on_plasmid_reads"] is not None]
    return sum(vals) if vals else None


def amr_summary(s: Sample, drug_class: str | None = None, min_reads: int = 1, top_n: int = 40,
                include_descriptions: bool = False) -> dict:
    genes = _amr_genes(s)
    if genes is None:
        return {"sample": s.key, "available": False,
                "note": "No amr.json - AMR analysis was not enabled for this run."}
    amr = s.amr()
    match = _amr_priority_matcher()
    out = []
    for g in genes:
        if drug_class and drug_class.lower() not in (g["drug_class"] or "").lower():
            continue
        if g["reads"] < min_reads:
            continue
        row = {k: g[k] for k in ("gene", "card_id", "drug_class", "mechanism", "family", "reads", "mean_identity")}
        row["priority"] = match(g)
        row["reads_on_plasmid"] = _plasmid_reads(g)
        row["attributed_hosts"] = g["hosts"][:5]
        if include_descriptions:
            row["description"] = g["description"]
        out.append(row)
    out.sort(key=lambda g: -g["reads"])
    by_class: dict[str, int] = {}
    for g in out:
        for c in (g["drug_class"] or "unknown").split(";"):
            by_class[c.strip()] = by_class.get(c.strip(), 0) + g["reads"]
    pri = [g for g in out if g["priority"] and g["priority"]["priority"] in ("critical", "high", "medium")]
    return {
        "sample": s.key, "available": True, **_amr_read_counts(amr),
        "reads_analysed": s.info().get("readsAnalysed"), "latest_chunk": amr.get("currentChunk"),
        "n_genes": len(out), "reads_by_drug_class": dict(sorted(by_class.items(), key=lambda kv: -kv[1])),
        "priority_genes": [{"gene": g["gene"], "reads": g["reads"], **g["priority"]} for g in pri],
        "genes": out[:top_n], "note": AMR_NOTE,
    }


def amr_across_samples(samples: list[Sample], by: str = "gene", query: str | None = None,
                       min_reads: int = 1, top_n: int = 30) -> dict:
    """Matrix of AMR reads across samples (like the GUI's AMR heatmap), ordered by date.
    by: gene | drug_class | family | mechanism. query: substring filter on the gene name, drug class, family
    or mechanism (e.g. "carbapenem", "tet(", "KPC")."""
    key_of = {"gene": lambda g: [g["gene"]], "drug_class": lambda g: (g["drug_class"] or "unknown").split(";"),
              "family": lambda g: (g["family"] or "unknown").split(";"),
              "mechanism": lambda g: (g["mechanism"] or "unknown").split(";")}
    if by not in key_of:
        return {"error": "by must be gene, drug_class, family or mechanism"}
    match = _amr_priority_matcher()
    q = (query or "").lower()
    cols, cells, meta = [], {}, {}
    no_amr = []
    for s in samples:
        genes = _amr_genes(s)
        if genes is None:
            no_amr.append(s.key)
            continue
        amr = s.amr()
        cols.append({"sample": s.key, "name": s.name, "date": _sample_date(s),
                     "reads_analysed": s.info().get("readsAnalysed"),
                     "reads_with_amr_hits": _amr_read_counts(amr)["reads_with_amr_hits"],
                     "still_running": s.info().get("martiStatus") != "Complete"})
        for g in genes:
            if q and not any(q in (g[f] or "").lower() for f in ("gene", "drug_class", "family", "mechanism")):
                continue
            for k in key_of[by](g):
                k = k.strip()
                c = cells.setdefault(k, {})
                c[s.key] = c.get(s.key, 0) + g["reads"]
                if by == "gene" and k not in meta:
                    meta[k] = {"drug_class": g["drug_class"], "family": g["family"], "priority": match(g)}
    order = sorted(range(len(cols)), key=lambda i: (cols[i]["date"] is None, str(cols[i]["date"])))
    cols = [cols[i] for i in order]
    rows = []
    for k, c in cells.items():
        if sum(c.values()) < min_reads:
            continue
        vals = []
        for col in cols:
            n = c.get(col["sample"], 0)
            vals.append({"reads": n,
                         "pct_of_amr_reads": _pct(n, col["reads_with_amr_hits"] or 0),
                         "per_million_reads": round(n * 1e6 / col["reads_analysed"], 1) if col["reads_analysed"] else None})
        rows.append({"name": k, **(meta.get(k, {})), "present_in": f"{sum(v['reads'] > 0 for v in vals)}/{len(cols)}",
                     "total_reads": sum(v["reads"] for v in vals), "by_sample": vals})
    rows.sort(key=lambda r: -r["total_reads"])
    return {
        "by": by, "query": query, "samples": cols, "samples_without_amr_analysis": no_amr,
        "n_rows": len(rows), "shown": min(top_n, len(rows)), "rows": rows[:top_n],
        "definitions": {"pct_of_amr_reads": "% of the sample's reads with any AMR hit",
                        "per_million_reads": "reads per million reads analysed - use this to compare samples of "
                                             "different depth"},
        "note": ("Counts match the MARTi GUI AMR heatmap's read counts by CARD gene, taken at each gene's true latest "
                 "chunk. Drug-class/family rows sum genes, and a gene with several classes adds to each. " + AMR_NOTE),
    }


def screen_amr(samples: list[Sample], min_reads: int = 1, include_low: bool = False) -> dict:
    """Priority AMR genes (amr_priority_genes list) in each sample, with hosts and plasmid evidence."""
    match = _amr_priority_matcher()
    keep = {"critical", "high", "medium"} | ({"low"} if include_low else set())
    results, no_amr = [], []
    for s in samples:
        genes = _amr_genes(s)
        if genes is None:
            no_amr.append(s.key)
            continue
        hits = []
        for g in genes:
            m = match(g)
            if m and m["priority"] in keep and g["reads"] >= min_reads:
                hits.append({"gene": g["gene"], "card_id": g["card_id"], **m, "reads": g["reads"],
                             "mean_identity": g["mean_identity"], "reads_on_plasmid": _plasmid_reads(g),
                             "attributed_hosts": g["hosts"][:5]})
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        hits.sort(key=lambda h: (order[h["priority"]], -h["reads"]))
        results.append({"sample": s.key, "name": s.name, "date": _sample_date(s),
                        "still_running": s.info().get("martiStatus") != "Complete",
                        "n_hits": len(hits), "hits": hits})
    return {"list": "amr_priority_genes", "samples_without_amr_analysis": no_amr, "results": results,
            "interpretation_notes": [
                "Gene detection from reads shows the gene's DNA is present, not that it is expressed or which "
                "organism carries it; host attribution is from the read's own classification.",
                "Variant-dependent families (SHV, TEM, CMY) need the specific variant to judge ESBL/AmpC status.",
                "Reads on plasmid suggest mobility but plasmid classification of single reads is uncertain.",
                "Low read counts are presumptive; confirm with targeted PCR or culture and susceptibility testing.",
            ], "note": AMR_NOTE}


def _amr_for_taxon(s: Sample, taxids: set[int]) -> list[dict]:
    """AMR genes with reads attributed to any taxon in `taxids` (a pathogen and its descendants)."""
    genes = _amr_genes(s) or []
    match = _amr_priority_matcher()
    out = []
    for g in genes:
        hs = [h for h in g["hosts"] if h["taxid"] is not None and int(h["taxid"]) in taxids]
        n = sum(h["reads"] for h in hs)
        if n:
            pl = [h["on_plasmid_reads"] for h in hs if h["on_plasmid_reads"] is not None]
            m = match(g)
            out.append({"gene": g["gene"], "drug_class": g["drug_class"], "reads_attributed": n,
                        "reads_on_plasmid": sum(pl) if pl else None,
                        "priority": m["priority"] if m else None, "category": m["category"] if m else None})
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "interpret with caution": 5, None: 4}
    return sorted(out, key=lambda x: (order.get(x["priority"], 4), -x["reads_attributed"]))


# --------------------------------------------------------------------------------------
# Finding samples (the GUI's Samples page)
# --------------------------------------------------------------------------------------
_COORDS = re.compile(r"(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)")
_ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def sample_coordinates(md: dict | None) -> tuple[float, float] | None:
    """Latitude, longitude written in the metadata location (e.g. "52.63, 1.29", as the GUI's sample map reads it)."""
    md = md or {}
    for field in ("sampleLocation", "location", "locationName"):
        value = md.get(field)
        m = _COORDS.search(value) if isinstance(value, str) else None
        if m:
            lat, lon = float(m.group(1)), float(m.group(2))
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return lat, lon
    return None


def location_name(md: dict | None) -> str:
    """The location as words, without any coordinates."""
    text = _COORDS.sub("", metadata_location(md))
    return re.sub(r"^[\s,;:()\-]+|[\s,;:()\-]+$", "", re.sub(r"\(\s*\)", "", text)).strip()


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(h))


def _lowest_nonzero_ms(s: Sample) -> str:
    avail = s.available_min_support()
    nonzero = [a for a in avail if float(a) > 0]
    return nonzero[0] if nonzero else avail[0]


def _find_taxon_any(samples: list[Sample], query: str, pick_ms) -> tuple[int, str] | None | str:
    """Taxid and name for a name, taxid or abbreviated species ("E. coli"); a message if ambiguous."""
    for s in samples:
        n = s.tree(pick_ms(s)).find(query)
        if n:
            return n.taxid, n.name
    m = re.match(r"^\s*([A-Za-z])\.\s*([a-z][\w-]*)\s*$", str(query))
    if m:
        letter, epithet = m.group(1).lower(), m.group(2).lower()
        found = {}
        for s in samples:
            for n in s.tree(pick_ms(s)).nodes.values():
                parts = n.name.split()
                if n.rank == "species" and len(parts) >= 2 and parts[0][:1].lower() == letter \
                        and parts[1].lower() == epithet:
                    found[n.taxid] = n.name
        if len(found) == 1:
            return next(iter(found.items()))
        if found:
            return f"'{query}' could be {', '.join(sorted(found.values()))}; give the full name."
    return None


COMPACT_ABOVE = 30
_CONTROL_NAME = re.compile(r"(^|[_\-\s])(nc|ntc|pc|neg|negative|pos|positive|blank|control|ctrl|mock|lambda)"
                           r"($|[_\-\s\d])", re.I)


def find_samples(samples: list[Sample], taxon: str | None = None, min_reads: int = 1,
                 min_percent: float | None = None, min_support: float | None = None,
                 date_from: str | None = None, date_to: str | None = None, location: list[str] | None = None,
                 near_lat: float | None = None, near_lon: float | None = None, within_km: float | None = None,
                 estimated_coordinates: dict[str, list[float]] | None = None, keywords: list[str] | None = None,
                 run: str | None = None, name: str | None = None) -> dict:
    """Samples meeting every criterion given, with the evidence for each."""
    if not samples:
        return {"error": "No samples to search."}
    for label, d in (("date_from", date_from), ("date_to", date_to)):
        if d is not None and not _ISO_DAY.match(str(d)):
            return {"error": f"{label} must be a date as YYYY-MM-DD (e.g. 2025-06-01)."}
    distance = within_km is not None or near_lat is not None or near_lon is not None
    if distance and (within_km is None or near_lat is None or near_lon is None):
        return {"error": "A distance search needs near_lat, near_lon and within_km."}
    if min_reads is not None and min_reads < 1:
        min_reads = 1
    criteria = {}

    if min_support is None:
        pick_ms = _lowest_nonzero_ms
        ms_note = "lowest non-zero minimum abundance available for each sample"
    else:
        pick_ms = (lambda s: _ms_or_lowest(s, min_support))
        ms_note = f"minimum abundance {min_support}%"
    taxid = None
    if taxon:
        hit = _find_taxon_any(samples, taxon, pick_ms)
        if isinstance(hit, str):
            return {"error": hit}
        if hit is None and min_support is None:
            hit = _find_taxon_any(samples, taxon, lambda s: s.available_min_support()[0])
        if hit is None:
            return {"query": taxon, "found": False, "n_matched": 0, "matched": [],
                    "note": "This taxon is not in any of these samples (or the name is not in the taxonomy). Try "
                            "search_taxa for the spelling, or a taxid."}
        taxid, taxon_name = hit
        criteria["taxon"] = {"name": taxon_name, "taxid": taxid, "min_reads": min_reads,
                             "min_percent_of_classified": min_percent, "threshold": ms_note}
    if date_from or date_to:
        criteria["date"] = {"from": date_from, "to": date_to}
    if location:
        criteria["location_contains"] = location
    if distance:
        criteria["within_km"] = {"of": [near_lat, near_lon], "km": within_km,
                                 "miles": round(within_km / 1.609344, 2)}
    if keywords:
        criteria["keywords"] = keywords
    if run:
        criteria["run_contains"] = run
    if name:
        criteria["name_contains"] = name

    estimates = {str(k).strip().lower(): v for k, v in (estimated_coordinates or {}).items()
                 if isinstance(v, (list, tuple)) and len(v) == 2}
    matched, excluded, no_coords = [], {}, set()

    def out(reason):
        excluded[reason] = excluded.get(reason, 0) + 1

    for s in samples:
        md = s.metadata() or {}
        row = {"sample": s.key, "name": s.name, "run": s.run_id, "date": _sample_date(s),
               "location": location_name(md) or None}
        if run and run.lower() not in s.run_id.lower():
            out("run does not match")
            continue
        if name and name.lower() not in s.name.lower() and name.lower() not in s.sample_id.lower():
            out("name does not match")
            continue
        if date_from or date_to:
            d = metadata_date(md)
            if not _ISO_DAY.match(d or ""):
                out("no collection date in metadata")
                continue
            if (date_from and d < date_from) or (date_to and d > date_to):
                out("date outside range")
                continue
        if location:
            text = metadata_location(md).lower()
            if not any(str(l).strip().lower() in text for l in location if str(l).strip()):
                out("location does not match")
                continue
        if keywords:
            have = [k.lower() for k in metadata_keywords(md)]
            if not all(any(str(k).strip().lower() in h for h in have) for k in keywords):
                out("keywords do not match")
                continue
        if distance:
            coords, estimated = sample_coordinates(md), False
            if coords is None:
                guess = estimates.get(location_name(md).lower())
                if guess:
                    coords, estimated = (float(guess[0]), float(guess[1])), True
            if coords is None:
                no_coords.add(location_name(md) or "(no location)")
                out("no coordinates")
                continue
            km = haversine_km((near_lat, near_lon), coords)
            row.update(distance_km=round(km, 2), distance_miles=round(km / 1.609344, 2),
                       coordinates=list(coords), coordinates_estimated=estimated)
            if km > within_km:
                out("too far away")
                continue
        if taxid is not None:
            ms = pick_ms(s)
            t = s.tree(ms)
            n = t.nodes.get(taxid)
            reads = n.reads_clade if n else 0
            pct = _pct(reads, t.classified_reads)
            row.update(taxon_reads=reads, taxon_pct_of_classified=pct, min_support=ms)
            if reads < min_reads or (min_percent is not None and pct < min_percent):
                out("taxon below threshold")
                continue
        matched.append(row)

    matched.sort(key=lambda r: (r["date"] is None, str(r["date"]), r["name"]))
    matched_keys = {r["sample"] for r in matched}
    controls = [r["sample"] for r in matched
                if _CONTROL_NAME.search(re.sub(r"(no|with|without)[_\-\s]controls?", "", r["name"], flags=re.I))]
    result = {"criteria": criteria, "n_searched": len(samples), "n_matched": len(matched)}
    if len(matched) > COMPACT_ABOVE:
        # keep the answer small enough for a model: key, date and the evidence, plus counts by place and run
        keep = ("sample", "date", "taxon_reads", "taxon_pct_of_classified", "distance_km", "distance_miles",
                "coordinates_estimated")
        result["summary"] = {
            "by_location": dict(sorted(Counter(r["location"] or "(none)" for r in matched).items())),
            "by_run": dict(sorted(Counter(r["run"] for r in matched).items()))}
        if taxid is not None:
            result["criteria"]["taxon"]["min_support_used"] = sorted({r["min_support"] for r in matched}, key=float)
        result["rows_shortened"] = f"Over {COMPACT_ABOVE} matches, so each row has only the key, date and evidence."
        matched = [{k: r[k] for k in keep if k in r} for r in matched]
    result["matched"] = matched
    result["excluded"] = excluded
    not_matched = [s.key for s in samples if s.key not in matched_keys]
    if 0 < len(not_matched) <= COMPACT_ABOVE:
        result["not_matched"] = not_matched
    if controls:
        result["possible_controls_matched"] = controls
        result["controls_note"] = "These look like control samples (by name); mention them separately."
    named = sorted(n for n in no_coords if n != "(no location)")
    if no_coords:
        result["locations_without_coordinates"] = sorted(no_coords)
    if named:
        result["note"] = ("Some samples have a location name but no coordinates. To include them, call again with "
                          "estimated_coordinates for these names (only places you know), and tell the user the "
                          "distances for them are estimates.")
    elif no_coords:
        result["note"] = ("Samples with no location at all (often controls) cannot be placed; leave them out and say "
                          "so. Do not estimate positions for them.")
    if any(r.get("coordinates_estimated") for r in matched):
        result["warning"] = "Distances marked coordinates_estimated use estimated positions, not recorded ones."
    return result
