const assert = require('node:assert/strict');
const test = require('node:test');
const { sampleHasTaxon } = require('./taxonFilter');

test('matches an exact taxon ID when only descendants have reads', () => {
  const tree = {
    ncbiID: 1,
    summedValue: 5,
    children: [{
      ncbiID: 2,
      value: 0,
      summedValue: 5,
      children: [{ ncbiID: 562, value: 5, summedValue: 5, children: [] }]
    }]
  };

  assert.equal(sampleHasTaxon(tree, '2'), true);
  assert.equal(sampleHasTaxon(tree, '562'), true);
  assert.equal(sampleHasTaxon(tree, '56'), false);
});

test('does not match taxa without assigned reads or nonnumeric input', () => {
  const tree = { ncbiID: 2, summedValue: 0, children: [] };
  assert.equal(sampleHasTaxon(tree, '2'), false);
  assert.equal(sampleHasTaxon(tree, 'abc2'), false);
  assert.equal(sampleHasTaxon(null, '2'), false);
});
