const assert = require('node:assert/strict');
const test = require('node:test');
const { calculateOrdination, calculateDendrogram, calculateDistanceMatrix, taxonCountsAtRank } = require('./ordination');

function sample(name, a, b) {
  return { name, runId: 'run', tree: {
    ncbiID: 1, rank: 0, summedValue: a + b,
    children: [{ ncbiID: 2, rank: 1, summedValue: a + b, children: [
      { ncbiID: 10, rank: 7, summedValue: a, children: [{ ncbiID: 100, rank: 8, summedValue: a }] },
      { ncbiID: 20, rank: 7, summedValue: b, children: [{ ncbiID: 200, rank: 8, summedValue: b }] }
    ] }]
  } };
}

const samples = [sample('a', 10, 0), sample('b', 0, 10), sample('c', 5, 5)];

test('extracts one count per taxon at the chosen rank', () => {
  assert.deepEqual([...taxonCountsAtRank(samples[0].tree, 7)], [['10', 10]]);
  assert.deepEqual([...taxonCountsAtRank(samples[0].tree, 8)], [['100', 10]]);
});

test('Bray–Curtis uses relative abundances and produces ordination coordinates', () => {
  const result = calculateOrdination(samples, {
    rank: 7, method: 'brayCurtis', minimumPrevalence: 1
  });
  assert.equal(result.distances[0][1], 1);
  assert.equal(result.distances[0][2], 0.5);
  assert.equal(result.featureCount, 2);
  assert.equal(result.points.length, 3);
  assert.ok(result.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
});

test('distance heatmap uses the same pairwise distances and accepts identical profiles', () => {
  const options = { rank: 7, method: 'brayCurtis', minimumPrevalence: 1 };
  const matrix = calculateDistanceMatrix(samples, options);
  const ordination = calculateOrdination(samples, options);
  assert.deepEqual(matrix.distances, ordination.distances);
  assert.deepEqual(matrix.samples.map(item => item.name), ['a', 'b', 'c']);
  assert.equal(matrix.distances[0][1], matrix.distances[1][0]);
  const identical = calculateDistanceMatrix([sample('a', 5, 5), sample('b', 10, 10)], options);
  assert.deepEqual(identical.distances, [[0, 0], [0, 0]]);
});

test('CLR/Aitchison requires a pseudocount for zeros and uses log ratios', () => {
  assert.throws(() => calculateOrdination(samples, {
    rank: 7, method: 'aitchison', minimumPrevalence: 1, pseudocount: 0
  }), /positive pseudocount/);
  const result = calculateOrdination(samples, {
    rank: 7, method: 'aitchison', minimumPrevalence: 1, pseudocount: 0.5
  });
  assert.ok(result.distances[0][1] > result.distances[0][2]);
  assert.equal(result.pseudocount, 0.5);
});

test('UPGMA merges the closest samples and uses size-weighted mean distances', () => {
  const result = calculateDendrogram([sample('a', 10, 0), sample('b', 0, 10), sample('c', 7, 3)], {
    rank: 7, method: 'brayCurtis', minimumPrevalence: 1
  });
  assert.ok(Math.abs(result.tree.distance - 0.85) < 1e-12);
  assert.ok(Math.abs(result.tree.children[0].distance - 0.3) < 1e-12);
  assert.deepEqual(result.tree.children[0].children.map(node => node.name), ['a', 'c']);
  assert.equal(result.tree.children[1].name, 'b');
  assert.equal(result.sampleCount, 3);
});

test('UPGMA accepts two identical samples and does not apply PCoA correction', () => {
  const result = calculateDendrogram([sample('a', 5, 5), sample('b', 5, 5)], {
    rank: 7, method: 'brayCurtis', minimumPrevalence: 1
  });
  assert.equal(result.tree.distance, 0);
  assert.deepEqual(result.tree.children.map(node => node.name), ['a', 'b']);
});

test('rejects unusable sample or taxon selections', () => {
  assert.throws(() => calculateOrdination(samples.slice(0, 2), {
    rank: 7, method: 'brayCurtis', minimumPrevalence: 1
  }), /three samples/);
  assert.throws(() => calculateOrdination(samples, {
    rank: 7, method: 'brayCurtis', minimumPrevalence: 4
  }), /No taxa/);
  assert.throws(() => calculateOrdination(samples, {
    rank: 10, method: 'brayCurtis', minimumPrevalence: 1
  }), /single taxonomic rank/);
  assert.throws(() => calculateOrdination([sample('a', 10, 0), sample('b', 10, 0), sample('c', 5, 5)], {
    rank: 7, method: 'aitchison', minimumPrevalence: 2, pseudocount: 0.5
  }), /at least two retained taxa/);
});


test('sample relationships support 160 samples across all analyses and enforce the boundary consistently', () => {
  const options = { rank: 7, method: 'brayCurtis', minimumPrevalence: 1 };
  const largeSelection = Array.from({ length: 160 }, (_, index) =>
    sample('sample-' + index, index + 1, 161 - index));
  const ordination = calculateOrdination(largeSelection, options);
  assert.equal(ordination.sampleCount, 160);
  assert.equal(ordination.points.length, 160);
  assert.ok(ordination.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  const dendrogram = calculateDendrogram(largeSelection, options);
  assert.equal(dendrogram.sampleCount, 160);
  function leafCount(node) {
    return node.children ? node.children.reduce((total, child) => total + leafCount(child), 0) : 1;
  }
  assert.equal(leafCount(dendrogram.tree), 160);
  const matrix = calculateDistanceMatrix(largeSelection, options);
  assert.equal(matrix.sampleCount, 160);
  assert.equal(matrix.distances.length, 160);
  assert.ok(matrix.distances.every(row => row.length === 160));
  const tooMany = largeSelection.concat(sample('sample-161', 50, 50));
  for (const calculate of [calculateOrdination, calculateDendrogram, calculateDistanceMatrix]) {
    assert.throws(() => calculate(tooMany, options), /no more than 160 samples/);
  }
});
