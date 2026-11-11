const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCompareUpSet, compareUpSetPresenceCsv, compareUpSetGroupCounts,
  compareUpSetIntersectionTooltipLines, compareUpSetLegendLayout } = require('./compareUpSet');

test('UpSet legend fills a wide row and wraps when space is limited', () => {
  const groups = ['Bacteria', 'Archaea', 'Fungi', 'Plants', 'Animals', 'Viruses', 'Other'];
  assert.equal(compareUpSetLegendLayout(groups, 760).rows, 1);
  const narrow = compareUpSetLegendLayout(groups, 300);
  assert.ok(narrow.rows > 1);
  assert.ok(narrow.items.every(item => item.x + item.width <= 300 - 16));
});

function sample(runId, id, counts, total = 1000) {
  return { runId, id, tree: { tree: { rank: 0, summedValue: total,
    children: Object.entries(counts).map(([taxon, count]) => ({
      rank: 7, ncbiID: taxon, name: 'Taxon ' + taxon, summedValue: count
    })) } } };
}

const options = { rank: 7, mode: 'groups', minReads: 2, minPercent: 0.1, minGroupSamples: 1 };
const group = (run, id) => ({ a: 'Winter', b: 'Winter', c: 'Spring', d: '' })[id];
const name = (run, id) => id;

test('group UpSet uses sample thresholds and counts exact taxon intersections', () => {
  const entries = [
    sample('r1', 'a', { 10: 2, 20: 3, 40: 1 }),
    sample('r1', 'b', { 10: 5, 20: 1 }),
    sample('r2', 'c', { 10: 4, 30: 2 }),
    sample('r2', 'd', { 50: 5 })
  ];
  const result = calculateCompareUpSet(entries, options, group, name);
  assert.deepEqual(result.sets.map(set => set.label), ['Winter', 'Spring']);
  assert.deepEqual(result.sets.map(set => set.taxa.size), [2, 2]);
  assert.equal(result.excludedUngrouped, 1);
  assert.deepEqual(result.intersections.map(item => [item.mask, item.count]).sort((a, b) => a[0] - b[0]),
    [[1, 1], [2, 1], [3, 1]]);
  const csv = compareUpSetPresenceCsv(result);
  assert.match(csv, /"10","Taxon 10","Other","TRUE","TRUE","Winter & Spring"/);
  assert.doesNotMatch(csv, /"40","Taxon 40"/);
});

test('broad groups follow taxon ancestors and stacked section totals match bars', () => {
  function lineageSample(id, taxa) {
    return { runId: 'run', id, tree: { tree: { rank: 0, ncbiID: 1, summedValue: 1000,
      children: taxa.map(([ancestor, taxon]) => ({ rank: 1, ncbiID: ancestor, summedValue: 10,
        children: [{ rank: 7, ncbiID: taxon, name: 'Taxon ' + taxon, summedValue: 10 }] })) } } };
  }
  const entries = [lineageSample('a', [[2, 10], [10239, 20], [33090, 30]]),
    lineageSample('b', [[2, 10], [4751, 40], [999, 50]])];
  const result = calculateCompareUpSet(entries, { ...options, mode: 'samples' }, group, name);
  assert.deepEqual(Array.from(result.taxonGroups.entries()).sort((a, b) => Number(a[0]) - Number(b[0])),
    [['10', 'Bacteria'], ['20', 'Viruses'], ['30', 'Plants'], ['40', 'Fungi'], ['50', 'Other']]);
  result.sets.forEach(set => {
    assert.equal(compareUpSetGroupCounts(set.taxa, result.taxonGroups)
      .reduce((sum, segment) => sum + segment.count, 0), set.taxa.size);
  });
  result.intersections.forEach(item => {
    assert.equal(compareUpSetGroupCounts(item.taxa, result.taxonGroups)
      .reduce((sum, segment) => sum + segment.count, 0), item.count);
  });
  assert.match(compareUpSetPresenceCsv(result), /"20","Taxon 20","Viruses"/);
  const otherColumn = result.intersections.find(item => item.taxa.includes('50'));
  const lines = compareUpSetIntersectionTooltipLines(otherColumn, result.sets, true, result.taxonGroups);
  assert.equal(lines[0], otherColumn.count + ' taxa in intersection');
  assert.ok(lines.includes('Other: 1'));
  assert.ok(lines.every(line => !line.includes('Taxon 50')));
});

test('intersection tooltip keeps the total first and omits individual taxa without stacking', () => {
  const item = { mask: 3, count: 2, taxa: ['10', '20'] };
  const lines = compareUpSetIntersectionTooltipLines(item,
    [{ label: 'Winter' }, { label: 'Spring' }], false, new Map());
  assert.deepEqual(lines, ['2 taxa in intersection', 'Winter & Spring']);
});

test('group minimum counts samples, while individual view keeps same names in different runs separate', () => {
  const entries = [sample('r1', 'a', { 10: 2, 20: 2 }),
    sample('r2', 'b', { 10: 3 }), sample('r3', 'c', { 20: 2 })];
  const grouped = calculateCompareUpSet(entries, { ...options, minGroupSamples: 2 },
    (run, id) => id === 'c' ? 'Spring' : 'Winter', name);
  assert.deepEqual(Array.from(grouped.sets[0].taxa), ['10']);
  assert.equal(grouped.sets[1].taxa.size, 0);
  const individual = calculateCompareUpSet(entries.slice(0, 2), { ...options, mode: 'samples' },
    group, () => 'Repeated');
  assert.deepEqual(individual.sets.map(set => set.label), ['Repeated (r1)', 'Repeated (r2)']);
  assert.deepEqual(individual.intersections.map(item => [item.mask, item.count]).sort((a, b) => a[0] - b[0]),
    [[1, 1], [3, 1]]);
});

test('rejects nested ranks and too many sets', () => {
  const entries = Array.from({ length: 9 }, (_, index) => sample('r', String(index), { 10: 2 }));
  assert.throws(() => calculateCompareUpSet(entries, { ...options, rank: 10, mode: 'samples' }, group, name), /single taxonomic rank/);
  assert.throws(() => calculateCompareUpSet(entries, { ...options, mode: 'samples' }, group, name), /up to eight sets/);
});
