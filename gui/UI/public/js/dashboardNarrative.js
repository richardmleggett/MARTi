// Narrative analysis card on the dashboard.
//
// Shows narrative.json for the current sample if one exists; otherwise, outside restricted mode, offers a
// "Generate narrative analysis" button. Generation runs on the GUI server (marti_llm.narrate). All text from the
// model is inserted with .text(), never as HTML.

var narrativeState = {
  sample: null,        // {id, runId} the card is showing, as reported by the server
  narrative: null,
  current: null,       // {readsAnalysed, martiStatus} of the sample now
  canGenerate: false,
  configured: false,
  generating: false,
  expanded: false
};

var NARRATIVE_PROVIDER_LABELS = {
  'anthropic': 'Anthropic',
  'openai': 'OpenAI',
  'openai-compatible': 'local or OpenAI-compatible server',
  'mcp': 'through the MARTi MCP server'
};

var NARRATIVE_PROFILE_LABELS = {
  'general': 'general',
  'clinical': 'clinical',
  'food_environment': 'food manufacturing environment',
  'environmental': 'environmental',
  'outdoor_air': 'outdoor air'
};

function narrativeFormatNumber (n) {
  return typeof n === 'number' ? n.toLocaleString() : String(n);
}

// Pure helpers (also used by tests) --------------------------------------------------------------------------
function narrativeStaleMessage (narrative, current) {
  if (!narrative || !narrative.basis || !current) return null;
  var then = narrative.basis.readsAnalysed;
  var now = current.readsAnalysed;
  if (typeof then === 'number' && typeof now === 'number' && now > then) {
    return 'Written when ' + narrativeFormatNumber(then) + ' reads had been analysed; ' +
      narrativeFormatNumber(now) + ' have been analysed now.';
  }
  if (narrative.basis.martiStatus && narrative.basis.martiStatus !== 'Complete' && current.martiStatus === 'Complete') {
    return 'Written while the analysis was still running; it has since completed.';
  }
  return null;
}

function narrativeCheckItems (validation) {
  if (!validation) return [];
  var items = [];
  if (validation.organisms_not_detected && validation.organisms_not_detected.length) {
    items.push('Named but not found in this sample\'s data (fine only if the text says they were not detected): ' +
      validation.organisms_not_detected.join(', '));
  }
  if (validation.genes_not_detected && validation.genes_not_detected.length) {
    items.push('Resistance genes named but not found in this sample: ' + validation.genes_not_detected.join(', '));
  }
  if (validation.numbers_not_found && validation.numbers_not_found.length) {
    items.push('Numbers that could not be matched to the results: ' + validation.numbers_not_found.join(', '));
  }
  return items;
}

