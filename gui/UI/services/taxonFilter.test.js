const assert = require('node:assert/strict');
const test = require('node:test');
const { sampleHasTaxon, suggestTaxa } = require('./taxonFilter');

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

test('name suggestions keep distinct taxon IDs and require assigned descendants', () => {
  const first = { ncbiID: 1, name: 'root', summedValue: 9, children: [
    { ncbiID: 562, name: 'Escherichia coli', ncbiRank: 'species', summedValue: 8 },
    { ncbiID: 999, name: 'Escherichia coli', ncbiRank: 'species', summedValue: 1 },
    { ncbiID: 1000, name: 'Escherichia empty', ncbiRank: 'species', summedValue: 0 }
  ] };
  const second = { ncbiID: 1, name: 'root', summedValue: 2, children: [
    { ncbiID: 562, name: 'Escherichia coli', ncbiRank: 'species', summedValue: 2 }
  ] };
  assert.deepEqual(suggestTaxa([first, second], 'eScHeRiChIa').map(taxon => taxon.id), ['562', '999']);
  assert.equal(suggestTaxa([first], 'coli')[0].rank, 'species');
  assert.deepEqual(suggestTaxa([first], 'e'), []);
});
