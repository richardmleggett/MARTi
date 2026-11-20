// Floating AI chat panel for the Compare page and the sample dashboard.
//
// The panel stays open while the user changes tabs, so links in the answers ([text](marti:<target>)) can take
// them to the plot or table the answer refers to. Questions are answered on the GUI server (marti_llm.chat),
// which only lets the model see the samples open on the page. Conversations are kept in this browser only
// (localStorage), one per page and set of samples; the server stores none. Model text is never inserted as HTML.

var MARTI_CHAT_VERSION = 'v1';
var MARTI_CHAT_MAX_CONVERSATIONS = 30;
var MARTI_CHAT_MAX_MESSAGES = 60;

// Places in the GUI the model may link to. view: the tab to open; card: element id, or title: card header text.
var MARTI_CHAT_LINKS = {
  compare: [
    { id: 'samples-table', card: 'compareSamplesCard', reveal: '#compareSamplesToggle', description: 'Table of the compared samples, with their groups' },
    { id: 'stacked-bar', view: 'Plots', card: 'stackedBarCard', description: 'Stacked bar chart of taxon abundance per sample' },
    { id: 'taxa-heatmap', view: 'Plots', card: 'heatmapTaxaCard', description: 'Heatmap of taxon abundance across samples' },
    { id: 'taxa-tree', view: 'Plots', card: 'compareTaxaTreeCard', reveal: '#compareTaxaTreeCard > .card-header', description: 'Taxonomic tree with each sample\'s abundance' },
    { id: 'taxa-donut', view: 'Plots', card: 'compareDonutCard', description: 'Donut charts of composition per sample' },
    { id: 'taxon-trends', view: 'Plots', card: 'compareTaxonTrendsCard', description: 'Taxon trends: percentages of chosen taxa (by default bacteria, archaea, fungi, plants, animals, viruses) across the samples, e.g. over time' },
    { id: 'accumulation-curves', view: 'Diversity', card: 'compareRarefactionCard', description: 'Taxa accumulation (rarefaction) curves per sample' },
    { id: 'diversity-plot', view: 'Diversity', card: 'compareDiversityPlotCard', description: 'Alpha diversity plot by sample or group' },
    { id: 'diversity-table', view: 'Diversity', card: 'compareDiversityCard', description: 'Table of diversity metrics per sample' },
    { id: 'ordination', view: 'Ordination', card: 'compareOrdinationCard', description: 'PCoA ordination of the samples (beta diversity)' },
    { id: 'clustering', view: 'Ordination', card: 'compareDendrogramCard', description: 'UPGMA clustering dendrogram of the samples' },
    { id: 'distance-matrix', view: 'Ordination', card: 'compareDistanceMatrixCard', description: 'Matrix of distances between samples' },
    { id: 'taxon-correlation', view: 'TaxonRelationships', card: 'compareTaxonCorrelationCard', description: 'Correlation of two taxa across samples' },
    { id: 'strongest-correlations', view: 'TaxonRelationships', card: 'compareTaxonDiscoveryCard', description: 'List of the most strongly correlated taxon pairs' },
    { id: 'cooccurrence', view: 'TaxonRelationships', card: 'compareCooccurrenceCard', description: 'Co-occurrence network of taxa' },
    { id: 'shared-taxa', view: 'TaxonRelationships', card: 'compareUpSetCard', description: 'UpSet plot of taxa shared between samples or groups' },
    { id: 'amr-heatmap', view: 'Amr', card: 'compareAmrHmCard', description: 'Heatmap of antimicrobial resistance genes across samples' }
  ],
  dashboard: [
    { id: 'reads-summary', title: 'Reads', description: 'Read counts, classification and run status' },
    { id: 'narrative', card: 'narrativeCard', description: 'The written narrative analysis of this sample, if any' },
    { id: 'taxa-table', view: 'Taxonomy', title: 'Taxa Table', description: 'Table of taxa with read counts' },
    { id: 'taxa-donut', view: 'Taxonomy', card: 'donutCard', description: 'Donut chart of composition' },
    { id: 'taxa-tree', view: 'Taxonomy', card: 'taxonomicTreeCard', description: 'Taxonomic tree' },
    { id: 'treemap', view: 'Taxonomy', card: 'treeMapCard', description: 'Treemap of composition' },
    { id: 'sankey', view: 'Taxonomy', card: 'sankeyPlotCard', description: 'Sankey plot from domain down to species' },
    { id: 'diversity', view: 'Diversity', selector: '#dashboardDiversityView .card', description: 'Taxa accumulation and diversity during the run' },
    { id: 'amr-table', view: 'Amr', title: 'AMR Table', description: 'Table of antimicrobial resistance genes' },
    { id: 'amr-hosts', view: 'Amr', title: 'Putative Host Taxa Analysis', description: 'Taxa the resistance genes were found in' },
    { id: 'amr-hits', view: 'Amr', title: 'AMR hits', description: 'Resistance gene hits by drug class or mechanism' }
  ],
  samples: [
    { id: 'samples-table', title: 'Sample selector', description: 'The table of samples, where samples are selected' },
    { id: 'sample-map', card: 'sampleMapCard', reveal: '#sampleMapCard > .card-header', description: 'Map of samples that have coordinates' }
  ]
};

var MARTI_CHAT_SUGGESTIONS = {
  compare: [
    'Summarise the main differences between these samples.',
    'Which organisms of concern are present, and in which samples?',
    'Do the groups differ in diversity or composition?',
    'Which taxa tend to occur together?',
    'Are there any priority antimicrobial resistance genes?'
  ],
  samples: [
    'Select the samples collected in summer 2025.',
    'List the samples with Escherichia coli.',
    'Which samples contain Streptomyces?',
    'Which locations have the most samples?'
  ],
  dashboard: [
    'Summarise this sample.',
    'Are there any human pathogens in this sample?',
    'Which resistance genes were found, and in which organisms?',
    'Was the sample sequenced deeply enough?'
  ]
};

