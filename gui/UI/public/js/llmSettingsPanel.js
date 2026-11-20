// AI model settings in the Options dialog. The API key is sent to the GUI server once, when saved, and is never
// sent back: the server returns only whether a key is set and its last four characters. Hidden in restricted
// mode, where the server also refuses to change settings.

var LLM_MODEL_PLACEHOLDERS = {
  'anthropic': 'e.g. claude-sonnet-5-5',
  'openai': 'Model name, as listed in your OpenAI account',
  'openai-compatible': 'e.g. google/gemma-4-26b-a4b (as the server lists it)'
};

var llmSettingsView = null;

function llmSetStatus (text, kind) {
  $('#llmSettingsStatus').text(text || '')
    .removeClass('text-success text-danger text-gray-700')
    .addClass(kind === 'ok' ? 'text-success' : kind === 'error' ? 'text-danger' : 'text-gray-700');
}

function llmUpdateProviderFields () {
  var provider = $('#llmProvider').val();
  var local = provider === 'openai-compatible';
  $('#llmBaseUrlRow').toggle(local);
  $('#llmModel').attr('placeholder', LLM_MODEL_PLACEHOLDERS[provider] || 'Model name, as the provider lists it');
  var v = llmSettingsView || {};
  var help;
  if (v.keySource === 'environment') {
    help = 'A key is set by the MARTI_LLM_API_KEY environment variable on the server; it takes precedence.';
  } else if (v.hasKey) {
    help = 'A key is saved (' + v.keyHint + '). Leave this blank to keep it.';
  } else {
    help = local ? 'Most local servers do not need a key.' : 'Paste the API key from your provider account.';
  }
  $('#llmApiKeyHelp').text(help);
  $('#llmApiKey').attr('placeholder', v.hasKey && v.keySource === 'saved' ? 'Saved key ' + v.keyHint : '');
  $('#llmClearKeyRow').toggle(Boolean(v.hasKey && v.keySource === 'saved'));
}

function llmShowSettings (view) {
  llmSettingsView = view;
  $('#llmProvider').val(view.provider || '');
  $('#llmModel').val(view.model || '');
  $('#llmBaseUrl').val(view.baseUrl || '');
  $('#llmApiKey').val('');
  $('#llmClearKey').prop('checked', false);
  llmUpdateProviderFields();
}

$(function () {
  $('#optionsModal').on('show.bs.modal', function () {
    llmSetStatus('');
    socket.emit('llm-settings-request', { clientId: uuid });
  });

  $('#llmProvider').on('change', llmUpdateProviderFields);

  $('#llmSettingsForm').on('submit', function (event) {
    event.preventDefault();
    llmSetStatus('Saving…');
    socket.emit('llm-settings-save', {
      clientId: uuid,
      settings: {
        provider: $('#llmProvider').val(),
        model: $('#llmModel').val(),
        baseUrl: $('#llmProvider').val() === 'openai-compatible' ? $('#llmBaseUrl').val() : '',
        apiKey: $('#llmApiKey').val(),
        clearKey: $('#llmClearKey').prop('checked')
      }
    });
    $('#llmApiKey').val('');
  });

  $('#llmTestButton').on('click', function () {
    llmSetStatus('Testing the connection…');
    $('#llmTestButton').prop('disabled', true);
    socket.emit('llm-settings-test', { clientId: uuid });
  });
});

socket.on('llm-settings-response', function (data) {
  if (!data || !data.available) {
    $('#llmSettingsSection').hide();
    return;
  }
  $('#llmSettingsSection').show();
  if (data.error) {
    // Keep what the user typed so they can correct it
    llmSettingsView = data;
    llmUpdateProviderFields();
    llmSetStatus(data.error, 'error');
    return;
  }
  llmShowSettings(data);
  if (data.saved) {
    llmSetStatus('Saved.', 'ok');
    // Let an open dashboard enable its Generate button
    if ($('#narrativeCard').length) socket.emit('dashboard-narrative-request', { clientId: uuid });
  }
});

socket.on('llm-settings-test-response', function (data) {
  $('#llmTestButton').prop('disabled', false);
  llmSetStatus(data.message, data.ok ? 'ok' : 'error');
});
