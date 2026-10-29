const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCompareTaxonCorrelation, compareTaxonCorrelationRanks } = require('./compareTaxonCorrelation');
const { prepareCompareTaxonCorrelationEntries, compareTaxonCorrelationCsvRows } = require('./compareTaxonCorrelation');

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

function discoveryEntries() {
  const bulk = [3000, 6500, 2200, 7400, 4000, 5000];
  return bulk.map((value, index) => {
    const low = index + 1;
    return { ...sample({ 10: value, 20: 10000 - value - 3 * low, 30: low, 40: 2 * low }),
      id: 'sample-' + index, runId: 'run-' + (index % 2) };
  });
}

const discoveryOptions = { rank: 7, selection: 'pairs', pairCount: 2, direction: 'both',
  minimumPrevalence: 3, minimumReads: 1, method: 'pearson' };

test('strongest pairs search includes low-abundance taxa excluded from the abundance shortlist', () => {
  const entries = discoveryEntries();
  const abundant = calculateCompareTaxonCorrelation(entries, { ...discoveryOptions, selection: 'abundance', topN: 2 });
  assert.deepEqual(new Set(abundant.taxa.map(taxon => taxon.id)), new Set(['10', '20']));
  for (const method of ['pearson', 'spearman']) {
    const result = calculateCompareTaxonCorrelation(entries, { ...discoveryOptions, method, direction: 'positive', pairCount: 1 });
    assert.equal(result.candidateCount, 4);
    assert.equal(result.pairsTested, 6);
    assert.equal(result.pairs.length, 1);
    assert.deepEqual(new Set([result.pairs[0].a.id, result.pairs[0].b.id]), new Set(['30', '40']));
    assert.ok(result.pairs[0].correlation > 0.999999999);
    assert.equal(result.pairs[0].a.values.length, 6);
    assert.equal(result.samples[0].name, 'sample-0');
    assert.equal(result.samples[0].runId, 'run-0');
  }
});

test('both directions retain separate strongest lists without self-pairs or symmetric duplicates', () => {
  const result = calculateCompareTaxonCorrelation(discoveryEntries(), discoveryOptions);
  assert.equal(result.pairs.filter(pair => pair.correlation > 0).length, 2);
  assert.equal(result.pairs.filter(pair => pair.correlation < 0).length, 2);
  const keys = result.pairs.map(pair => [pair.a.id, pair.b.id].sort().join(':'));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(result.pairs.every(pair => pair.a.id !== pair.b.id));
  for (const direction of ['positive', 'negative']) {
    const filtered = calculateCompareTaxonCorrelation(discoveryEntries(), { ...discoveryOptions, direction });
    assert.ok(filtered.pairs.every(pair => direction === 'positive' ? pair.correlation > 0 : pair.correlation < 0));
    const magnitudes = filtered.pairs.map(pair => Math.abs(pair.correlation));
    assert.deepEqual(magnitudes, magnitudes.slice().sort((a, b) => b - a));
  }
});

test('read support and prevalence select candidates without dropping zeros, low counts or renormalizing abundances', () => {
  const entries = [sample({ 10: 1, 20: 12, 30: 87 }), sample({ 10: 10, 20: 2, 30: 88 }),
    sample({ 10: 15, 20: 10, 30: 75 }), sample({ 10: 0, 20: 10, 30: 90 })];
  const result = calculateCompareTaxonCorrelation(entries, { ...discoveryOptions, minimumReads: 10, minimumPrevalence: 2 });
  const ten = result.taxa.find(taxon => taxon.id === '10');
  assert.equal(ten.prevalence, 2);
  assert.deepEqual(ten.values, [0.01, 0.1, 0.15, 0]);
  assert.deepEqual(ten.counts, [1, 10, 15, 0]);
  const stricter = calculateCompareTaxonCorrelation(entries, { ...discoveryOptions, minimumReads: 10, minimumPrevalence: 3 });
  assert.equal(stricter.candidateCount, 2);
  assert.ok(stricter.pairs.every(pair => pair.a.id !== '10' && pair.b.id !== '10'));
});

test('compact worker inputs match direct results and preserve input objects', () => {
  const entries = discoveryEntries();
  const before = JSON.stringify(entries);
  const prepared = prepareCompareTaxonCorrelationEntries(entries, 7);
  assert.deepEqual(calculateCompareTaxonCorrelation(prepared, discoveryOptions), calculateCompareTaxonCorrelation(entries, discoveryOptions));
  assert.equal(JSON.stringify(entries), before);
});

test('constant taxa are omitted with many samples despite floating-point rounding', () => {
  const entries = Array.from({ length: 126 }, (_, i) => sample({ 10: i + 1, 20: 1999 - i, 30: 1000 }));
  const result = calculateCompareTaxonCorrelation(entries, { ...discoveryOptions, method: 'spearman' });
  assert.equal(result.constantCount, 1);
  assert.equal(result.candidateCount, 2);
  assert.ok(result.pairs.every(pair => Number.isFinite(pair.correlation)));
});

test('pair export includes evidence, method, search scope and every displayed pair', () => {
  const result = calculateCompareTaxonCorrelation(discoveryEntries(), discoveryOptions);
  const rows = compareTaxonCorrelationCsvRows(result, '0.1');
  assert.equal(rows.length, result.pairs.length + 1);
  const first = Object.fromEntries(rows[0].map((name, index) => [name, rows[1][index]]));
  assert.equal(first.Method, 'pearson');
  assert.equal(first['Minimum reads'], 1);
  assert.equal(first['LCA (%)'], '0.1');
  assert.equal(first['Pairs searched'], 6);
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
