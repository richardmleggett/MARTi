const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProjectSampleGroups } = require('./projectSampleGroups');

test('project sample groups use exact run and sample IDs', () => {
  assert.deepEqual(normalizeProjectSampleGroups([
    { runId: ' run-1 ', sampleId: ' barcode01 ', group: ' Control ' },
    { runId: 'run-2', sampleId: 'barcode01', group: 'Treatment' }
  ]), [
    { runId: 'run-1', sampleId: 'barcode01', group: 'Control' },
    { runId: 'run-2', sampleId: 'barcode01', group: 'Treatment' }
  ]);
  assert.throws(() => normalizeProjectSampleGroups([
    { runId: 'run-1', sampleId: 'barcode01', group: 'Control' },
    { runId: 'run-1', sampleId: 'barcode01', group: 'Treatment' }
  ]), /Duplicate/);
  assert.throws(() => normalizeProjectSampleGroups([{ runId: 'run-1', sampleId: 'barcode01' }]), /needs runId/);
});
