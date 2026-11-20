const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const d3 = require('./d3.v3.min.js');

const context = vm.createContext({
  compareSampleGroupValue: (run, sample) => ({ 'run/A1': 'Site A', 'run/A2': 'Site A' })[run + '/' + sample] || '',
  compareSampleMetadataGroup: (sample, field) => field === 'location' ? sample.metadatafile.locationName :
    field === 'date' ? sample.metadatafile.sampleDate : ''
});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'compareTaxonTrends.js'), 'utf8'), context);

test('the default broad preset uses the same taxonomic IDs as UpSet', () => {
  const preset = context.compareTaxonTrendsBroadPreset;
  assert.equal(preset.denominatorTaxonId, '1');
  assert.equal(preset.minimumRootPercent, 0);
  assert.deepEqual(Array.from(preset.taxa, taxon => [taxon.id, taxon.name]), [
    ['2', 'Bacteria'], ['2157', 'Archaea'], ['4751', 'Fungi'],
    ['33090', 'Plants'], ['33208', 'Animals'], ['10239', 'Viruses']
  ]);
  const html = fs.readFileSync(path.join(__dirname, '../compare.html'), 'utf8');
  assert.match(html, /id="compareTaxonTrendsSelection"[^>]*><option value="broad_taxonomic_groups" selected>/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, 'compareTaxonTrends.js'), 'utf8'), /heatmapTaxaPresets\.json/);
});

test('tooltip placement flips beside and above the pointer at viewport edges', () => {
  const source = fs.readFileSync(path.join(__dirname, 'universal.js'), 'utf8');
  const start = source.indexOf('function tooltipPositionAroundCursor(');
  const end = source.indexOf('\nfunction isEmpty(', start);
  assert.ok(start > 0 && end > start);
  const placement = vm.createContext({ window: { innerWidth: 800, innerHeight: 600 } });
  vm.runInContext(source.slice(start, end), placement);
  const position = (x, y) => placement.tooltipPositionAroundCursor({ clientX: x, clientY: y }, 250, 150);
  assert.deepEqual({ ...position(100, 100) }, { left: 112, top: 112 });
  assert.deepEqual({ ...position(790, 590) }, { left: 528, top: 428 });
  assert.deepEqual({ ...position(5, 5) }, { left: 17, top: 17 });
});

test('line series can use a stable group or location without changing assigned groups', () => {
  const sample = { pathRun: 'run', pathName: 'A1', metadatafile: { locationName: 'Bowermans' } };
  assert.equal(context.compareTaxonTrendsSeries(sample, 'group'), 'Site A');
  assert.equal(context.compareTaxonTrendsSeries(sample, 'location'), 'Bowermans');
  assert.equal(context.compareTaxonTrendsSeries(sample, 'all'), 'All samples');
});

test('date is available by default only when every selected sample has a valid date', () => {
  const sample = date => ({ metadatafile: { sampleDate: date } });
  assert.equal(context.compareTaxonTrendsHasDates([sample('2026-04-13'), sample('2026-04-20')]), true);
  assert.equal(context.compareTaxonTrendsHasDates([sample('2026-04-13'), sample('')]), false);
  assert.equal(context.compareTaxonTrendsHasDates([sample('2026-02-30')]), false);
  assert.equal(context.compareTaxonTrendsHasDates([]), false);
});

test('assigned groups are the default series when any selected sample has one', () => {
  const samples = [{ pathRun: 'run', pathName: 'A1' }, { pathRun: 'run', pathName: 'A2' }];
  const group = (run, name) => ({ A1: 'Site A', A2: 'Site A' })[name] || '';
  assert.equal(context.compareTaxonTrendsHasAssignedGroups(samples, group), true);
  assert.equal(context.compareTaxonTrendsHasAssignedGroups(samples, (run, name) => name === 'A1' ? 'Site A' : ''), true);
  assert.equal(context.compareTaxonTrendsHasAssignedGroups(samples, () => ''), false);
  assert.equal(context.compareTaxonTrendsHasAssignedGroups([], group), false);
});

test('x-axis labels become sparser when the trend plot is narrow', () => {
  assert.equal(context.compareTaxonTrendsTickLimit(400, false), 5);
  assert.equal(context.compareTaxonTrendsTickLimit(400, true), 4);
  assert.equal(context.compareTaxonTrendsTickLimit(1500, false), 18);
  assert.equal(context.compareTaxonTrendsTickLimit(1500, true), 8);
});

