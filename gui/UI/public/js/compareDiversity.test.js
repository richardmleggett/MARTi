const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compareDiversitySortRecords, compareDiversitySortPlotRows,
  compareDiversityNumericCompare, compareDiversityTableCell
} = require('./compareDiversity');

test('diversity records follow the Samples card even when display names match', () => {
  const records = [
    { metadata: { id: 'Same name', runId: 'Run 1', pathName: 'sample-a', pathRun: 'run-1' } },
    { metadata: { id: 'Same name', runId: 'Run 1', pathName: 'sample-b', pathRun: 'run-1' } },
    { metadata: { id: 'Other', runId: 'Run 2', pathName: 'sample-c', pathRun: 'run-2' } }
  ];
  const displayed = [
    { pathName: 'sample-b', pathRun: 'run-1' },
    { pathName: 'sample-c', pathRun: 'run-2' },
    { pathName: 'sample-a', pathRun: 'run-1' }
  ];
  assert.deepEqual(compareDiversitySortRecords(records, displayed).map(record => record.metadata.pathName),
    ['sample-b', 'sample-c', 'sample-a']);
});

test('plot order follows metric values while keeping missing values last and ties in sample order', () => {
  const rows = [
    { record: 'A', value: 2 },
    { record: 'B', value: null },
    { record: 'C', value: 5 },
    { record: 'D', value: 2 },
    { record: 'E', value: NaN }
  ];
  const names = ordered => ordered.map(row => row.record);
  assert.deepEqual(names(compareDiversitySortPlotRows(rows, 'sample')), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(names(compareDiversitySortPlotRows(rows, 'descending')), ['C', 'A', 'D', 'B', 'E']);
  assert.deepEqual(names(compareDiversitySortPlotRows(rows, 'ascending')), ['A', 'D', 'C', 'B', 'E']);
  assert.deepEqual(names(rows), ['A', 'B', 'C', 'D', 'E']);
});

test('table cells display rounded values but sort by full numeric values', () => {
  const low = compareDiversityTableCell(2.0004, 3);
  const high = compareDiversityTableCell(2.0005, 3);
  assert.equal(low.display, '2.000');
  assert.equal(low.sort, 2.0004);
  assert.equal(compareDiversityNumericCompare(low.sort, high.sort, false), -1);
  assert.equal(compareDiversityNumericCompare(low.sort, high.sort, true), 1);
  assert.equal(compareDiversityNumericCompare(10, 2, false), 1);
  assert.equal(compareDiversityNumericCompare(10, 2, true), -1);
  const missing = compareDiversityTableCell(null, 3);
  assert.equal(missing.display, '—');
  assert.equal(compareDiversityNumericCompare(missing.sort, low.sort, false), 1);
  assert.equal(compareDiversityNumericCompare(missing.sort, low.sort, true), 1);
});
