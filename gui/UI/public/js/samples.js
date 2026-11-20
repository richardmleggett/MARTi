var sampleSearchTokens = [];
var sampleTaxonFilterMatches = new Map();
var sampleTaxonFilterRequestSerial = 0;
var sampleTaxonSuggestionRequestSerial = 0;
var sampleTaxonSuggestionTimer;
var sampleTaxonFilterRegistered = false;
var sampleSearchSuggestions = [];
var sampleTaxonSuggestionActive = -1;

function sampleTaxonFilterKey(runId, name) {
  return JSON.stringify([runId, name]);
}

function sampleTaxonFilterSamples() {
  return samplePageDataTable.rows().data().toArray().map(function(row) {
    return { runId: row[11], name: row[12] };
  });
}

function sampleSearchTaxonQuery(draft) {
  var prefixed = /^taxon\s*:\s*(.*)$/i.exec(draft);
  if (prefixed) return prefixed[1].trim();
  return /[a-z]/i.test(draft) && !draft.includes(':') ? draft : '';
}

function sampleSearchStructuredDraft(draft) {
  return /^(taxon|sample|run|pipeline|barcode|status)\s*:/i.test(draft);
}

function sampleSearchSuggestionQuery(draft) {
  var prefixed = /^(taxon|sample|run|pipeline|barcode|status)\s*:\s*(.*)$/i.exec(draft);
  return prefixed ? { type: prefixed[1].toLowerCase(), value: prefixed[2].trim() }
    : { type: 'all', value: draft };
}

function sampleSearchLocalSuggestions(draft) {
  var query = sampleSearchSuggestionQuery(draft);
  if (!['all', 'run', 'pipeline'].includes(query.type) ||
      (query.type === 'all' && query.value.length < 2) || !samplePageDataTable) return [];
  var lower = query.value.toLowerCase();
  var seen = new Set();
  var suggestions = [];
  samplePageDataTable.rows().data().toArray().forEach(function(row) {
    if (query.type !== 'pipeline') {
      var runName = String(row[2] == null ? '' : row[2]);
      if (runName && runName.toLowerCase().includes(lower) && !seen.has('run:' + runName)) {
        seen.add('run:' + runName);
        suggestions.push({ type: 'run', value: runName, label: runName, detail: 'Run' });
      }
    }
    if (query.type === 'pipeline') {
      var pipelineName = String(row[7] == null ? '' : row[7]);
      if (pipelineName && pipelineName.toLowerCase().includes(lower) && !seen.has('pipeline:' + pipelineName)) {
        seen.add('pipeline:' + pipelineName);
        suggestions.push({ type: 'pipeline', value: pipelineName,
          label: pipelineName, detail: 'Pipeline' });
      }
    }
  });
  suggestions.sort(function(a, b) {
    var aStarts = a.label.toLowerCase().startsWith(lower);
    var bStarts = b.label.toLowerCase().startsWith(lower);
    return Number(bStarts) - Number(aStarts) || a.label.localeCompare(b.label);
  });
  return suggestions.slice(0, 12);
}

function sampleSearchBarcodeMatches(query, barcode) {
  var requestedCode = /^(?:bc)?0*(\d+)$/i.exec(query.trim());
  if (requestedCode) {
    var sampleCode = /^(?:bc)?0*(\d+)$/i.exec(String(barcode == null ? '' : barcode).trim());
    return !!sampleCode && Number(sampleCode[1]) === Number(requestedCode[1]);
  }
  return formatBarcodeLabel(barcode).toLowerCase().includes(query.trim().toLowerCase());
}

function hideSampleTaxonSuggestions() {
  $('#sampleTaxonSuggestions').prop('hidden', true).empty();
  $('#sampleSearchInput').attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
  sampleTaxonSuggestionActive = -1;
}

function renderSampleSearchTokens() {
  var container = $('#sampleSearchTokens').empty();
  sampleSearchTokens.forEach(function(token, index) {
    var chip = $('<span class="sampleSearchToken"></span>').appendTo(container);
    $('<span></span>').text(token.label).appendTo(chip);
    $('<button type="button" aria-label="Remove filter"></button>')
      .attr('aria-label', 'Remove ' + token.label + ' filter')
      .html('&times;')
      .on('click', function() {
        var removed = sampleSearchTokens.splice(index, 1)[0];
        renderSampleSearchTokens();
        if (removed.type === 'taxon') requestSampleTaxonFilters();
        else drawSampleSearch();
        $('#sampleSearchInput').trigger('focus');
      }).appendTo(chip);
  });
  $('#sampleSearchClear').prop('hidden', !sampleSearchTokens.length && !$('#sampleSearchInput').val());
}

function addSampleSearchToken(token) {
  if (!sampleSearchTokens.some(function(existing) {
    return existing.type === token.type && existing.value.toLowerCase() === token.value.toLowerCase() &&
      existing.exact === token.exact;
  })) sampleSearchTokens.push(token);
  ++sampleTaxonSuggestionRequestSerial;
  clearTimeout(sampleTaxonSuggestionTimer);
  $('#sampleSearchInput').val('');
  hideSampleTaxonSuggestions();
  renderSampleSearchTokens();
  if (token.type === 'taxon') requestSampleTaxonFilters();
  else drawSampleSearch();
  $('#sampleSearchInput').trigger('focus');
}

function chooseSampleTaxonSuggestion(taxon) {
  addSampleSearchToken({ type: 'taxon', value: String(taxon.id),
    label: 'Taxon: ' + taxon.name + ' (' + taxon.id + ')' });
}

function chooseSampleSearchSuggestion(suggestion) {
  if (suggestion.type === 'taxon') chooseSampleTaxonSuggestion(suggestion);
  else addSampleSearchToken({ type: suggestion.type, value: suggestion.value,
    exact: true,
    label: (suggestion.type === 'run' ? 'Run: ' : 'Pipeline: ') + suggestion.label });
}

