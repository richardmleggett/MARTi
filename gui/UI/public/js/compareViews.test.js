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
