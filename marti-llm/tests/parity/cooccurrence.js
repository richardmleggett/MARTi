const fs = require('fs');
const co = require(process.argv[2] + '/gui/UI/public/js/compareCooccurrence.js');
const cor = require(process.argv[2] + '/gui/UI/public/js/compareTaxonCorrelation.js');
const files = JSON.parse(fs.readFileSync(process.argv[3]));
const entries = files.map((f, i) => ({ name: 's' + i, runId: 'r', tree: { tree: JSON.parse(fs.readFileSync(f)).tree } }));
const out = {};
for (const rank of [5, 7]) {
  const j = co.calculateCompareCooccurrence(entries, { rank, topN: 12, presenceReads: 1, minimumPrevalence: 1, minimumShared: 2, minimumJaccard: 0.5, maxLinks: 30 });
  out['jaccard_' + rank] = j.edges.map(e => [j.taxa[e.source].name, j.taxa[e.target].name, +e.jaccard.toFixed(3)]);
  for (const method of ['spearman', 'pearson']) {
    const c = cor.calculateCompareTaxonCorrelation(entries, { rank, method, selection: 'abundance', topN: 15, minimumPrevalence: 1, minimumReads: 1 });
    const pairs = [];
    c.taxa.forEach((a, i) => c.taxa.forEach((b, k) => { if (k > i) pairs.push([a.name, b.name, +c.matrix[i][k].toFixed(3)]); }));
    out[method + '_' + rank] = pairs;
  }
}
fs.writeFileSync(process.argv[4], JSON.stringify(out));