function renderSampleTaxonSuggestions() {
  var list = $('#sampleTaxonSuggestions').empty();
  sampleTaxonSuggestionActive = -1;
  sampleSearchSuggestions.forEach(function(suggestion, index) {
    var option = $('<button type="button" class="list-group-item list-group-item-action"></button>')
      .attr('id', 'sampleTaxonOption' + index)
      .attr('role', 'option')
      .attr('aria-selected', 'false')
      .on('mousedown', function(event) { event.preventDefault(); })
      .on('click', function() { chooseSampleSearchSuggestion(suggestion); });
    $('<span></span>').text(suggestion.label || suggestion.name).appendTo(option);
    $('<small class="d-block text-muted"></small>')
      .text(suggestion.type === 'taxon'
        ? (suggestion.rank ? suggestion.rank + ' · ' : '') + 'NCBI ID ' + suggestion.id
        : suggestion.detail)
      .appendTo(option);
    option.appendTo(list);
  });
  var open = sampleSearchSuggestions.length > 0;
  list.prop('hidden', !open);
  $('#sampleSearchInput').attr('aria-expanded', String(open));
}

function requestSampleTaxonSuggestions() {
  var draft = $('#sampleSearchInput').val().trim();
  var localSuggestions = sampleSearchLocalSuggestions(draft);
  sampleSearchSuggestions = localSuggestions;
  renderSampleTaxonSuggestions();
  var query = sampleSearchTaxonQuery(draft);
  var serial = ++sampleTaxonSuggestionRequestSerial;
  if (query.length < 2 && !(/^taxon\s*:/i.test(draft) && /^\d+$/.test(query))) return;
  socket.emit('sample-taxon-suggestions-request', {
    clientId: uuid,
    query: query,
    samples: sampleTaxonFilterSamples()
  }, function(response) {
    if (serial !== sampleTaxonSuggestionRequestSerial || currentPage !== 'Samples' ||
        draft !== $('#sampleSearchInput').val().trim()) return;
    var taxa = response && Array.isArray(response.suggestions) ? response.suggestions : [];
    sampleSearchSuggestions = localSuggestions.concat(taxa.map(function(taxon) {
      return Object.assign({ type: 'taxon', label: taxon.name }, taxon);
    }));
    renderSampleTaxonSuggestions();
    if (/^taxon\s*:/i.test(draft)) {
      $('#sampleTaxonFilterStatus').text(taxa.length
        ? 'Choose a taxon to include it and its descendants.'
        : 'No matching taxa with assigned reads in the loaded samples.');
    }
  });
}

function refreshSampleMapMarkers() {
  if (!markers || !samplePageDataTable) return;
  markers.clearLayers();
  existingMarkers = [];
  markerCoords = [];

  var visibleSamples = new Set();
  samplePageDataTable.rows({ search: 'applied' }).data().each(function(rowData) {
    visibleSamples.add(sampleTaxonFilterKey(rowData[11], rowData[12]));
  });
  for (const sampleMetaData of sampleMetaDataArray) {
    if (visibleSamples.has(sampleTaxonFilterKey(sampleMetaData.pathRun, sampleMetaData.pathName)) &&
        sampleMetaData.metadatafile && sampleMetaData.metadatafile.location) {
      addSampleMarkerToMap(sampleMetaData);
    }
  }
  $('#sampleMapCard').toggle(existingMarkers.length > 0);
}

function drawSampleSearch() {
  if (!samplePageDataTable) return;
  var draft = $('#sampleSearchInput').val().trim();
  samplePageDataTable.search(sampleSearchStructuredDraft(draft) ? '' : draft).draw(false);
  $('#samplePageDataTable thead>tr').children(':first-child').removeClass('checkSelected');
  $('#sampleSearchClear').prop('hidden', !sampleSearchTokens.length && !draft);
  refreshSampleMapMarkers();
  var taxonCount = sampleSearchTokens.filter(function(token) { return token.type === 'taxon'; }).length;
  if (sampleSearchTokens.length && sampleTaxonFilterMatches.size === taxonCount) {
    var count = samplePageDataTable.rows({ search: 'applied' }).count();
    $('#sampleTaxonFilterStatus').text(count === 1 ? '1 matching sample.' : count + ' matching samples.');
  }
}

function requestSampleTaxonFilters() {
  var serial = ++sampleTaxonFilterRequestSerial;
  var status = $('#sampleTaxonFilterStatus');
  var ids = sampleSearchTokens.filter(function(token) { return token.type === 'taxon'; })
    .map(function(token) { return token.value; });
  sampleTaxonFilterMatches = new Map();
  if (!ids.length) {
    status.text('');
    drawSampleSearch();
    return;
  }
  drawSampleSearch();
  status.text('Finding samples with reads assigned to the selected taxa or their descendants…');
  var samples = sampleTaxonFilterSamples();
  ids.forEach(function(id) {
    socket.emit('sample-taxon-filter-request', {
      clientId: uuid, taxonId: id, samples: samples
    }, function(response) {
      if (serial !== sampleTaxonFilterRequestSerial || currentPage !== 'Samples') return;
      var matches = response && Array.isArray(response.matches) ? response.matches : [];
      sampleTaxonFilterMatches.set(id, new Set(matches.map(function(sample) {
        return sampleTaxonFilterKey(sample.runId, sample.name);
      })));
      if (sampleTaxonFilterMatches.size === ids.length) {
        drawSampleSearch();
        var count = samplePageDataTable.rows({ search: 'applied' }).count();
        status.text(count === 1 ? '1 matching sample.' : count + ' matching samples.');
      }
    });
  });
}

