const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('Samples group edits recolour PCoA and UPGMA without recalculating either analysis', () => {
  const key = 'martiCompareOrdinationGroups:project-a';
  const saved = new Map([[key, JSON.stringify({ '["run-1","path-a"]': 'Control' })]]);
  let renders = 0;
  let dendrogramRenders = 0;
  const element = {
    empty() { return this; },
    val() { return this; },
    appendTo() { return this; },
    text() { return this; }
  };
  const context = vm.createContext({
    clientProject: 'project-a',
    localStorage: {
      getItem: key => saved.get(key) || null,
      setItem: (key, value) => saved.set(key, value)
    },
    $: selector => selector === '#compareOrdinationColourBy'
      ? { val: () => 'manual' } : element
  });
  for (const file of ['compareViews.js', 'compareOrdination.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
  }
  context.renderCompareOrdination = () => { renders++; };
  context.renderCompareDendrogram = () => { dendrogramRenders++; };
  context.requestCompareOrdination = () => { throw new Error('Group edits must not recalculate coordinates'); };
  context.requestCompareDendrogram = () => { throw new Error('Group edits must not recalculate clustering'); };

  vm.runInContext('compareSampleGroupsLoad()', context);
  assert.equal(vm.runInContext('compareOrdinationGroup({ runId: "run-1", name: "path-a" })', context), 'Control');

  vm.runInContext('setCompareSampleGroup("run-2", "path-b", "Treatment")', context);
  assert.equal(vm.runInContext('compareOrdinationGroup({ runId: "run-2", name: "path-b" })', context), 'Treatment');
  assert.equal(renders, 1);
  assert.equal(dendrogramRenders, 1);
  assert.equal(JSON.parse(saved.get(key))['["run-1","path-a"]'], 'Control');
  assert.equal(JSON.parse(saved.get(key))['["run-2","path-b"]'], 'Treatment');

  vm.runInContext('setCompareSampleGroup("run-2", "path-b", "")', context);
  assert.equal(vm.runInContext('compareOrdinationGroup({ runId: "run-2", name: "path-b" })', context), 'Ungrouped');
  assert.equal(dendrogramRenders, 2);
  assert.equal(JSON.parse(saved.get(key))['["run-2","path-b"]'], undefined);
});

test('manual sample order is saved per project and survives renamed or temporarily deselected samples', () => {
  const saved = new Map();
  const context = vm.createContext({
    clientProject: 'project-a',
    localStorage: {
      getItem: key => saved.get(key) || null,
      setItem: (key, value) => saved.set(key, value)
    },
    $: () => ({ text() { return this; } })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'compareViews.js'), 'utf8'), context);
  const key = 'martiCompareSampleOrder:project-a';

  vm.runInContext('compareSampleOrderSave([["run", "path-a"], ["run", "path-b"], ["run", "path-c"]])', context);
  assert.deepEqual(JSON.parse(saved.get(key)), [['run', 'path-a'], ['run', 'path-b'], ['run', 'path-c']]);
  vm.runInContext('compareSampleOrderSave([["run", "path-c"], ["run", "path-a"]])', context);
  assert.deepEqual(JSON.parse(saved.get(key)), [['run', 'path-c'], ['run', 'path-b'], ['run', 'path-a']]);

  vm.runInContext('manualSortCompareSamplePaths = []; compareSampleOrderLoad()', context);
  const sorted = vm.runInContext(`compareSampleOrderSort([
    { id: 'Renamed A', pathRun: 'run', pathName: 'path-a' },
    { id: 'New D', pathRun: 'run', pathName: 'path-d' },
    { id: 'B', pathRun: 'run', pathName: 'path-b' },
    { id: 'C', pathRun: 'run', pathName: 'path-c' }
  ]).map(sample => sample.pathName)`, context);
  assert.deepEqual(Array.from(sorted), ['path-c', 'path-b', 'path-a', 'path-d']);

  context.clientProject = 'project-b';
  vm.runInContext('compareSampleOrderLoad()', context);
  assert.equal(vm.runInContext('manualSortCompareSamplePaths.length', context), 0);
});

test('browser sample names override shared names per project without changing sample identifiers', () => {
  const saved = new Map();
  const context = vm.createContext({
    clientProject: 'project-a',
    selectedCompareMetaDataArray: [
      { id: 'Shared name', runId: 'run-1', pathRun: 'run-1', pathName: 'original-id' }
    ],
    localStorage: {
      getItem: key => saved.get(key) || null,
      setItem: (key, value) => saved.set(key, value)
    },
    $: () => ({ text() { return this; } })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'compareViews.js'), 'utf8'), context);
  vm.runInContext('compareSampleNamesLoad()', context);
  assert.equal(vm.runInContext('compareSampleDisplayNameById("run-1", "Shared name")', context), 'Shared name');

  vm.runInContext('setCompareSampleName("run-1", "original-id", "  My <sample>  ")', context);
  assert.equal(vm.runInContext('compareSampleDisplayNameById("run-1", "Shared name")', context), 'My <sample>');
  assert.equal(vm.runInContext('compareSampleDisplayNameHtml("run-1", "Shared name")', context), 'My &lt;sample&gt;');
  assert.equal(context.selectedCompareMetaDataArray[0].id, 'Shared name');
  assert.equal(JSON.parse(saved.get('martiCompareSampleNames:project-a'))['["run-1","original-id"]'], 'My <sample>');

  context.clientProject = 'project-b';
  vm.runInContext('compareSampleNamesLoad()', context);
  assert.equal(vm.runInContext('compareSampleDisplayNameById("run-1", "Shared name")', context), 'Shared name');
  context.clientProject = 'project-a';
  vm.runInContext('compareSampleNamesLoad(); setCompareSampleName("run-1", "original-id", "")', context);
  assert.equal(vm.runInContext('compareSampleDisplayNameById("run-1", "Shared name")', context), 'Shared name');
});

test('barcode order is numeric, with missing values last in both directions', () => {
  const context = vm.createContext({ clientProject: 'project-a' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'compareViews.js'), 'utf8'), context);
  const samples = [
    { id: 'Missing', pathRun: 'run', pathName: 'missing', barcode: null },
    { id: 'Ten', pathRun: 'run', pathName: 'ten', barcode: 10 },
    { id: 'Two', pathRun: 'run', pathName: 'two', barcode: '2' },
    { id: 'None', pathRun: 'run', pathName: 'none', barcode: 0 },
    { id: 'Unknown', pathRun: 'run', pathName: 'unknown', barcode: '' }
  ];
  context.samples = samples;
  assert.deepEqual(Array.from(vm.runInContext(
    'samples.slice().sort((a, b) => compareSampleBarcodeCompare(a, b, false)).map(sample => sample.id)', context
  )), ['None', 'Two', 'Ten', 'Missing', 'Unknown']);
  assert.deepEqual(Array.from(vm.runInContext(
    'samples.slice().sort((a, b) => compareSampleBarcodeCompare(a, b, true)).map(sample => sample.id)', context
  )), ['Ten', 'Two', 'None', 'Missing', 'Unknown']);
});
