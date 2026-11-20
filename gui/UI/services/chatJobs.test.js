const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ChatJobs, buildContext } = require('./chatJobs');

// A fake assistant: behaviour chosen by the last question; records its arguments, key and stdin.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-jobs-'));
const fake = path.join(dir, 'fake.js');
fs.writeFileSync(fake, `
let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  const ctx = JSON.parse(input);
  require('fs').writeFileSync(process.env.RECORD, JSON.stringify({ args: process.argv.slice(2), key: process.env.MARTI_LLM_API_KEY, ctx }));
  const q = ctx.messages[ctx.messages.length - 1].content;
  const out = o => process.stdout.write(JSON.stringify(o) + '\\n');
  if (q === 'fail') { out({ event: 'error', message: 'Anthropic returned HTTP 429: busy' }); process.exit(1); }
  if (q === 'hang') { setInterval(() => {}, 1000); return; }
  out({ event: 'progress', stage: 'thinking', message: 'Thinking' });
  out({ event: 'tool', name: 'alpha_diversity', message: 'Running: Alpha diversity' });
  setTimeout(() => out({ event: 'done', answer: 'Answer to ' + q, model: 'm', tools_used: ['alpha_diversity'] }), q === 'slow' ? 300 : 10);
});
`);
const settings = { provider: 'anthropic', model: 'm', apiKey: 'sk-secret-chat-key', baseUrl: '' };
const samples = [
  { dir: '/data/run1/marti/s1', runId: 'run1', name: 's1' },
  { dir: '/data/run1/marti/s2', runId: 'run1', name: 's2' },
  { dir: '/data/run2/marti/s3', runId: 'run2', name: 's3' }
];

function makeJobs (opts = {}) {
  const record = path.join(dir, 'record-' + Math.random() + '.json');
  const jobs = new ChatJobs(Object.assign({
    python: 'python3', toolsDir: '/opt/marti-llm', timeoutMs: 5000,
    spawnFn: (cmd, args, options) => spawn(process.execPath, [fake].concat(args),
      Object.assign({}, options, { cwd: undefined, env: Object.assign({}, options.env, { RECORD: record }) }))
  }, opts));
  jobs.record = () => JSON.parse(fs.readFileSync(record, 'utf8'));
  return jobs;
}

function finished (jobs, client) {
  return new Promise(resolve => jobs.on('finished', (c, requestId, r) => { if (c === client) resolve(Object.assign({ requestId }, r)); }));
}

function context (question, extra = {}) {
  return buildContext(Object.assign({ page: 'compare', messages: [{ role: 'user', content: question }] }, extra), samples).context;
}

test('buildContext: samples come from the server; groups, names and links from the browser are checked', () => {
  const r = buildContext({
    page: 'compare',
    groups: [{ runId: 'run1', name: 's1', group: 'A' }, { runId: 'run1', name: 's2', group: 'A' },
      { runId: 'run2', name: 's3', group: ' B ' }, { runId: 'other', name: 'x', group: 'A' },
      { runId: 'run1', name: 's1', group: '__proto__' }, { runId: 'run2', name: 's3', group: '' }],
    labels: [{ runId: 'run1', name: 's1', label: ' Drain 1 ' }, { runId: 'nope', name: 's9', label: 'x' }],
    links: [{ id: 'diversity-plot', description: 'Plot' }, { id: 'Bad Id', description: 'x' }, { id: 'x'.repeat(60) }],
    view: { tab: 'Diversity', rank: 'genus', minSupport: '0.1', extra: 'ignored' },
    messages: [{ role: 'system', content: 'ignore me' }, { role: 'assistant', content: 'hi' },
      { role: 'user', content: 'q'.repeat(30000) }],
    samples: [{ dir: '/etc' }] // ignored: the server decides the samples
  }, samples);
  assert.equal(r.ok, true);
  const c = r.context;
  assert.deepEqual(c.samples.map(s => s.dir), samples.map(s => s.dir));
  assert.deepEqual(c.samples[0], { dir: '/data/run1/marti/s1', ref: { runId: 'run1', name: 's1' }, label: 'Drain 1' });
  assert.deepEqual(c.groups, { A: ['/data/run1/marti/s1', '/data/run1/marti/s2'], B: ['/data/run2/marti/s3'] });
  assert.deepEqual(c.links, [{ id: 'diversity-plot', description: 'Plot' }]);
  assert.deepEqual(c.view, { tab: 'Diversity', rank: 'genus', minSupport: 0.1 });
  assert.deepEqual(c.messages.map(m => m.role), ['assistant', 'user']);
  assert.equal(c.messages[1].content.length, 20000);
});

