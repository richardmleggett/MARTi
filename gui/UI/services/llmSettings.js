// LLM provider settings for narrative analysis, kept on the GUI server only.
//
// The API key is stored in its own file, readable only by the account running the GUI (mode 600), and is never
// sent back to a browser: browsers see only whether a key is set and its last four characters. A key in the
// MARTI_LLM_API_KEY environment variable takes precedence over a saved one, for server installations.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROVIDERS = ['anthropic', 'openai', 'openai-compatible'];
const MODEL_PATTERN = /^[A-Za-z0-9._:/@+-]{1,200}$/;

function defaultSettingsPath () {
  return path.join(os.homedir(), '.marti', 'llm_settings.json');
}

function validateBaseUrl (value) {
  if (value === '') return '';
  let url;
  try {
    url = new URL(value);
  } catch (err) {
    throw new Error('Base URL must be a full http:// or https:// address, e.g. http://localhost:1234/v1');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Base URL must start with http:// or https://');
  }
  if (url.username || url.password) {
    throw new Error('Do not put credentials in the base URL; use the API key field.');
  }
  return value.replace(/\/+$/, '');
}

class LlmSettings {
  constructor ({ file = defaultSettingsPath(), env = process.env } = {}) {
    this.file = file;
    this.env = env;
  }

  _read () {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return data && typeof data === 'object' ? data : {};
    } catch (err) {
      return {};
    }
  }

  // Full settings, including the key, for starting the generator. Never send this to a browser.
  get () {
    const saved = this._read();
    const envKey = (this.env.MARTI_LLM_API_KEY || '').trim();
    return {
      provider: saved.provider || '',
      model: saved.model || '',
      baseUrl: saved.baseUrl || '',
      apiKey: envKey || saved.apiKey || '',
      keySource: envKey ? 'environment' : (saved.apiKey ? 'saved' : null)
    };
  }

  isConfigured () {
    const s = this.get();
    if (!PROVIDERS.includes(s.provider) || !s.model) return false;
    return s.provider === 'openai-compatible' ? Boolean(s.baseUrl) : Boolean(s.apiKey);
  }

  // What a browser may see.
  publicView () {
    const s = this.get();
    return {
      provider: s.provider,
      model: s.model,
      baseUrl: s.baseUrl,
      hasKey: Boolean(s.apiKey),
      keySource: s.keySource,
      keyHint: s.keySource === 'saved' && s.apiKey.length >= 12 ? '…' + s.apiKey.slice(-4) : '',
      configured: this.isConfigured(),
      providers: PROVIDERS
    };
  }

  // update: {provider, model, baseUrl, apiKey (only when changing it), clearKey}
  save (update) {
    if (!update || typeof update !== 'object') throw new Error('No settings given.');
    const current = this._read();
    const provider = String(update.provider || '').trim();
    if (!PROVIDERS.includes(provider)) throw new Error('Choose a provider: ' + PROVIDERS.join(', ') + '.');
    const model = String(update.model || '').trim();
    if (!MODEL_PATTERN.test(model)) {
      throw new Error('Enter a model name (letters, numbers and . _ : / @ + - only).');
    }
    const baseUrl = validateBaseUrl(String(update.baseUrl || '').trim());
    if (provider === 'openai-compatible' && !baseUrl) {
      throw new Error('A local or OpenAI-compatible server needs its base URL, e.g. http://localhost:1234/v1');
    }
    const next = { provider, model, baseUrl };
    if (update.clearKey) {
      // key removed
    } else if (typeof update.apiKey === 'string' && update.apiKey.trim() !== '') {
      const key = update.apiKey.trim();
      if (key.length > 500 || /\s/.test(key)) throw new Error('That does not look like an API key.');
      next.apiKey = key;
    } else if (current.apiKey) {
      next.apiKey = current.apiKey;
    }
    const dir = path.dirname(this.file);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmp = path.join(dir, '.llm_settings.' + process.pid + '.' + Date.now() + '.tmp');
    fs.writeFileSync(tmp, JSON.stringify(next, null, 1), { mode: 0o600 });
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, this.file);
    return this.publicView();
  }
}

module.exports = { LlmSettings, PROVIDERS, defaultSettingsPath };
