"""
Check that marti-llm reproduces MARTi's own calculations exactly, using MARTi's source code:
  - alpha diversity: the engine's DiversityStats.java (compiled against small stand-in taxonomy classes)
  - beta diversity, rarefied richness: the GUI's services/ordination.js and public/js/diversity.js
  - co-occurrence (Jaccard) and taxon correlation (Spearman/Pearson): the GUI's compare*.js

    python tests/parity_test.py /path/to/MARTi            # needs javac (JDK 17+) and node

Rerun after updating MARTi: a failure means MARTi's calculations changed and marti-llm needs updating.
"""
import json
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from marti_llm import analysis as A  # noqa: E402
from marti_llm import diversity as D  # noqa: E402
from marti_llm import groups as GR  # noqa: E402
from marti_llm.data import MartiStore  # noqa: E402

marti = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent  # marti-llm lives in MARTi
for tool in ("javac", "java", "node"):
    if not shutil.which(tool):
        sys.exit(f"{tool} not found - install a JDK (17+) and Node.js to run parity checks")
here = Path(__file__).parent / "parity"
tmp = Path(tempfile.mkdtemp())
store = MartiStore([marti / "gui" / "output"])
samples = store.samples()
failures = 0


def check(label, ok):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + label)


# ---- 1. engine alpha diversity -------------------------------------------------------------------------
src = tmp / "java"
shutil.copytree(here / "java", src)
core = src / "uk/ac/earlham/marti/core"
core.mkdir(parents=True)
shutil.copy(marti / "engine/src/main/java/uk/ac/earlham/marti/core/DiversityStats.java", core)
jar = marti / "bin" / "MARTiEngine.jar"
subprocess.run(["javac", "-encoding", "UTF-8", "-nowarn", "-cp", str(jar), "-d", str(tmp / "out"),
                *map(str, src.rglob("*.java"))], check=True, capture_output=True)
FIELDS = ["N", "S", "chao1", "shannon", "pielou", "simpson", "invSimpson", "simpsonEvenness"]
n = bad = 0
for s in samples:
    for ms in s.available_min_support()[:2]:
        for unit, yb in (("reads", False), ("bases", True)):
            t = s.tree(ms, yield_based=yb)
            nodes = tmp / "nodes.tsv"
            nodes.write_text("".join(f"{x.taxid}\t{x.parent if x.parent is not None else -1}\t{x.srank}\t"
                                     f"{x.reads_clade}\t{x.bases_clade}\n" for x in t.nodes.values()))
            chao = float(ms) == 0
            out = subprocess.run(["java", "-cp", f"{tmp / 'out'}:{jar}", "Harness", str(nodes), str(chao).lower()],
                                 capture_output=True, text=True, check=True).stdout.splitlines()
            for line in out:
                f = line.split("\t")
                if f[0] != unit:
                    continue
                java = dict(zip(FIELDS, [None if v == "null" else float(v) for v in f[2:]]))
                py, _ = D.tree_diversity(t, int(f[1]), yb, chao and not yb)
                for k in FIELDS:
                    n += 1
                    a, b = java[k], py[k]
                    if (a is None) != (b is None) or (a is not None and not math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)):
                        bad += 1
check(f"alpha diversity vs engine DiversityStats.java: {n} values, {bad} mismatches", bad == 0)

# ---- 2. GUI beta diversity and rarefaction ---------------------------------------------------------------
files = tmp / "files.json"
files.write_text(json.dumps([str(s.json_dir / "tree_ms0.1.json") for s in samples]))
subprocess.run(["node", str(here / "beta.js"), str(marti), str(files), str(tmp / "beta.json")], check=True)
js = json.loads((tmp / "beta.json").read_text())
for key, r in js.items():
    if key == "rarefied":
        continue
    method, rank = key.split("_")
    taxa, names, m = A.abundance_matrix(samples, int(rank), "0.1")
    d = D.distance_matrix(m.T, method, 0.5)
    p = D.pcoa(d, method)
    ok = (len(taxa) == r["features"] and np.abs(d - np.array(r["distances"])).max() < 1e-9
          and np.abs(np.array(p["axis_percent"]) - np.round(r["axisPercent"], 1)).max() < 0.051
          and abs(p["lingoes_constant"] - r["lingoes"]) < 1e-9)
    check(f"beta diversity {method} rank {rank} vs GUI ordination.js", ok)
counts = [D.tree_diversity(s.tree("0.1"), 8, False, False)[1] for s in samples]
depth = min(sum(c) for c in counts)
diff = max(abs(D.rarefied_richness(c, depth) - v) for c, v in zip(counts, js["rarefied"]["values"]))
check(f"rarefied richness vs GUI diversity.js (depth {depth})", depth == js["rarefied"]["depth"] and diff < 1e-9)