function initialiseSamplePage() {
exportRequestPending = false;
mapUpdated = false;
$('#sampleMapCard').hide();
sampleSearchTokens = [];
sampleTaxonFilterMatches = new Map();
++sampleTaxonFilterRequestSerial;
++sampleTaxonSuggestionRequestSerial;
clearTimeout(sampleTaxonSuggestionTimer);
sampleSearchSuggestions = [];
hideSampleTaxonSuggestions();
renderSampleSearchTokens();

if (!sampleTaxonFilterRegistered) {
  $.fn.dataTable.ext.search.push(function(settings, searchData, dataIndex) {
    if (settings.nTable.id !== 'samplePageDataTable') return true;
    var row = settings.aoData[dataIndex]._aData;
    var text = searchData.join(' ').toLowerCase();
    return sampleSearchTokens.every(function(token) {
      var value = token.value.toLowerCase();
      if (token.type === 'text') return text.includes(value);
      if (token.type === 'taxon') {
        var matches = sampleTaxonFilterMatches.get(token.value);
        return !!matches && matches.has(sampleTaxonFilterKey(row[11], row[12]));
      }
      if (token.type === 'sample') return String(row[1]).toLowerCase().includes(value) ||
        String(row[12]).toLowerCase().includes(value);
      if (token.type === 'run' && token.exact) return String(row[2]).toLowerCase() === value;
      if (token.type === 'run') return String(row[2]).toLowerCase().includes(value) ||
        String(row[11]).toLowerCase().includes(value);
      if (token.type === 'pipeline' && token.exact) return String(row[7]).toLowerCase() === value;
      if (token.type === 'pipeline') return String(row[7]).toLowerCase().includes(value);
      if (token.type === 'barcode') return sampleSearchBarcodeMatches(token.value, row[3]);
      if (token.type === 'status') return String(row[8]).toLowerCase().includes(value);
      return true;
    });
  });
  sampleTaxonFilterRegistered = true;
}

if (!$.fn.DataTable.isDataTable('#samplePageDataTable')) {

  function compareSampleTableBarcodes(a, b, descending) {
    var first = a === null || a === '' || !Number.isFinite(Number(a)) ? null : Number(a);
    var second = b === null || b === '' || !Number.isFinite(Number(b)) ? null : Number(b);
    if (first === null && second !== null) return 1;
    if (second === null && first !== null) return -1;
    if (first === null || first === second) return 0;
    return (first < second ? -1 : 1) * (descending ? -1 : 1);
  }

  $.fn.dataTable.ext.type.order['marti-barcode-asc'] = function(a, b) {
    return compareSampleTableBarcodes(a, b, false);
  };
  $.fn.dataTable.ext.type.order['marti-barcode-desc'] = function(a, b) {
    return compareSampleTableBarcodes(a, b, true);
  };

  samplePageDataTable = $('#samplePageDataTable').DataTable({
    "language": {
      "emptyTable": "No samples found.<br><br>\
  You can specify a directory to monitor using the following command:<br>\
  <code>marti_gui --marti /path/to/marti_output</code><br><br>\
  For more details, visit: <a href='https://marti.readthedocs.io/en/latest/gui.html' target='_blank' style='text-decoration: underline;'>MARTi GUI Documentation</a>"
    },
  "columns": [
    {
    "data": null,
    "orderable": false,
    className: "select-checkbox",
    "defaultContent": ""
  },
  null,
  null,
  {
    type: 'marti-barcode',
    render: function(data, type) {
      return type === 'sort' || type === 'type' ? data : formatBarcodeLabel(data);
    }
  },
  null,
  null,
  null,
  null,
  null,
  null,
  {
  "data": null,
  "orderable": false,
  className: "moreInfo",
  "defaultContent": ""
  },
  null,
  null,
  null
  ],
  "columnDefs": [
      {
          "targets": [ 11,12 ],
          "visible": false,
          "searchable": false
      },
      {
          "targets": [ 13 ],
          "visible": false,
          "searchable": true
      }
  ],
    "dom": 't',
    "paging" : false,
    "order": [ 9, 'desc' ]
  });

}
samplePageDataTable.search('').draw(false);




// socket.emit('meta-request',{
//   clientId: uuid
// });

setTimeout(() => {
  socket.emit('meta-request', {
      clientId: uuid
  });
}, 100);


$('.compareSamplesInput').on('click', function() {

  // emitSelectedCompareSamples();

    if (comparePageUnlocked == false) {
      $('#compareModal').modal('show')
    } else {
    activeSidebarIcon($("#compare-item"));
    currentPage = "Compare";
    $("h1#pageTitle").text("Compare");
    $("#response").load("/compare.html", function(){
      $("html, body").animate({ scrollTop: "0px" });
      initialiseComparePage();
    });
  }
});

sampleListCurrent = [];

$('#sampleSearchField').on('click.sampleSearch', function(event) {
  if (!$(event.target).closest('button, input').length) $('#sampleSearchInput').trigger('focus');
});

$('#sampleSearchInput').on('input.sampleSearch', function() {
  ++sampleTaxonSuggestionRequestSerial;
  clearTimeout(sampleTaxonSuggestionTimer);
  sampleSearchSuggestions = [];
  hideSampleTaxonSuggestions();
  $('#sampleTaxonFilterStatus').text('');
  drawSampleSearch();
  var query = sampleSearchSuggestionQuery(this.value.trim());
  if ((query.type === 'all' && query.value.length >= 2) ||
      (['run', 'pipeline'].includes(query.type)) ||
      (query.type === 'taxon' && (query.value.length >= 2 || /^\d+$/.test(query.value)))) {
    sampleTaxonSuggestionTimer = setTimeout(requestSampleTaxonSuggestions, 200);
  } else if (!sampleSearchTokens.length) {
    $('#sampleTaxonFilterStatus').text('');
  }
});

$('#sampleSearchInput').on('keydown.sampleSearch', function(event) {
  if (event.key === 'Escape') {
    hideSampleTaxonSuggestions();
    return;
  }
  if (event.key === 'Backspace' && !this.value && sampleSearchTokens.length) {
    event.preventDefault();
    var removed = sampleSearchTokens.pop();
    renderSampleSearchTokens();
    if (removed.type === 'taxon') requestSampleTaxonFilters();
    else drawSampleSearch();
    return;
  }
  var suggestionsOpen = sampleSearchSuggestions.length && !$('#sampleTaxonSuggestions').prop('hidden');
  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestionsOpen) {
    event.preventDefault();
    var step = event.key === 'ArrowDown' ? 1 : -1;
    sampleTaxonSuggestionActive = sampleTaxonSuggestionActive < 0
      ? (step > 0 ? 0 : sampleSearchSuggestions.length - 1)
      : (sampleTaxonSuggestionActive + step + sampleSearchSuggestions.length) % sampleSearchSuggestions.length;
    var list = document.getElementById('sampleTaxonSuggestions');
    var option = document.getElementById('sampleTaxonOption' + sampleTaxonSuggestionActive);
    $('#sampleTaxonSuggestions [role="option"]').removeClass('active').attr('aria-selected', 'false');
    $(option).addClass('active').attr('aria-selected', 'true');
    this.setAttribute('aria-activedescendant', 'sampleTaxonOption' + sampleTaxonSuggestionActive);
    var listBounds = list.getBoundingClientRect();
    var optionBounds = option.getBoundingClientRect();
    if (optionBounds.bottom > listBounds.bottom) {
      list.scrollTop += optionBounds.bottom - listBounds.bottom;
    } else if (optionBounds.top < listBounds.top) {
      list.scrollTop -= listBounds.top - optionBounds.top;
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (suggestionsOpen && sampleTaxonSuggestionActive >= 0) {
      chooseSampleSearchSuggestion(sampleSearchSuggestions[sampleTaxonSuggestionActive]);
      return;
    }
    var draft = this.value.trim();
    if (!draft) return;
    var parsed = /^(taxon|sample|run|pipeline|barcode|status)\s*:\s*(.*)$/i.exec(draft);
    if (parsed) {
      var type = parsed[1].toLowerCase();
      var value = parsed[2].trim();
      if (type === 'taxon' && !/^\d+$/.test(value)) {
        $('#sampleTaxonFilterStatus').text('Choose a taxon from the suggestions or enter a numeric NCBI ID.');
        return;
      }
      if (!value) return;
      addSampleSearchToken({ type: type, value: value,
        label: type.charAt(0).toUpperCase() + type.slice(1) + ': ' + value });
    } else {
      addSampleSearchToken({ type: 'text', value: draft, label: draft });
    }
  }
});

$('#sampleSearchInput').on('focus.sampleSearch', function() {
  var query = sampleSearchSuggestionQuery(this.value.trim());
  if ((query.type === 'all' && query.value.length < 2) ||
      (query.type === 'taxon' && query.value.length < 2 && !/^\d+$/.test(query.value)) ||
      !['all', 'run', 'pipeline', 'taxon'].includes(query.type)) return;
  if (sampleSearchSuggestions.length) renderSampleTaxonSuggestions();
  else requestSampleTaxonSuggestions();
});

$(document).off('click.sampleTaxonSuggestions').on('click.sampleTaxonSuggestions', function(event) {
  if (!$(event.target).closest('.sampleSearchFieldWrap').length) hideSampleTaxonSuggestions();
});

$('#sampleSearchClear').on('click.sampleSearch', function() {
  sampleSearchTokens = [];
  $('#sampleSearchInput').val('');
  ++sampleTaxonSuggestionRequestSerial;
  clearTimeout(sampleTaxonSuggestionTimer);
  hideSampleTaxonSuggestions();
  renderSampleSearchTokens();
  requestSampleTaxonFilters();
  $('#sampleSearchInput').trigger('focus');
});

$("#sampleDataSampleName").on('input', function(){
  var inputName = $("#sampleDataSampleName").val();
  var placeholder = $("#sampleDataSampleName").attr('placeholder');
  var setId;
  if (inputName != ""){
      setId = inputName;
  } else {
      setId = placeholder;
  }

  socket.emit('update-sample-name-request',{
    clientId: uuid,
    newId: setId,
    pathRun: currentSampleInfoModalData.pathRun,
    pathName: currentSampleInfoModalData.pathName,
    originalId: placeholder
  });


});

initialiseExportCard();
existingMarkers = [];
initialiseSampleMap();

};

