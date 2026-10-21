const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeHeatmapTaxaPresets } = require('./heatmapTaxaPresets');

const example = {
  id: 'rvc_bacteria', name: 'RVC – Bacteria', denominatorTaxonId: '2',
  minimumRootPercent: 0.005,
  taxa: [{ id: '497', name: 'Psychrobacter' }, { id: '286', name: 'Pseudomonas' }]
};

test('accepts an empty list and normalizes valid project presets', () => {
  assert.deepEqual(normalizeHeatmapTaxaPresets([]), []);
  assert.deepEqual(normalizeHeatmapTaxaPresets([example]), [example]);
});

test('rejects ambiguous or malformed project presets', () => {
  assert.throws(() => normalizeHeatmapTaxaPresets({}), /array/);
  assert.throws(() => normalizeHeatmapTaxaPresets([{ ...example, id: 'custom' }]), /unique ID/);
  assert.throws(() => normalizeHeatmapTaxaPresets([example, example]), /unique ID/);
  assert.throws(() => normalizeHeatmapTaxaPresets([{ ...example, minimumRootPercent: -1 }]), /minimumRootPercent/);
  assert.throws(() => normalizeHeatmapTaxaPresets([{ ...example, taxa: [{ id: '497', name: 'Psychrobacter' }, { id: '497', name: 'Psychrobacter' }] }]), /duplicate ID/);
});
