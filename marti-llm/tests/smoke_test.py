"""
End-to-end smoke test through the MCP layer, using the example output shipped in the
MARTi repo (gui/output). Usage:

    python tests/smoke_test.py /path/to/MARTi/gui/output

A copy of the example data is made in a temp dir, and synthetic metadata.json, projects.json and
lcaparse per-read files are added so those code paths are exercised. The synthetic files are
clearly test fixtures, not real data.
"""
import asyncio
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

src = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "gui" / "output"
tmp = Path(tempfile.mkdtemp()) / "output"
shutil.copytree(src, tmp)

# --- synthetic fixtures -------------------------------------------------------------
(tmp / "projects.json").write_text(json.dumps({
    "defaultProject": "bambi",
    "bambi": {"directories": [], "runs": [p.name for p in tmp.glob("BAMBI_*")], "samples": [],
              "heatmapTaxaPresets": [{"id": "enterics", "name": "Enteric indicators (TEST)", "denominatorTaxonId": 2,
                                      "minimumRootPercent": 0.1,
                                      "taxa": [{"id": 570, "name": "Klebsiella"}, {"id": 561, "name": "Escherichia"},
                                               {"id": 583, "name": "Proteus"}]}]},
    "marc": {"directories": [], "runs": [p.name for p in tmp.glob("MARC_*")], "samples": []},
    # every sample, grouped by origin, in projects.json sampleGroups format (runId / sampleId = folder names)
    "all": {"directories": [str(tmp)], "runs": [], "samples": [],
            "sampleGroups": [{"runId": r.name, "sampleId": next((r / "marti").iterdir()).name,
                              "group": "gut" if r.name.startswith("BAMBI") else "river"}
                             for r in sorted(tmp.iterdir()) if (r / "marti").is_dir()]},
    "broken": {"directories": [], "runs": [p.name for p in tmp.glob("MARC_*")], "samples": [],
               "sampleGroups": [{"runId": "x", "sampleId": "y"}]},
}))
# metadata.json exactly as the engine writes it (MetaData.java): keywords as one comma-separated string,
# day-first dates; two sites so location grouping can be tested
for i, run in enumerate(sorted(tmp.glob("BAMBI_*"))):
    jd = next((run / "marti").iterdir())
    (jd / "metadata.json").write_text(json.dumps(
        {"barcode": "0", "id": jd.name, "runId": run.name, "sampleLocation": "Ward A" if i < 3 else "Ward B",
         "sampleDate": f"0{i + 1}/02/2018", "keywords": "TEST FIXTURE, infant stool"}))
# one per-read file so read-identity evidence is exercised
run = sorted(tmp.glob("BAMBI_P8_*"))[0]
(run / "lcaparse").mkdir()
(run / "lcaparse" / "test_chunk_0_megablast_nt_lcaparse_perread.txt").write_text(
    "r1\t562\tEscherichia coli\tspecies\t99.1\t97.0\n"
    "r2\t562\tEscherichia coli\tspecies\t96.0\t94.2\n"
    "r3\t543\tEnterobacteriaceae\tfamily\t92.0\t90.0\n")

os.environ["MARTI_DIRS"] = str(tmp)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# MARTi >= 1.0 accumulation format for one sample: "rawReads"/"rawTime" plus a per-chunk "diversity" series
# (layout from engine TaxaAccumulation.writeJSON). The final point is computed with the Python port, which
# reproduces the engine's DiversityStats exactly; earlier points are synthetic.
from marti_llm.data import MartiStore, RANK_NAME  # noqa: E402
from marti_llm.diversity import tree_diversity  # noqa: E402
_s = MartiStore([tmp]).get("BAMBI_P8_1D_19092017")
_acc_path = _s.json_dir / "accumulation_ms0.1.json"
_acc = json.loads(_acc_path.read_text())
for r in range(1, 11):
    rd = _acc["accumulation"][RANK_NAME[r]]
    rd["rawReads"], rd["rawTime"] = rd["reads"], rd["time"]
    final_r, _ = tree_diversity(_s.tree("0.1"), r, False, False)
    final_b, _ = tree_diversity(_s.tree("0.1", yield_based=True), r, True, False)
    pts = []
    for k, (reads, _t) in enumerate(rd["reads"]):
        f = (k + 1) / len(rd["reads"])
        scale = lambda d: {**d, "S": max(1, round(d["S"] * f)), "shannon": (d["shannon"] or 0) * (0.8 + 0.2 * f)}
        pts.append({"readsAnalysed": reads, "mins": k * 10,
                    "reads": final_r if f == 1 else scale(final_r), "bases": final_b if f == 1 else scale(final_b)})
    rd["diversity"] = pts
_acc_path.write_text(json.dumps(_acc))

import server  # noqa: E402