var map, markers;
var mapUpdated = false;
var markerCoords = [];

function initialiseSampleMap(){

  if ($('#sampleMap').length === 0) {
    return;
  }

  updateOnlineStatus();

  if (map !== undefined && map !== null) {
    map.remove(); // Destroy the existing map instance before re-creating
  }

  map = L.map('sampleMap').setView([51.505, -0.09], 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  L.control.scale().addTo(map);

  markers = L.markerClusterGroup();


  $('#sampleMapCard').on('shown.bs.collapse', function () {
    map.invalidateSize();
    if (mapUpdated == false) {
      var bounds = L.latLngBounds(markerCoords);
      map.fitBounds(bounds);
    }
    mapUpdated = true;
  });


  $('#collapseSampleMap').on('click', '#sampleMap div.leaflet-popup-content-wrapper table tr:nth-child(1) > td:nth-child(2)', function() {

      var markerTable = $(this).closest('table');
      var sampleName = markerTable.data('path-name');
      var runId = markerTable.data('path-run');

      socket.emit('selected-dashboard-sample',{
        clientId: uuid,
        name: sampleName,
        runId: runId
      });

      activeSidebarIcon($("#dashboard-item"));
      currentPage = "Dashboard";
      $("h1#pageTitle").text("Dashboard");
      $("#response").load("/dashboard.html", function(){
        $("html, body").animate({ scrollTop: "0px" });
        initialiseDashboardPage();
      });

  });


  $('#collapseSampleMap').on('click', '#sampleMap div.leaflet-popup-content-wrapper table tr:nth-child(5) > td:nth-child(2)', function() {

    var markerTable = $(this).closest('table');
    var sampleName = markerTable.data('path-name');
    var runId = markerTable.data('path-run');

    $(this).closest('tr').toggleClass('checkSelected');

    $('#samplePageDataTable tbody tr').each(function() {
      var rowData = samplePageDataTable.row( $(this) ).data();
      var rowName = rowData[12];
      var rowRun = rowData[11];

      if (sampleName == rowName && runId == rowRun) {
        $(this).closest('tr').toggleClass('checkSelected');
      }
    });

    emitSelectedCompareSamples();
  });

  map.on('popupopen', function(e) {
    var markerTable = $('.leaflet-popup .table');
    for (var sampleData of selectedCompareMetaDataArray){
      if (markerTable.data('path-name') == sampleData.pathName && markerTable.data('path-run') == sampleData.pathRun) {
        $('#sampleMap div.leaflet-popup-content-wrapper table tr:nth-child(5)').addClass("checkSelected");
      }
    }
  });

}


var exportCardObject = {};
var exportRequestPending = false;
var exportCutoffRequestSerial = 0;

function refreshExportCutoffOptions() {
  var serial = ++exportCutoffRequestSerial;
  socket.emit('export-cutoff-options-request', { clientId: uuid }, function(response) {
    if (serial !== exportCutoffRequestSerial || currentPage !== 'Samples') return;
    var available = response && Array.isArray(response.lcas) ? response.lcas : [];
    var sampleCount = response ? response.sampleCount : 0;
    var choices = $('input[name="exportLcaCutoffToggle"]');
    choices.each(function() {
      var disabled = !available.includes('lca_' + this.value);
      this.disabled = disabled;
      $(this).closest('label').toggleClass('text-muted', disabled);
    });
    if (!choices.filter(':checked:not(:disabled)').length) {
      var fallback = choices.filter('[value="0.0"]:not(:disabled)');
      if (!fallback.length) fallback = choices.filter(':not(:disabled)').first();
      choices.prop('checked', false);
      fallback.prop('checked', true);
    }
    var enabledCount = choices.filter(':not(:disabled)').length;
    $('#exportLcaCutoffStatus').text(!sampleCount
      ? 'Select samples to see available cutoffs.'
      : !enabledCount
        ? 'No LCA cutoff has a taxonomy file for every selected sample.'
        : enabledCount === choices.length
          ? 'All cutoffs are available for the selected samples.'
          : 'Greyed out cutoffs are missing a taxonomy file for at least one selected sample.');
    $('#sampleExportButton').prop('disabled', exportRequestPending ||
      (sampleCount > 0 && !enabledCount));
  });
}

function initialiseExportCard(){

  refreshExportCutoffOptions();

  var taxRankArray = ["All levels","Domain","Phylum","Class","Order","Family","Genus","Species"];
  // var defaultMaxJobs = 4;

  var taxRankOptions = d3.select("select[name='exportTaxRank']").selectAll("option")
      .data(taxRankArray);

  taxRankOptions.enter()
      .append("option")
      .text(function(d) {
          return d;
      });

  taxRankOptions.exit()
      .remove();

      function updateExportRankScope() {
        $('#exportRankScopeRow').toggle($('select[name="exportTaxRank"]').val() !== 'All levels');
      }
      $('select[name="exportTaxRank"]').on('change', updateExportRankScope);
      updateExportRankScope();

      $('#sampleExportButton').on("click", function() {

        if (selectedCompareMetaDataArray.length == 0){
            $('#exportModal').modal('show');
        } else if (!exportRequestPending) {
          exportCardObject = {};

          exportCardObject.lca = $('input[type="radio"][name="exportLcaCutoffToggle"]:checked').val();
          exportCardObject.rankName = $('select[name="exportTaxRank"] option:selected').text();
          exportCardObject.rankNum = getValueCaseInsensitive(taxonomicLevelDict, exportCardObject.rankName);
          exportCardObject.rankScope = $('input[name="exportRankScope"]:checked').val();
          exportCardObject.includeUnclassified = $('#exportIncludeUnclassified').prop('checked');
          exportCardObject.lineageIds = $('#exportLineageIds').prop('checked');
          exportCardObject.lineageNames = $('#exportLineageNames').prop('checked');
          exportCardObject.selectedSamples = selectedCompareMetaDataArray.map(function(sample) {
            return { id: sample.id, pathRun: sample.pathRun, pathName: sample.pathName, barcode: sample.barcode };
          });
          exportCardObject.columns = {};
          $("input:checkbox.export-col:checked").each(function() {
            exportCardObject.columns[$(this).data("value")] = {
              header:$(this).data("header")
            }
          });
          exportCardObject.delimiterName = $('input[type="radio"][name="exportDelimiterToggle"]:checked').val();
          exportCardObject.delimiter = $('input[type="radio"][name="exportDelimiterToggle"]:checked').data("delimiter");
          exportCardObject.extension = $('input[type="radio"][name="exportDelimiterToggle"]:checked').data("extension");

          exportRequestPending = true;
          $('#sampleExportButton').prop('disabled', true);
          $('#sampleExportStatus').removeClass('text-danger').text('Preparing export…');
          requestExportData(exportCardObject.lca);
        }
      });


};




function validateAndExtractLocation(location) {
    // Define the regex pattern for the location string
    const pattern = /^\s*(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)\s*$/;

    const match = location.match(pattern);
    if (!match) {
        return { isValid: false, latitude: null, longitude: null };
    }

    // Extract latitude and longitude from the regex groups
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);

    // Validate the ranges of latitude and longitude
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        return { isValid: true, latitude: latitude, longitude: longitude };
    }
    return { isValid: false, latitude: null, longitude: null };
}

