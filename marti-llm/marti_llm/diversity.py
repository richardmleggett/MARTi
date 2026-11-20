"""
Alpha diversity exactly as MARTi computes it (engine DiversityStats.java, GUI public/js/diversity.js),
plus the GUI's beta-diversity calculations (gui/UI/services/ordination.js).

Keeping these identical to MARTi means numbers the LLM reports match what the user sees in the GUI.
"""
from __future__ import annotations

import math

import numpy as np

from .data import TaxTree


# ---------------------------------------------------------------------------- alpha
def marti_diversity(counts: list[int], chao1_valid: bool) -> dict:
    """DiversityStats / martiDiversity. Natural-log Shannon; Gini-Simpson; inverse Simpson (Hill q=2);
    Pielou J'; Simpson evenness = (1/D)/S; Chao1 (bias-corrected when f2 = 0) only when valid."""
    n_total = int(sum(counts))
    s = len(counts)
    out = {"N": n_total, "S": s, "chao1": None, "shannon": None, "pielou": None,
           "simpson": None, "invSimpson": None, "simpsonEvenness": None}
    if n_total == 0:
        return out
    h = 0.0
    sum_p2 = 0.0
    for c in counts:
        p = c / n_total
        h -= p * math.log(p)
        sum_p2 += p * p
    out["shannon"] = h
    out["simpson"] = 1.0 - sum_p2
    out["invSimpson"] = 1.0 / sum_p2
    out["simpsonEvenness"] = (1.0 / sum_p2) / s
    out["pielou"] = h / math.log(s) if s > 1 else None
    if chao1_valid:
        f1 = sum(1 for c in counts if c == 1)
        f2 = sum(1 for c in counts if c == 2)
        out["chao1"] = s + (f1 * f1) / (2.0 * f2) if f2 > 0 else s + (f1 * (f1 - 1)) / 2.0
    return out


def tree_diversity(tree: TaxTree, rank, use_yield: bool, chao1_valid: bool) -> tuple[dict, list[int]]:
    nodes = tree.leaf_abundances(rank, use_yield)
    counts = [n.bases_clade if use_yield else n.reads_clade for n in nodes]
    return marti_diversity(counts, chao1_valid), counts


def rarefied_richness(counts: list[int], depth: int) -> float:
    """Expected number of taxa in a random subsample of `depth` reads (Hurlbert 1971), as in the GUI."""
    n_total = sum(counts)
    if depth >= n_total:
        return float(len(counts))

    def lchoose(n, k):
        return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)

    denom = lchoose(n_total, depth)
    return sum(1.0 if n_total - c < depth else 1.0 - math.exp(lchoose(n_total - c, depth) - denom)
               for c in counts)


def average_ranks(values) -> np.ndarray:
    """1-based ranks with ties averaged (GUI compareTaxonCorrelationRanks), for Spearman correlation."""
    order = np.argsort(values, kind="stable")
    ranks = np.empty(len(values))
    i = 0
    while i < len(order):
        j = i + 1
        while j < len(order) and values[order[j]] == values[order[i]]:
            j += 1
        ranks[order[i:j]] = (i + j + 1) / 2
        i = j
    return ranks


# ---------------------------------------------------------------------------- beta
def distance_matrix(values: np.ndarray, method: str, pseudocount: float = 0.5) -> np.ndarray:
    """values: samples x taxa counts. Bray-Curtis on relative abundances, or Aitchison (Euclidean on CLR)."""
    if method == "brayCurtis":
        rel = values / values.sum(axis=1, keepdims=True)
        return np.abs(rel[:, None, :] - rel[None, :, :]).sum(axis=2) / 2
    if method == "aitchison":
        if pseudocount == 0 and (values == 0).any():
            raise ValueError("A positive pseudocount is required when taxa are absent from a sample.")
        lg = np.log(values + pseudocount)
        z = lg - lg.mean(axis=1, keepdims=True)
        return np.sqrt(((z[:, None, :] - z[None, :, :]) ** 2).sum(axis=2))
    raise ValueError("method must be 'brayCurtis' or 'aitchison'")


def pcoa(d: np.ndarray, method: str) -> dict:
    """Classical MDS with the GUI's Lingoes correction for non-Euclidean Bray-Curtis distances."""
    def gram(dist):
        sq = dist ** 2
        row = sq.mean(axis=1)
        return -0.5 * (sq - row[:, None] - row[None, :] + row.mean())

    vals, vecs = np.linalg.eigh(gram(d))
    order = np.argsort(vals)[::-1]
    vals, vecs = vals[order], vecs[:, order]
    lingoes = 0.0
    largest = max(1.0, vals[0])
    if method == "brayCurtis" and vals[-1] < -largest * 1e-8:
        lingoes = float(-vals[-1])
        corrected = np.sqrt(d ** 2 + 2 * lingoes)
        np.fill_diagonal(corrected, 0)
        vals, vecs = np.linalg.eigh(gram(corrected))
        order = np.argsort(vals)[::-1]
        vals, vecs = vals[order], vecs[:, order]
    keep = vals > max(1.0, vals[0]) * 1e-9
    vals, vecs = vals[keep], vecs[:, keep]
    if not len(vals):
        raise ValueError("The selected samples have identical taxon profiles.")
    coords = vecs[:, :3] * np.sqrt(vals[:3])
    return {"axis_percent": [round(float(v / vals.sum() * 100), 1) for v in vals[:3]],
            "coords": coords, "lingoes_constant": lingoes}


def upgma_newick(d: np.ndarray, labels: list[str]) -> str:
    """Average-linkage (UPGMA) clustering, as the GUI dendrogram, returned as Newick with merge heights."""
    clusters = {i: (f"'{labels[i]}'", 1, 0.0) for i in range(len(labels))}
    dist = {(i, j): float(d[i, j]) for i in range(len(labels)) for j in range(i + 1, len(labels))}
    nxt = len(labels)
    while len(clusters) > 1:
        (a, b), h = min(dist.items(), key=lambda kv: kv[1])
        (na, sa, ha), (nb, sb, hb) = clusters.pop(a), clusters.pop(b)
        merged = (f"({na}:{max(h / 2 - ha, 0):.4f},{nb}:{max(h / 2 - hb, 0):.4f})", sa + sb, h / 2)
        for k in clusters:
            dak = dist.pop((min(a, k), max(a, k)))
            dbk = dist.pop((min(b, k), max(b, k)))
            dist[(min(k, nxt), max(k, nxt))] = (sa * dak + sb * dbk) / (sa + sb)
        dist.pop((a, b))
        clusters[nxt] = merged
        nxt += 1
    return next(iter(clusters.values()))[0] + ";"
