// Runs the narrative generator (python -m marti_llm.narrate) for one sample at a time per sample, with a limit
// on how many run at once. The API key reaches the generator through an environment variable, never the command
// line (which other users of the machine can see). Progress comes back as one JSON object per line.

const { spawn } = require('child_process');
const EventEmitter = require('events').EventEmitter;
const path = require('path');
const fs = require('fs');
const os = require('os');

// "~/x" as the shell would expand it (options files and Windows shells do not)
function expandHome (p) {
  if (typeof p !== 'string' || !p) return p;
  return p === '~' || p.startsWith('~/') || p.startsWith('~\\') ? path.join(os.homedir(), p.slice(1)) : p;
}

function isDirectory (p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch (_) {
    return false;
  }
}

const STDERR_LIMIT = 4000;

class NarrativeJobs extends EventEmitter {
  constructor ({ python = 'python3', toolsDir = '', timeoutMs = 10 * 60 * 1000, maxConcurrent = 2,
    spawnFn = spawn } = {}) {
    super();
    this.python = expandHome(String(python || 'python3').trim()) || 'python3';
    this.toolsDir = toolsDir ? path.resolve(expandHome(String(toolsDir).trim())) : '';
    this.timeoutMs = timeoutMs;
    this.maxConcurrent = Math.max(1, maxConcurrent);
    this.spawnFn = spawnFn;
    this.running = new Map(); // key -> {child, progress}
    this.queue = [];          // {key, sampleDir, settings}
  }

  // A message if the marti-llm folder set with LLMToolsDir / --llm-tools does not exist, else null
  toolsProblem () {
    if (!this.toolsDir || isDirectory(this.toolsDir)) return null;
    return `The marti-llm folder '${this.toolsDir}' was not found. Check LLMToolsDir in marti_engine_options.txt or --llm-tools.`;
  }

  isBusy (key) {
    return this.running.has(key) || this.queue.some(job => job.key === key);
  }

  lastProgress (key) {
    if (this.running.has(key)) return this.running.get(key).progress;
    if (this.queue.some(job => job.key === key)) return { stage: 'queued', message: 'Waiting for another narrative to finish' };
    return null;
  }

  // Returns {started: true} or {started: false, reason}
  start (key, sampleDir, settings) {
    if (this.isBusy(key)) return { started: false, reason: 'A narrative is already being generated for this sample.' };
    const job = { key, sampleDir, settings };
    if (this.running.size >= this.maxConcurrent) {
      this.queue.push(job);
      this.emit('progress', key, { stage: 'queued', message: 'Waiting for another narrative to finish' });
    } else {
      this._run(job);
    }
    return { started: true };
  }

  _env (settings) {
    const env = Object.assign({}, process.env);
    delete env.MARTI_LLM_API_KEY;
    if (settings.apiKey) env.MARTI_LLM_API_KEY = settings.apiKey;
    if (this.toolsDir) {
      env.PYTHONPATH = this.toolsDir + (env.PYTHONPATH ? path.delimiter + env.PYTHONPATH : '');
    }
    return env;
  }

  _args (settings, extra) {
    const args = ['-m', 'marti_llm.narrate', '--json-progress', '--provider', settings.provider, '--model', settings.model];
    if (settings.baseUrl) args.push('--base-url', settings.baseUrl);
    return args.concat(extra);
  }