var existingMarkers = [];

function addSampleMarkerToMap(data){

  if ($('#sampleMap').length === 0) {
    return;
  }

  var findMarker = existingMarkers.findIndex(e => e.pathName == data.pathName && e.pathRun == data.pathRun);

  if (findMarker == -1) {
    var location = data.metadatafile.location;

    const result = validateAndExtractLocation(location);

    if (result.isValid){

      $('#sampleMapCard').show();

      // var marker = L.marker([result.latitude, result.longitude]).addTo(map);
      var marker = L.marker([result.latitude, result.longitude]);
      markerCoords.push([result.latitude, result.longitude]);

      var popupContent = "";
      // popupContent += '<table class="table table-bordered"><thead><tr><th width="50%"><strong>Sample</strong> </th><th width="50%"><strong>Values</strong> </th></tr></thead><thead></thead><tbody>';
      popupContent += '<table class="table table-bordered" data-path-name="' + data.pathName + '" data-path-run="' + data.pathRun + '"><tbody>';
      popupContent += "<tr><td><strong>Sample Name:</strong></td>";
      popupContent += "<td>" + data.id + "</td></tr>";
      popupContent += "<tr><td><strong>Run Name:</strong></td>";
      popupContent += "<td>" + data.runId + "</td></tr>";
      popupContent += "<tr><td><strong>Location:</strong></td>";
      popupContent += "<td>" + data.metadatafile.locationName + "</td></tr>";
      popupContent += "<tr><td><strong>Coordinates:</strong></td>";
      popupContent += '<td><a href="https://www.google.com/maps?q=' + location + '" target="_blank">' + location + "</td></tr>";
      popupContent += "<tr><td><strong>Compare:</strong></td>";
      popupContent += '<td class="select-checkbox">' + "</td></tr>";
      popupContent += "</tbody></table>";

      // marker.bindPopup("<b>" + data.id + "</b><br>" + location);
      marker.bindPopup(popupContent);

      markers.addLayer(marker);
      map.addLayer(markers);

      existingMarkers.push({pathName:data.pathName,pathRun:data.pathRun});
    }
  }
}

