const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCompareCooccurrence, compareCooccurrenceLabelPositions } = require('./compareCooccurrence');

function sample(counts) {
  return { tree: { tree: { rank: 0, children: Object.entries(counts).map(([id, value]) => ({
    rank: 7, ncbiID: id, name: 'Taxon ' + id, summedValue: value
  })) } } };
}

const options = { rank: 7, topN: 10, presenceReads: 1, minimumPrevalence: 1,
  minimumShared: 2, minimumJaccard: 0.5, maxLinks: 30 };

test('links taxa by shared sample presence with Jaccard overlap', () => {
  const entries = [
    sample({ 1: 1, 2: 10 }), sample({ 1: 2, 2: 2 }),
    sample({ 1: 100, 3: 1 }), sample({ 2: 1, 3: 1 })
  ];
  const result = calculateCompareCooccurrence(entries, options);
  assert.equal(result.sampleCount, 4);
  assert.equal(result.taxa.length, 3);
  assert.equal(result.edges.length, 1);
  const edge = result.edges[0];
  assert.deepEqual([result.taxa[edge.source].id, result.taxa[edge.target].id].sort(), ['1', '2']);
  assert.equal(edge.both, 2);
  assert.equal(edge.either, 4);
  assert.equal(edge.jaccard, 0.5);
});

test('read threshold changes presence and link eligibility', () => {
  const entries = [
    sample({ 1: 1, 2: 10 }), sample({ 1: 2, 2: 2 }),
    sample({ 1: 100, 3: 1 }), sample({ 2: 1, 3: 1 })
  ];
  const result = calculateCompareCooccurrence(entries, {
    ...options, presenceReads: 2, minimumShared: 1, minimumJaccard: 0
  });
  assert.equal(result.taxa.length, 2);
  assert.equal(result.taxa.find(taxon => taxon.id === '1').prevalence, 2);
  assert.equal(result.edges[0].both, 1);
  assert.equal(result.edges[0].either, 3);
  assert.equal(result.edges[0].jaccard, 1 / 3);
});

test('orders strongest links, caps display, and handles no qualifying links', () => {
  const entries = [
    sample({ 1: 1, 2: 1, 3: 1 }), sample({ 1: 1, 2: 1 }),
    sample({ 1: 1, 2: 1, 3: 1 }), sample({ 1: 1, 3: 1 })
  ];
  const result = calculateCompareCooccurrence(entries, {
    ...options, minimumShared: 1, minimumJaccard: 0, maxLinks: 1
  });
  assert.equal(result.eligibleLinkCount, 3);
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].jaccard, 0.75);
  const empty = calculateCompareCooccurrence(entries, { ...options, minimumShared: 4 });
  assert.equal(empty.edges.length, 0);
  assert.equal(empty.taxa.length, 3);
});

test('rejects all-level rank and too few usable samples', () => {
  const entries = [sample({ 1: 1, 2: 1 }), sample({ 1: 1, 2: 1 })];
  assert.throws(() => calculateCompareCooccurrence(entries, options), /at least three/);
  assert.throws(() => calculateCompareCooccurrence(entries, { ...options, rank: 10 }), /single taxonomic rank/);
  assert.equal(compareCooccurrenceLabelPositions([{}, {}, {}, {}], 400, 300, 200).length, 4);
});
