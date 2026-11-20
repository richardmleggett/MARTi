const fs = require('fs'), glob = require('path');
const ord = require(process.argv[2] + '/gui/UI/services/ordination.js');
const div = require(process.argv[2] + '/gui/UI/public/js/diversity.js');
const files = JSON.parse(fs.readFileSync(process.argv[3]));
const samples = files.map(f => ({ name: f, runId: 'r', tree: JSON.parse(fs.readFileSync(f)).tree }));
const out = {};
for (const method of ['brayCurtis', 'aitchison']) for (const rank of [5, 7, 8]) {
  const o = ord.calculateOrdination(samples, { method, rank, minimumPrevalence: 1, pseudocount: 0.5 });
  out[`${method}_${rank}`] = { distances: o.distances, axisPercent: o.axisPercent, lingoes: o.lingoesConstant,
                               x: o.points.map(p => p.x), coverage: o.points.map(p => p.coveragePercent), features: o.featureCount };
}
// GUI rarefied richness at the compare-page depth (min N across samples), species rank
const counts = samples.map(s => div.martiTreeDiversity(s.tree, 8, { chao1Valid: false }).counts);
const depth = Math.min(...counts.map(c => c.reduce((a, b) => a + b, 0)));
out.rarefied = { depth, values: counts.map(c => div.martiRarefiedRichness(c, depth)) };
fs.writeFileSync(process.argv[4], JSON.stringify(out));