var selectedCompareMetaDataArray = [];
var sampleMetaDataArray = [];

function formatDateForDisplay(dateString) {
  if (!dateString) return "";
  let formatted = dateString.replace('T', ' ').replace(/[Zz]$/, '');
  formatted = formatted.replace(/\.\d+$/, '');
  return formatted;
}

function updateSampleTable(data){

dataSampleList = [];

sampleMetaDataArray = [];

samplePageDataTable.clear();
markers.clearLayers();
existingMarkers = [];
  for (const [runId, samples] of Object.entries(data)) {
    var dirRunId = runId;
    for (const [sample, value] of Object.entries(samples)) {
    var sampleData = value.sample;
    sampleData.martiVersion = value.meta.martiVersion;
    var dirSampleId = sample;
    sampleMetaDataArray.push(sampleData);
    dataSampleList.push(sample);
    var keywords = "";
    if (sampleData.hasOwnProperty("metadatafile")){
      if (sampleData.metadatafile.hasOwnProperty("keywords")){
        keywords = sampleData.metadatafile.keywords;
      }
      if (sampleData.metadatafile.hasOwnProperty("location")){
        addSampleMarkerToMap(sampleData);
      }

    }
    // sampleData.readsPassBasecall = thousandsSeparators(sampleData.readsPassBasecall);
    // sampleData.readsAnalysed = thousandsSeparators(sampleData.readsAnalysed);

     sampleListCurrent.push(sampleData.id);

       samplePageDataTable.row.add([null,sampleData.id,sampleData.runId,sampleData.barcode == null ? null : sampleData.barcode,sampleData.yieldGb.toFixed(3),thousandsSeparators(sampleData.readsPassBasecall),thousandsSeparators(sampleData.readsAnalysed),sampleData.analysis.pipeline,sampleData.martiStatus,formatDateForDisplay(sampleData.analysisDate),null,dirRunId,dirSampleId,keywords]);

     };
 };

samplePageDataTable.draw(false);
if (sampleSearchTokens.some(function(token) { return token.type === 'taxon'; })) requestSampleTaxonFilters();
else drawSampleSearch();
if ($('#sampleSearchInput').val().trim()) requestSampleTaxonSuggestions();


  $('#samplePageDataTable tbody>tr[role="row"]>td:nth-child(2)').on('click', function() {
    var rowData = samplePageDataTable.row( $(this).closest('tr') ).data();
      var sampleName = rowData[12];
      var runId = rowData[11];

      socket.emit('selected-dashboard-sample',{
        clientId: uuid,
        name: sampleName,
        runId: runId
      });

      activeSidebarIcon($("#dashboard-item"));
      currentPage = "Dashboard";
      $("h1#pageTitle").text("Dashboard");
      $("#response").load("/dashboard.html", function(){
        $("html, body").animate({ scrollTop: "0px" });
        initialiseDashboardPage();
      });
  });


    $('#samplePageDataTable tbody>tr').children(':not(:nth-child(2)):not(:last-child)').on('click', function() {
      $(this).closest('tr').toggleClass('checkSelected');
      emitSelectedCompareSamples();

    });


  $('#samplePageDataTable thead>tr').children(':first-child')
    .off('click')
    .on('click', function(event) {
      event.stopPropagation();
  
      if($(this).hasClass('checkSelected')){
        $(this).removeClass('checkSelected');
        $('#samplePageDataTable tbody>tr').removeClass('checkSelected');
      } else {
        $(this).addClass('checkSelected');
        $('#samplePageDataTable tbody>tr').addClass('checkSelected');
      }
  
      emitSelectedCompareSamples();
  });


$('#samplePageDataTable tbody>tr').children(':last-child').on('click', function() {
    var rowData = samplePageDataTable.row( $(this).closest('tr') ).data();
    var sampleName = rowData[1];
    var runId = rowData[2];

    var thisMetaData;

    for (var sample of sampleMetaDataArray){
      if (sampleName == sample.id && runId == sample.runId){
        thisMetaData = sample;
      }
    };

    prepareSampleInfoModal(thisMetaData);

  $('#sampleInfoModal').modal('show');


});

  if (existingMarkers.length == 0) {
    $('#sampleMapCard').hide();
  } else {
    $('#sampleMapCard').show();
  }


};