function narrativeFooterText (narrative) {
  var when = '';
  if (narrative.generatedAt) {
    var d = new Date(narrative.generatedAt);
    if (!isNaN(d)) when = ' on ' + d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
  var reads = narrative.basis && typeof narrative.basis.readsAnalysed === 'number'
    ? ', from ' + narrativeFormatNumber(narrative.basis.readsAnalysed) + ' reads analysed' : '';
  var profile = NARRATIVE_PROFILE_LABELS[narrative.profile] || narrative.profile;
  return 'Written by ' + narrative.model + ' (' + (NARRATIVE_PROVIDER_LABELS[narrative.provider] || narrative.provider) +
    ')' + when + reads + (profile ? ', ' + profile + ' profile' : '') +
    '. AI-generated: check it against the results on this page.';
}

// Rendering --------------------------------------------------------------------------------------------------
function renderNarrativeCard () {
  if (!$('#narrativeCard').length) return;
  var s = narrativeState;
  var button = $('#narrativeGenerateButton');

  if (s.canGenerate) {
    button.show();
    button.text(s.narrative ? 'Regenerate' : 'Generate narrative analysis');
    button.prop('disabled', s.generating || !s.configured);
    button.attr('title', s.configured ? '' : 'Choose an AI model in Options (gear icon) first');
  } else {
    button.hide();
  }

  $('#narrativeProgress').toggle(s.generating);

  var empty = $('#narrativeEmpty');
  if (s.narrative || s.generating) {
    empty.hide();
  } else {
    empty.empty();
    if (!s.canGenerate) {
      empty.text('No narrative analysis has been generated for this sample.');
    } else if (!s.configured) {
      empty.append(document.createTextNode('No narrative analysis for this sample yet. To generate one, choose an AI model in '));
      $('<a href="#" data-toggle="modal" data-target="#optionsModal">Options</a>').appendTo(empty);
      empty.append(document.createTextNode(' (the gear icon, top right).'));
    } else {
      empty.text('No narrative analysis for this sample yet. Generate one for a written summary of the results ' +
        'on this page: organisms of note, resistance genes and data quality.');
    }
    empty.show();
  }

  var content = $('#narrativeContent');
  if (!s.narrative) {
    content.hide();
    return;
  }
  var n = s.narrative;
  $('#narrativeSummary').text(n.summary || '');

  var sections = $('#narrativeSections').empty();
  (n.sections || []).forEach(function (section) {
    $('<h6></h6>').text(section.title).appendTo(sections);
    $('<p></p>').text(section.text).appendTo(sections);
  });
  sections.toggle(s.expanded);
  $('#narrativeToggle').toggle((n.sections || []).length > 0)
    .text(s.expanded ? 'Hide full analysis' : 'Show full analysis')
    .append($('<i aria-hidden="true"></i>').addClass('fas ' + (s.expanded ? 'fa-chevron-up' : 'fa-chevron-down')))
    .attr('aria-expanded', s.expanded ? 'true' : 'false');

  var stale = narrativeStaleMessage(n, s.current);
  $('#narrativeStale').text(stale ? stale + (s.canGenerate ? ' Regenerate to update it.' : '') : '').toggle(Boolean(stale));

  var checks = $('#narrativeChecks').empty().removeClass('narrativeChecksOk alert alert-warning');
  var items = narrativeCheckItems(n.validation);
  if (items.length) {
    checks.addClass('alert alert-warning');
    $('<strong></strong>').text('Automatic checks found things to verify:').appendTo(checks);
    var list = $('<ul></ul>').appendTo(checks);
    items.forEach(function (item) { $('<li></li>').text(item).appendTo(list); });
  } else if (n.validation) {
    checks.addClass('narrativeChecksOk')
      .text('Automatic checks: every organism, resistance gene and number matched the analysis results.');
  }

  $('#narrativeFooter').text(narrativeFooterText(n));
  content.show();
}

function showNarrativeError (message) {
  $('#narrativeError').text(message || '').toggle(Boolean(message));
}

function narrativeForThisCard (data) {
  return data && narrativeState.sample && data.id === narrativeState.sample.id && data.runId === narrativeState.sample.runId;
}

// Called from initialiseDashboardPage() each time the dashboard loads
function initialiseDashboardNarrative () {
  narrativeState = {
    sample: null, narrative: null, current: null, canGenerate: false, configured: false,
    generating: false, expanded: false
  };
  showNarrativeError(null);

  $('#narrativeGenerateButton').off('click').on('click', function () {
    showNarrativeError(null);
    narrativeState.generating = true;
    $('#narrativeProgressText').text('Starting');
    renderNarrativeCard();
    socket.emit('narrative-generate-request', { clientId: uuid });
  });

  $('#narrativeToggle').off('click').on('click', function () {
    narrativeState.expanded = !narrativeState.expanded;
    renderNarrativeCard();
  });

  socket.emit('dashboard-narrative-request', { clientId: uuid });
}

// Socket handlers (registered once) --------------------------------------------------------------------------
socket.on('dashboard-narrative-response', function (data) {
  if (!$('#narrativeCard').length) return;
  narrativeState.sample = { id: data.id, runId: data.runId };
  narrativeState.narrative = data.narrative;
  narrativeState.current = data.current;
  narrativeState.canGenerate = data.canGenerate;
  narrativeState.configured = data.configured;
  narrativeState.generating = data.generating;
  if (data.generating && data.progress) $('#narrativeProgressText').text(data.progress.message);
  renderNarrativeCard();
});

socket.on('narrative-update-available', function (data) {
  if (!$('#narrativeCard').length || !narrativeForThisCard(data)) return;
  showNarrativeError(null);
  socket.emit('dashboard-narrative-request', { clientId: uuid });
});

socket.on('narrative-progress', function (data) {
  if (!$('#narrativeCard').length || !narrativeForThisCard(data)) return;
  narrativeState.generating = true;
  $('#narrativeProgressText').text(data.message || data.stage);
  renderNarrativeCard();
});

socket.on('narrative-error', function (data) {
  if (!$('#narrativeCard').length) return;
  if (narrativeState.sample && !narrativeForThisCard(data)) return;
  narrativeState.generating = false;
  showNarrativeError(data.message);
  renderNarrativeCard();
});

// Keep the "written at N reads" note current as the run progresses. The card follows sample updates itself,
// because the dashboard's own refresh relies on currentDashboardSampleName, which is not set when the dashboard
// is opened from a /sample/<uuid> link.
socket.on('meta-update-available', function (data) {
  if (!$('#narrativeCard').length || !data || !narrativeState.sample) return;
  if (data.sampleId !== narrativeState.sample.id || data.runId !== narrativeState.sample.runId) return;
  socket.emit('dashboard-narrative-request', { clientId: uuid });
});

socket.on('dashboard-meta-response', function (data) {
  if (!$('#narrativeCard').length || !data || !data.sample || !narrativeState.sample) return;
  if (data.sample.pathName !== narrativeState.sample.id || data.sample.pathRun !== narrativeState.sample.runId) return;
  narrativeState.current = { readsAnalysed: data.sample.readsAnalysed, martiStatus: data.sample.martiStatus };
  renderNarrativeCard();
});