def unpack(res):
    """Normalise call_tool results across MCP SDK versions to a Python object."""
    if isinstance(res, tuple):
        res = res[1] if res[1] is not None else res[0]
    if isinstance(res, dict):
        return res.get("result", res)
    if hasattr(res, "structured_content") and res.structured_content:
        r = res.structured_content
        return r.get("result", r)
    blocks = res.content if hasattr(res, "content") else res
    return json.loads(blocks[0].text)


async def call(name, **args):
    out = unpack(await server.mcp.call_tool(name, args))
    assert not (isinstance(out, dict) and "error" in out), f"{name}: {out}"
    return out


async def main():
    tools = await server.mcp.list_tools()
    print(f"{len(tools)} tools:", ", ".join(t.name for t in tools))

    inv = await call("list_samples")
    print(f"\nlist_samples: {inv['n_samples']} samples, projects={inv['projects']}")
    keys = [s["key"] for s in inv["samples"]]

    ov = await call("sample_overview", sample="BAMBI_P8_1D_19092017")
    print("overview:", ov["reads"], "| db:", ov["classification"]["database"])

    tt = await call("taxa_table", sample="BAMBI_P8", rank="species", top_n=5)
    print("\ntop species P8:", [(t["name"], t["reads_in_clade"], t["pct_of_classified"]) for t in tt["taxa"]])
    print("  reads not resolved to species:", tt["reads_not_resolved_to_this_rank"])

    sc = await call("screen_samples", list_id="human_pathogens", project="bambi")
    print("\nscreen human_pathogens (bambi):")
    for r in sc["results"]:
        print(f"  {r['name']}: {r['n_hits']} hits;",
              [(h["taxon"], h["reads_in_clade"]) for h in r["hits"][:5]])
    ecoli = next(h for r in sc["results"] if "P8" in r["sample"] for h in r["hits"] if h["taxid"] == 562)
    print("  E. coli P8 identity evidence:", ecoli.get("blast_identity"))
    print("  list warnings:", sc["list_validation_warnings"])

    sp = await call("screen_samples", list_id="food_spoilage", project="marc")
    print("\nscreen food_spoilage (marc):",
          [(r["name"][-22:], r["n_hits"]) for r in sp["results"]])

    tx = await call("taxon_across_samples", taxon="Klebsiella", project="bambi")
    print("\nKlebsiella across bambi:", tx["present_in"],
          [(s["date"], s["reads_in_clade"]) for s in tx["samples"]])

    cmp_ = await call("compare_samples", sample_a=keys[5], sample_b=keys[7])
    print("\ncompare", keys[5][-30:], "vs", keys[7][-30:], "aitchison", cmp_["aitchison_distance"],
          "| higher in b:", [r["taxon"] for r in cmp_["higher_in_b"][:5]])

    un = await call("unusual_features", target="BAMBI_P8_1D_19092017", reference_project="bambi")
    print("\nunusual P8 vs bambi:", un["overall"],
          "\n  elevated:", [r["taxon"] for r in un["elevated_vs_reference"][:6]])

    co = await call("cooccurrence")
    print("\ncooccurrence (9 samples):", co["n_taxa_tested"], "taxa; groups", co["sample_groups"],
          [(p["taxon_1"], p["taxon_2"], p["rho"]) for p in co["most_proportional"][:4]])

    ad = await call("alpha_diversity", project="bambi", rank="species")
    print(f"\nalpha_diversity (bambi, species, rarefied to {ad['rarefaction_depth_reads']} reads):")
    for r in ad["samples"]:
        print(f"  {r['name'][:28]:28s} S={r['S']:4d} rarefied={r['rarefied_richness']:7.2f} "
              f"H'={r['shannon']:.3f} 1/D={r['invSimpson']:.2f}" + (f"  during_run={r['during_run']['shannon_at_reads']}"
                                                                   f" engine_match={r['during_run']['engine_final_matches_tree']}"
                                                                   if "during_run" in r else ""))
    adb = await call("alpha_diversity", samples=["BAMBI_P8_1D_19092017"], unit="bases", min_support=0.0)
    print("  P8 by bases:", {k: adb["samples"][0][k] for k in ("N", "S", "shannon", "chao1")})
    ad0 = await call("alpha_diversity", samples=["BAMBI_P8_1D_19092017"], min_support=0.0)
    print("  P8 reads ms0.0 chao1:", ad0["samples"][0]["chao1"])

    bd = await call("beta_diversity", project="bambi")
    print("\nbeta_diversity bambi (Bray-Curtis, genus): PCoA axes %", bd["pcoa"]["axis_percent_variance"],
          "\n  nearest:", {k[:12]: v["sample"][:12] for k, v in bd["nearest_neighbour"].items()},
          "\n  UPGMA:", bd["upgma_newick"][:110], "...")
    bda = await call("beta_diversity", method="aitchison", rank="family")
    print("  all 9, Aitchison family: axes %", bda["pcoa"]["axis_percent_variance"])

    st = await call("search_taxa", query="klebs")
    print("\nsearch_taxa 'klebs':", [(m["name"], m["ncbi_rank"], m["n_samples"]) for m in st["matches"][:4]])

    lists = await call("list_reference_lists")
    print("lists:", [l["id"] for l in lists])
    pr = await call("screen_samples", list_id="project:bambi:enterics", project="bambi")
    print("preset screen P8:", [(h["taxon"], h["pct_of_all_reads"], h.get("pct_of_preset_denominator"),
                                 h.get("meets_preset_minimum_root_percent"))
                                for r in pr["results"] if "P8" in r["sample"] for h in r["hits"]])

    for m in ("jaccard", "spearman"):
        c = await call("cooccurrence", method=m)
        top = c.get("links") or c.get("strongest_positive")
        print(f"cooccurrence {m}:", [(t["taxon_1"], t["taxon_2"], t.get("jaccard", t.get("r"))) for t in top[:3]])

    # ---- groups
    ls = await call("list_samples", project="all")
    print("\nlist_samples(all): groups", ls["project_groups"], "| first:",
          {k: ls["samples"][0][k] for k in ("group", "location", "keywords", "date")})
    assert ls["samples"][0]["keywords"] == ["TEST FIXTURE", "infant stool"]
    assert ls["samples"][0]["date"] == "2018-02-01", ls["samples"][0]["date"]
    cg = await call("compare_groups", project="all")
    sep = cg["separation"]["permanova"]
    print("compare_groups(all, project groups):", cg["power"]["group_sizes"], "PERMANOVA", sep,
          "| q<0.05:", cg["taxa"]["n_q_below_0.05"])
    assert sep["p"] <= 0.008 and sep["R2"] > 0.5
    print("  top:", [(t["taxon"], t["highest_in"], t["q"]) for t in cg["taxa"]["differing"][:3]],
          "| only in one group:", [(o["taxon"], o["group"]) for o in cg["only_in_one_group"][:3]])
    print("  AMR:", [(c["drug_class"], c["prevalence_by_group"]) for c in cg["amr"]["drug_classes"][:2]])
    loc = await call("compare_groups", project="bambi", group_by="location", include_amr=False)
    print("compare_groups(bambi by location):", loc["power"], loc["separation"]["permanova"])
    ex = await call("compare_groups", groups={"P8": ["BAMBI_P8_1D_19092017"],
                                              "others": ["BAMBI_P103M", "BAMBI_P106I", "BAMBI_P116I", "BAMBI_P205G"]},
                    include_amr=False)
    print("compare_groups(explicit 1 vs 4):", ex["power"]["smallest_possible_p"], ex["taxa"]["note"][-90:])
    ad = await call("alpha_diversity", project="all", group_by="project")
    print("alpha_diversity by group:", {g: v["shannon"]["mean"] for g, v in ad["group_summary"]["groups"].items()},
          ad["group_summary"]["p"])
    bd = await call("beta_diversity", project="all", group_by="project")
    print("beta_diversity by group:", bd["group_separation"]["permanova"], bd["samples"][0]["group"])
    for args, expect in [({"project": "marc"}, "defines no sampleGroups"),
                         ({"project": "broken"}, "needs runId, sampleId and group"),
                         ({"project": "bambi", "group_by": "colour"}, "group_by must be"),
                         ({"groups": {"a": ["BAMBI_P8_1D_19092017"], "b": ["BAMBI_P8_1D_19092017"]}}, "in both")]:
        r = unpack(await server.mcp.call_tool("compare_groups", args))
        assert expect in r.get("error", ""), (args, r)
    print("  group error messages OK")

    sat = await call("sequencing_saturation", sample="BAMBI_P8")
    print("\nsaturation:", {k: sat.get(k) for k in ("curve", "taxa_observed", "new_taxa_in_last_20pct_of_reads",
                                                   "likely_saturated", "shannon_change_in_last_20pct")})
    sat_old = await call("sequencing_saturation", sample="BAMBI_P103M")
    print("saturation (pre-1.0 file):", sat_old["curve"])
    amr = await call("get_amr", sample="BAMBI_P8", top_n=3)
    print("\namr:", amr["reads_with_amr_hits"], list(amr["reads_by_drug_class"].items())[:3])
    print("  top gene:", amr["genes"][0]["gene"], amr["genes"][0]["priority"], amr["genes"][0]["attributed_hosts"][:1])
    print("  priority genes:", [(g["gene"], g["category"]) for g in amr["priority_genes"][:4]])

    # regression: amr.json chunk keys are strings - latest must be chunk 21, not lexically-largest "9"
    tet = await call("get_amr", sample="BAMBI_P103M", drug_class="tetracycline", top_n=50)
    tet_o = next(g for g in tet["genes"] if g["gene"] == "tet(O)")
    assert tet_o["reads"] == 50, tet_o["reads"]
    print("  tet(O) in P103M at latest chunk:", tet_o["reads"], "(chunk-order regression OK)")

    sa = await call("screen_amr", project="bambi")
    print("screen_amr bambi:", [(r["name"][:12], [(h["gene"], h["priority"]) for h in r["hits"][:2]])
                                for r in sa["results"]])
    ax = await call("amr_across_samples", project="bambi", by="drug_class", top_n=3)
    print("amr_across_samples by class:", [(r["name"], r["present_in"], [v["per_million_reads"] for v in r["by_sample"]])
                                          for r in ax["rows"]])
    axq = await call("amr_across_samples", query="beta-lactamase")
    print("  beta-lactamase genes:", [(r["name"], r["present_in"]) for r in axq["rows"][:5]])
    sp = await call("screen_samples", list_id="human_pathogens", samples=["BAMBI_P8_1D_19092017"])
    kp = next(h for h in sp["results"][0]["hits"] if h["taxon"] == "Klebsiella pneumoniae")
    print("  K. pneumoniae in P8 carries:", [(g["gene"], g["reads_attributed"], g["priority"])
                                             for g in kp["amr_genes_attributed"][:4]])
    wrong = unpack(await server.mcp.call_tool("screen_samples", {"list_id": "amr_priority_genes"}))
    assert "screen_amr" in wrong["error"]

    # ---- narratives written by the client's model (get_narrative_inputs / save_narrative)
    ni = await call("get_narrative_inputs", sample="BAMBI_P8_1D_19092017")
    print("\nget_narrative_inputs:", ni["profile"], ni["sections_to_write"], "| results keys:",
          sorted(ni["analysis_results"])[:6], "| ~tokens", len(json.dumps(ni)) // 4)
    assert "Use ONLY the analysis results" in ni["instructions"] and "Answer with JSON" not in ni["instructions"]
    good = {"summary": "Klebsiella pneumoniae dominates this sample with 16,774 reads (65.6% of classified reads).",
            "sections": [{"title": t, "text": "Proteus mirabilis follows with 2,936 reads."}
                         for t in ni["sections_to_write"]]}
    sv = await call("save_narrative", sample="BAMBI_P8_1D_19092017", model="Claude (test)", **good)
    saved = json.loads(Path(sv["saved"]).read_text())["narrative"]
    print("save_narrative:", sv["validation"]["ok"], sv["sections_saved"], "|", saved["provider"], saved["model"],
          saved["generator"])
    assert sv["validation"]["ok"] and saved["provider"] == "mcp" and saved["model"] == "Claude (test)"
    assert saved["summary"] == good["summary"] and len(saved["sections"]) == 4 and saved["facts"]
    bad = dict(good, summary="Listeria monocytogenes was found in 42,000 reads, with KPC-2.")
    sv2 = await call("save_narrative", sample="BAMBI_P8_1D_19092017", **bad)
    print("  flawed narrative flagged:", sv2["validation"]["organisms_not_detected"],
          sv2["validation"]["genes_not_detected"], sv2["validation"]["numbers_not_found"], "|", sv2["next_step"][:40])
    assert not sv2["validation"]["ok"] and json.loads(Path(sv2["saved"]).read_text())["narrative"]["model"] \
        == "Model in an MCP client"
    empty = unpack(await server.mcp.call_tool("save_narrative", {"sample": "BAMBI_P8_1D_19092017",
                                                                 "summary": "x", "sections": []}))
    assert "at least one section" in empty["error"], empty
    pr = await server.mcp.get_prompt("write_narrative", {"sample": "BAMBI_P8"})
    msg = pr.messages[0].content.text
    assert "get_narrative_inputs" in msg and "save_narrative" in msg
    print("  empty sections refused; write_narrative prompt OK")

    # error path returns data, not an exception
    err = unpack(await server.mcp.call_tool("sample_overview", {"sample": "BAMBI"}))
    print("\nambiguous ref ->", err["error"][:80], "...")

    prompts = await server.mcp.list_prompts()
    print("prompts:", [p.name for p in prompts])

    sizes = {n: len(json.dumps(await call(n, **a))) // 4 for n, a in [
        ("screen_samples", {"list_id": "human_pathogens"}),
        ("unusual_features", {"target": "BAMBI_P8_1D_19092017", "reference_project": "bambi"}),
        ("taxa_table", {"sample": "BAMBI_P8"})]}
    print("approx tokens per result:", sizes)
    print("\nALL OK")


asyncio.run(main())
