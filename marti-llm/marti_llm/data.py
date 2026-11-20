"""
Read-only access to MARTi output directories.

Layout (from MARTiEngineOptions / gui/UI/services/observer.js):

    <output_dir>/<run>/marti/<sample_id>/sample.json
                                        /metadata.json      (optional, from config Metadata block)
                                        /alerts.json        (optional)
                                        /tree_ms<minSupport>.json
                                        /accumulation_ms<minSupport>.json
                                        /amr.json           (optional)
                                        /assignments_ms<minSupport>.csv
    <output_dir>/<run>/ids.json                             (optional sample renames)
    <output_dir>/<run>/lcaparse[/barcodeNN]/*_perread.txt   (BLAST-LCA pipelines only)
    <output_dir>/projects.json                              (optional)

Everything is re-read when a file's mtime changes, so this works on live runs.
"""
from __future__ import annotations

import glob
import json
import os
import re
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

# NCBI renamed "superkingdom" to "domain" in 2025; MARTi trees may contain either.
RANK_ALIASES = {"domain": "superkingdom", "superkingdom": "superkingdom"}
STANDARD_RANKS = ["superkingdom", "kingdom", "phylum", "class", "order", "family", "genus", "species"]

# MARTi's simplified ranks (engine uk.ac.earlham.lcaparse.SimplifiedRank). Every tree node carries this
# number as "rank"; the GUI and the engine's diversity/accumulation code select taxa by it, so e.g.
# "species group" and "subgenus" nodes count at genus level (7). Used as a fallback for older trees.
SIMPLIFIED_RANK = {
    "biotype": 9, "clade": 0, "class": 4, "cohort": 4, "family": 6, "forma": 9, "forma specialis": 9,
    "genotype": 8, "genus": 7, "infraclass": 4, "infraorder": 5, "isolate": 8, "kingdom": 2, "morph": 9,
    "no rank": 0, "order": 5, "parvorder": 5, "pathogroup": 9, "phylum": 3, "section": 7, "series": 7,
    "serogroup": 9, "serotype": 9, "species": 8, "species group": 7, "species subgroup": 7, "strain": 9,
    "subclass": 4, "subcohort": 4, "subfamily": 6, "subgenus": 7, "subkingdom": 2, "suborder": 5,
    "subphylum": 3, "subsection": 7, "subspecies": 9, "subtribe": 6, "subvariety": 9, "superclass": 3,
    "superfamily": 5, "superkingdom": 1, "domain": 1, "realm": 2, "cellular root": 0, "acellular root": 1,
    "superorder": 4, "superphylum": 2, "tribe": 6, "varietas": 9,
}
# Rank names as used in accumulation_ms*.json and the GUI rank selector.
RANK_NUMBER = {"domain": 1, "superkingdom": 1, "kingdom": 2, "phylum": 3, "class": 4, "order": 5,
               "family": 6, "genus": 7, "species": 8, "subspecies": 9, "alllevels": 10, "all": 10,
               "all levels": 10}
RANK_NAME = {1: "domain", 2: "kingdom", 3: "phylum", 4: "class", 5: "order", 6: "family", 7: "genus",
             8: "species", 9: "subspecies", 10: "alllevels"}


def norm_rank(rank: str) -> str:
    rank = (rank or "").strip().lower()
    return RANK_ALIASES.get(rank, rank)


def rank_number(rank: str | int) -> int:
    """'genus' -> 7 etc. Accepts MARTi's numbers directly."""
    if isinstance(rank, int) or str(rank).strip().isdigit():
        n = int(rank)
    else:
        n = RANK_NUMBER.get(str(rank).strip().lower(), 0)
    if not 1 <= n <= 10:
        raise ValueError(f"Unknown rank '{rank}'. Use one of: {', '.join(RANK_NAME.values())}")
    return n


# --------------------------------------------------------------------------------------
# Small mtime-aware JSON cache
# --------------------------------------------------------------------------------------
_cache: dict[str, tuple[float, Any]] = {}


def _load(path: Path, parser=json.load) -> Any | None:
    try:
        mtime = path.stat().st_mtime
    except FileNotFoundError:
        return None
    key = str(path)
    hit = _cache.get(key)
    if hit and hit[0] == mtime:
        return hit[1]
    try:
        with open(path, encoding="utf-8") as fh:
            value = parser(fh)
    except (json.JSONDecodeError, OSError):
        # MARTi may be mid-write on a live run; keep the previous version if we have one.
        return hit[1] if hit else None
    _cache[key] = (mtime, value)
    return value


