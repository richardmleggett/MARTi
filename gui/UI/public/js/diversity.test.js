const test = require('node:test');
const assert = require('node:assert/strict');
const {
  martiTreeDiversity, martiRarefiedRichness, martiChunkDiversitySeries
} = require('./diversity');

const tree = {
  name: 'root', rank: 0, summedValue: 9, children: [
    { name: 'genus A', rank: 7, summedValue: 6, children: [
      { name: 'species A1', rank: 8, summedValue: 4 },
      { name: 'species A2', rank: 8, summedValue: 2 }
    ] },
    { name: 'genus B', rank: 7, summedValue: 3 },
    { name: 'unclassified', rank: 0, summedValue: 1 }
  ]
};

test('rank counts include a lineage stopping above species and exclude unclassified', () => {
  const genus = martiTreeDiversity(tree, 7);
  const species = martiTreeDiversity(tree, 8);
  assert.deepEqual(genus.counts, [6, 3]);
  assert.deepEqual(species.counts, [4, 2, 3]);
  assert.equal(species.N, 9);
  assert.equal(species.S, 3);
  assert.equal(species.chao1, 3);
  assert.equal(martiTreeDiversity(tree, 8, { chao1Valid: false }).chao1, null);
});

test('read and basepair trees give different N and weighted diversity', () => {
  const baseTree = {
    name: 'root', rank: 0, summedValue: 11, summedYield: 20000, children: [
      { name: 'species A', rank: 8, summedValue: 1, summedYield: 10000 },
      { name: 'species B', rank: 8, summedValue: 10, summedYield: 10000 }
    ]
  };
  const readTree = {
    name: 'root', rank: 0, summedValue: 11, children: [
      { name: 'species A', rank: 8, summedValue: 1 },
      { name: 'species B', rank: 8, summedValue: 10 }
    ]
  };
  const reads = martiTreeDiversity(readTree, 8, { chao1Valid: false });
  const bases = martiTreeDiversity(baseTree, 8, { chao1Valid: false, useYield: true });
  assert.equal(reads.N, 11);
  assert.equal(bases.N, 20000);
  assert.ok(bases.shannon > reads.shannon);
  assert.equal(bases.chao1, null);
});

test('rarefied richness is bounded by depth and sample richness', () => {
  assert.equal(martiRarefiedRichness([4, 2, 3], 9), 3);
  assert.ok(Math.abs(martiRarefiedRichness([4, 2, 3], 1) - 1) < 1e-10);
  const middle = martiRarefiedRichness([4, 2, 3], 5);
  assert.ok(middle > 1 && middle < 3);
});

test('historical series use engine points and omit undefined metrics', () => {
  const rankData = { diversity: [
    { readsAnalysed: 10, mins: 2, reads: { shannon: 0.4, chao1: null }, bases: { shannon: 0.2 } },
    { readsAnalysed: 20, mins: 4, reads: { shannon: 0.6, chao1: 3 }, bases: { shannon: 0.3 } }
  ] };
  assert.deepEqual(martiChunkDiversitySeries(rankData, 'shannon', 'reads', 'time'), [[2, 0.4], [4, 0.6]]);
  assert.deepEqual(martiChunkDiversitySeries(rankData, 'shannon', 'bases', 'reads'), [[10, 0.2], [20, 0.3]]);
  assert.deepEqual(martiChunkDiversitySeries(rankData, 'chao1', 'reads', 'reads'), [[20, 3]]);
  assert.deepEqual(martiChunkDiversitySeries({ reads: [[10, 2]] }, 'shannon', 'reads', 'reads'), []);
});
