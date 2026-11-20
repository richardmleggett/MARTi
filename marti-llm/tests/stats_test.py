"""
Check marti-llm's group statistics against established implementations:
  - PERMANOVA and PERMDISP pseudo-F against scikit-bio
  - per-taxon one-way ANOVA F against SciPy, Benjamini-Hochberg q against SciPy
  - exact enumeration of relabellings, and the false-positive rate on null data

    pip install scikit-bio scipy     # test-only dependencies
    python tests/stats_test.py
"""
import sys
import warnings
from pathlib import Path

import numpy as np

try:
    from scipy.spatial.distance import pdist, squareform
    from scipy.stats import f_oneway, false_discovery_control
    from skbio.stats.distance import DistanceMatrix, permanova, permdisp
except ImportError:
    sys.exit("stats_test needs scikit-bio and scipy: pip install scikit-bio scipy")

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from marti_llm import diversity as D  # noqa: E402
from marti_llm import groups as G  # noqa: E402

rng = np.random.default_rng(1)
failures = 0


def vegan_betadisper_z(d, lab, k):
    """vegan::betadisper(type = "centroid"): PCoA keeping positive and negative eigenvalue axes,
    z = sqrt(|dist^2 on positive axes - dist^2 on negative axes|) to each group's centroid."""
    n = len(d)
    j = np.eye(n) - 1 / n
    vals, vecs = np.linalg.eigh(-0.5 * j @ (d ** 2) @ j)
    keep = np.abs(vals) > max(np.abs(vals).max(), 1) * 1e-10
    vals, vecs = vals[keep], vecs[:, keep]
    x = vecs * np.sqrt(np.abs(vals))
    pos, neg = vals > 0, vals < 0
    z = np.zeros(n)
    for g in range(k):
        idx = lab == g
        c = x[idx].mean(axis=0)
        diff = x[idx] - c
        z[idx] = np.sqrt(np.abs((diff[:, pos] ** 2).sum(axis=1) - (diff[:, neg] ** 2).sum(axis=1)))
    return z


def check(label, ok):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + label)


for sizes in ([5, 4], [3, 3, 3], [6, 7], [12, 11]):
    n, k = sum(sizes), len(sizes)
    lab = np.repeat(np.arange(k), sizes)
    labs, exact = G.labelings(lab)
    total = G._n_labelings(sizes)
    ok = (labs[0] == lab).all() and all((np.bincount(r, minlength=k) == sizes).all() for r in labs)
    if exact:
        ok &= len(labs) == total == len({tuple(r) for r in labs})
    check(f"groups {sizes}: {'all' if exact else 'random'} relabellings ({len(labs)} of {total}), sizes preserved", ok)

    x = rng.normal(size=(40, n))
    f = G.anova_f(x, labs[:50], k)
    sp = np.array([[f_oneway(*[x[t, labs[j] == g] for g in range(k)]).statistic for t in range(40)] for j in range(50)])
    check(f"groups {sizes}: per-taxon ANOVA F matches SciPy", np.abs(f - sp).max() / np.abs(sp).max() < 1e-9)

    ids = [f"s{i}" for i in range(n)]
    grouping = [str(v) for v in lab]
    counts = rng.poisson(rng.gamma(0.5, 20, size=(n, 30)) * (1 + (lab[:, None] == 0) * 2))
    counts[counts.sum(axis=1) == 0, 0] = 1
    for name, d in [("Euclidean", squareform(pdist(rng.normal(size=(n, 6)) + (lab == 0)[:, None] * 1.5))),
                    ("Aitchison", D.distance_matrix(counts.astype(float), "aitchison", 0.5)),
                    ("Bray-Curtis", D.distance_matrix(counts.astype(float), "brayCurtis"))]:
        pf, _ = G.permanova(d, labs, k)
        sk = permanova(DistanceMatrix(d, ids), grouping, permutations=0)["test statistic"]
        z = G.distance_to_centroid(d, lab, k)
        zv = vegan_betadisper_z(d, lab, k)
        fz = G.anova_f(z[None, :], labs[:1], k)[0, 0]
        ok = abs(pf[0] - sk) / sk < 1e-9 and np.abs(z - zv).max() < 1e-8
        detail = f"PERMDISP distances match vegan's method (max diff {np.abs(z - zv).max():.0e})"
        if name != "Bray-Curtis":   # Euclidean-embeddable: scikit-bio's PCoA-based PERMDISP must agree too
            skd = permdisp(DistanceMatrix(d, ids), grouping, test="centroid", permutations=0, method="eigh",
                           dimensions=n - 1)["test statistic"]
            ok &= abs(fz - skd) / max(skd, 1e-12) < 1e-6
            detail += f", F {fz:.4f} = scikit-bio {skd:.4f}"
        check(f"groups {sizes}, {name}: PERMANOVA F {pf[0]:.4f} = scikit-bio {sk:.4f}; {detail}", ok)

pv = rng.uniform(size=200) ** 3
check("Benjamini-Hochberg q matches SciPy", np.abs(G.bh_fdr(pv) - false_discovery_control(pv)).max() < 1e-12)
hits = []
for _ in range(400):
    lab = np.repeat([0, 1], [6, 6])
    labs, _ = G.labelings(lab)
    hits.append(float(G.p_value(G.anova_f(rng.normal(size=(1, 12)), labs, 2))[0]) <= 0.05)
check(f"null data: {np.mean(hits):.3f} of 400 tests at p <= 0.05 (should be about 0.05 or less)",
      0.02 <= np.mean(hits) <= 0.07)

print("\nALL STATS CHECKS PASSED" if not failures else f"\n{failures} STATS CHECK(S) FAILED")
sys.exit(1 if failures else 0)