# --------------------------------------------------------------------------------------
# Taxonomy tree
# --------------------------------------------------------------------------------------
@dataclass
class TaxNode:
    taxid: int
    name: str
    rank: str
    parent: int | None
    reads_here: int        # MARTi "value": reads whose LCA stopped exactly at this node
    reads_clade: int       # MARTi "summedValue": reads at this node or any descendant
    bases_here: int
    bases_clade: int
    srank: int = 0         # MARTi simplified rank (1=domain ... 7=genus, 8=species, 9=subspecies, 0=no rank)
    children: list[int] = field(default_factory=list)


class TaxTree:
    """Flattened view of a MARTi tree_ms*.json file."""

    def __init__(self, tree_json: dict, section: str = "tree"):
        """section: "tree" (read-count min-support adjustment) or "treeYield" (base-yield adjustment)."""
        self.nodes: dict[int, TaxNode] = {}
        self.by_name: dict[str, int] = {}
        self.section = section
        root = tree_json[section]
        stack: list[tuple[dict, int | None]] = [(root, None)]
        while stack:
            raw, parent = stack.pop()
            taxid = int(raw.get("ncbiID", -1))
            if taxid in self.nodes:  # defensive: never seen in practice
                continue
            node = TaxNode(
                taxid=taxid,
                name=raw.get("name", str(taxid)),
                rank=norm_rank(raw.get("ncbiRank", "")),
                parent=parent,
                reads_here=int(raw.get("value", 0)),
                reads_clade=int(raw.get("summedValue", 0)),
                bases_here=int(raw.get("yield", 0)),
                bases_clade=int(raw.get("summedYield", 0)),
                srank=int(raw["rank"]) if str(raw.get("rank", "")).lstrip("-").isdigit()
                else SIMPLIFIED_RANK.get((raw.get("ncbiRank") or "").strip().lower(), 0),
            )
            self.nodes[taxid] = node
            self.by_name.setdefault(node.name.lower(), taxid)
            if parent is not None:
                self.nodes[parent].children.append(taxid)
            for child in raw.get("children", []) or []:
                stack.append((child, taxid))
        self.root_id = int(root.get("ncbiID", 1))

    @property
    def total_reads(self) -> int:
        """All reads analysed (root summedValue == sample.json readsAnalysed)."""
        return self.nodes[self.root_id].reads_clade

    @property
    def unclassified_reads(self) -> int:
        # MARTi uses a pseudo-node with ncbiID 0 named "unclassified".
        n = self.nodes.get(0)
        return n.reads_clade if n else 0

    @property
    def classified_reads(self) -> int:
        return self.total_reads - self.unclassified_reads

    def lineage(self, taxid: int) -> list[TaxNode]:
        out = []
        cur = self.nodes.get(taxid)
        while cur is not None:
            out.append(cur)
            cur = self.nodes.get(cur.parent) if cur.parent is not None else None
        return list(reversed(out))

    def descendants(self, taxid: int, include_self: bool = True) -> set[int]:
        out: set[int] = set()
        stack = [taxid] if taxid in self.nodes else []
        while stack:
            t = stack.pop()
            out.add(t)
            stack.extend(self.nodes[t].children)
        if not include_self:
            out.discard(taxid)
        return out

    def at_rank(self, rank: str | int) -> list[TaxNode]:
        """Taxa at a rank as the MARTi GUI compare page selects them (services/ordination.js
        taxonCountsAtRank): the first node with that simplified rank on each path from the root.
        Nested nodes of the same simplified rank (e.g. a subgenus under a genus) are not double counted;
        reads that stop above the rank are not included (see leaf_abundances for that)."""
        r = rank_number(rank)
        out, stack = [], [self.root_id]
        while stack:
            n = self.nodes[stack.pop()]
            if n.srank == r and n.taxid > 0:
                if n.reads_clade > 0:
                    out.append(n)
                continue
            stack.extend(n.children)
        return out

    def leaf_abundances(self, rank: str | int, use_yield: bool = False) -> list[TaxNode]:
        """Taxa counted for diversity and accumulation, exactly as the engine's
        DiversityStats.leafAbundances / TaxaAccumulation.exploreNode and the GUI's martiCountsAtRank:
        a taxon is a node at or above the target rank with no counted descendants at or above that rank.
        A lineage that stops above the rank (e.g. a genus with no species-level reads) counts as one
        taxon. Rank-0 ("no rank"/clade) nodes are never counted. rank 10 = all levels."""
        r = rank_number(rank)
        counted: list[TaxNode] = []

        def explore(t: int) -> int:
            n = self.nodes[t]
            marked = 0
            for c in n.children:
                cn = self.nodes[c]
                if cn.reads_clade > 0 and cn.srank <= r:
                    marked += explore(c)
            if marked == 0 and n.srank != 0 and n.srank <= r and n.reads_clade > 0:
                if (n.bases_clade if use_yield else n.reads_clade) > 0:
                    counted.append(n)
                marked += 1
            return marked

        import sys
        old = sys.getrecursionlimit()
        sys.setrecursionlimit(max(old, 10000))
        try:
            explore(self.root_id)
        finally:
            sys.setrecursionlimit(old)
        return counted

    def find(self, query: str | int) -> TaxNode | None:
        if isinstance(query, int) or (isinstance(query, str) and query.strip().isdigit()):
            return self.nodes.get(int(query))
        tid = self.by_name.get(str(query).strip().lower())
        return self.nodes.get(tid) if tid is not None else None

    def nearest_ancestor_at(self, taxid: int, rank: str) -> TaxNode | None:
        rank = norm_rank(rank)
        for n in reversed(self.lineage(taxid)):
            if n.rank == rank:
                return n
        return None


