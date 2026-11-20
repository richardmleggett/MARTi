const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LlmSettings } = require('./llmSettings');

function tempFile () {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'llm-settings-')), 'sub', 'llm_settings.json');
}

test('nothing saved means not configured and no key shown', () => {
  const s = new LlmSettings({ file: tempFile(), env: {} });
  assert.equal(s.isConfigured(), false);
  assert.deepEqual([s.publicView().hasKey, s.publicView().keyHint], [false, '']);
});

test('saved key is kept server-side: owner-only file, never in the public view', () => {
  const file = tempFile();
  const s = new LlmSettings({ file, env: {} });
  const key = 'sk-ant-test-0123456789abcd';
  const view = s.save({ provider: 'anthropic', model: 'claude-test', apiKey: key });
  assert.equal(view.configured, true);
  assert.equal(view.keyHint, '…abcd');
  assert.ok(!JSON.stringify(view).includes(key));
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(s.get().apiKey, key);
  // saving again without a key keeps it; clearKey removes it
  s.save({ provider: 'anthropic', model: 'claude-other' });
  assert.equal(s.get().apiKey, key);
  s.save({ provider: 'anthropic', model: 'claude-other', clearKey: true });
  assert.equal(s.get().apiKey, '');
  assert.equal(s.isConfigured(), false);
});

test('an environment key takes precedence and is not hinted', () => {
  const s = new LlmSettings({ file: tempFile(), env: { MARTI_LLM_API_KEY: 'sk-env-value-9999' } });
  s.save({ provider: 'openai', model: 'gpt-test', apiKey: 'sk-saved-value-1111' });
  assert.equal(s.get().apiKey, 'sk-env-value-9999');
  assert.deepEqual([s.publicView().keySource, s.publicView().keyHint], ['environment', '']);
});

test('a local OpenAI-compatible server needs a URL but no key', () => {
  const s = new LlmSettings({ file: tempFile(), env: {} });
  assert.throws(() => s.save({ provider: 'openai-compatible', model: 'local-model' }), /base URL/);
  const view = s.save({ provider: 'openai-compatible', model: 'google/gemma-4-26b-a4b', baseUrl: 'http://localhost:1234/v1/' });
  assert.equal(view.configured, true);
  assert.equal(view.baseUrl, 'http://localhost:1234/v1');
});

test('invalid settings are refused', () => {
  const s = new LlmSettings({ file: tempFile(), env: {} });
  assert.throws(() => s.save({ provider: 'other', model: 'm' }), /Choose a provider/);
  assert.throws(() => s.save({ provider: 'openai', model: 'bad model; rm -rf' }), /model name/);
  assert.throws(() => s.save({ provider: 'openai-compatible', model: 'm', baseUrl: 'javascript:alert(1)' }), /http/);
  assert.throws(() => s.save({ provider: 'openai-compatible', model: 'm', baseUrl: 'http://u:p@host/v1' }), /credentials/);
  assert.throws(() => s.save({ provider: 'openai', model: 'm', apiKey: 'has space' }), /API key/);
});
