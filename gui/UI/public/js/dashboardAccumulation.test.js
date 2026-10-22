const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('Dashboard accepts accumulation before sample metadata loads and ignores an old selection', () => {
  const handlers = {};
  const plotted = [];
  const context = vm.createContext({
    socket: { on: (name, handler) => { handlers[name] = handler; } },
    d3: {},
    $: () => ({ css() { return this; } }),
    console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'dashboard.js'), 'utf8'), context);
  context.currentPage = 'Dashboard';
  context.sampleMetaDataArray = [];
  context.dashboardAccumulationDataAvailable = true;
  context.taxonomicRankSelectedTextLowerCase = 'species';
  context.lcaAbundanceDashboard = '0.1';
  context.plotRarefactionCompare = data => plotted.push(data);

  const response = [{ id: 'sample-path', runId: 'run-path', data: { reads: [[100, 5]] } }];
  handlers['dashboard-accumulationChart-response'](response, { rank: 'species', lca: 'lca_0.1' });
  assert.equal(plotted.length, 1);
  assert.equal(plotted[0], response);

  handlers['dashboard-accumulationChart-response']([], { rank: 'genus', lca: 'lca_0.1' });
  handlers['dashboard-accumulationChart-response']([], { rank: 'species', lca: 'lca_1.0' });
  assert.equal(plotted.length, 1);

  handlers['dashboard-accumulationChart-response']([], { rank: 'species', lca: 'lca_0.1' });
  assert.equal(plotted.length, 2);
  assert.equal(plotted[1].length, 0);
});