var martiChat = {
  status: null,            // from the server: {enabled, configured, canConfigure, model}
  page: null,              // 'compare' | 'dashboard' | null when the panel does not apply
  samples: [],             // [{runId, name}] open on the page, as the server sees them
  key: null,               // storage key of the conversation shown
  conversation: [],        // [{role, content, model, time}]
  pending: null,           // {requestId, key, page}
  progress: '',
  error: null,             // {message, key}
  open: false,
  scrollToken: 0,
  openToken: 0,            // a newer open_view replaces one still waiting for its dashboard
  undo: {},                // answer time -> {before, after, undone}: selections made in this page session          // a link's scrolling stops when another link is followed or the user scrolls
  wide: false,
  memory: {},              // conversations kept here when browser storage is unavailable
  storageOk: true,
  clearArmed: false
};

// Pure helpers (also used by tests) ----------------------------------------------------------------------------
function martiChatHash (text) {
  var h = 5381;
  for (var i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function martiChatStorageKey (page, samples) {
  var keys = (samples || []).map(function (s) { return JSON.stringify([String(s.runId), String(s.name)]); }).sort();
  return 'martiChat:' + MARTI_CHAT_VERSION + ':' + page + ':' + keys.length + ':' + martiChatHash(keys.join('|'));
}

// Split text into blocks: paragraphs and bullet/numbered lists.
function martiChatBlocks (text) {
  var blocks = [];
  String(text || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).forEach(function (chunk) {
    var lines = chunk.split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return;
    var bullet = /^\s*[-*•]\s+/;
    var numbered = /^\s*\d+[.)]\s+/;
    var current = null;
    lines.forEach(function (line) {
      var type = bullet.test(line) ? 'ul' : numbered.test(line) ? 'ol' : 'p';
      var content = line.replace(bullet, '').replace(numbered, '');
      if (type === 'p') content = content.replace(/^\s*#{1,6}\s+/, '');
      if (current && current.type === type && type !== 'p') {
        current.items.push(content);
      } else if (current && current.type === 'p' && type === 'p') {
        current.items.push(content);
      } else {
        current = { type: type, items: [content] };
        blocks.push(current);
      }
    });
  });
  return blocks;
}

// Inline formatting: **bold**, `code` and [label](marti:target). Everything else is text.
function martiChatInline (text) {
  var tokens = [];
  var re = /\*\*([^*\n]+?)\*\*|`([^`\n]+)`|\[([^\]\n]{1,200})\]\((marti:[^)\s]+)\)/g;
  var last = 0;
  var m;
  text = String(text || '');
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ t: 'strong', children: martiChatInline(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: 'code', v: m[2] });
    else tokens.push({ t: 'link', v: m[3], target: m[4].slice('marti:'.length) });
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push({ t: 'text', v: text.slice(last) });
  return tokens;
}

function martiChatPlain (text) {
  return String(text || '').replace(/\[([^\]\n]{1,200})\]\(marti:[^)\s]+\)/g, '$1');
}

function martiChatTranscript (conversation, contextLines, when) {
  var out = ['# MARTi AI chat', ''].concat(contextLines || []);
  out.push('Exported ' + (when || new Date()).toLocaleString() + '. AI-generated answers: check them against the results.', '');
  (conversation || []).forEach(function (m) {
    out.push(m.role === 'user' ? '## Question' : '## Answer' + (m.model ? ' (' + m.model + ')' : ''), '');
    out.push(martiChatPlain(m.content), '');
  });
  return out.join('\n');
}

function martiChatFindLink (page, target) {
  var list = MARTI_CHAT_LINKS[page] || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === target) return list[i];
  return null;
}

// Storage -------------------------------------------------------------------------------------------------
function martiChatLoad (key) {
  if (!martiChat.storageOk) return (martiChat.memory[key] || []).slice();
  try {
    var saved = JSON.parse(localStorage.getItem(key) || 'null');
    return saved && Array.isArray(saved.messages) ? saved.messages : [];
  } catch (_) {
    martiChat.storageOk = false;
    return (martiChat.memory[key] || []).slice();
  }
}

function martiChatSave (key, messages) {
  messages = messages.slice(-MARTI_CHAT_MAX_MESSAGES);
  martiChat.memory[key] = messages.slice();
  if (!martiChat.storageOk) return;
  try {
    var indexKey = 'martiChat:' + MARTI_CHAT_VERSION + ':index';
    var index = {};
    try { index = JSON.parse(localStorage.getItem(indexKey) || '{}') || {}; } catch (_) { index = {}; }
    if (messages.length) {
      localStorage.setItem(key, JSON.stringify({ messages: messages, updated: Date.now() }));
      index[key] = Date.now();
    } else {
      localStorage.removeItem(key);
      delete index[key];
    }
    Object.keys(index).filter(function (k) { return k !== key; })
      .sort(function (a, b) { return index[b] - index[a]; })
      .slice(MARTI_CHAT_MAX_CONVERSATIONS - (index[key] ? 1 : 0)).forEach(function (old) {
        localStorage.removeItem(old);
        delete index[old];
      });
    localStorage.setItem(indexKey, JSON.stringify(index));
  } catch (_) {
    martiChat.storageOk = false;
  }
}

// Panel ---------------------------------------------------------------------------------------------------
function martiChatBuildPanel () {
  if (document.getElementById('martiChatPanel')) return;
  var html =
    '<button type="button" id="martiChatLauncher" class="btn btn-primary shadow martiChatLauncher" hidden ' +
      'aria-controls="martiChatPanel" aria-expanded="false"><i class="fas fa-comments mr-2" aria-hidden="true"></i>Ask AI</button>' +
    '<section id="martiChatPanel" class="martiChatPanel shadow" aria-labelledby="martiChatTitle" hidden>' +
      '<header class="martiChatHeader">' +
        '<div class="martiChatHeading">' +
          '<h2 id="martiChatTitle">Ask AI <span class="badge badge-light martiChatBadge">AI</span></h2>' +
          '<p id="martiChatContext" class="martiChatContext"></p>' +
        '</div>' +
        '<div class="martiChatTools">' +
          '<button type="button" class="btn btn-link btn-sm" id="martiChatDownload" title="Download conversation" aria-label="Download conversation"><i class="fas fa-download" aria-hidden="true"></i></button>' +
          '<button type="button" class="btn btn-link btn-sm" id="martiChatClear" title="Clear conversation" aria-label="Clear conversation"><i class="fas fa-trash-alt" aria-hidden="true"></i></button>' +
          '<button type="button" class="btn btn-link btn-sm" id="martiChatWide" title="Larger panel" aria-label="Larger panel" aria-pressed="false"><i class="fas fa-expand" aria-hidden="true"></i></button>' +
          '<button type="button" class="btn btn-link btn-sm" id="martiChatClose" title="Close" aria-label="Close"><i class="fas fa-times" aria-hidden="true"></i></button>' +
        '</div>' +
      '</header>' +
      '<div id="martiChatMessages" class="martiChatMessages" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div id="martiChatNotice" class="martiChatNotice" hidden></div>' +
      '<form id="martiChatForm" class="martiChatForm">' +
        '<label for="martiChatInput" class="sr-only">Question</label>' +
        '<textarea id="martiChatInput" class="form-control form-control-sm" rows="2" maxlength="4000" placeholder="Ask about the samples on this page"></textarea>' +
        '<button type="submit" class="btn btn-primary btn-sm" id="martiChatSend" aria-label="Send"><i class="fas fa-paper-plane" aria-hidden="true"></i></button>' +
        '<button type="button" class="btn btn-outline-secondary btn-sm" id="martiChatStop" hidden>Stop</button>' +
      '</form>' +
      '<p class="martiChatFoot">AI answers can be wrong: check them against the results. This conversation is kept only in this browser.</p>' +
    '</section>';
  $('body').append(html);

  $('#martiChatLauncher').on('click', function () { martiChatSetOpen(true); });
  $('#martiChatClose').on('click', function () { martiChatSetOpen(false); });
  $('#martiChatWide').on('click', function () {
    martiChat.wide = !martiChat.wide;
    $('#martiChatPanel').toggleClass('martiChatPanelWide', martiChat.wide);
    $(this).attr('aria-pressed', String(martiChat.wide)).attr('title', martiChat.wide ? 'Smaller panel' : 'Larger panel')
      .find('i').toggleClass('fa-expand', !martiChat.wide).toggleClass('fa-compress', martiChat.wide);
  });
  $('#martiChatDownload').on('click', martiChatDownload);
  $('#martiChatClear').on('click', function () {
    if (!martiChat.clearArmed) {
      martiChat.clearArmed = true;
      $(this).addClass('text-danger').attr('title', 'Click again to clear this conversation');
      $('#martiChatNotice').text('Click the bin again to clear this conversation.').prop('hidden', false);
      setTimeout(function () { martiChatDisarmClear(); }, 4000);
      return;
    }
    martiChatDisarmClear();
    if (martiChat.key) martiChatSave(martiChat.key, []);
    martiChat.conversation = [];
    martiChat.error = null;
    martiChatRender();
  });
  $('#martiChatForm').on('submit', function (event) {
    event.preventDefault();
    martiChatAsk($('#martiChatInput').val());
  });
  $('#martiChatInput').on('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      martiChatAsk(this.value);
    }
  });
  $('#martiChatStop').on('click', function () {
    socket.emit('chat-cancel', { clientId: uuid });
  });
  $('#martiChatMessages').on('click', 'a.martiChatLink', function (event) {
    event.preventDefault();
    martiChatGo(this.getAttribute('data-target'));
  });
  $('#martiChatMessages').on('click', 'button.martiChatSuggestion', function () {
    martiChatAsk($(this).text());
  });
  $('#martiChatMessages').on('click', 'button.martiChatUndo', function () {
    var undo = martiChat.undo[this.getAttribute('data-time')];
    if (!undo) return;
    undo.undone = !undo.undone;
    martiChatSetSelection(undo.undone ? undo.before : undo.after);
    martiChatRender();
  });
  $('#martiChatMessages').on('click', 'button.martiChatReopen', function () {
    try { martiChatOpen(JSON.parse(this.getAttribute('data-open'))); } catch (_) { /* ignore */ }
  });
  $('#martiChatMessages').on('click', 'button.martiChatCompare', function () {
    $('#compare-item').trigger('click');
  });
  $('#martiChatMessages').on('click', 'button.martiChatRetry', function () {
    martiChat.error = null;
    martiChatSend();
  });
  $(document).on('keydown', function (event) {
    if (event.key === 'Escape' && martiChat.open && $(event.target).closest('#martiChatPanel').length) martiChatSetOpen(false);
  });
  // The user scrolling, or changing tab, ends a link's scrolling; a tab change also removes the extra space.
  $(window).on('wheel touchstart', function (event) {
    if (!$(event.target).closest('#martiChatPanel').length) martiChat.scrollToken++;
  });
  $(document).on('keydown', function (event) {
    if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(event.key) &&
        !$(event.target).closest('#martiChatPanel, input, textarea, select').length) martiChat.scrollToken++;
  });
  $(document).on('click', '.martiViewNav .nav-link', function () {
    martiChat.scrollToken++;
    martiChatSpacer(0);
  });
}

function martiChatDisarmClear () {
  if (!martiChat.clearArmed) return;
  martiChat.clearArmed = false;
  $('#martiChatClear').removeClass('text-danger').attr('title', 'Clear conversation');
  martiChatRenderNotice();
}

function martiChatSetOpen (open) {
  martiChat.open = open;
  try { sessionStorage.setItem('martiChatOpen', open ? '1' : ''); } catch (_) { /* not kept */ }
  martiChatRenderVisibility();
  if (open) {
    $('#martiChatInput').trigger('focus');
    martiChatScrollToEnd();
  } else {
    $('#martiChatLauncher').trigger('focus');
  }
}

function martiChatAvailable () {
  var s = martiChat.status;
  return Boolean(martiChat.page && s && s.enabled && (s.configured || s.canConfigure));
}

function martiChatRenderVisibility () {
  var available = martiChatAvailable();
  $('#martiChatLauncher').prop('hidden', !available || martiChat.open).attr('aria-expanded', String(martiChat.open));
  $('#martiChatPanel').prop('hidden', !available || !martiChat.open);
}

function martiChatContextLines () {
  var n = martiChat.samples.length;
  if (martiChat.page === 'samples') {
    return ['Samples page: ' + n + (n === 1 ? ' sample' : ' samples') + ' listed' +
      (martiChat.status && martiChat.status.scope ? ' (project ' + martiChat.status.scope + ')' : '')];
  }
  if (martiChat.page === 'dashboard') {
    return n ? ['Sample: ' + martiChat.samples[0].name + ' (run ' + martiChat.samples[0].runId + ')'] : [];
  }
  var lines = ['Comparing ' + n + (n === 1 ? ' sample' : ' samples') + ':'];
  martiChat.samples.forEach(function (s) {
    var group = martiChatGroupOf(s);
    lines.push('- ' + s.name + ' (run ' + s.runId + ')' + (group ? ', group ' + group : ''));
  });
  return lines;
}

function martiChatGroupOf (s) {
  return typeof compareSampleGroupValue === 'function' ? compareSampleGroupValue(s.runId, s.name) : '';
}

function martiChatRenderContext () {
  var text = '';
  var n = martiChat.samples.length;
  if (martiChat.page === 'samples') {
    var selected = martiChatSelection().length;
    text = n ? 'Find and select from the ' + n + (n === 1 ? ' sample' : ' samples') + ' listed' +
      ' · ' + selected + ' selected' : 'No samples are listed yet.';
  } else if (martiChat.page === 'dashboard') {
    text = n ? 'About sample ' + martiChat.samples[0].name : 'Open a sample to ask about it.';
  } else if (martiChat.page === 'compare') {
    var groups = {};
    martiChat.samples.forEach(function (s) {
      var g = martiChatGroupOf(s);
      if (g) groups[g] = (groups[g] || 0) + 1;
    });
    var names = Object.keys(groups).sort();
    text = n ? 'About the ' + n + (n === 1 ? ' sample' : ' samples') + ' being compared' +
      (names.length ? ' · groups: ' + names.map(function (g) { return g + ' (' + groups[g] + ')'; }).join(', ') : '')
      : 'Choose samples to compare first.';
  }
  $('#martiChatContext').text(text).attr('title', martiChatContextLines().join('\n'));
}

function martiChatAppendInline (parent, tokens) {
  tokens.forEach(function (tok) {
    if (tok.t === 'text') {
      parent.appendChild(document.createTextNode(tok.v));
    } else if (tok.t === 'strong') {
      var strong = document.createElement('strong');
      martiChatAppendInline(strong, tok.children);
      parent.appendChild(strong);
    } else if (tok.t === 'code') {
      var code = document.createElement('code');
      code.textContent = tok.v;
      parent.appendChild(code);
    } else if (tok.t === 'link') {
      var ok = tok.target.indexOf('sample/') === 0 || martiChatFindLink(martiChat.page, tok.target);
      if (!ok) {
        parent.appendChild(document.createTextNode(tok.v));
        return;
      }
      var a = document.createElement('a');
      a.href = '#';
      a.className = 'martiChatLink';
      a.setAttribute('data-target', tok.target);
      a.title = tok.target.indexOf('sample/') === 0 ? 'Open this sample\'s dashboard' : 'Show this on the page';
      a.textContent = tok.v;
      parent.appendChild(a);
    }
  });
}

function martiChatRenderText (container, text) {
  martiChatBlocks(text).forEach(function (block) {
    if (block.type === 'p') {
      var p = document.createElement('p');
      block.items.forEach(function (line, i) {
        if (i) p.appendChild(document.createElement('br'));
        martiChatAppendInline(p, martiChatInline(line));
      });
      container.appendChild(p);
    } else {
      var list = document.createElement(block.type);
      block.items.forEach(function (item) {
        var li = document.createElement('li');
        martiChatAppendInline(li, martiChatInline(item));
        list.appendChild(li);
      });
      container.appendChild(list);
    }
  });
}

function martiChatMessageElement (m) {
  var div = document.createElement('div');
  div.className = 'martiChatMessage ' + (m.role === 'user' ? 'martiChatUser' : 'martiChatAssistant');
  if (m.role === 'user') {
    div.textContent = m.content;
  } else {
    martiChatRenderText(div, m.content);
    if (m.selection) div.appendChild(martiChatSelectionElement(m));
    if (m.open && martiChatOpenLabel(m.open)) {
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn btn-link btn-sm martiChatReopen';
      again.setAttribute('data-open', JSON.stringify(m.open));
      again.textContent = 'Show ' + martiChatOpenLabel(m.open) + ' again';
      div.appendChild(again);
    }
    if (m.model) {
      var meta = document.createElement('div');
      meta.className = 'martiChatMeta';
      meta.textContent = m.model + (m.time ? ' · ' + new Date(m.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '');
      div.appendChild(meta);
    }
  }
  return div;
}

function martiChatRenderNotice () {
  var s = martiChat.status || {};
  var notice = $('#martiChatNotice').empty();
  var text = null;
  if (s.enabled && !s.configured) {
    if (s.canConfigure) {
      notice.append(document.createTextNode('To use the chat, choose an AI model in '));
      $('<a href="#" data-toggle="modal" data-target="#optionsModal">Options</a>').appendTo(notice);
      notice.append(document.createTextNode(' (the gear icon, top right).'));
      notice.prop('hidden', false);
      return;
    }
    text = 'No AI model has been set up on this server.';
  } else if (!martiChat.samples.length) {
    text = martiChat.page === 'dashboard' ? 'Open a sample to ask about it.' : 'Choose samples to compare first.';
  } else if (!martiChat.storageOk) {
    text = 'This browser is not keeping conversations: they will be lost when you leave the page.';
  }
  notice.text(text || '').prop('hidden', !text);
}

function martiChatRender () {
  if (!document.getElementById('martiChatPanel')) return;
  martiChatRenderContext();
  martiChatRenderNotice();
  var box = document.getElementById('martiChatMessages');
  $(box).empty();
  var ready = Boolean(martiChat.status && martiChat.status.configured && martiChat.samples.length);
  if (!martiChat.conversation.length && ready) {
    var intro = document.createElement('div');
    intro.className = 'martiChatIntro';
    var p = document.createElement('p');
    p.textContent = {
      dashboard: 'Ask a question about this sample. Answers link to the plots and tables they are based on.',
      compare: 'Ask a question about the samples being compared. Answers link to the plots and tables they are based on.',
      samples: 'Find samples by organism, date, place or keyword, or ask to select them for comparison.'
    }[martiChat.page];
    intro.appendChild(p);
    (MARTI_CHAT_SUGGESTIONS[martiChat.page] || []).forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-outline-primary btn-sm martiChatSuggestion';
      b.textContent = q;
      intro.appendChild(b);
    });
    box.appendChild(intro);
  }
  martiChat.conversation.forEach(function (m) { box.appendChild(martiChatMessageElement(m)); });
  var pendingHere = martiChat.pending && martiChat.pending.key === martiChat.key;
  if (pendingHere) {
    var wait = document.createElement('div');
    wait.className = 'martiChatMessage martiChatAssistant martiChatWaiting';
    wait.setAttribute('role', 'status');
    var spin = document.createElement('span');
    spin.className = 'spinner-border spinner-border-sm text-primary mr-2';
    spin.setAttribute('aria-hidden', 'true');
    wait.appendChild(spin);
    wait.appendChild(document.createTextNode(martiChat.progress || 'Thinking'));
    box.appendChild(wait);
  }
  if (martiChat.error && martiChat.error.key === martiChat.key) {
    var err = document.createElement('div');
    err.className = 'alert alert-warning small martiChatError';
    err.setAttribute('role', 'alert');
    err.appendChild(document.createTextNode(martiChat.error.message + ' '));
    var last = martiChat.conversation[martiChat.conversation.length - 1];
    if (last && last.role === 'user') {
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn btn-link btn-sm p-0 martiChatRetry';
      retry.textContent = 'Try again';
      err.appendChild(retry);
    }
    box.appendChild(err);
  }
  var busy = Boolean(martiChat.pending);
  $('#martiChatInput').prop('disabled', !ready).attr('placeholder', {
    dashboard: 'Ask about this sample', compare: 'Ask about the samples being compared',
    samples: 'Find or select samples'
  }[martiChat.page] || '');
  $('#martiChatSend').prop('disabled', !ready || busy).prop('hidden', busy && pendingHere);
  $('#martiChatStop').prop('hidden', !(busy && pendingHere));
  $('#martiChatDownload, #martiChatClear').prop('disabled', !martiChat.conversation.length);
  martiChatScrollToEnd();
}

function martiChatScrollToEnd () {
  var box = document.getElementById('martiChatMessages');
  if (box) box.scrollTop = box.scrollHeight;
}

// Asking --------------------------------------------------------------------------------------------------
function martiChatViewState () {
  if (martiChat.page === 'compare') {
    return {
      tab: $.trim($('.martiViewNav .nav-link.active[id^="compare"]').text()) || undefined,
      rank: $.trim($('#taxonomicLevelSelectorCompare').text()) || undefined,
      minSupport: typeof lcaAbundanceCompare !== 'undefined' ? Number(lcaAbundanceCompare) : undefined
    };
  }
  return {
    tab: $.trim($('.martiViewNav .nav-link.active[id^="dashboard"]').text()) || undefined,
    rank: $.trim($('#taxonomicLevelSelectorDashboard').text()) || undefined,
    minSupport: typeof lcaAbundanceDashboard !== 'undefined' ? Number(lcaAbundanceDashboard) : undefined
  };
}

function martiChatAsk (text) {
  text = $.trim(text || '');
  if (!text || martiChat.pending || !martiChat.key) return;
  if (!(martiChat.status && martiChat.status.configured) || !martiChat.samples.length) return;
  martiChat.error = null;
  martiChat.conversation.push({ role: 'user', content: text, time: Date.now() });
  martiChatSave(martiChat.key, martiChat.conversation);
  $('#martiChatInput').val('');
  martiChatSend();
}

function martiChatSend () {
  var last = martiChat.conversation[martiChat.conversation.length - 1];
  if (!last || last.role !== 'user' || martiChat.pending) return;
  var requestId = 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  martiChat.pending = { requestId: requestId, key: martiChat.key, page: martiChat.page };
  martiChat.progress = 'Thinking';
  var request = {
    clientId: uuid,
    requestId: requestId,
    page: martiChat.page,
    view: martiChatViewState(),
    links: (MARTI_CHAT_LINKS[martiChat.page] || []).map(function (l) { return { id: l.id, description: l.description }; }),
    // views the model can open on any listed sample's dashboard ("open the treemap for sample X")
    dashboardLinks: MARTI_CHAT_LINKS.dashboard.map(function (l) { return { id: l.id, description: l.description }; }),
    messages: martiChat.conversation.map(function (m) { return { role: m.role, content: m.content }; })
  };
  if (martiChat.page === 'compare') {
    request.groups = martiChat.samples.map(function (s) { return { runId: s.runId, name: s.name, group: martiChatGroupOf(s) }; })
      .filter(function (g) { return g.group; });
    request.labels = martiChat.samples.map(function (s) {
      var label = typeof compareSampleNames !== 'undefined' && typeof compareSampleOrderKey === 'function'
        ? compareSampleNames[compareSampleOrderKey(s.runId, s.name)] : '';
      return { runId: s.runId, name: s.name, label: label || '' };
    }).filter(function (l) { return l.label; });
  }
  socket.emit('chat-ask', request);
  martiChatRender();
}

// Selecting samples (Samples page) ------------------------------------------------------------------------
// The selection is the GUI's own: the rows ticked in the Samples table, kept on the server as the client's
// compare samples. Answers can change it; each change can be undone while the page is open.
function martiChatSelection () {
  if (typeof selectedCompareMetaDataArray === 'undefined' || !Array.isArray(selectedCompareMetaDataArray)) return [];
  return selectedCompareMetaDataArray.map(function (m) { return { runId: m.pathRun, name: m.pathName }; });
}

function martiChatSelectionKey (s) {
  return JSON.stringify([String(s.runId), String(s.name)]);
}

// Pure: the selection after applying actions [{type: 'select', mode, samples}] to a starting selection.
function martiChatNextSelection (current, actions) {
  var order = [];
  var chosen = {};
  (current || []).forEach(function (s) {
    var k = martiChatSelectionKey(s);
    if (!chosen[k]) { chosen[k] = s; order.push(k); }
  });
  (actions || []).forEach(function (a) {
    if (!a || a.type !== 'select' || !Array.isArray(a.samples)) return;
    if (a.mode === 'replace' || !a.mode) { chosen = {}; order = []; }
    a.samples.forEach(function (s) {
      if (!s || typeof s.runId !== 'string' || typeof s.name !== 'string') return;
      var k = martiChatSelectionKey(s);
      if (a.mode === 'remove') {
        delete chosen[k];
      } else if (!chosen[k]) {
        chosen[k] = { runId: s.runId, name: s.name };
        order.push(k);
      }
    });
  });
  return order.filter(function (k) { return chosen[k]; }).map(function (k) { return chosen[k]; });
}

function martiChatSetSelection (samples) {
  var wanted = {};
  samples.forEach(function (s) { wanted[martiChatSelectionKey(s)] = true; });
  if (typeof samplePageDataTable !== 'undefined' && samplePageDataTable && $('#samplePageDataTable').length) {
    samplePageDataTable.rows().every(function () {
      var d = this.data();
      $(this.node()).toggleClass('checkSelected', Boolean(wanted[martiChatSelectionKey({ runId: d[11], name: d[12] })]));
    });
    var rows = $('#samplePageDataTable tbody>tr');
    $('#samplePageDataTable thead>tr').children(':first-child')
      .toggleClass('checkSelected', rows.length > 0 && rows.filter('.checkSelected').length === rows.length);
  }
  if (typeof comparePageUnlocked !== 'undefined') comparePageUnlocked = samples.length > 0;
  socket.emit('selected-compare-samples', { clientId: uuid, data: samples });
}

// Apply an answer's selection; returns what to show with the answer, or null.
function martiChatApplyActions (actions, time) {
  var selects = (actions || []).filter(function (a) { return a && a.type === 'select'; });
  if (!selects.length) return null;
  var before = martiChatSelection();
  var listed = {};
  martiChat.samples.forEach(function (s) { listed[martiChatSelectionKey(s)] = true; });
  var after = martiChatNextSelection(before, selects).filter(function (s) { return listed[martiChatSelectionKey(s)]; });
  martiChatSetSelection(after);
  martiChat.undo[time] = { before: before, after: after };
  return { count: after.length };
}

function martiChatSelectionElement (m) {
  var box = document.createElement('div');
  box.className = 'martiChatSelection';
  var undo = martiChat.undo[m.time];
  var text = document.createElement('span');
  text.textContent = undo && undo.undone ? 'Selection undone.'
    : m.selection.count + (m.selection.count === 1 ? ' sample' : ' samples') + ' selected.';
  box.appendChild(text);
  if (undo && martiChat.page === 'samples') {
    var u = document.createElement('button');
    u.type = 'button';
    u.className = 'btn btn-link btn-sm martiChatUndo';
    u.setAttribute('data-time', String(m.time));
    u.textContent = undo.undone ? 'Redo' : 'Undo';
    box.appendChild(u);
    if (!undo.undone && undo.after.length) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'btn btn-primary btn-sm martiChatCompare';
      c.textContent = 'Compare';
      box.appendChild(c);
    }
  }
  return box;
}

// Opening views the model was asked for -------------------------------------------------------------------
function martiChatOpenLabel (open) {
  var link = martiChatFindLink(open.sample ? 'dashboard' : open.page, open.target);
  if (!link) return '';
  var what = link.description.charAt(0).toLowerCase() + link.description.slice(1);
  return open.sample ? what + ' for ' + open.sample.name : what;
}

// {page, target, sample?}: a view on this page, or on a listed sample's dashboard (opened first if need be).
function martiChatOpen (open) {
  if (!open || typeof open.target !== 'string') return;
  if (!open.sample) {
    if (open.page === martiChat.page) martiChatGo(open.target, open.page);
    return;
  }
  var s = open.sample;
  if (typeof s.runId !== 'string' || typeof s.name !== 'string' || !martiChatFindLink('dashboard', open.target)) return;
  var here = martiChat.page === 'dashboard' && martiChat.samples[0] &&
    martiChat.samples[0].runId === s.runId && martiChat.samples[0].name === s.name;
  if (here) {
    martiChatGo(open.target, 'dashboard');
    return;
  }
  var token = ++martiChat.openToken;
  martiChatOpenDashboard(s.runId, s.name);
  var started = Date.now();
  (function waitForDashboard () {
    if (token !== martiChat.openToken) return;
    var ready = typeof currentPage !== 'undefined' && currentPage === 'Dashboard' && $('#narrativeCard').length &&
      martiChatTargetElement(martiChatFindLink('dashboard', open.target)).length;
    if (!ready && Date.now() - started < 15000) {
      setTimeout(waitForDashboard, 200);
      return;
    }
    if (!ready) return;
    setTimeout(function () {
      if (token !== martiChat.openToken) return;
      martiChatGo(open.target, 'dashboard');
      // this page has its own conversation, so say where the answer that opened it went
      martiChatNotify('Opened the ' + martiChatOpenLabel(open) + '. The answer is in the conversation on the page you asked from.');
    }, 300);
  })();
}

// Links ---------------------------------------------------------------------------------------------------
function martiChatNotify (message) {
  $('#martiChatNotice').text(message).prop('hidden', false);
  setTimeout(martiChatRenderNotice, 4000);
}

function martiChatTargetElement (link) {
  if (link.card) return $('#' + link.card).first();
  if (link.selector) return $(link.selector).first();
  if (link.title) {
    return $('#response .card-header h6').filter(function () { return $.trim($(this).text()) === link.title; })
      .first().closest('.card');
  }
  return $();
}

function martiChatGo (target, page) {
  if (!target) return;
  page = page || martiChat.page;
  if (target.indexOf('sample/') === 0) {
    var parts = target.slice('sample/'.length).split('/');
    if (parts.length !== 2) return;
    var runId = decodeURIComponent(parts[0]);
    var name = decodeURIComponent(parts[1]);
    if (!martiChat.samples.some(function (s) { return s.runId === runId && s.name === name; })) {
      martiChatNotify('That sample is not part of this conversation.');
      return;
    }
    martiChatOpenDashboard(runId, name);
    return;
  }
  var link = martiChatFindLink(page, target);
  if (!link) return;
  if (link.view) {
    if (page === 'compare' && typeof setCompareView === 'function') setCompareView(link.view);
    if (page === 'dashboard' && typeof setDashboardView === 'function') setDashboardView(link.view);
  }
  // open a collapsed section first (reveal: the control that opens it)
  var reveal = link.reveal ? $(link.reveal).first() : $();
  if (reveal.length && reveal.is(':visible') && reveal.attr('aria-expanded') === 'false') reveal.trigger('click');
  var el = martiChatTargetElement(link);
  if (!el.length || el.is(':hidden')) {
    martiChatNotify('That part of the page is not showing at the moment.');
    return;
  }
  if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) martiChatSetOpen(false);
  martiChatScrollToCard(el[0]);
}

// Height of the bars fixed at the top of the window (page title, and the Compare page's options bar).
function martiChatTopOffset () {
  var bars = [];
  $('.topbar, .fixed-options-bar').each(function () {
    var style = window.getComputedStyle(this);
    if ((style.position !== 'fixed' && style.position !== 'sticky') || style.display === 'none' ||
        style.visibility === 'hidden') return;
    var r = this.getBoundingClientRect();
    if (r.height > 0) bars.push(r);
  });
  // bars stacked from the top of the window (a bar further down the page does not count)
  var bottom = 0;
  bars.sort(function (a, b) { return a.top - b.top; }).forEach(function (r) {
    if (r.top <= bottom + 1) bottom = Math.max(bottom, r.bottom);
  });
  return bottom + 16;
}

function martiChatSpacer (height) {
  var spacer = document.getElementById('martiChatScrollSpacer');
  if (!height) {
    if (spacer) spacer.parentNode.removeChild(spacer);
    return;
  }
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.id = 'martiChatScrollSpacer';
    spacer.setAttribute('aria-hidden', 'true');
    (document.getElementById('response') || document.body).appendChild(spacer);
  }
  spacer.style.height = Math.ceil(height) + 'px';
}

// Scroll so the card's top sits just below the fixed bars. Plots on a newly opened tab are drawn after it opens
// and change the page's height, so wait until the card stops moving, scroll, then correct for late changes.
// A card near the end of the page gets temporary space below it so it can still reach the top.
function martiChatScrollToCard (el) {
  var token = ++martiChat.scrollToken;
  var smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var current = function () { return token === martiChat.scrollToken && document.body.contains(el); };
  var targetY = function () {
    martiChatSpacer(0);
    var y = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - martiChatTopOffset());
    var room = document.documentElement.scrollHeight - window.innerHeight;
    if (y > room) martiChatSpacer(y - room);
    return y;
  };
  var started = Date.now();
  var last = null;
  var stable = 0;
  (function waitForLayout () {
    if (!current()) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset;
    stable = last !== null && Math.abs(y - last) < 1 ? stable + 1 : 0;
    last = y;
    if (stable < 2 && Date.now() - started < 1500) {
      setTimeout(waitForLayout, 100);
      return;
    }
    window.scrollTo({ top: targetY(), behavior: smooth ? 'smooth' : 'auto' });
    el.classList.remove('martiChatFlash');
    void el.offsetWidth; // restart the animation
    el.classList.add('martiChatFlash');
    setTimeout(function () { el.classList.remove('martiChatFlash'); }, 2600);
    [900, 1800, 3000].forEach(function (delay) {
      setTimeout(function () {
        if (!current()) return;
        var y2 = targetY();
        if (Math.abs(window.pageYOffset - y2) > 4) window.scrollTo({ top: y2, behavior: 'auto' });
      }, delay);
    });
  })();
}

function martiChatOpenDashboard (runId, name) {
  socket.emit('selected-dashboard-sample', { clientId: uuid, name: name, runId: runId });
  if (typeof activeSidebarIcon === 'function') activeSidebarIcon($('#dashboard-item'));
  currentPage = 'Dashboard';
  $('h1#pageTitle').text('Dashboard');
  $('#response').load('/dashboard.html', function () {
    initialiseDashboardPage();
  });
}

function martiChatDownload () {
  if (!martiChat.conversation.length) return;
  var text = martiChatTranscript(martiChat.conversation, martiChatContextLines());
  var blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  var name = 'marti-chat-' + (martiChat.page === 'dashboard' && martiChat.samples[0]
    ? martiChat.samples[0].name : martiChat.page) + '-' + new Date().toISOString().slice(0, 10) + '.md';
  if (typeof saveAs === 'function') {
    saveAs(blob, name.replace(/[^\w.-]+/g, '_'));
  }
}

// Page tracking -------------------------------------------------------------------------------------------
function martiChatPageNow () {
  if (typeof currentPage === 'undefined') return null;
  if (currentPage === 'Compare') return 'compare';
  if (currentPage === 'Dashboard') return 'dashboard';
  if (currentPage === 'Samples') return 'samples';
  return null;
}

function martiChatRefresh () {
  var page = martiChatPageNow();
  martiChat.page = page;
  if (!page) {
    martiChatRenderVisibility();
    return;
  }
  if (typeof socket !== 'undefined' && uuid) socket.emit('chat-status-request', { clientId: uuid, page: page });
}

function martiChatShowConversation () {
  // the Samples page has one conversation per project; other pages one per set of samples
  var key = !martiChat.samples.length ? null : martiChat.page === 'samples'
    ? martiChatStorageKey('samples', [{ runId: 'project', name: (martiChat.status && martiChat.status.scope) || '' }])
    : martiChatStorageKey(martiChat.page, martiChat.samples);
  if (key !== martiChat.key) {
    martiChat.key = key;
    martiChat.conversation = key ? martiChatLoad(key) : [];
    martiChatDisarmClear();
  }
  martiChatRenderVisibility();
  martiChatRender();
}

function initialiseMartiChat () {
  martiChatBuildPanel();
  try { martiChat.open = sessionStorage.getItem('martiChatOpen') === '1'; } catch (_) { martiChat.open = false; }
  try {
    var probe = 'martiChat:probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch (_) {
    martiChat.storageOk = false;
  }
  var response = document.getElementById('response');
  if (response && window.MutationObserver) {
    var timer = null;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(martiChatRefresh, 150);
    }).observe(response, { childList: true });
  }

  socket.on('chat-status-response', function (data) {
    if (!data || data.page !== martiChat.page) return;
    martiChat.status = data;
    martiChat.samples = Array.isArray(data.samples) ? data.samples : [];
    martiChatShowConversation();
  });
  socket.on('chat-status-changed', martiChatRefresh);
  socket.on('current-compare-samples-response', function () {
    if (martiChat.page === 'compare') martiChatRefresh();
    // the selection count in the header (selectedCompareMetaDataArray is updated by this event's own handler)
    if (martiChat.page === 'samples') setTimeout(martiChatRenderContext, 0);
  });
  socket.on('current-dashboard-sample-response', function () { if (martiChat.page === 'dashboard') martiChatRefresh(); });
  socket.on('register-response', function () { setTimeout(martiChatRefresh, 0); });

  socket.on('chat-progress', function (data) {
    if (!martiChat.pending || !data || data.requestId !== martiChat.pending.requestId) return;
    martiChat.progress = data.message || 'Working';
    if (martiChat.pending.key === martiChat.key) {
      $('#martiChatMessages .martiChatWaiting').contents().filter(function () { return this.nodeType === 3; })
        .first().replaceWith(document.createTextNode(martiChat.progress));
    }
  });
  socket.on('chat-answer', function (data) {
    if (!martiChat.pending || !data || data.requestId !== martiChat.pending.requestId) return;
    var key = martiChat.pending.key;
    martiChat.pending = null;
    var conversation = key === martiChat.key ? martiChat.conversation : martiChatLoad(key);
    var message = { role: 'assistant', content: String(data.answer || ''), model: data.model || '', time: Date.now() };
    var selection = martiChatApplyActions(data.actions, message.time);
    if (selection) message.selection = selection;
    var opens = (data.actions || []).filter(function (a) { return a && a.type === 'open' && typeof a.target === 'string'; });
    if (opens.length) message.open = opens[opens.length - 1];
    conversation.push(message);
    martiChatSave(key, conversation);
    martiChatRender();
    if (message.open) martiChatOpen(message.open);
  });
  socket.on('chat-error', function (data) {
    if (!data) return;
    if (martiChat.pending && data.requestId && data.requestId !== martiChat.pending.requestId) return;
    var key = martiChat.pending ? martiChat.pending.key : martiChat.key;
    martiChat.pending = null;
    martiChat.error = data.cancelled ? null : { message: data.message || 'Something went wrong.', key: key };
    martiChatRender();
  });

  // Groups and names on the Compare page change the context shown in the header.
  $(document).on('change input', '.compareSampleGroupInput, #compareMetadataGroups', function () {
    setTimeout(martiChatRenderContext, 0);
  });
  martiChatRefresh();
}

$(function () {
  if (typeof socket !== 'undefined' && typeof $ !== 'undefined') initialiseMartiChat();
});
