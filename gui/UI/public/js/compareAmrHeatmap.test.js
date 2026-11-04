const test = require('node:test');
const assert = require('node:assert/strict');
const { rankedAmrHmRows, amrHmCsv } = require('./compareAmrHeatmap');

test('AMR heatmap rows use selected-sample abundance and a stable tie break', () => {
  const labels = ['Other', 'Beta', 'Alpha', 'Gamma'];
  const samples = [{ Other: { proportion: 0.9 } }];
  const references = [
    { category: 'Alpha', values: [{ proportion: 0.2 }] },
    { category: 'Beta', values: [{ proportion: 0.2 }] },
    { category: 'Gamma', values: [{ proportion: 0.1 }] }
  ];
  assert.deepEqual(rankedAmrHmRows(labels, samples, references, 3), ['Alpha', 'Beta', 'Gamma']);
  assert.deepEqual(rankedAmrHmRows(labels, samples, references, 4), ['Alpha', 'Beta', 'Gamma', 'Other']);
  assert.deepEqual(labels, ['Other', 'Beta', 'Alpha', 'Gamma']);
});

test('AMR heatmap CSV uses visible rows and current units with quoted labels', () => {
  const samples = [{
    sample: 'Sample, "A"', runId: 'run,1',
    taxa: [
      { name: 'Gene, A', taxaReadCount: 3, proportion: 0.25 },
      { name: 'Gene B', taxaReadCount: 9, proportion: 0.75 }
    ]
  }];
  assert.equal(amrHmCsv(samples, ['Gene, A'], true),
    '"AMR category","Sample, ""A"" (run,1) AMR hit %"\r\n"Gene, A","25"');
  assert.equal(amrHmCsv(samples, ['Gene B'], false),
    '"AMR category","Sample, ""A"" (run,1) AMR hit count"\r\n"Gene B","9"');
  assert.equal(amrHmCsv(samples, ['Gene B'], false, () => 'Renamed sample'),
    '"AMR category","Renamed sample (run,1) AMR hit count"\r\n"Gene B","9"');
});
