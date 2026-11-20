"""
Sample groups, defined the same ways as on the MARTi GUI's Compare page, and permutation statistics for them.

Grouping (gui/UI/public/js/compareViews.js, compareOrdination.js, services/projectSampleGroups.js):
  - "project":  projects.json "sampleGroups": [{"runId", "sampleId", "group"}, ...], validated as the GUI does
  - "location": metadata site name  (locationName, else location, else sampleLocation)
  - "date":     metadata sampleDate, normalised to YYYY-MM-DD where it parses (dd/mm/yy, dd/mm/yyyy, ISO)
  - "run":      the run id
  - explicit:   {"group name": [sample refs]} - e.g. the groups a GUI user has edited in their browser

Statistics are permutation tests on group labels, so they make no distributional assumptions and are valid for
small groups; with very few samples the smallest achievable p-value is reported so nobody over-reads them.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import date
from itertools import combinations

import numpy as np

from .data import MartiStore, Sample


# ------------------------------------------------------------------------------------------- metadata (GUI rules)
def _text(v) -> str:
    return v.strip() if isinstance(v, str) else ""


def metadata_location(md: dict | None) -> str:
    md = md or {}
    return _text(md.get("locationName")) or _text(md.get("location")) or _text(md.get("sampleLocation"))


_ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])", re.ASCII)
_DAY_FIRST = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})$", re.ASCII)


def metadata_date(md: dict | None) -> str:
    """sampleDate as YYYY-MM-DD when it is ISO or day-first (UK) format and a real date; otherwise as written."""
    value = _text((md or {}).get("sampleDate"))
    iso, dmy = _ISO.match(value), _DAY_FIRST.match(value)
    if not iso and not dmy:
        return value
    year = int(iso.group(1) if iso else dmy.group(3))
    if year < 100:
        year += 2000
    month = int(iso.group(2) if iso else dmy.group(2))
    day = int(iso.group(3) if iso else dmy.group(1))
    try:
        date(year, month, day)
    except ValueError:
        return value
    return f"{year:04d}-{month:02d}-{day:02d}"


def metadata_keywords(md: dict | None) -> list[str]:
    """The engine writes keywords as one comma-separated string; accept a list too."""
    kw = (md or {}).get("keywords")
    if isinstance(kw, str):
        return [k.strip() for k in kw.split(",") if k.strip()]
    if isinstance(kw, list):
        return [str(k).strip() for k in kw if str(k).strip()]
    return []


def normalize_project_sample_groups(groups) -> list[dict]:
    """services/projectSampleGroups.js normalizeProjectSampleGroups, including its error messages."""
    if not isinstance(groups, list):
        raise ValueError("sampleGroups must be an array")
    seen, out = set(), []
    for index, entry in enumerate(groups):
        if not isinstance(entry, dict):
            raise ValueError(f"sampleGroups entry {index + 1} must be an object")
        run_id, sample_id, group = (_text(entry.get("runId")), _text(entry.get("sampleId")),
                                    _text(entry.get("group")))
        if not run_id or not sample_id or not group:
            raise ValueError(f"sampleGroups entry {index + 1} needs runId, sampleId and group")
        if (run_id, sample_id) in seen:
            raise ValueError(f"Duplicate sampleGroups entry for {run_id}/{sample_id}")
        seen.add((run_id, sample_id))
        out.append({"runId": run_id, "sampleId": sample_id, "group": group})
    return out


def _matches(s: Sample, run_id: str, sample_id: str) -> bool:
    # The GUI keys samples by run and sample folder names; these normally equal sample.json's runId and id.
    return run_id in (s.run_id, s.run_dir.name) and sample_id in (s.sample_id, s.json_dir.name)


# ------------------------------------------------------------------------------------------- assignment
@dataclass
class Grouping:
    source: str
    labels: dict[str, str]                       # sample key -> group
    samples: list[Sample]                        # grouped samples, in group order
    ungrouped: list[Sample] = field(default_factory=list)

    @property
    def order(self) -> list[str]:
        seen: list[str] = []
        for s in self.samples:
            g = self.labels[s.key]
            if g not in seen:
                seen.append(g)
        return seen

    def label_index(self) -> np.ndarray:
        idx = {g: i for i, g in enumerate(self.order)}
        return np.array([idx[self.labels[s.key]] for s in self.samples])

    def summary(self) -> dict:
        members = {g: [s.key for s in self.samples if self.labels[s.key] == g] for g in self.order}
        return {"source": self.source,
                "groups": [{"group": g, "n": len(m), "samples": m} for g, m in members.items()],
                "ungrouped": [s.key for s in self.ungrouped]}


def resolve_groups(store: MartiStore, sample_refs: list[str] | None = None, project: str | None = None,
                   group_by: str | None = None, groups: dict[str, list[str]] | None = None) -> Grouping:
    if groups:
        labels, chosen = {}, []
        for g, refs in groups.items():
            g = str(g).strip()
            if not g:
                raise ValueError("Group names must not be empty.")
            for ref in refs:
                s = store.get(ref)
                if s.key in labels and labels[s.key] != g:
                    raise ValueError(f"{s.key} is in both '{labels[s.key]}' and '{g}'.")
                if s.key not in labels:
                    labels[s.key] = g
                    chosen.append(s)
        return _finish("explicit groups", labels, chosen, [])

    group_by = (group_by or ("project" if project else "")).lower()
    if not group_by:
        raise ValueError("Say how to group the samples: group_by = project, location, date or run, "
                         "or pass explicit groups.")
    universe = store.resolve(sample_refs, project)
    labels: dict[str, str] = {}
    if group_by == "project":
        if not project:
            raise ValueError("group_by='project' needs a project name.")
        spec = store.projects().get(project) or {}
        if "sampleGroups" not in spec:
            raise ValueError(f"Project '{project}' defines no sampleGroups in projects.json. "
                             "Use group_by = location, date or run, or pass explicit groups.")
        entries = normalize_project_sample_groups(spec["sampleGroups"])
        for s in universe:
            for e in entries:
                if _matches(s, e["runId"], e["sampleId"]):
                    labels[s.key] = e["group"]
                    break
    elif group_by in ("location", "date"):
        fn = metadata_location if group_by == "location" else metadata_date
        for s in universe:
            v = fn(s.metadata())
            if v:
                labels[s.key] = v
    elif group_by == "run":
        labels = {s.key: s.run_id for s in universe}
    else:
        raise ValueError("group_by must be project, location, date or run.")
    grouped = [s for s in universe if s.key in labels]
    return _finish(f"{group_by} ({project})" if group_by == "project" else group_by, labels, grouped,
                   [s for s in universe if s.key not in labels])


def _finish(source, labels, grouped, ungrouped) -> Grouping:
    order = list(dict.fromkeys(labels[s.key] for s in grouped))
    if len(order) < 2:
        raise ValueError(f"Need at least two groups; found {len(order)} ({', '.join(order) or 'none'}).")
    grouped = sorted(grouped, key=lambda s: order.index(labels[s.key]))
    return Grouping(source, labels, grouped, ungrouped)


# ------------------------------------------------------------------------------------------- permutations
MAX_EXACT = 10_000
N_RANDOM = 9_999


def _n_labelings(counts: list[int]) -> int:
    n, total = sum(counts), 1
    for c in counts:
        total *= math.comb(n, c)
        n -= c
    return total


def labelings(labels: np.ndarray, seed: int = 20261119) -> tuple[np.ndarray, bool]:
    """Group-label vectors to test against, observed first. All distinct relabelings when there are at most
    10,000 (an exact test), otherwise 9,999 random permutations from a fixed seed (reproducible)."""
    k = int(labels.max()) + 1
    counts = [int((labels == g).sum()) for g in range(k)]
    n = len(labels)
    if _n_labelings(counts) <= MAX_EXACT:
        out = []

        def rec(remaining: tuple[int, ...], g: int, current: np.ndarray):
            if g == k - 1:
                current = current.copy()
                current[list(remaining)] = g
                out.append(current)
                return
            for chosen in combinations(remaining, counts[g]):
                nxt = current.copy()
                nxt[list(chosen)] = g
                picked = set(chosen)
                rec(tuple(i for i in remaining if i not in picked), g + 1, nxt)

        rec(tuple(range(n)), 0, np.zeros(n, dtype=int))
        arr = np.array(out)
        obs = np.where((arr == labels).all(axis=1))[0][0]
        arr[[0, obs]] = arr[[obs, 0]]
        return arr, True
    rng = np.random.default_rng(seed)
    return np.vstack([labels] + [rng.permutation(labels) for _ in range(N_RANDOM)]), False


def _onehot(lab: np.ndarray, k: int) -> np.ndarray:
    return (lab[..., None] == np.arange(k)).astype(float)


def p_value(stats: np.ndarray) -> float | np.ndarray:
    """stats: (labelings, ...) with the observed value first; larger is more extreme. The observed labeling is
    counted once, giving (1 + #as extreme)/(1 + N) for random permutations and the exact p for full enumeration."""
    obs = stats[0]
    ge = (stats >= obs - 1e-9 * np.maximum(1, np.abs(obs))).sum(axis=0)
    return ge / len(stats)


def min_p(n_labelings: int) -> float:
    return 1.0 / n_labelings


def anova_f(x: np.ndarray, labs: np.ndarray, k: int, chunk: int = 500) -> np.ndarray:
    """One-way ANOVA F for each feature (rows of x: features x samples) under each labeling.
    Returns (labelings, features)."""
    n = x.shape[1]
    sst = ((x - x.mean(axis=1, keepdims=True)) ** 2).sum(axis=1)
    grand = x.sum(axis=1) ** 2 / n
    sizes = np.bincount(labs[0], minlength=k).astype(float)
    out = []
    for i in range(0, len(labs), chunk):
        h = _onehot(labs[i:i + chunk], k)                       # (m, n, k)
        m = h.shape[0]
        sums = (x @ h.transpose(1, 0, 2).reshape(n, m * k)).reshape(-1, m, k).transpose(1, 0, 2)  # (m, t, k)
        ssb = (sums ** 2 / sizes).sum(axis=2) - grand
        ssw = np.maximum(sst - ssb, 1e-300)
        out.append((ssb / (k - 1)) / (ssw / (n - k)))
    return np.vstack(out)


def permanova(d: np.ndarray, labs: np.ndarray, k: int, chunk: int = 500) -> tuple[np.ndarray, float]:
    """PERMANOVA pseudo-F (Anderson 2001) for each labeling, and R^2 for the observed one."""
    n = len(d)
    d2 = d ** 2
    sst = d2[np.triu_indices(n, 1)].sum() / n
    sizes = np.bincount(labs[0], minlength=k).astype(float)
    fs = []
    for i in range(0, len(labs), chunk):
        h = _onehot(labs[i:i + chunk], k)                       # (m, n, k)
        m = h.shape[0]
        hf = h.transpose(1, 0, 2).reshape(n, m * k)             # one column per (labeling, group)
        within = ((d2 @ hf) * hf).sum(axis=0).reshape(m, k) / 2 / sizes
        ssw = within.sum(axis=1)
        fs.append(((sst - ssw) / (k - 1)) / (ssw / (n - k)))
    f = np.concatenate(fs)
    h0 = _onehot(labs[0], k)
    ssw0 = (np.einsum("nk,nj,jk->k", h0, d2, h0) / 2 / sizes).sum()
    return f, float(1 - ssw0 / sst)


def distance_to_centroid(d: np.ndarray, lab: np.ndarray, k: int) -> np.ndarray:
    """Each sample's distance to its group centroid, as in PERMDISP (Anderson 2006) and R vegan's betadisper.
    Computed from the distances directly, which equals vegan's PCoA-based value: for non-Euclidean distances such
    as Bray-Curtis the squared distance includes the negative-eigenvalue part and can be negative, and vegan
    takes the square root of its absolute value (scikit-bio instead drops negative axes)."""
    d2 = d ** 2
    out = np.zeros(len(d))
    for g in range(k):
        idx = np.where(lab == g)[0]
        sub = d2[np.ix_(idx, idx)]
        z2 = sub.mean(axis=1) - sub.sum() / (2 * len(idx) ** 2)
        out[idx] = np.sqrt(np.abs(z2))
    return out


def bh_fdr(p: np.ndarray) -> np.ndarray:
    """Benjamini-Hochberg adjusted p-values (q-values)."""
    m = len(p)
    if m == 0:
        return p
    order = np.argsort(p)
    ranked = p[order] * m / np.arange(1, m + 1)
    q = np.minimum.accumulate(ranked[::-1])[::-1]
    out = np.empty(m)
    out[order] = np.minimum(q, 1.0)
    return out
