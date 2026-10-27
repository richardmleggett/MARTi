/*
 * diversity.js — alpha-diversity helpers for the MARTi GUI.
 * Works on the tree objects already sent to the browser (tree_ms*.json -> "tree" or "treeYield").
 * Rank numbers follow taxonomicLevelDict in universal.js (1=Domain ... 7=Genus, 8=Species, 10=All Levels).
 */

// Abundance vector at a rank. Taxa are chosen exactly as the engine's TaxaAccumulation
// (and DiversityStats.leafAbundances) does, so S matches the taxa accumulation curve:
// a taxon is a node at or above the target rank with no counted descendants at or above
// that rank. A lineage that stops above the rank (e.g. a genus with no species-level reads
// when rank = species) therefore counts as one taxon, weighted by summedValue for reads
// or summedYield for bases.
// Rank-0 ("no rank"/clade) nodes and "unclassified" are never counted.
// rank 10 ("All Levels") gives every terminal taxon.
function martiCountsAtRank(tree, rank, useYield) {
  var counts = [];
  (function explore(n) {
    var marked = 0;
    var kids = n.children || n._children || [];   // d3 trees may have collapsed nodes into _children
    kids.forEach(function (c) {
      if (c.name === "unclassified") return;
      if (c.summedValue > 0 && c.rank <= rank) marked += explore(c);
    });
    if (marked === 0 && n.rank !== 0 && n.rank <= rank && n.summedValue > 0) {
      var abundance = useYield ? n.summedYield : n.summedValue;
      if (abundance > 0) counts.push(abundance);
      marked++;
    }
    return marked;
  })(tree);
  return counts;
}

function martiLgamma(x) {          // Lanczos approximation, adequate for counts in the millions
  var g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - martiLgamma(1 - x);
  x -= 1;
  var a = c[0], t = x + g + 0.5;
  for (var i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function martiLogChoose(n, k) {
  return martiLgamma(n + 1) - martiLgamma(k + 1) - martiLgamma(n - k + 1);
}

// Expected number of taxa in a random subsample of `depth` reads (Hurlbert 1971).
// Exact and deterministic, so no random subsampling is needed to compare samples of different depth.
function martiRarefiedRichness(counts, depth) {
  var N = counts.reduce(function (a, b) { return a + b; }, 0);
  if (depth >= N) return counts.length;
  var lDenom = martiLogChoose(N, depth);
  return counts.reduce(function (s, ni) {
    return s + (N - ni < depth ? 1 : 1 - Math.exp(martiLogChoose(N - ni, depth) - lDenom));
  }, 0);
}

// opts.chao1Valid: pass false when singletons/doubletons are not real read counts
// (min support > 0, or base-yield mode), so Chao1 is reported as null rather than misleading.
function martiDiversity(counts, opts) {
  opts = opts || {};
  var N = counts.reduce(function (a, b) { return a + b; }, 0);
  var S = counts.length;
  var out = { N: N, S: S, chao1: null, shannon: null, pielou: null,
              simpson: null, invSimpson: null, simpsonEvenness: null };
  if (N === 0) return out;

  var H = 0, sumP2 = 0;
  counts.forEach(function (n) {
    var p = n / N;
    H -= p * Math.log(p);
    sumP2 += p * p;
  });
  out.shannon = H;                                   // natural log
  out.simpson = 1 - sumP2;                           // Gini–Simpson
  out.invSimpson = 1 / sumP2;                        // Hill number q=2
  out.pielou = S > 1 ? H / Math.log(S) : null;       // evenness J'
  out.simpsonEvenness = S > 0 ? (1 / sumP2) / S : null;

  if (opts.chao1Valid !== false) {
    var f1 = 0, f2 = 0;
    counts.forEach(function (n) { if (n === 1) f1++; else if (n === 2) f2++; });
    out.chao1 = f2 > 0 ? S + (f1 * f1) / (2 * f2)
                       : S + (f1 * (f1 - 1)) / 2;    // bias-corrected form when f2 = 0
  }
  return out;
}

// Convenience wrapper used by the dashboard and compare pages.
// tree: sample tree object (already switched to "tree" or "treeYield")
// rank: numeric rank 1-10 (10 = All Levels, i.e. all terminal taxa).
function martiTreeDiversity(tree, rank, opts) {
  if (!tree || !(rank >= 1 && rank <= 10)) return null;
  var counts = martiCountsAtRank(tree, rank, opts && opts.useYield);
  var d = martiDiversity(counts, opts);
  d.counts = counts;
  return d;
}

// ---------------------------------------------------------------------------
// Per-chunk diversity written by the engine into accumulation_ms*.json
// (accumulation[rank].diversity = [{readsAnalysed, mins, reads:{...}, bases:{...}}, ...])
// ---------------------------------------------------------------------------

var MARTI_DIVERSITY_METRICS = {
  taxa:            { label: "Taxa count",            decimals: 0 },
  shannon:         { label: "Shannon (H')",          decimals: 3 },
  pielou:          { label: "Pielou evenness (J')",  decimals: 3 },
  simpson:         { label: "Simpson (1-D)",         decimals: 3 },
  invSimpson:      { label: "Inverse Simpson (1/D)", decimals: 2 },
  simpsonEvenness: { label: "Simpson evenness",      decimals: 3 },
  chao1:           { label: "Chao1",                 decimals: 1 }
};

function martiHasChunkDiversity(rankData) {
  return !!(rankData && Array.isArray(rankData.diversity) && rankData.diversity.length > 0);
}

// Returns [[x, value], ...] for one metric. xAxis is "reads" or "time"; unit is "reads" or "bases".
// Points where the metric is undefined (e.g. Chao1 at a non-zero LCA cutoff) are dropped.
function martiChunkDiversitySeries(rankData, metric, unit, xAxis) {
  if (!martiHasChunkDiversity(rankData)) return [];
  var series = [];
  rankData.diversity.forEach(function (p) {
    var stats = p[unit];
    if (!stats) return;
    var v = stats[metric];
    if (v === null || v === undefined || isNaN(v)) return;
    series.push([xAxis === "time" ? p.mins : p.readsAnalysed, v]);
  });
  return series;
}

if (typeof module !== "undefined") {   // lets the same file be unit-tested with node
  module.exports = { martiCountsAtRank: martiCountsAtRank, martiDiversity: martiDiversity,
                     martiRarefiedRichness: martiRarefiedRichness, martiTreeDiversity: martiTreeDiversity,
                     martiHasChunkDiversity: martiHasChunkDiversity, martiChunkDiversitySeries: martiChunkDiversitySeries,
                     MARTI_DIVERSITY_METRICS: MARTI_DIVERSITY_METRICS };
}
