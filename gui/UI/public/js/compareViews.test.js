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

test('metadata groups use site names or coordinates and normalize collection dates', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'compareViews.js'), 'utf8'), context);
  context.sample = { metadatafile: { locationName: ' Thetford Forest ', location: '52.4, 0.7', sampleDate: '14/04/25' } };
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "location")', context), 'Thetford Forest');
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "date")', context), '2025-04-14');
  context.sample.metadatafile.sampleDate = '2025-04-14';
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "date")', context), '2025-04-14');
  context.sample.metadatafile.sampleDate = '16/01/2025';
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "date")', context), '2025-01-16');
  delete context.sample.metadatafile.locationName;
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "location")', context), '52.4, 0.7');
  delete context.sample.metadatafile.location;
  context.sample.metadatafile.sampleLocation = '52.5, 0.8';
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "location")', context), '52.5, 0.8');
  context.sample = {};
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "location")', context), '');
  assert.equal(vm.runInContext('compareSampleMetadataGroup(sample, "date")', context), '');
});

test('metadata grouping updates only selected samples, saves once and preserves identifiers and metadata', () => {
  const saved = new Map();
  let writes = 0;
  let renders = 0;
  const element = {
    text() { return this; }, empty() { return this; }, val() { return this; },
    appendTo() { return this; }, each() { return this; }
  };
  const samples = [
    { id: 'Shared name', pathRun: 'run-1', pathName: 'a', metadatafile: { locationName: 'Foxley Wood', sampleDate: '25/07/24' } },
    { id: 'Shared name', pathRun: 'run-2', pathName: 'b', metadatafile: { locationName: 'Foxley Wood', sampleDate: '2025-04-14' } },
    { id: 'Control', pathRun: 'run-2', pathName: 'c' }
  ];
  const before = JSON.stringify(samples);
  const context = vm.createContext({
    clientProject: 'metadata-test', selectedCompareMetaDataArray: samples,
    localStorage: { getItem: () => null, setItem: (key, value) => { writes++; saved.set(key, value); } },
    $: () => element,
    renderCompareOrdination: () => { renders++; },
    requestCompareOrdination: () => { throw new Error('Must not recalculate PCoA'); }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'compareViews.js'), 'utf8'), context);
  vm.runInContext(`compareSampleGroups = { '["run-2","c"]': 'Old control', '["other","d"]': 'Keep me' };
    setCompareSampleGroupsFromMetadata('location')`, context);
  const key = 'martiCompareOrdinationGroups:metadata-test';
  assert.deepEqual(JSON.parse(saved.get(key)), {
    '["run-1","a"]': 'Foxley Wood', '["run-2","b"]': 'Foxley Wood', '["other","d"]': 'Keep me'
  });
  assert.equal(writes, 1);
  assert.equal(renders, 1);
  vm.runInContext(`setCompareSampleGroupsFromMetadata('date')`, context);
  assert.equal(JSON.parse(saved.get(key))['["run-1","a"]'], '2024-07-25');
  assert.equal(JSON.parse(saved.get(key))['["run-2","b"]'], '2025-04-14');
  assert.equal(JSON.stringify(samples), before);
  // Switching projects cannot carry these assignments into the other project.
  context.clientProject = 'other-project';
  vm.runInContext('compareSampleGroupsLoad()', context);
  assert.equal(vm.runInContext('compareSampleGroupValue("run-1", "a")', context), '');
});

test('group ordering is chronological for dates and keeps ungrouped samples last in both directions', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'compareViews.js'), 'utf8'), context);
  context.samples = [
    { id: 'Control', pathRun: 'run', pathName: 'control' },
    { id: 'April', pathRun: 'run', pathName: 'april' },
    { id: 'January', pathRun: 'run', pathName: 'january' }
  ];
  vm.runInContext(`compareSampleGroups = { '["run","april"]': '2025-04-14', '["run","january"]': '2025-01-16' }`, context);
  assert.deepEqual(Array.from(vm.runInContext('samples.slice().sort((a, b) => compareSampleGroupCompare(a, b, false)).map(s => s.id)', context)), ['January', 'April', 'Control']);
  assert.deepEqual(Array.from(vm.runInContext('samples.slice().sort((a, b) => compareSampleGroupCompare(a, b, true)).map(s => s.id)', context)), ['April', 'January', 'Control']);
});