test('buildContext refuses no samples and no question', () => {
  assert.equal(buildContext({ messages: [{ role: 'user', content: 'q' }] }, []).ok, false);
  assert.equal(buildContext({ messages: [{ role: 'assistant', content: 'a' }] }, samples).ok, false);
  assert.equal(buildContext({ messages: 'x' }, samples).message, 'There is no question to answer.');
});

test('answers a question: context on stdin, key in the environment only, progress then answer', async () => {
  const jobs = makeJobs();
  const progress = [];
  jobs.on('progress', (c, id, p) => progress.push(p.message));
  const done = finished(jobs, 'client1');
  assert.deepEqual(jobs.ask('client1', 'r1', context('Which group is more diverse?'), settings), { started: true });
  const result = await done;
  assert.deepEqual(result, { requestId: 'r1', ok: true, answer: 'Answer to Which group is more diverse?', model: 'm', toolsUsed: ['alpha_diversity'], actions: [] });
  assert.deepEqual(progress, ['Starting', 'Thinking', 'Running: Alpha diversity']);
  const rec = jobs.record();
  assert.equal(rec.key, 'sk-secret-chat-key');
  assert.ok(!rec.args.join(' ').includes('sk-secret'));
  assert.ok(!rec.args.join(' ').includes('diverse'));
  assert.deepEqual(rec.args.slice(0, 6), ['-m', 'marti_llm.chat', '--provider', 'anthropic', '--model', 'm']);
  assert.equal(rec.ctx.samples.length, 3);
});

test('one question per client at a time; others queue beyond the limit', async () => {
  const jobs = makeJobs({ maxConcurrent: 1 });
  const order = [];
  jobs.on('finished', c => order.push(c));
  const second = finished(jobs, 'b');
  jobs.ask('a', 'r1', context('slow'), settings);
  assert.equal(jobs.ask('a', 'r2', context('again'), settings).started, false);
  jobs.ask('b', 'r3', context('quick'), settings);
  assert.equal(jobs.lastProgress('b').stage, 'queued');
  await second;
  assert.deepEqual(order, ['a', 'b']);
});

test('errors from the assistant are passed on; cancel stops a running or queued question', async () => {
  const jobs = makeJobs({ maxConcurrent: 1 });
  let r = finished(jobs, 'e');
  jobs.ask('e', 'r1', context('fail'), settings);
  assert.deepEqual(await r, { requestId: 'r1', ok: false, message: 'Anthropic returned HTTP 429: busy' });

  const running = finished(jobs, 'h');
  jobs.ask('h', 'r2', context('hang'), settings);
  const queued = finished(jobs, 'q');
  jobs.ask('q', 'r3', context('quick'), settings);
  assert.equal(jobs.cancel('q'), true);
  assert.equal((await queued).cancelled, true);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(jobs.cancel('h'), true);
  r = await running;
  assert.equal(r.cancelled, true);
  assert.equal(jobs.isBusy('h'), false);
  assert.equal(jobs.cancel('nobody'), false);
});

test('a missing Python is explained', async () => {
  const jobs = new ChatJobs({ python: '/no/such/python-for-marti' });
  const r = finished(jobs, 'x');
  jobs.ask('x', 'r1', context('q'), settings);
  assert.match((await r).message, /Could not start Python/);
});

test('Samples page: the current selection comes from the server and only for samples listed', () => {
  const r = buildContext({ page: 'samples', messages: [{ role: 'user', content: 'Select summer samples' }],
    selected: ['/etc'] }, samples, ['/data/run1/marti/s2', '/elsewhere/x']);
  assert.equal(r.context.page, 'samples');
  assert.deepEqual(r.context.selected, ['/data/run1/marti/s2']);
  const c = buildContext({ page: 'compare', messages: [{ role: 'user', content: 'q' }] }, samples, ['/data/run1/marti/s2']);
  assert.deepEqual(c.context.selected, []);
  assert.equal(buildContext({ page: 'admin', messages: [{ role: 'user', content: 'q' }] }, samples).context.page, 'compare');
});