test('percentage axes name the denominator and distinguish analysed from classified reads', () => {
  assert.equal(context.compareTaxonTrendsDenominatorLabel('1', 'root', 'reads'), 'analysed reads');
  assert.equal(context.compareTaxonTrendsDenominatorLabel('1', 'root', 'bases'), 'analysed bases');
  assert.equal(context.compareTaxonTrendsDenominatorLabel('2', 'Bacteria', 'reads'), 'Bacteria reads');
  assert.equal(context.compareTaxonTrendsDenominatorLabel('4751', 'Fungi', 'bases'), 'Fungi bases');
  assert.equal(context.compareTaxonTrendsDenominatorLabel('999', '', 'reads'), 'NCBI taxon 999 reads');
});

test('consistent NorfolkSeq replicate labels form two date lines', () => {
  const members = ['2024-07-25', '2024-10-17', '2025-01-16'].flatMap((date, visit) => [1, 2].map((replicate) => ({
    date, index: visit * 2 + replicate, location: 'City Centre',
    sampleId: `CityCentre${replicate}_${visit}`
  })));
  const tracks = context.compareTaxonTrendsLineTracks(members, true);
  assert.deepEqual(Array.from(tracks, track => [track.id, Array.from(track.rows, row => row.index)]), [
    ['1', [1, 3, 5]], ['2', [2, 4, 6]]
  ]);
  assert.equal(members.length, 6);
});

test('ambiguous sample names do not create replicate lines', () => {
  const members = [
    { date: '2026-04-13', index: 0, location: 'City Centre', sampleId: 'CityCentre1_a' },
    { date: '2026-04-13', index: 1, location: 'City Centre', sampleId: 'CityCentre2_a' },
    { date: '2026-04-20', index: 2, location: 'City Centre', sampleId: 'Other1_b' },
    { date: '2026-04-20', index: 3, location: 'City Centre', sampleId: 'Other2_b' }
  ];
  assert.deepEqual(Array.from(context.compareTaxonTrendsLineTracks(members, true), track => track.rows.length), [0]);
  assert.deepEqual(Array.from(context.compareTaxonTrendsLineTracks(members, false), track => track.rows.length), [4]);
});

test('nearby tooltip points stay within one taxon panel and put the hovered sample first', () => {
  const points = [
    { index: 0, x: 20, y: 30 },
    { index: 1, x: 20, y: 30 },
    { index: 2, x: 27, y: 31 },
    { index: 3, x: 30, y: 30 }
  ];
  const x = point => point.x;
  const y = point => point.y;
  assert.deepEqual(Array.from(context.compareTaxonTrendsNearbyPoints(points, points[1], x, y), point => point.index), [1, 0, 2]);
  assert.deepEqual(Array.from(context.compareTaxonTrendsNearbyPoints(points, points[0], x, y), point => point.index), [0, 1, 2]);
});

test('trend line styles match accumulation options and produce distinct SVG paths', () => {
  const html = fs.readFileSync(path.join(__dirname, '../compare.html'), 'utf8');
  for (const value of ['linear', 'step-after', 'monotone']) {
    assert.match(html, new RegExp(`<option value="${value}">`));
  }
  const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
  const paths = ['linear', 'step-after', 'monotone'].map(style =>
    d3.svg.line().interpolate(style).x(point => point.x).y(point => point.y)(points));
  assert.equal(new Set(paths).size, 3);
});

test('the shipped D3 version supports the trend plot scales, axes and lines', () => {
  assert.equal(d3.version, '3.5.17');
  const samples = d3.scale.ordinal().domain([0, 1]).rangePoints([0, 100], 0.35);
  const dates = d3.time.scale.utc().domain([new Date('2026-04-13T00:00:00Z'), new Date('2026-04-20T00:00:00Z')])
    .range([0, 100]);
  assert.ok(Number.isFinite(samples(0)));
  assert.equal(dates(new Date('2026-04-20T00:00:00Z')), 100);
  assert.equal(typeof d3.svg.axis().scale(dates).orient('bottom'), 'function');
  assert.equal(d3.svg.line().x(point => point.x).y(point => point.y)([{ x: 0, y: 1 }, { x: 2, y: 3 }]), 'M0,1L2,3');
});
