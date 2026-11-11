const test = require('node:test');
const assert = require('node:assert/strict');
global.d3 = {
  scale: { linear: () => ({ range() { return this; } }) },
  svg: { axis: () => ({ scale() { return this; }, ticks() { return this; }, orient() { return this; } }) }
};
const { accumulationGroupColours } = require('./rarefactionCompare');

test('accumulation curves share group colours across runs and keep ungrouped distinct', () => {
  const samples = [
    { runId: 'run-2', pathName: 'a' },
    { runId: 'run-1', pathName: 'a' },
    { runId: 'run-1', pathName: 'b' },
    { runId: 'run-3', pathName: 'c' }
  ];
  const groups = { 'run-2/a': 'NEC', 'run-1/a': 'Healthy', 'run-1/b': 'NEC' };
  const groupValue = (run, sample) => groups[run + '/' + sample] || '';
  const colour = accumulationGroupColours(samples, groupValue, ['blue', 'orange']);
  assert.equal(colour(samples[0]), colour(samples[2]));
  assert.notEqual(colour(samples[0]), colour(samples[1]));
  assert.equal(colour(samples[3]), '#858796');
});