# --------------------------------------------------------------------------------------
# Sample
# --------------------------------------------------------------------------------------
@dataclass
class Sample:
    sample_id: str
    run_id: str
    json_dir: Path            # .../marti/<sample_id>/
    run_dir: Path             # directory containing marti/, lcaparse/, ids.json
    output_dir: Path          # the monitored directory this sample was found under
    display_name: str = ""

    @property
    def key(self) -> str:
        return f"{self.run_id}/{self.sample_id}"

    @property
    def name(self) -> str:
        return self.display_name or self.sample_id

    # ---- raw files ----
    def info(self) -> dict:
        d = _load(self.json_dir / "sample.json") or {}
        return d.get("sample", {})

    def metadata(self) -> dict | None:
        return _load(self.json_dir / "metadata.json")

    def alerts(self) -> list[dict]:
        d = _load(self.json_dir / "alerts.json") or {}
        return d.get("alerts", [])

    def available_min_support(self) -> list[str]:
        out = []
        for p in self.json_dir.glob("tree_ms*.json"):
            m = re.match(r"tree_ms(.+)\.json$", p.name)
            if m:
                out.append(m.group(1))
        return sorted(out, key=float)

    def _resolve_ms(self, ms: str | float | None) -> str:
        avail = self.available_min_support()
        if not avail:
            raise FileNotFoundError(f"No tree_ms*.json files for {self.key}")
        if ms is None:
            return avail[0]
        want = float(ms)
        for a in avail:
            if abs(float(a) - want) < 1e-9:
                return a
        raise ValueError(f"min_support {ms} not available for {self.key}; available: {avail}")

    def tree(self, ms: str | float | None = None, yield_based: bool = False) -> TaxTree:
        """Read-count tree, or with yield_based=True the base-yield tree ("treeYield"), whose minimum
        support filter is applied by bases rather than reads."""
        ms = self._resolve_ms(ms)
        path = self.json_dir / f"tree_ms{ms}.json"
        raw = _load(path)
        if raw is None:
            raise FileNotFoundError(path)
        section = "treeYield" if yield_based else "tree"
        if section not in raw:
            raise ValueError(f"{path.name} has no '{section}' section")
        # cache the parsed TaxTree alongside the raw JSON
        key = f"{path}::taxtree::{section}"
        mtime = path.stat().st_mtime
        hit = _cache.get(key)
        if hit and hit[0] == mtime:
            return hit[1]
        t = TaxTree(raw, section)
        _cache[key] = (mtime, t)
        return t

    def accumulation(self, ms: str | float | None = None) -> dict | None:
        ms = self._resolve_ms(ms)
        d = _load(self.json_dir / f"accumulation_ms{ms}.json")
        return d.get("accumulation") if d else None

    def amr(self) -> dict | None:
        d = _load(self.json_dir / "amr.json")
        return d.get("amr") if d else None

    # ---- per-read evidence (BLAST-LCA only) ----
    def perread_files(self) -> list[Path]:
        base = self.run_dir / "lcaparse"
        bc = int(self.info().get("barcode", 0) or 0)
        if bc > 0:
            base = base / f"barcode{bc:02d}"
        return sorted(base.glob("*_perread.txt")) if base.is_dir() else []

    def read_identities(self, taxids: set[int], max_files: int | None = None) -> dict | None:
        """Best/mean BLAST identity for reads assigned within `taxids`.

        Returns None when per-read files are unavailable (e.g. Kraken2/Centrifuge runs,
        or the GUI host only has the marti/ JSON directory).
        """
        files = self.perread_files()
        if not files:
            return None
        if max_files:
            files = files[-max_files:]
        best, mean = [], []
        for f in files:
            with open(f, encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    parts = line.rstrip("\n").split("\t")
                    if len(parts) < 6:
                        continue
                    try:
                        tid = int(parts[1])
                    except ValueError:
                        continue
                    if tid in taxids:
                        try:
                            best.append(float(parts[4]))
                            mean.append(float(parts[5]))
                        except ValueError:
                            pass
        if not best:
            return {"reads_found": 0}
        best.sort()
        return {
            "reads_found": len(best),
            "best_identity_median": round(statistics.median(best), 1),
            "best_identity_min": best[0],
            "best_identity_max": best[-1],
            "mean_identity_median": round(statistics.median(mean), 1),
            "fraction_best_identity_ge_95": round(sum(b >= 95 for b in best) / len(best), 3),
        }


# --------------------------------------------------------------------------------------
# Store: discovers samples under one or more monitored directories
# --------------------------------------------------------------------------------------
class MartiStore:
    def __init__(self, directories: Iterable[str | Path]):
        self.directories = [Path(d).expanduser().resolve() for d in directories]

    @classmethod
    def from_env(cls) -> "MartiStore":
        raw = os.environ.get("MARTI_DIRS", "")
        dirs = [d for d in re.split(r"[;:]" if os.name != "nt" else r";", raw) if d.strip()]
        if not dirs:
            raise RuntimeError("Set MARTI_DIRS to one or more MARTi output directories (separated by ';').")
        return cls(dirs)

    # Same patterns as the GUI's observer.js, so anything the GUI shows, we see.
    _PATTERNS = ["sample.json", "*/sample.json", "marti/*/sample.json", "*/marti/*/sample.json"]

    def samples(self) -> list[Sample]:
        found: dict[str, Sample] = {}
        for out_dir in self.directories:
            for pat in self._PATTERNS:
                for p in glob.glob(str(out_dir / pat)):
                    json_dir = Path(p).parent
                    run_dir = json_dir.parent.parent if json_dir.parent.name == "marti" else json_dir
                    info = (_load(Path(p)) or {}).get("sample", {})
                    sid = info.get("id") or json_dir.name
                    rid = info.get("runId") or run_dir.name
                    s = Sample(sid, rid, json_dir, run_dir, out_dir)
                    ids = _load(run_dir / "ids.json") or {}
                    s.display_name = ids.get(sid, "")
                    found.setdefault(s.key, s)
        return sorted(found.values(), key=lambda s: s.key)

    def projects(self) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for d in self.directories:
            pj = _load(d / "projects.json") or {}
            for name, spec in pj.items():
                if isinstance(spec, dict):
                    out[name] = spec
        return out

    def heatmap_presets(self) -> dict[str, dict]:
        """Taxon sets defined per project in projects.json ("heatmapTaxaPresets", GUI v1.0+).
        Keyed "project:<project>:<preset id>"."""
        out = {}
        for project, spec in self.projects().items():
            presets = spec.get("heatmapTaxaPresets")
            if not isinstance(presets, list):
                continue
            for p in presets:
                if not isinstance(p, dict) or not p.get("id") or not isinstance(p.get("taxa"), list):
                    continue
                out[f"project:{project}:{p['id']}"] = {"project": project, **p}
        return out

    def project_samples(self, project: str) -> list[Sample]:
        spec = self.projects().get(project)
        if spec is None:
            raise KeyError(f"Unknown project '{project}'. Known: {sorted(self.projects())}")
        dirs = [Path(p).expanduser().resolve() for p in spec.get("directories", [])]
        runs = set(spec.get("runs", []))
        names = set(spec.get("samples", []))
        out = []
        for s in self.samples():
            in_dir = any(d == s.output_dir or d in s.run_dir.parents or d == s.run_dir for d in dirs)
            if in_dir or s.run_id in runs or s.sample_id in names or s.display_name in names:
                out.append(s)
        return out

    def get(self, ref: str) -> Sample:
        """Resolve a sample by 'run/sample' key, sample id or display name."""
        ref = ref.strip()
        all_s = self.samples()
        exact = [s for s in all_s if ref in (s.key, s.sample_id, s.display_name)]
        if len(exact) == 1:
            return exact[0]
        if len(exact) > 1:
            raise ValueError(f"'{ref}' is ambiguous; use one of: {[s.key for s in exact]}")
        fuzzy = [s for s in all_s if ref.lower() in s.key.lower() or ref.lower() in s.name.lower()]
        if len(fuzzy) == 1:
            return fuzzy[0]
        if fuzzy:
            raise ValueError(f"'{ref}' matches several samples; use one of: {[s.key for s in fuzzy]}")
        raise KeyError(f"No sample matching '{ref}'. Use list_samples to see what is available.")

    def resolve(self, refs: list[str] | None = None, project: str | None = None) -> list[Sample]:
        if refs:
            return [self.get(r) for r in refs]
        if project:
            return self.project_samples(project)
        return self.samples()
