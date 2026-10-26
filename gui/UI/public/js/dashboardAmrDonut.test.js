const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadDonutContext() {
  const context = vm.createContext({
    d3: { layout: { pie: () => ({ value() { return this; } }) } },
    dashboardAmrTableChunkSelected: 1
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'dashboardAmrDonut.js'), 'utf8'), context);
  return context;
}

test('putative host counts keep equal names with different NCBI IDs separate', () => {
  const context = loadDonutContext();
  const result = vm.runInContext(`consolidateAmrHostCounts(returnTaxaSeperateCounts([
    { ncbiID: 11, name: 'Same name', chunkCounts: { 1: 3 } },
    { ncbiID: 22, name: 'Same name', chunkCounts: { 1: 5 } },
    { ncbiID: 11, name: 'Renamed taxon', chunkCounts: { 1: 2 } }
  ]), 10)`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { taxonKey: 'id:11', label: 'Same name (NCBI 11)', value: 5 },
    { taxonKey: 'id:22', label: 'Same name (NCBI 22)', value: 5 }
  ]);
});

test('top N groups remaining hosts as Other and old name-only AMR data still works', () => {
  const context = loadDonutContext();
  const result = vm.runInContext(`consolidateAmrHostCounts(returnTaxaSeperateCounts({
    'Host A': { 1: 8 }, 'Host B': { 1: 3 }, 'Host C': { 1: 2 }
  }), 1)`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { taxonKey: 'name:Host A', label: 'Host A', value: 8 },
    { taxonKey: 'other', label: 'Other', value: 5 }
  ]);
});
