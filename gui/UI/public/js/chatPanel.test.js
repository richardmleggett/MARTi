const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadChat () {
  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
  const fn = () => {};
  fn.trim = s => String(s).trim();
  const context = vm.createContext({
    socket: { on: () => {}, emit: () => {} },
    $: fn, localStorage, Date, JSON, Math, Object, String, Number, Array
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'chatPanel.js'), 'utf8'), context);
  context.store = store;
  return context;
}

test('a conversation belongs to a page and a set of samples, in any order', () => {
  const c = loadChat();
  const a = [{ runId: 'r1', name: 's1' }, { runId: 'r2', name: 's2' }];
  const b = [{ runId: 'r2', name: 's2' }, { runId: 'r1', name: 's1' }];
  assert.equal(c.martiChatStorageKey('compare', a), c.martiChatStorageKey('compare', b));
  assert.notEqual(c.martiChatStorageKey('compare', a), c.martiChatStorageKey('dashboard', a));
  assert.notEqual(c.martiChatStorageKey('compare', a), c.martiChatStorageKey('compare', a.slice(0, 1)));
  assert.match(c.martiChatStorageKey('compare', a), /^martiChat:v1:compare:2:/);
});

test('answers are split into paragraphs and lists', () => {
  const c = loadChat();
  const blocks = JSON.parse(JSON.stringify(c.martiChatBlocks(
    'First line\nsecond line\n\n- one\n- two\n* three\n\n1. a\n2) b\n\n### Heading\ntext')));
  assert.deepEqual(blocks, [
    { type: 'p', items: ['First line', 'second line'] },
    { type: 'ul', items: ['one', 'two', 'three'] },
    { type: 'ol', items: ['a', 'b'] },
    { type: 'p', items: ['Heading', 'text'] }
  ]);
});

test('inline formatting: bold, code and GUI links only; anything else stays text', () => {
  const c = loadChat();
  const tokens = JSON.parse(JSON.stringify(c.martiChatInline(
    'See **the [plot](marti:diversity-plot)** and `tet(M)` or [web](https://example.org) <b>x</b>')));
  assert.deepEqual(tokens, [
    { t: 'text', v: 'See ' },
    { t: 'strong', children: [{ t: 'text', v: 'the ' }, { t: 'link', v: 'plot', target: 'diversity-plot' }] },
    { t: 'text', v: ' and ' },
    { t: 'code', v: 'tet(M)' },
    { t: 'text', v: ' or [web](https://example.org) <b>x</b>' }
  ]);
});

test('every link target names a tab the page has and an element to show', () => {
  const c = loadChat();
  const views = { compare: ['Plots', 'Diversity', 'Ordination', 'TaxonRelationships', 'Amr'], dashboard: ['Taxonomy', 'Diversity', 'Amr'], samples: [] };
  for (const page of ['compare', 'dashboard', 'samples']) {
    const html = fs.readFileSync(path.join(__dirname, '..', page + '.html'), 'utf8');
    const ids = new Set();
    for (const link of c.MARTI_CHAT_LINKS[page]) {
      assert.match(link.id, /^[a-z][a-z0-9-]{0,40}$/);
      assert.ok(!ids.has(link.id), 'duplicate ' + link.id);
      ids.add(link.id);
      if (link.view) assert.ok(views[page].includes(link.view), link.id);
      if (link.card) assert.ok(html.includes('id="' + link.card + '"'), link.id + ': no #' + link.card);
      if (link.title) assert.ok(html.includes('>' + link.title + '</h6>'), link.id + ': no card titled ' + link.title);
      assert.ok(link.card || link.title || link.selector, link.id);
      assert.ok(link.description.length > 10, link.id);
    }
  }
});

test('conversations are kept per key, emptied ones removed, and only the most recent are kept', () => {
  const c = loadChat();
  c.martiChatSave('martiChat:v1:compare:1:a', [{ role: 'user', content: 'q' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(c.martiChatLoad('martiChat:v1:compare:1:a'))), [{ role: 'user', content: 'q' }]);
  c.martiChatSave('martiChat:v1:compare:1:a', []);
  assert.equal(c.store.has('martiChat:v1:compare:1:a'), false);
  for (let i = 0; i < 35; i++) c.martiChatSave('martiChat:v1:compare:1:k' + i, [{ role: 'user', content: 'q' + i }]);
  const kept = [...c.store.keys()].filter(k => k !== 'martiChat:v1:index');
  assert.equal(kept.length, 30);
  const long = Array.from({ length: 80 }, (_, i) => ({ role: 'user', content: String(i) }));
  c.martiChatSave('martiChat:v1:compare:1:long', long);
  assert.equal(c.martiChatLoad('martiChat:v1:compare:1:long').length, 60);
});

test('download transcript: plain text, links reduced to their words', () => {
  const c = loadChat();
  const text = c.martiChatTranscript([
    { role: 'user', content: 'Which group is more diverse?' },
    { role: 'assistant', content: 'Group A, see the [diversity plot](marti:diversity-plot).', model: 'claude-x' }
  ], ['Comparing 2 samples:'], new Date(2026, 10, 19, 12, 0));
  assert.match(text, /^# MARTi AI chat\n\nComparing 2 samples:/);
  assert.match(text, /## Answer \(claude-x\)\n\nGroup A, see the diversity plot\./);
  assert.ok(!text.includes('marti:'));
});

test('selections: replace, add and remove, in order, ignoring malformed entries', () => {
  const c = loadChat();
  const a = { runId: 'r1', name: 'a' };
  const b = { runId: 'r1', name: 'b' };
  const d = { runId: 'r2', name: 'a' };
  const plain = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(plain(c.martiChatNextSelection([a], [{ type: 'select', mode: 'replace', samples: [b, d] }])), [b, d]);
  assert.deepEqual(plain(c.martiChatNextSelection([a], [{ type: 'select', mode: 'add', samples: [b, a] }])), [a, b]);
  assert.deepEqual(plain(c.martiChatNextSelection([a, b, d], [{ type: 'select', mode: 'remove', samples: [b] }])), [a, d]);
  assert.deepEqual(plain(c.martiChatNextSelection([a], [
    { type: 'select', mode: 'replace', samples: [b, { runId: 3 }, null] },
    { type: 'other', samples: [d] },
    { type: 'select', mode: 'add', samples: [d] }])), [b, d]);
});
