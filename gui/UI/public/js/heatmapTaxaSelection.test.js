const assert = require('node:assert/strict');
const test = require('node:test');
const { parseTaxonIds, buildSampleCells, resolveColourThresholds } = require('./heatmapTaxaSelection');

test('parses exact, ordered taxon IDs without duplicates', () => {
  assert.deepEqual(parseTaxonIds('562, 2\n562; 4751'), {
    ids: ['562', '2', '4751'],
    invalid: []
  });
  assert.deepEqual(parseTaxonIds('2a, 20'), { ids: ['20'], invalid: ['2a'] });
});

test('uses descendant sums and the chosen percent denominator', () => {
  const tree = {
    ncbiID: 1, summedValue: 10000, children: [
      { ncbiID: 2, name: 'Bacteria', summedValue: 1000, children: [
        { ncbiID: 562, name: 'Escherichia coli', ncbiRank: 'species',
          value: 10, summedValue: 10, children: [] }
      ] }
    ]
  };
  const result = buildSampleCells(tree, ['2', '562', '999'], '2', 0.005);
  assert.equal(result.cells['2'].value, 1000);
  assert.equal(result.cells['562'].value, 10);
  assert.equal(result.cells['562'].proportion, 0.01);
  assert.equal(result.cells['999'].value, 0);
  assert.equal(result.missingDenominator, false);

  const thresholded = buildSampleCells(tree, ['562'], '2', 0.2);
  assert.equal(thresholded.cells['562'].value, 0);
  assert.equal(buildSampleCells(tree, ['562'], '4751', 0).missingDenominator, true);
});

test('resolves traffic lights colour thresholds in percentage or count units', () => {
  assert.deepEqual(
    resolveColourThresholds({ low: '', mid: '', high: '' }, 0.001, 0.1, true).domain,
    [0.001, 0.0505, 0.1]
  );
  assert.deepEqual(
    resolveColourThresholds({ low: '0.1', mid: '1', high: '10' }, 0.001, 0.1, true).domain,
    [0.001, 0.01, 0.1]
  );
  assert.deepEqual(
    resolveColourThresholds({ low: '10', mid: '100', high: '1000' }, 1, 500, false).domain,
    [10, 100, 1000]
  );
  assert.match(
    resolveColourThresholds({ low: '10', mid: '5', high: '20' }, 1, 100, false).error,
    /increasing order/
  );
  assert.deepEqual(
    resolveColourThresholds({ low: '', mid: '', high: '' }, Infinity, 0, true).domain,
    [0, 0.005, 0.01]
  );
});