// function emitSelectedCompareSamples() {
//   var selectedSamplesData = [];
//   $('#samplePageDataTable tbody tr.checkSelected').each(function() {
//     var rowData = samplePageDataTable.row( $(this) ).data();
//     var selectedRowData = {
//       name: rowData[12],
//       runId: rowData[11]
//     };
//     selectedSamplesData.push(selectedRowData);
//   });
//
//   socket.emit('selected-compare-samples', {
//     clientId: uuid,
//     data: selectedSamplesData
//   });
// }

function emitSelectedCompareSamples() {
  var selectedSamplesData = [];
  samplePageDataTable.rows().every(function() {
    if ($(this.node()).hasClass('checkSelected')) {
      var rowData = this.data();
      selectedSamplesData.push({ name: rowData[12], runId: rowData[11] });
    }
  });

  if(isEmpty(selectedSamplesData)) {
    comparePageUnlocked = false;
  } else {
    comparePageUnlocked = true;
  };

  socket.emit('selected-compare-samples', {
    clientId: uuid,
    data: selectedSamplesData
  });
}

function requestExportData(lca) {

  socket.emit('compare-tree-request',{
    clientId: uuid,
    lca: "lca_"+lca
  });


}


socket.on('meta-response', function(metaData) {
  if (!metaData || typeof metaData !== "object") {
    return;
  }
  if(currentPage=="Samples") {
    updateSampleTable(metaData);
  }
  socket.emit('current-dashboard-sample-request',{
    clientId: uuid
  });
  socket.emit('current-compare-samples-request',{
    clientId: uuid
  });

  if(currentPage=="Dashboard") {
    socket.emit('dashboard-accumulationChart-request',{
      clientId: uuid,
      rank:taxonomicRankSelectedTextLowerCase,
      lca: "lca_"+lcaAbundanceDashboard
    });
  };
});

socket.on('meta-update-available', request => {
  if(currentPage=="Samples") {
    socket.emit('meta-request',{
      clientId: uuid
    });
  } else if(currentPage == "Dashboard" && currentDashboardSampleName == request.sampleId) {
    socket.emit('dashboard-meta-request',{
      clientId: uuid
    });
  };
});

socket.on('sample-taxon-filter-data-updated', function() {
  if (currentPage !== 'Samples') return;
  refreshExportCutoffOptions();
  if (sampleSearchTokens.some(function(token) { return token.type === 'taxon'; })) requestSampleTaxonFilters();
  if ($('#sampleSearchInput').val().trim()) requestSampleTaxonSuggestions();
});

// socket.on('metadata-file-update-available', request => {
//   if(currentPage=="Samples") {
//     socket.emit('metadata-file-request',{
//       clientId: uuid
//     });
//   }
// });



// socket.on('meta-id-file-update-available', request => {
//   if(currentPage=="Samples") {
//     socket.emit('meta-request',{
//       clientId: uuid
//     });
//   } else if(currentPage == "Dashboard" && currentDashboardSampleRun == request.runId) {
//     socket.emit('dashboard-meta-request',{
//       clientId: uuid
//     });
//   };
// });

socket.on('current-dashboard-sample-response', function(sample) {
  if(sample.name == "") {
    dashboardPageUnlocked = false;
  } else {
    dashboardPageUnlocked = true;
  };
  currentDashboardSampleRun = sample.runId;
  currentDashboardSampleName = sample.name;

  $("#samplePageDataTable tbody tr").each(function() {

    var rowData = samplePageDataTable.row( $(this) ).data();

    if (typeof rowData !== 'undefined'){

      var selectedRowData = {
        name: rowData[12],
        runId: rowData[11]
      };
      if (selectedRowData.name == currentDashboardSampleName && selectedRowData.runId == currentDashboardSampleRun){
        $("tr").removeClass("dashboardSelected");
        $(this).addClass("dashboardSelected");
      };
    };


  });

});

// socket.on('current-dashboard-sample-url-switch', function(sample) {

//   currentDashboardSampleRun = sample.runId;
//   currentDashboardSampleName = sample.name;

//   activeSidebarIcon($("#dashboard-item"));
//   currentPage = "Dashboard";
//   $("h1#pageTitle").text("Dashboard");
//   $("#response").load("/dashboard.html", function(){
//     $("html, body").animate({ scrollTop: "0px" });
//     initialiseDashboardPage();
//   });

// });

socket.on('sample-not-found-url-switch', function(data) {

  activeSidebarIcon(this);
  currentPage = "Samples";
  $("h1#pageTitle").text("Samples");
  urlFormat();
  $("#response").load("/samples.html", function() {
  $("html, body").animate({ scrollTop: "0px" });
  initialiseSamplePage();
  });

});




socket.on('current-compare-samples-response', function(samples) {


  if(isEmpty(samples)) {
    comparePageUnlocked = false;
  } else {
    comparePageUnlocked = true;
  };

  selectedCompareMetaDataArray = [];

  var mapPopupSelected = false;

  for (const sampleMetaData of sampleMetaDataArray) {
    for (const sample of samples) {
      if (sampleMetaData.pathName == sample.name && sampleMetaData.pathRun == sample.runId) {
        selectedCompareMetaDataArray.push(sampleMetaData);

        if(currentPage=="Samples") {

          $('#samplePageDataTable tbody tr').each(function() {
            var rowData = samplePageDataTable.row( $(this) ).data();
            var selectedRowData = {
              name: rowData[12],
              runId: rowData[11]
            };
            if (selectedRowData.name == sample.name && selectedRowData.runId == sample.runId) {
              $(this).addClass("checkSelected");
            };
          });

          const allRows = $('#samplePageDataTable tbody>tr');
          const allSelected = allRows.length > 0 && allRows.filter('.checkSelected').length === allRows.length;

          const selectAllToggle = $('#samplePageDataTable thead>tr').children(':first-child');

          if (allSelected) {
            selectAllToggle.addClass('checkSelected');
          } else {
            selectAllToggle.removeClass('checkSelected');
          }

          if ($('.leaflet-popup').length > 0) {
            var markerTable = $('.leaflet-popup .table');
            if (markerTable.data('path-name') == sample.name && markerTable.data('path-run') == sample.runId) {
              mapPopupSelected = true;
              // $('#sampleMap div.leaflet-popup-content-wrapper table tr:nth-child(5)').addClass("checkSelected");
            };
          }

        };

      };
    };
  };

  if (mapPopupSelected) {
    $('#sampleMap div.leaflet-popup-content-wrapper table tr:nth-child(5)').addClass("checkSelected");
  } else {
    $('#sampleMap div.leaflet-popup-content-wrapper table tr:nth-child(5)').removeClass("checkSelected");
  }

  if (currentPage === 'Samples') refreshExportCutoffOptions();

});