  // Start the generator; calls onEvent for each JSON line, resolves {code, stderr, timedOut, spawnError}.
  // input: text for its stdin (kept off the command line); onChild: receives the process, e.g. to cancel it.
  _spawn (args, settings, onEvent, { input = null, onChild = null } = {}) {
    return new Promise(resolve => {
      let child;
      try {
        child = this.spawnFn(this.python, args, {
          env: this._env(settings),
          // a missing working folder would fail as if Python were missing, so only use it if it exists
          cwd: this.toolsDir && isDirectory(this.toolsDir) ? this.toolsDir : undefined,
          stdio: [input === null ? 'ignore' : 'pipe', 'pipe', 'pipe']
        });
      } catch (err) {
        resolve({ code: null, stderr: '', timedOut: false, spawnError: err });
        return;
      }
      if (onChild) onChild(child);
      if (input !== null && child.stdin) {
        child.stdin.on('error', () => {}); // the process may exit before reading everything
        child.stdin.end(input);
      }
      let buffer = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      }, this.timeoutMs);
      child.stdout.on('data', chunk => {
        buffer += chunk.toString();
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          try {
            onEvent(JSON.parse(line));
          } catch (err) {
            // not a progress line; ignore
          }
        }
      });
      child.stderr.on('data', chunk => {
        stderr = (stderr + chunk.toString()).slice(-STDERR_LIMIT);
      });
      child.on('error', err => finish({ code: null, stderr, timedOut, spawnError: err }));
      child.on('close', code => finish({ code, stderr, timedOut, spawnError: null }));
    });
  }

  _failureMessage (result, lastError, what = { tool: 'narrative generator', job: 'narrative' }) {
    if (lastError) return lastError;
    const missing = this.toolsProblem();
    if (missing && (result.spawnError || /No module named ['"]?marti_llm/.test(result.stderr || ''))) return missing;
    if (result.spawnError) {
      return result.spawnError.code === 'ENOENT'
        ? `Could not start Python ('${this.python}'). Set LLMPython in marti_engine_options.txt or use --llm-python.`
        : `Could not start the ${what.tool}: ` + result.spawnError.message;
    }
    if (result.timedOut) return `The ${what.job} took longer than ${Math.round(this.timeoutMs / 60000)} minutes and was stopped.`;
    if (/No module named ['"]?marti_llm/.test(result.stderr)) {
      return 'The marti_llm package was not found. Set LLMToolsDir in marti_engine_options.txt or use --llm-tools.';
    }
    if (/ModuleNotFoundError/.test(result.stderr)) {
      const m = result.stderr.match(/No module named ['"]?([\w.]+)/);
      return `A Python package the ${what.tool} needs is missing${m ? ' (' + m[1] + ')' : ''}. Install marti-llm's requirements.`;
    }
    return `The ${what.tool} failed (exit code ${result.code}). See the GUI's console output for details.`;
  }

  async _run (job) {
    const record = { progress: { stage: 'starting', message: 'Starting' } };
    this.running.set(job.key, record);
    this.emit('progress', job.key, record.progress);
    let lastError = null;
    let done = null;
    const result = await this._spawn(this._args(job.settings, ['--sample-dir', job.sampleDir]), job.settings, event => {
      if (event.event === 'progress') {
        record.progress = { stage: event.stage, message: event.message };
        this.emit('progress', job.key, record.progress);
      } else if (event.event === 'error') {
        lastError = event.message;
      } else if (event.event === 'done') {
        done = event;
      }
    });
    this.running.delete(job.key);
    if (result.code === 0 && done) {
      this.emit('finished', job.key, { ok: true, summary: done.summary, validationOk: done.validation_ok });
    } else {
      if (!lastError && result.stderr) console.error(`[narrative] ${job.key}: generator output:\n${result.stderr}`);
      this.emit('finished', job.key, { ok: false, message: this._failureMessage(result, lastError) });
    }
    const next = this.queue.shift();
    if (next) this._run(next);
  }

  // Connection test: resolves {ok, message}
  async check (settings) {
    let outcome = null;
    let lastError = null;
    const result = await this._spawn(this._args(settings, ['--check']), settings, event => {
      if (event.event === 'check') outcome = event;
      if (event.event === 'error') lastError = event.message;
    });
    if (result.code === 0 && outcome) return { ok: Boolean(outcome.model_found), message: outcome.message };
    if (!lastError && result.stderr) console.error('[narrative] connection test output:\n' + result.stderr);
    return { ok: false, message: this._failureMessage(result, lastError) };
  }
}

module.exports = { NarrativeJobs, expandHome };