# ---- 3. GUI co-occurrence and correlation -----------------------------------------------------------------
subprocess.run(["node", str(here / "cooccurrence.js"), str(marti), str(files), str(tmp / "cooc.json")], check=True)
js = json.loads((tmp / "cooc.json").read_text())
for rank in (5, 7):
    r = A.cooccurrence(samples, rank, "0.1", method="jaccard")
    py = sorted((min(e["taxon_1"], e["taxon_2"]), max(e["taxon_1"], e["taxon_2"]), e["jaccard"]) for e in r["links"])
    g = sorted((min(a, b), max(a, b), j) for a, b, j in js[f"jaccard_{rank}"])
    check(f"Jaccard co-occurrence rank {rank} vs GUI compareCooccurrence.js", py == g)
    for meth in ("spearman", "pearson"):
        r = A.cooccurrence(samples, rank, "0.1", method=meth, top_n=10_000)
        py = {frozenset((x["taxon_1"], x["taxon_2"])): x["r"] for x in r["strongest_positive"] + r["strongest_negative"]}
        g = {frozenset((a, b)): v for a, b, v in js[f"{meth}_{rank}"] if v != 0}
        check(f"{meth} correlation rank {rank} vs GUI compareTaxonCorrelation.js",
              set(py) == set(g) and max(abs(py[k] - v) for k, v in g.items()) <= 0.0015)

# ---- 4. GUI sample-grouping rules -----------------------------------------------------------------------
md_cases = [
    {"locationName": " Thetford Forest ", "location": "52.4, 0.7", "sampleDate": "14/04/25"},
    {"location": "52.4, 0.7", "sampleDate": "2025-04-14"}, {"sampleLocation": "52.5, 0.8", "sampleDate": "16/01/2025"},
    {"sampleDate": "31/02/2025"}, {"sampleDate": "2025-04-14T10:00:00"}, {"sampleDate": " 1/2/2025 "},
    {"sampleDate": "2025/04/14"}, {"sampleDate": "14-04-2025"}, {"sampleDate": "29/02/24"}, {"sampleDate": "29/02/23"},
    {"sampleDate": "1/13/2025"}, {"sampleDate": "05/06/7"}, {"sampleDate": "2025-4-14"}, {"sampleDate": "0099-01-01"},
    {"sampleDate": "\u0662\u0660\u0662\u0665-04-14"}, {"sampleDate": 20250414}, {"locationName": "", "location": "  "},
    {"locationName": 5, "location": {"lat": 1}, "sampleLocation": " Norwich "}, {},
]
group_cases = [
    [{"runId": " R1 ", "sampleId": "S1", "group": " drains "}, {"runId": "R1", "sampleId": "S2", "group": "surfaces"}],
    [{"runId": "R1", "sampleId": "S1", "group": "a"}, {"runId": "R1", "sampleId": "S1", "group": "b"}],
    [{"runId": "R1", "sampleId": "S1"}], [{"runId": "R1", "sampleId": "S1", "group": "  "}], ["not an object"],
    [[1, 2]], {"runId": "R1"}, [], [{"runId": 1, "sampleId": "S1", "group": "a"}],
]
cases = tmp / "group_cases.json"
cases.write_text(json.dumps({"metadata": md_cases, "groups": group_cases}))
subprocess.run(["node", str(here / "groups.js"), str(marti), str(cases), str(tmp / "groups_out.json")], check=True)
js = json.loads((tmp / "groups_out.json").read_text())
bad = [(md, j) for md, j in zip(md_cases, js["metadata"])
       if (GR.metadata_location(md), GR.metadata_date(md)) != (j["location"], j["date"])]
check(f"location/date grouping vs GUI compareViews.js: {len(md_cases)} cases, {len(bad)} differ", not bad)
for md, j in bad[:5]:
    print("   ", md, "GUI:", j, "py:", GR.metadata_location(md), GR.metadata_date(md))
bad = []
for g, j in zip(group_cases, js["groups"]):
    try:
        py = {"ok": GR.normalize_project_sample_groups(g)}
    except ValueError as e:
        py = {"error": str(e)}
    if py != j:
        bad.append((g, j, py))
check(f"sampleGroups validation vs GUI projectSampleGroups.js: {len(group_cases)} cases, {len(bad)} differ", not bad)
for b in bad[:5]:
    print("   ", b)

print("\nALL PARITY CHECKS PASSED" if not failures else f"\n{failures} PARITY CHECK(S) FAILED")
sys.exit(1 if failures else 0)
