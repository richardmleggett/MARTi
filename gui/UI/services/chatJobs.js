// Answers chat questions with python -m marti_llm.chat: one question at a time per browser tab (client), with a
// limit on how many run at once. The samples, groups and conversation go to Python on stdin and the API key in
// an environment variable, so none of them appear on the command line. The server stores no conversations:
// each question arrives with its history from the browser.

const { NarrativeJobs } = require('./narrativeJobs');

const LIMITS = {
  messages: 40,          // messages of history accepted per question
  messageChars: 20000,   // characters per message
  links: 40,
  labelChars: 100,
  groupChars: 80
};

const WHAT = { tool: 'chat assistant', job: 'answer' };

function cleanText (value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

const PAGES = ['compare', 'dashboard', 'samples'];

function chatPage (value) {
  return PAGES.includes(value) ? value : 'compare';
}

// Validate what the browser sent; returns {ok, context|message}. samples: [{dir, runId, name}] decided by the
// server (the samples this client has open), never taken from the browser; likewise selectedDirs, the folders of
// the samples currently selected (used on the Samples page).
// listed: [{runId, name}] the samples the client's Samples page lists, so "open the treemap for sample X" can find X.
function buildContext (request, samples, selectedDirs = [], listed = []) {
  if (!Array.isArray(samples) || samples.length === 0) return { ok: false, message: 'No samples are open.' };
  const page = chatPage(request.page);
  const key = (runId, name) => JSON.stringify([String(runId), String(name)]);
  const dirOf = new Map(samples.map(s => [key(s.runId, s.name), s.dir]));

  const labels = new Map();
  (Array.isArray(request.labels) ? request.labels : []).forEach(entry => {
    if (entry && dirOf.has(key(entry.runId, entry.name)) && typeof entry.label === 'string' && entry.label.trim()) {
      labels.set(key(entry.runId, entry.name), entry.label.trim().slice(0, LIMITS.labelChars));
    }
  });
  const groups = {};
  (Array.isArray(request.groups) ? request.groups : []).forEach(entry => {
    const k = entry && key(entry.runId, entry.name);
    const group = entry && typeof entry.group === 'string' ? entry.group.trim().slice(0, LIMITS.groupChars) : '';
    if (!group || !dirOf.has(k) || group === '__proto__') return;
    if (!Object.prototype.hasOwnProperty.call(groups, group)) groups[group] = [];
    if (!groups[group].includes(dirOf.get(k))) groups[group].push(dirOf.get(k));
  });

  const messages = (Array.isArray(request.messages) ? request.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-LIMITS.messages)
    .map(m => ({ role: m.role, content: m.content.slice(0, LIMITS.messageChars) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { ok: false, message: 'There is no question to answer.' };
  }
  const cleanLinks = list => (Array.isArray(list) ? list : [])
    .filter(l => l && typeof l.id === 'string' && /^[a-z][a-z0-9-]{0,40}$/.test(l.id))
    .slice(0, LIMITS.links)
    .map(l => ({ id: l.id, description: cleanText(l.description, 200) }));
  const links = cleanLinks(request.links);
  const dashboardLinks = cleanLinks(request.dashboardLinks);
  const view = {};
  if (request.view && typeof request.view === 'object') {
    if (typeof request.view.tab === 'string') view.tab = request.view.tab.slice(0, 40);
    if (typeof request.view.rank === 'string') view.rank = request.view.rank.slice(0, 20);
    const ms = Number(request.view.minSupport);
    if (request.view.minSupport !== undefined && request.view.minSupport !== null && isFinite(ms)) view.minSupport = ms;
  }
  return {
    ok: true,
    context: {
      page,
      samples: samples.map(s => ({
        dir: s.dir,
        ref: { runId: String(s.runId), name: String(s.name) },
        label: labels.get(key(s.runId, s.name)) || ''
      })),
      groups,
      selected: page === 'samples' ? selectedDirs.filter(d => samples.some(s => s.dir === d)) : [],
      view,
      links,
      dashboardLinks,
      listed: (Array.isArray(listed) ? listed : []).map(s => ({ runId: String(s.runId), name: String(s.name) })),
      messages
    }
  };
}

class ChatJobs extends NarrativeJobs {
  constructor (options = {}) {
    super(Object.assign({ maxConcurrent: 3 }, options));
    this.children = new Map(); // clientId -> child process
    this.cancelled = new Set();
  }

  // Returns {started: true} or {started: false, reason}. Events: progress(clientId, requestId, {message}) and
  // finished(clientId, requestId, {ok, answer, model} | {ok: false, message, cancelled}).
  ask (clientId, requestId, context, settings) {
    if (this.isBusy(clientId)) return { started: false, reason: 'Wait for the current answer to finish.' };
    const job = { key: clientId, requestId, context, settings };
    if (this.running.size >= this.maxConcurrent) {
      this.queue.push(job);
      this.emit('progress', clientId, requestId, { stage: 'queued', message: 'Waiting for other questions to finish' });
    } else {
      this._run(job);
    }
    return { started: true };
  }

  cancel (clientId) {
    const queued = this.queue.findIndex(job => job.key === clientId);
    if (queued >= 0) {
      const [job] = this.queue.splice(queued, 1);
      this.emit('finished', clientId, job.requestId, { ok: false, cancelled: true, message: 'Stopped.' });
      return true;
    }
    const child = this.children.get(clientId);
    if (!child) return false;
    this.cancelled.add(clientId);
    child.kill('SIGTERM');
    return true;
  }

  _chatArgs (settings) {
    const args = ['-m', 'marti_llm.chat', '--provider', settings.provider, '--model', settings.model,
      '--timeout', String(Math.max(30, Math.round(this.timeoutMs / 1000)))];
    if (settings.baseUrl) args.push('--base-url', settings.baseUrl);
    return args;
  }

  async _run (job) {
    const record = { progress: { stage: 'starting', message: 'Starting' } };
    this.running.set(job.key, record);
    this.emit('progress', job.key, job.requestId, record.progress);
    let lastError = null;
    let done = null;
    const result = await this._spawn(this._chatArgs(job.settings), job.settings, event => {
      if (event.event === 'progress' || event.event === 'tool') {
        record.progress = { stage: event.event, message: event.message };
        this.emit('progress', job.key, job.requestId, record.progress);
      } else if (event.event === 'error') {
        lastError = event.message;
      } else if (event.event === 'done') {
        done = event;
      }
    }, { input: JSON.stringify(job.context), onChild: child => this.children.set(job.key, child) });
    this.running.delete(job.key);
    this.children.delete(job.key);
    if (this.cancelled.delete(job.key)) {
      this.emit('finished', job.key, job.requestId, { ok: false, cancelled: true, message: 'Stopped.' });
    } else if (result.code === 0 && done) {
      this.emit('finished', job.key, job.requestId, {
        ok: true, answer: done.answer, model: done.model, toolsUsed: done.tools_used || [],
        actions: Array.isArray(done.actions) ? done.actions : []
      });
    } else {
      if (!lastError && result.stderr) console.error(`[chat] ${job.key}: assistant output:\n${result.stderr}`);
      this.emit('finished', job.key, job.requestId, { ok: false, message: this._failureMessage(result, lastError, WHAT) });
    }
    const next = this.queue.shift();
    if (next) this._run(next);
  }
}

module.exports = { ChatJobs, buildContext, chatPage, LIMITS };
