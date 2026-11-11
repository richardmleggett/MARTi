const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compareDiversitySortRecords, compareDiversitySortPlotRows,
  compareDiversityNumericCompare, compareDiversityTableCell,
  compareDiversityGroupRows, compareDiversityGroupCsv
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

test('group view averages sample metrics, shows observed range, and leaves ungrouped samples separate', () => {
  const points = [
    { record: { metadata: { pathRun: 'r1', pathName: 'a', runId: 'r1', id: 'A' } }, value: 4 },
    { record: { metadata: { pathRun: 'r1', pathName: 'b', runId: 'r1', id: 'B' } }, value: 8 },
    { record: { metadata: { pathRun: 'r2', pathName: 'c', runId: 'r2', id: 'C' } }, value: 15 },
    { record: { metadata: { pathRun: 'r2', pathName: 'd', runId: 'r2', id: 'D' } }, value: null },
    { record: { metadata: { pathRun: 'r2', pathName: 'e', runId: 'r2', id: 'E' } }, value: 20 }
  ];
  const group = (run, sample) => ({ a: 'River', b: 'River', c: '', d: 'River', e: 'NEC' })[sample];
  const rows = compareDiversityGroupRows(points, group, metadata => metadata.id);
  assert.deepEqual(rows.map(row => row.label), ['River', 'Ungrouped · C', 'NEC']);
  assert.deepEqual([rows[0].value, rows[0].minimum, rows[0].maximum], [6, 4, 8]);
  assert.equal(rows[0].members.length, 3);
  assert.equal(rows[0].validMembers.length, 2);
  assert.deepEqual([rows[1].value, rows[1].minimum, rows[1].maximum], [15, 15, 15]);
  assert.deepEqual(compareDiversitySortPlotRows(rows, 'descending').map(row => row.label),
    ['NEC', 'Ungrouped · C', 'River']);
});

test('group summary CSV uses displayed group order and quotes names', () => {
  const rows = compareDiversityGroupRows([
    { record: { metadata: { pathRun: 'r', pathName: 'a', runId: 'r', id: 'A' } }, value: 2 },
    { record: { metadata: { pathRun: 'r', pathName: 'b', runId: 'r', id: 'B' } }, value: 4 }
  ], () => 'River, "one"', metadata => metadata.id);
  const csv = compareDiversityGroupCsv(rows, { label: 'Taxa (S)' }, 'Species', 0.005, 'reads', '');
  assert.match(csv, /"River, ""one""","Group","2","2","3","2","4"/);
  assert.match(csv, /"Species","0.005","reads"/);
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
