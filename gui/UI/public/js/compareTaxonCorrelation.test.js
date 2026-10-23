const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCompareTaxonCorrelation, compareTaxonCorrelationRanks } = require('./compareTaxonCorrelation');

function sample(counts) {
  return { tree: { tree: { rank: 0, children: Object.entries(counts).map(([id, value]) => ({
    rank: 7, ncbiID: id, name: 'Taxon ' + id, summedValue: value
  })) } } };
}

test('uses relative read abundance and returns a symmetric correlation matrix', () => {
  const result = calculateCompareTaxonCorrelation([
    sample({ 10: 1, 20: 3, 30: 1 }),
    sample({ 10: 4, 20: 2, 30: 2 }),
    sample({ 10: 9, 20: 1, 30: 3 }),
    sample({ 10: 8, 20: 12, 30: 4 })
  ], { rank: 7, topN: 3, minimumPrevalence: 1, method: 'pearson' });
  assert.equal(result.sampleCount, 4);
  assert.equal(result.taxa.length, 3);
  assert.deepEqual(result.taxa.find(taxon => taxon.id === '10').values, [1 / 5, 4 / 8, 9 / 13, 8 / 24]);
  assert.deepEqual(result.matrix.map((row, i) => row[i]), [1, 1, 1]);
  result.matrix.forEach((row, i) => row.forEach((value, j) => {
    assert.ok(value >= -1 && value <= 1);
    assert.equal(value, result.matrix[j][i]);
  }));
  assert.ok(Math.abs(result.taxa[0].mean - result.taxa[0].values.reduce((a, b) => a + b, 0) / 4) < 1e-12);
});

test('Spearman uses average ranks for ties', () => {
  assert.deepEqual(compareTaxonCorrelationRanks([2, 1, 2, 4]), [2.5, 1, 2.5, 4]);
  const entries = [
    sample({ 10: 1, 20: 4, 30: 5 }),
    sample({ 10: 1, 20: 3, 30: 6 }),
    sample({ 10: 3, 20: 2, 30: 5 }),
    sample({ 10: 4, 20: 1, 30: 5 })
  ];
  const options = { rank: 7, topN: 3, minimumPrevalence: 1 };
  const pearson = calculateCompareTaxonCorrelation(entries, { ...options, method: 'pearson' });
  const spearman = calculateCompareTaxonCorrelation(entries, { ...options, method: 'spearman' });
  const p10 = pearson.taxa.findIndex(taxon => taxon.id === '10');
  const p20 = pearson.taxa.findIndex(taxon => taxon.id === '20');
  const s10 = spearman.taxa.findIndex(taxon => taxon.id === '10');
  const s20 = spearman.taxa.findIndex(taxon => taxon.id === '20');
  assert.notEqual(pearson.matrix[p10][p20], spearman.matrix[s10][s20]);
  assert.ok(spearman.matrix[s10][s20] < 0);
});

test('filters prevalence, constant taxa, and samples without taxa at rank', () => {
  const result = calculateCompareTaxonCorrelation([
    sample({ 10: 1, 20: 3, 30: 1 }),
    sample({ 10: 2, 20: 2, 30: 1 }),
    sample({ 10: 3, 20: 1, 30: 1 }),
    sample({ 10: 4, 20: 4, 30: 2 }),
    sample({})
  ], { rank: 7, topN: 3, minimumPrevalence: 4, method: 'pearson' });
  assert.equal(result.excludedCount, 1);
  assert.equal(result.taxa.length, 2);
  assert.equal(result.constantCount, 1);
  assert.throws(() => calculateCompareTaxonCorrelation([sample({ 10: 1 }), sample({ 10: 2 })],
    { rank: 7, topN: 3, minimumPrevalence: 1, method: 'pearson' }), /at least three/);
  assert.throws(() => calculateCompareTaxonCorrelation([sample({ 10: 1 }), sample({ 10: 2 }), sample({ 10: 3 })],
    { rank: 10, topN: 3, minimumPrevalence: 1, method: 'pearson' }), /single taxonomic rank/);
});
