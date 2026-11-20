const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadNarrativeContext () {
  const handlers = {};
  const context = vm.createContext({
    socket: { on: (name, fn) => { handlers[name] = fn; }, emit: () => {} },
    $: () => ({ length: 0 }),
    Date, Number, String
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'dashboardNarrative.js'), 'utf8'), context);
  context.handlers = handlers;
  return context;
}

const narrative = {
  model: 'claude-test', provider: 'anthropic', profile: 'clinical',
  generatedAt: '2026-11-19T12:00:00+00:00',
  basis: { readsAnalysed: 30000, martiStatus: 'Running' },
  validation: { ok: false, organisms_not_detected: ['Listeria monocytogenes'], genes_not_detected: [], numbers_not_found: ['42,000'] }
};

test('stale note when more reads have been analysed, or the run has since completed', () => {
  const c = loadNarrativeContext();
  assert.match(c.narrativeStaleMessage(narrative, { readsAnalysed: 48000, martiStatus: 'Running' }), /30,000.*48,000/);
  assert.match(c.narrativeStaleMessage(narrative, { readsAnalysed: 30000, martiStatus: 'Complete' }), /since completed/);
  assert.equal(c.narrativeStaleMessage(Object.assign({}, narrative, { basis: { readsAnalysed: 30000, martiStatus: 'Complete' } }),
    { readsAnalysed: 30000, martiStatus: 'Complete' }), null);
  assert.equal(c.narrativeStaleMessage(narrative, null), null);
});

test('automatic check findings are listed in plain words', () => {
  const c = loadNarrativeContext();
  const items = c.narrativeCheckItems(narrative.validation);
  assert.equal(items.length, 2);
  assert.match(items[0], /Listeria monocytogenes/);
  assert.match(items[1], /42,000/);
  assert.deepEqual(Array.from(c.narrativeCheckItems({ ok: true, organisms_not_detected: [], genes_not_detected: [], numbers_not_found: [] })), []);
});

test('footer names the model, provider, profile and basis', () => {
  const c = loadNarrativeContext();
  const text = c.narrativeFooterText(narrative);
  assert.match(text, /^Written by claude-test \(Anthropic\) on .*from 30,000 reads analysed, clinical profile\. AI-generated/);
});

test('narratives written through the MCP server name the model the client reported', () => {
  const c = loadNarrativeContext();
  const text = c.narrativeFooterText(Object.assign({}, narrative, { provider: 'mcp', model: 'Claude (Claude app)' }));
  assert.match(text, /^Written by Claude \(Claude app\) \(through the MARTi MCP server\)/);
});

test('socket listeners are registered for the narrative events', () => {
  const c = loadNarrativeContext();
  for (const name of ['dashboard-narrative-response', 'narrative-update-available', 'narrative-progress',
    'narrative-error', 'meta-update-available', 'dashboard-meta-response']) {
    assert.equal(typeof c.handlers[name], 'function', name);
  }
});
