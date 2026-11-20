const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { NarrativeJobs } = require('./narrativeJobs');

// A fake generator: behaviour chosen by the --sample-dir value; records what it was given.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'narrative-jobs-'));
const fake = path.join(dir, 'fake.js');
fs.writeFileSync(fake, `
const args = process.argv.slice(2);
const mode = args.includes('--check') ? 'check' : args[args.indexOf('--sample-dir') + 1];
require('fs').writeFileSync(process.env.RECORD, JSON.stringify({ args, key: process.env.MARTI_LLM_API_KEY, pythonpath: process.env.PYTHONPATH }));
const out = o => process.stdout.write(JSON.stringify(o) + '\\n');
if (mode === 'check') { out({ event: 'check', model_found: true, message: 'Connected' }); process.exit(0); }
if (mode === 'missing-module') { process.stderr.write("ModuleNotFoundError: No module named 'marti_llm'"); process.exit(1); }
if (mode === 'model-error') { out({ event: 'error', message: 'Anthropic returned HTTP 401: invalid x-api-key. Check the API key.' }); process.exit(1); }
if (mode === 'hang') { setInterval(() => {}, 1000); return; }
out({ event: 'progress', stage: 'analysing', message: 'Running analyses' });
setTimeout(() => { out({ event: 'progress', stage: 'calling_model', message: 'Asking m' }); out({ event: 'done', summary: 'S', validation_ok: true }); }, mode === 'slow' ? 300 : 20);
`);
const settings = { provider: 'anthropic', model: 'm', apiKey: 'sk-secret-key-1234', baseUrl: '' };

function makeJobs (opts = {}) {
  const record = path.join(dir, 'record-' + Math.random() + '.json');
  const jobs = new NarrativeJobs(Object.assign({
    python: 'python3', toolsDir: '/opt/marti-llm', timeoutMs: 5000,
    spawnFn: (cmd, args, options) => spawn(process.execPath, [fake].concat(args),
      Object.assign({}, options, { cwd: undefined, env: Object.assign({}, options.env, { RECORD: record }) }))
  }, opts));
  jobs.record = () => JSON.parse(fs.readFileSync(record, 'utf8'));
  return jobs;
}

function finished (jobs, key) {
  return new Promise(resolve => jobs.on('finished', (k, r) => { if (k === key) resolve(r); }));
}

test('runs the generator, reports progress, keeps the key out of the command line', async () => {
  const jobs = makeJobs();
  const stages = [];
  jobs.on('progress', (k, p) => stages.push(p.stage));
  const done = finished(jobs, 'run/s1');
  assert.deepEqual(jobs.start('run/s1', 'ok', settings), { started: true });
  const result = await done;
  assert.equal(result.ok, true);
  assert.deepEqual(stages, ['starting', 'analysing', 'calling_model']);
  const rec = jobs.record();
  assert.equal(rec.key, 'sk-secret-key-1234');
  assert.ok(!rec.args.join(' ').includes('sk-secret'));
  assert.deepEqual(rec.args.slice(0, 7), ['-m', 'marti_llm.narrate', '--json-progress', '--provider', 'anthropic', '--model', 'm']);
  assert.ok(rec.pythonpath.startsWith('/opt/marti-llm'));
  assert.equal(jobs.isBusy('run/s1'), false);
});

test('one narrative per sample at a time; others queue beyond the limit', async () => {
  const jobs = makeJobs({ maxConcurrent: 1 });
  const order = [];
  jobs.on('finished', k => order.push(k));
  const second = finished(jobs, 'run/b');
  jobs.start('run/a', 'slow', settings);
  assert.equal(jobs.start('run/a', 'slow', settings).started, false);
  jobs.start('run/b', 'ok', settings);
  assert.equal(jobs.lastProgress('run/b').stage, 'queued');
  await second;
  assert.deepEqual(order, ['run/a', 'run/b']);
});

test('errors are reported in words the user can act on', async () => {
  let jobs = makeJobs();
  let p = finished(jobs, 'k');
  jobs.start('k', 'model-error', settings);
  assert.match((await p).message, /HTTP 401.*Check the API key/);

  jobs = makeJobs();
  p = finished(jobs, 'k');
  jobs.start('k', 'missing-module', settings);
  assert.match((await p).message, /LLMToolsDir/);

  jobs = makeJobs({ timeoutMs: 300 });
  p = finished(jobs, 'k');
  jobs.start('k', 'hang', settings);
  assert.match((await p).message, /took longer/);

  jobs = new NarrativeJobs({ python: 'definitely-not-a-python-binary' });
  p = finished(jobs, 'k');
  jobs.start('k', '/tmp', settings);
  assert.match((await p).message, /Could not start Python.*LLMPython/);
});

test('connection check', async () => {
  const jobs = makeJobs();
  assert.deepEqual(await jobs.check(settings), { ok: true, message: 'Connected' });
  assert.ok(jobs.record().args.includes('--check'));
});

test('a missing marti-llm folder is reported as such, not as missing Python; ~ is expanded', async () => {
  const { expandHome } = require('./narrativeJobs');
  assert.equal(expandHome('~/marti-llm'), require('path').join(require('os').homedir(), 'marti-llm'));
  assert.equal(expandHome('/opt/x'), '/opt/x');
  const jobs = new NarrativeJobs({ python: process.execPath, toolsDir: '/no/such/marti-llm-folder' });
  assert.match(jobs.toolsProblem(), /marti-llm folder '\/no\/such\/marti-llm-folder' was not found/);
  const ok = new NarrativeJobs({ python: process.execPath, toolsDir: require('os').tmpdir() });
  assert.equal(ok.toolsProblem(), null);
  // spawning still works when the folder is missing (no bad working directory), and the message names the folder
  const r = await jobs._spawn(['-e', 'process.exit(3)'], {}, () => {});
  assert.equal(r.code, 3);
  assert.match(jobs._failureMessage({ spawnError: Object.assign(new Error('x'), { code: 'ENOENT' }) }), /marti-llm folder/);
  assert.match(jobs._failureMessage({ code: 1, stderr: "ModuleNotFoundError: No module named 'marti_llm'" }), /marti-llm folder/);
});
