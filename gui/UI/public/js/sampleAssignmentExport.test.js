const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSampleAssignmentExport, serializeDelimitedRows } = require('./sampleAssignmentExport');

function tree(speciesCount) {
  return { tree: { tree: {
    name: 'root', ncbiID: 1, rank: 0, ncbiRank: 'no rank', value: 1,
    summedValue: speciesCount + 10, children: [
      { name: 'Bacteria', ncbiID: 2, rank: 1, ncbiRank: 'domain', value: 2,
        summedValue: speciesCount + 5, children: [
          { name: 'Example genus', ncbiID: 10, rank: 7, ncbiRank: 'genus', value: 3,
            summedValue: speciesCount + 3, children: [
              { name: 'Example species', ncbiID: 11, rank: 8, ncbiRank: 'species',
                value: speciesCount, summedValue: speciesCount }
            ] }
        ] },
      { name: 'unclassified', ncbiID: 0, rank: 0, ncbiRank: 'no rank', value: 4, summedValue: 4 }
    ]
  } } };
}

const samples = [
  { id: 'Same display name', pathRun: 'run1', pathName: 'folderA', barcode: 0 },
  { id: 'Same display name', pathRun: 'run2', pathName: 'folderB', barcode: 27 }
];
const responses = [
  { id: 'folderA', runId: 'run1', ...tree(20) },
  { id: 'folderB', runId: 'run2', ...tree(30) }
];
const options = {
  rankNum: 8, rankScope: 'through_rank', includeUnclassified: true,
  lineageIds: true, lineageNames: true, delimiter: ',',
  columns: { name: true, ncbiId: true, ncbiRank: true, rankNumber: true,
    readCount: true, summedCount: true }
};

test('multi-sample export includes sample identity, ancestors, and both lineage forms', () => {
  const result = buildSampleAssignmentExport(samples, responses, options);
  assert.equal(result.rowCount, 10);
  assert.deepEqual(result.missingSamples, []);
  const lines = result.text.split('\n').map(line => line.split(','));
  const header = lines[0];
  assert.deepEqual(header.slice(0, 3), ['Sample ID', 'Run ID', 'Barcode']);
  assert.equal(header.length, 25);
  const species = lines.find(row => row[1] === 'run2' && row[4] === '11');
  assert.deepEqual(species.slice(0, 3), ['Same display name', 'run2', '27']);
  assert.equal(species[header.indexOf('Direct read count')], '30');
  assert.equal(species[header.indexOf('Domain')], '2');
  assert.equal(species[header.indexOf('Genus')], '10');
  assert.equal(species[header.indexOf('Species')], '11');
  assert.equal(species[header.indexOf('Domain_name')], 'Bacteria');
  assert.equal(species[header.indexOf('Species_name')], 'Example species');
  assert.equal(species[header.indexOf('Kingdom')], '');
});

test('rank-only mode and lineage switches control rows and columns', () => {
  const result = buildSampleAssignmentExport(samples, responses, {
    ...options, rankScope: 'rank_only', includeUnclassified: false,
    lineageIds: false, lineageNames: false
  });
  assert.equal(result.rowCount, 2);
  const lines = result.text.split('\n');
  assert.equal(lines[0].split(',').length, 9);
  assert.ok(lines.every(line => !line.includes('unclassified')));
  assert.ok(lines.slice(1).every(line => line.includes('Example species')));
});

test('missing tree is reported rather than presented as zero counts', () => {
  const result = buildSampleAssignmentExport(samples, responses.slice(0, 1), options);
  assert.deepEqual(result.missingSamples, [
    { sampleId: 'Same display name', runId: 'run2', directory: 'folderB' }
  ]);
});

test('delimited writer quotes separators, quotes and line breaks', () => {
  assert.equal(serializeDelimitedRows([['Taxon, "A"\nline 2', '42']], ','),
    '"Taxon, ""A""\nline 2",42');
  assert.equal(serializeDelimitedRows([['A\tB', '42']], '\\t'), '"A\tB"\t42');
  assert.equal(serializeDelimitedRows([['A;B', '42']], ';'), '"A;B";42');
  assert.equal(serializeDelimitedRows([['A:B', '42']], ':'), '"A:B":42');
});