var currentSampleInfoModalData;

function prepareSampleInfoModal(data){
  currentSampleInfoModalData = data;
  // $("#sampleDataSampleName").text(data.id);

  if (restrictedMode == false){
      $('#sampleDataSampleName').removeAttr('disabled');
  }

  $("#sampleDataSampleName").val(data.id);
  if(data.hasOwnProperty("originalId")){
    $("#sampleDataSampleName").attr('placeholder', data.originalId);
  } else {
    $("#sampleDataSampleName").attr('placeholder', data.id);
  }

  $("#sampleDataRunName").text(data.runId);
  $("#sampleDataSequencingDate").text(formatDateForDisplay(data.sequencingDate));
  $("#sampleDataAnalysisDate").text(formatDateForDisplay(data.analysisDate));

  $("#sampleDataYieldGb").text(data.yieldGb);
  $("#sampleDataBasecalledReads").text(thousandsSeparators(data.readsPassBasecall));
  $("#sampleDataReadsPassedFilter").text(thousandsSeparators(data.readsPassedFilter));
  $("#sampleDataReadsAnalysed").text(thousandsSeparators(data.readsAnalysed));
  $("#sampleDataReadsClassified").text(thousandsSeparators(data.readsWithClassification));
  $("#sampleDataReadsUnclassified").text(thousandsSeparators(data.readsUnclassified));
  $("#sampleDataReadsPoorAlignments").text(thousandsSeparators(data.readsWithPoorAlignments));

  $("#sampleDataMartiVersion").text(data.martiVersion);
  $("#sampleDataAnalysisStatus").text(data.martiStatus);
  $("#sampleDataAnalysisPipeline").text(data.analysis.pipeline);


}



function emitAsync(socket, event, data) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (response) => {
      if (response.error) {
        reject(response.error);
      } else {
        resolve(response.data);
      }
    });
  });
}


async function postToGrassroots(){
var taxIdArray = [];
  try {
    const responseData = await emitAsync(socket, 'compare-taxa-id-request', { clientId: uuid });
    taxIdArray = responseData;
  } catch (error) {
      console.error('Error:', error);
  }

  for (var sampleData of selectedCompareMetaDataArray){

    var sampleTaxIdArray = [];

    for (var sampleTaxData of taxIdArray) {
      if (sampleTaxData.id == sampleData.pathName && sampleTaxData.runId == sampleData.pathRun) {
        sampleTaxIdArray = sampleTaxData.taxIds;
      }
    };



    if (sampleData.hasOwnProperty("metadatafile")){
      var missingFields = [];
      var sampleName = sampleData.id;
      var sampleUuid = sampleData.uuid;
      var siteName = "";
      if (sampleData.metadatafile.hasOwnProperty("locationName")) {
        siteName = sampleData.metadatafile.locationName;
      } else {
        missingFields.push("site name");
      }
      var keywords = "";
      if (sampleData.metadatafile.hasOwnProperty("keywords")) {
        keywords = sampleData.metadatafile.keywords;
        keywords = keywords.replace(/,\s+/g, ',');
      }
      var latitude = 0.0;
      var longitude = 0.0;
      if (sampleData.metadatafile.hasOwnProperty("location")) {
        const [lat, lon] = sampleData.metadatafile.location.split(',');
        latitude = parseFloat(lat);
        longitude = parseFloat(lon);
      } else {
        missingFields.push("location");
      }
      var date = "";
      if (sampleData.metadatafile.hasOwnProperty("sampleDate")) {
        date = sampleData.metadatafile.sampleDate;
      } else {
        missingFields.push("date");
      }
      var time = "12:00:00"
      if (sampleData.metadatafile.hasOwnProperty("sampleTime")) {
        time = sampleData.metadatafile.sampleTime;
      } else {
        missingFields.push("time");
      }

      var dateTime = date + "T" + time;
      var postTemplate = {
        "services": [
            {
                "so:name": "MARTi submission service",
                "start_service": true,
                "parameter_set": {
                    "level": "simple",
                    "parameters": [
                        {
                            "param": "Name",
                            "current_value": sampleName
                        },
                        {
                            "param": "MARTi Id",
                            "current_value": sampleUuid
                        },
                        {
                            "param": "Site Name",
                            "current_value": siteName
                        },
                        {
                            "param": "Description",
                            "current_value": keywords
                        },
                        {
                            "param": "Latitude",
                            "current_value": latitude
                        },
                        {
                            "param": "Longitude",
                            "current_value": longitude
                        },
                        {
                            "param": "Start Date",
                            "current_value": dateTime
                        },
                        {
                            "param": "Taxa",
                            "current_value": sampleTaxIdArray
                        }
                    ]
                }
            }
        ]
      }

      if(missingFields.length > 0) {
          console.log(sampleData.id + " not posted. Missing field(s):", missingFields.join(", "))
      } else {
        console.log(JSON.stringify(postTemplate));

        socket.emit('post-to-grassroots-request',{
          clientId: uuid,
          sample:sampleData.id,
          body: JSON.stringify(postTemplate)
        });

      }
    } else {
      console.log(sampleData.id + " not posted. No metadata found.")
    }
  }

}
