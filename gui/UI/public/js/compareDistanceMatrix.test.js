const test = require('node:test');
const assert = require('node:assert/strict');
const { compareDistanceMatrixOrder, compareDistanceMatrixColour } = require('./compareDistanceMatrix');

test('distance matrix follows the Samples card order on both axes', () => {
  const result = {
    samples: [
      { runId: 'r1', name: 'same' },
      { runId: 'r2', name: 'same' },
      { runId: 'r1', name: 'third' }
    ],
    distances: [[0, 1, 2], [1, 0, 3], [2, 3, 0]]
  };
  const ordered = compareDistanceMatrixOrder(result, [
    JSON.stringify(['r1', 'third']), JSON.stringify(['r2', 'same']), JSON.stringify(['r1', 'same'])
  ]);
  assert.deepEqual(ordered.samples.map(sample => [sample.runId, sample.name]),
    [['r1', 'third'], ['r2', 'same'], ['r1', 'same']]);
  assert.deepEqual(ordered.distances, [[0, 3, 2], [3, 0, 1], [2, 1, 0]]);
  assert.deepEqual(result.distances, [[0, 1, 2], [1, 0, 3], [2, 3, 0]]);
});

test('distance colours keep zero dark and larger distances pale', () => {
  assert.equal(compareDistanceMatrixColour(0, 1), 'rgb(8,81,156)');
  assert.equal(compareDistanceMatrixColour(1, 1), 'rgb(247,251,255)');
});
