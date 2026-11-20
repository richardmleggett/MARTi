var compareTaxonTrendsBroadPreset = {
  id: 'broad_taxonomic_groups', name: 'Broad taxonomic groups',
  denominatorTaxonId: '1', minimumRootPercent: 0,
  taxa: [
    { id: '2', name: 'Bacteria' }, { id: '2157', name: 'Archaea' },
    { id: '4751', name: 'Fungi' }, { id: '33090', name: 'Plants' },
    { id: '33208', name: 'Animals' }, { id: '10239', name: 'Viruses' }
  ]
};
var compareTaxonTrendsPresets = [compareTaxonTrendsBroadPreset];
var compareTaxonTrendsData = [];
var compareTaxonTrendsRows = [];
var compareTaxonTrendsXAxisUserChosen = false;
var compareTaxonTrendsSeriesUserChosen = false;

function initialiseCompareTaxonTrends() {
  compareTaxonTrendsData = [];
  compareTaxonTrendsRows = [];
  compareTaxonTrendsXAxisUserChosen = false;
  compareTaxonTrendsSeriesUserChosen = false;
  var requestedProject = clientProject;
  $('#compareTaxonTrendsTooltip').remove();
  $('<div id="compareTaxonTrendsTooltip" class="compareTaxonTrendsTooltip" role="tooltip" hidden></div>').appendTo('body');

  $('#compareTaxonTrendsSettingsButton').off('.taxonTrends').on('click.taxonTrends', function() {
    compareTaxonTrendsSettingsOpen($('#compareTaxonTrendsSettings').prop('hidden'));
  });
  $('#compareTaxonTrendsSettingsClose').off('.taxonTrends').on('click.taxonTrends', function() {
    compareTaxonTrendsSettingsOpen(false, true);
  });
  $('#compareTaxonTrendsSettings').off('.taxonTrends').on('keydown.taxonTrends', function(event) {
    if (event.key === 'Escape') { event.preventDefault(); compareTaxonTrendsSettingsOpen(false, true); }
  });
  $('#compareTaxonTrendsSelection').off('.taxonTrends').on('change.taxonTrends', function() {
    var preset = compareTaxonTrendsPresets.find(function(item) { return item.id === this.value; }, this);
    if (preset) {
      $('#compareTaxonTrendsIds').val(preset.taxa.map(function(taxon) { return taxon.id; }).join(', '));
      $('#compareTaxonTrendsDenominator').val(preset.denominatorTaxonId);
      $('#compareTaxonTrendsMinimumPercent').val(preset.minimumRootPercent);
    }
    renderCompareTaxonTrends();
  });
  $('#compareTaxonTrendsIds').off('.taxonTrends').on('input.taxonTrends', function() {
    if ($('#compareTaxonTrendsSelection').val() !== 'custom') $('#compareTaxonTrendsSelection').val('custom');
    renderCompareTaxonTrends();
  });
  $('#compareTaxonTrendsDenominator, #compareTaxonTrendsMinimumPercent').off('.taxonTrends')
    .on('input.taxonTrends', renderCompareTaxonTrends);
  $('#compareTaxonTrendsXAxis').off('.taxonTrends').on('change.taxonTrends', function() {
    compareTaxonTrendsXAxisUserChosen = true;
    renderCompareTaxonTrends();
  });
  $('#compareTaxonTrendsSeries').off('.taxonTrends').on('change.taxonTrends', function() {
    compareTaxonTrendsSeriesUserChosen = true;
    renderCompareTaxonTrends();
  });
  $('#compareTaxonTrendsLineStyle, #compareTaxonTrendsShowPercent, #compareTaxonTrendsSharedScale').off('.taxonTrends')
    .on('change.taxonTrends', renderCompareTaxonTrends);
  $('#exportCompareTaxonTrendsSVG').off('.taxonTrends').on('click.taxonTrends', function(event) {
    event.preventDefault(); compareTaxonTrendsExportPlot('svg');
  });
  $('#exportCompareTaxonTrendsPNG').off('.taxonTrends').on('click.taxonTrends', function(event) {
    event.preventDefault(); compareTaxonTrendsExportPlot('png');
  });
  $('#exportCompareTaxonTrendsCSV').off('.taxonTrends').on('click.taxonTrends', function(event) {
    event.preventDefault(); compareTaxonTrendsExportCsv();
  });
  $(window).off('resize.taxonTrends').on('resize.taxonTrends', function() {
    if (currentPage === 'Compare') renderCompareTaxonTrends();
  });

  function installPresets(presets) {
    if (!$('#compareTaxonTrendsSelection').length) return;
    compareTaxonTrendsPresets = [compareTaxonTrendsBroadPreset].concat(presets.filter(function(preset) {
      return preset.id !== compareTaxonTrendsBroadPreset.id;
    }));
    $('#compareTaxonTrendsSelection option[data-preset]').remove();
    compareTaxonTrendsPresets.slice(1).forEach(function(preset) {
      $('<option>', { value: preset.id, text: preset.name }).attr('data-preset', 'true')
        .appendTo('#compareTaxonTrendsSelection');
    });
  }
  socket.emit('heatmap-taxa-presets-request', { clientId: uuid }, function(response) {
    if (!$('#compareTaxonTrendsSelection').length || clientProject !== requestedProject) return;
    if (response && Array.isArray(response.presets)) {
      installPresets(response.presets);
      if (response.error) $('#compareTaxonTrendsPresetStatus').text('Project presets could not be loaded: ' + response.error);
      return;
    }
    installPresets([]);
  });
}

function compareTaxonTrendsSettingsOpen(open, returnFocus) {
  $('#compareTaxonTrendsSettings').prop('hidden', !open);
  $('#compareTaxonTrendsSettingsButton').attr('aria-expanded', String(open)).toggleClass('active', open);
  if (open) $('#compareTaxonTrendsSettingsTitle').trigger('focus');
  else if (returnFocus) $('#compareTaxonTrendsSettingsButton').trigger('focus');
  window.requestAnimationFrame(renderCompareTaxonTrends);
}

function compareTaxonTrendsHideTooltip() {
  $('#compareTaxonTrendsTooltip').prop('hidden', true);
}

function compareTaxonTrendsShowTooltip(points, event) {
  var tooltip = $('#compareTaxonTrendsTooltip').empty();
  if (!points.length) return;
  if (points.length > 1) $('<strong></strong>').text(points.length + ' samples near this point').appendTo(tooltip);
  $('<div class="compareTaxonTrendsTooltipTaxon"></div>')
    .text(points[0].taxonName + ' (NCBI ' + points[0].taxonId + ')').appendTo(tooltip);
  points.slice(0, 5).forEach(function(point) {
    var row = $('<div class="compareTaxonTrendsTooltipRow"></div>').appendTo(tooltip);
    $('<strong></strong>').text(point.label).appendTo(row);
    $('<div></div>').text('Run: ' + point.runId).appendTo(row);
    if (point.date) $('<div></div>').text('Date: ' + point.date).appendTo(row);
    if (point.location) $('<div></div>').text('Location: ' + point.location).appendTo(row);
    if (point.series && point.series !== 'All samples') $('<div></div>').text('Series: ' + point.series).appendTo(row);
    $('<div></div>').text('Abundance: ' + point.percent.toFixed(3) + '% (' +
      Number(point.count).toLocaleString() + ' of ' + Number(point.denominator).toLocaleString() +
      ' ' + (plotLevelSelectedCompareId === 'base' ? 'bases' : 'reads') + ')').appendTo(row);
  });
  if (points.length > 5) $('<div></div>').text('And ' + (points.length - 5) + ' more overlapping samples.').appendTo(tooltip);
  tooltip.prop('hidden', false);
  var position = tooltipPositionAroundCursor(event, tooltip.outerWidth(), tooltip.outerHeight());
  tooltip.css({ left: position.left + 'px', top: position.top + 'px' });
}

function compareTaxonTrendsNearbyPoints(rows, anchor, x, y) {
  var anchorX = x(anchor), anchorY = y(anchor);
  return rows.map(function(row) {
    return { row: row, distance: Math.hypot(x(row) - anchorX, y(row) - anchorY) };
  }).filter(function(item) { return item.distance <= 9; })
    .sort(function(a, b) {
      if (a.row === anchor) return -1;
      if (b.row === anchor) return 1;
      return a.distance - b.distance || a.row.index - b.row.index;
    }).map(function(item) { return item.row; });
}

function compareTaxonTrendsSeries(sample, mode) {
  if (mode === 'group') return compareSampleGroupValue(sample.pathRun, sample.pathName);
  if (mode === 'location') return compareSampleMetadataGroup(sample, 'location');
  return 'All samples';
}

function compareTaxonTrendsValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  var parsed = new Date(date + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function compareTaxonTrendsHasDates(samples) {
  return samples.length > 0 && samples.every(function(sample) {
    return compareTaxonTrendsValidDate(compareSampleMetadataGroup(sample, 'date'));
  });
}

function compareTaxonTrendsHasAssignedGroups(samples, groupValue) {
  return samples.some(function(sample) {
    return Boolean(groupValue(sample.pathRun, sample.pathName));
  });
}

function compareTaxonTrendsTickLimit(innerWidth, dateAxis) {
  return Math.max(2, Math.min(dateAxis ? 8 : 18,
    Math.floor(innerWidth / (dateAxis ? 100 : 75))));
}

function compareTaxonTrendsDenominatorLabel(id, name, unit) {
  if (id === '1') return 'analysed ' + unit;
  return (name && name !== id ? name : 'NCBI taxon ' + id) + ' ' + unit;
}

function compareTaxonTrendsReplicateToken(row) {
  if (row.replicateId) return String(row.replicateId);
  // Infer a replicate only from names like CityCentre1_24-Jul at City Centre.
  var match = String(row.sampleId || '').match(/^(.+?)(\d+)_/);
  if (!match) return '';
  var site = String(row.location || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  var prefix = match[1].replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (!site || prefix !== site) return '';
  return match[2];
}

function compareTaxonTrendsLineTracks(members, dateAxis) {
  var sorted = members.slice().sort(function(a, b) {
    return dateAxis ? a.date.localeCompare(b.date) || a.index - b.index : a.index - b.index;
  });
  if (!dateAxis) return [{ id: '', rows: sorted }];
  var dateCounts = {};
  sorted.forEach(function(row) { dateCounts[row.date] = (dateCounts[row.date] || 0) + 1; });
  if (Object.keys(dateCounts).every(function(date) { return dateCounts[date] === 1; })) {
    return [{ id: '', rows: sorted }];
  }
  var byReplicate = {}, byDate = {};
  sorted.forEach(function(row) {
    var token = compareTaxonTrendsReplicateToken(row);
    if (token) (byReplicate[token] = byReplicate[token] || []).push(row);
    (byDate[row.date] = byDate[row.date] || []).push(token);
  });
  var tokens = Object.keys(byReplicate).sort();
  var consistent = tokens.length > 1 && Object.keys(byDate).length > 1 &&
    Object.keys(byDate).every(function(date) {
      var dateTokens = byDate[date].slice().sort();
      return dateTokens.length === tokens.length && dateTokens.every(function(token, i) { return token === tokens[i]; });
    });
  if (consistent) return tokens.map(function(token) { return { id: token, rows: byReplicate[token] }; });
  // Without a reliable replicate ID, leave same-date points separate.
  return [{ id: '', rows: sorted.filter(function(row) { return dateCounts[row.date] === 1; }) }];
}

function renderCompareTaxonTrends(data) {
  if (Array.isArray(data)) compareTaxonTrendsData = data;
  if (!$('#compareTaxonTrendsPlot').length) return;
  compareTaxonTrendsHideTooltip();
  var plot = d3.select('#compareTaxonTrendsPlot');
  plot.selectAll('*').remove();
  compareTaxonTrendsRows = [];
  var status = $('#compareTaxonTrendsStatus');
  var parsed = HeatmapTaxaSelection.parseTaxonIds($('#compareTaxonTrendsIds').val());
  var denominatorId = $('#compareTaxonTrendsDenominator').val().trim();
  var minimumText = $('#compareTaxonTrendsMinimumPercent').val();
  var minimumPercent = Number(minimumText);
  if (parsed.invalid.length || !/^\d+$/.test(denominatorId) || minimumText === '' ||
      !Number.isFinite(minimumPercent) || minimumPercent < 0 || minimumPercent > 100) {
    status.text(parsed.invalid.length ? 'Taxon IDs must contain digits only.' :
      !/^\d+$/.test(denominatorId) ? 'Enter a numeric denominator taxon ID.' :
      'Enter a minimum abundance between 0 and 100%.');
    return;
  }
  if (!parsed.ids.length) { status.text('Enter taxon IDs in Settings to see trends.'); return; }
  if (parsed.ids.length > 24) { status.text('Show up to 24 taxa at a time.'); return; }
  var preset = compareTaxonTrendsPresets.find(function(item) {
    return item.id === $('#compareTaxonTrendsSelection').val();
  });
  var presetNames = {};
  if (preset) preset.taxa.forEach(function(taxon) { presetNames[taxon.id] = taxon.name; });
  var order = Array.isArray(sortCompareNameArray) ? sortCompareNameArray : [];
  var samples = selectedCompareMetaDataArray || [];
  if (!compareTaxonTrendsXAxisUserChosen) {
    $('#compareTaxonTrendsXAxis').val(compareTaxonTrendsHasDates(samples) ? 'date' : 'samples');
  }
  if (!compareTaxonTrendsSeriesUserChosen) {
    $('#compareTaxonTrendsSeries').val(compareTaxonTrendsHasAssignedGroups(samples, compareSampleGroupValue) ?
      'group' : 'all');
  }
  var dateAxis = $('#compareTaxonTrendsXAxis').val() === 'date';
  var mode = $('#compareTaxonTrendsSeries').val();
  var percentMode = $('#compareTaxonTrendsShowPercent').prop('checked');
  var sharedScale = $('#compareTaxonTrendsSharedScale').prop('checked');
  var rows = [], missingDates = 0, missingTrees = 0, missingDenominators = 0, denominatorName = '';
  order.forEach(function(ordered, index) {
    var sample = samples.find(function(item) {
      return item.runId === ordered.runId && item.id === ordered.name;
    });
    var source = compareTaxonTrendsData.find(function(item) {
      return item.jsonRunId === ordered.runId && item.jsonId === ordered.name;
    });
    if (!sample || !source || !source.tree || !source.tree[plotLevelSelectedCompareTreeName]) {
      missingTrees++; return;
    }
    var date = compareSampleMetadataGroup(sample, 'date');
    if (dateAxis && !compareTaxonTrendsValidDate(date)) { missingDates++; return; }
    var cells = HeatmapTaxaSelection.buildSampleCells(
      source.tree[plotLevelSelectedCompareTreeName], parsed.ids, denominatorId, minimumPercent);
    if (!denominatorName && cells.denominatorName) denominatorName = cells.denominatorName;
    if (cells.missingDenominator) missingDenominators++;
    var series = compareTaxonTrendsSeries(sample, mode);
    parsed.ids.forEach(function(id) {
      var cell = cells.cells[id];
      rows.push({ taxonId: id, taxonName: presetNames[id] || cell.name, sampleId: sample.pathName,
        runId: sample.pathRun, label: compareSampleDisplayName(sample.pathRun, sample.pathName, sample.id),
        date: date, location: compareSampleMetadataGroup(sample, 'location'),
        replicateId: sample.metadatafile && sample.metadatafile.replicateId, index: index,
        series: series, count: cell.value, denominator: cells.denominator,
        percent: cell.proportion * 100 });
    });
  });
  compareTaxonTrendsRows = rows;
  if (!rows.length) {
    status.text(dateAxis ? 'No selected samples have both a sampling date and taxonomy data at this LCA cutoff.' :
      'No selected samples have taxonomy data at this LCA cutoff.');
    return;
  }
  var unit = plotLevelSelectedCompareId === 'base' ? 'bases' : 'reads';
  var denominatorLabel = compareTaxonTrendsDenominatorLabel(denominatorId,
    presetNames[denominatorId] || denominatorName, unit);
  var messages = [parsed.ids.length + ' taxa across ' + (rows.length / parsed.ids.length) + ' samples.'];
  if (percentMode) messages.push('Percent of ' + denominatorLabel + '.');
  if (mode !== 'all') {
    var ungrouped = rows.filter(function(row) { return row.taxonId === parsed.ids[0] && !row.series; }).length;
    if (ungrouped) messages.push(ungrouped + ' samples without a series are shown as unconnected points.');
  }
  if (missingDates) messages.push(missingDates + ' samples without a valid date omitted.');
  if (missingTrees) messages.push(missingTrees + ' samples without taxonomy data omitted.');
  if (missingDenominators) messages.push(missingDenominators + ' samples have no denominator ' + unit + '; shown at zero.');
  if (dateAxis) messages.push('Same-date samples share an x position; consistent replicate labels in sample IDs form separate lines.');
  if (preset && lcaAbundanceCompare !== '0.0') messages.push('This preset was built with the 0% LCA cutoff.');
  if (preset && plotLevelSelectedCompareId !== 'read') messages.push('This preset was built with Read count.');
  status.text(messages.join(' '));

  var seriesNames = Array.from(new Set(rows.map(function(row) { return row.series; }).filter(Boolean)));
  var width = Math.floor($('#compareTaxonTrendsPlot').width() || 0);
  if (width < 120) return;
  var measureContext = document.createElement('canvas').getContext('2d');
  if (measureContext) measureContext.font = '12px Arial';
  var legendLayout = seriesNames.length > 1 ? compareOrdinationLegendLayout(seriesNames, width - 116,
    function(label) { return measureContext ? measureContext.measureText(label).width : label.length * 7; }) : null;
  var margin = { left: 76, right: 28, top: 44, bottom: dateAxis ? 54 : 100 };
  var panelHeight = dateAxis ? 235 : 275;
  var panelStep = panelHeight + 16;
  var legendTop = parsed.ids.length * panelStep + 9;
  var height = legendLayout ? legendTop + legendLayout.height + 20 : legendTop + 16;
  var svg = plot.append('svg').attr('id', 'compareTaxonTrendsSvg')
    .attr('width', width).attr('height', height).attr('viewBox', '0 0 ' + width + ' ' + height)
    .style('font-family', 'Arial, Helvetica, sans-serif').style('background', '#fff');
  var innerWidth = width - margin.left - margin.right;
  var innerHeight = panelHeight - margin.top - margin.bottom;
  var dates = rows.map(function(row) { return row.date; }).filter(Boolean).sort();
  var xDate = dateAxis ? d3.time.scale.utc().domain(d3.extent(dates.map(function(date) {
    return new Date(date + 'T00:00:00Z');
  }))).range([0, innerWidth]) : null;
  if (dateAxis && dates[0] === dates[dates.length - 1]) {
    var only = new Date(dates[0] + 'T00:00:00Z').getTime();
    xDate.domain([new Date(only - 86400000), new Date(only + 86400000)]);
  }
  var xSample = d3.scale.ordinal().domain(order.map(function(_, index) { return index; }))
    .rangePoints([0, innerWidth], 0.35);
  var colours = d3.scale.category10().domain(seriesNames);
  var legendElements = [];
  function highlightSeries(series) {
    var selected = Array.isArray(series) ? series : series ? [series] : [];
    var active = selected.length > 0;
    function matches(value) { return selected.indexOf(value) !== -1; }
    svg.selectAll('.compareTaxonTrendsSeriesLine')
      .style('opacity', function() { return !active || matches(this.getAttribute('data-series')) ? 1 : 0.2; })
      .style('stroke-width', function() { return active && matches(this.getAttribute('data-series')) ? '3px' : null; });
    svg.selectAll('.compareTaxonTrendsPoint')
      .style('opacity', function(row) { return !active || matches(row.series) ? 1 : 0.25; })
      .style('stroke', function(row) { return active && matches(row.series) ? '#111' : null; })
      .style('stroke-width', function(row) { return active && matches(row.series) ? '2px' : null; });
    legendElements.forEach(function(item) {
      item.element.style('opacity', !active || matches(item.series) ? 1 : 0.3);
      item.label.style('font-weight', active && matches(item.series) ? 'bold' : 'normal');
    });
  }
  var globalMaximum = d3.max(rows, function(row) { return percentMode ? row.percent : row.count; }) || 0;
  var labelByIndex = new Map(rows.filter(function(row) { return row.taxonId === parsed.ids[0]; })
    .map(function(row) { return [row.index, row.label]; }));

  parsed.ids.forEach(function(id, panelIndex) {
    var panelRows = rows.filter(function(row) { return row.taxonId === id; });
    var name = panelRows.find(function(row) { return row.taxonName !== id; });
    var title = (name ? name.taxonName : id) + ' (NCBI ' + id + ')';
    var panel = svg.append('g').attr('transform', 'translate(' + margin.left + ',' +
      (panelIndex * panelStep + margin.top) + ')');
    panel.append('text').attr('x', 0).attr('y', -20).attr('font-size', 15)
      .attr('font-weight', 'bold').attr('fill', '#343a40').text(title);
    var maximum = sharedScale ? globalMaximum :
      d3.max(panelRows, function(row) { return percentMode ? row.percent : row.count; }) || 0;
    var y = d3.scale.linear().domain([0, maximum > 0 ? maximum * 1.1 : 1]).nice()
      .range([innerHeight, 0]);
    var grid = panel.append('g').attr('class', 'compareTaxonTrendsGrid').call(d3.svg.axis()
      .scale(y).orient('left').ticks(4).tickSize(-innerWidth, 0).tickFormat(function() { return ''; }));
    grid.selectAll('line').attr('stroke', '#e3e6f0').attr('stroke-width', 0.75);
    grid.select('path').remove();
    var yAxis = panel.append('g').call(d3.svg.axis().scale(y).orient('left').ticks(4));
    yAxis.selectAll('path, line').attr('fill', 'none').attr('stroke', '#555').attr('stroke-width', 0.75);
    panel.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2)
      .attr('y', -57).attr('text-anchor', 'middle').attr('font-size', 11)
      .text(percentMode ? '% of ' + denominatorLabel :
        (plotLevelSelectedCompareId === 'base' ? 'Bases' : 'Reads'));
    var tickLimit = compareTaxonTrendsTickLimit(innerWidth, dateAxis);
    var axis = dateAxis ? d3.svg.axis().scale(xDate).orient('bottom')
      .ticks(Math.min(tickLimit, dates.length)).tickFormat(d3.time.format.utc('%d %b %Y')) :
      d3.svg.axis().scale(xSample).orient('bottom')
        .tickValues(order.map(function(_, index) { return index; }).filter(function(index) {
        return order.length <= tickLimit || index % Math.ceil(order.length / tickLimit) === 0;
      })).tickFormat(function(index) {
        var label = labelByIndex.get(index) || '';
        return label.length > 13 ? label.slice(0, 12) + '…' : label;
      });
    var xAxis = panel.append('g').attr('transform', 'translate(0,' + innerHeight + ')').call(axis);
    xAxis.selectAll('path, line').attr('fill', 'none').attr('stroke', '#555').attr('stroke-width', 0.75);
    xAxis.selectAll('text').attr('font-size', 11);
    if (!dateAxis) xAxis.selectAll('text').attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end').attr('dx', '-0.5em').attr('dy', '0.4em');
    var xValue = function(row) { return dateAxis ? xDate(new Date(row.date + 'T00:00:00Z')) : xSample(row.index); };
    var yValue = function(row) { return y(percentMode ? row.percent : row.count); };
    var pointX = xValue;
    var lineStyle = $('#compareTaxonTrendsLineStyle').val() || 'linear';
    function showNearby(row, event, highlight) {
      var nearby = compareTaxonTrendsNearbyPoints(panelRows, row, pointX, yValue);
      if (highlight) highlightSeries(Array.from(new Set(nearby.map(function(point) { return point.series; }).filter(Boolean))));
      compareTaxonTrendsShowTooltip(nearby, event);
    }
    seriesNames.forEach(function(series) {
      var members = panelRows.filter(function(row) { return row.series === series; });
      compareTaxonTrendsLineTracks(members, dateAxis).forEach(function(track, trackIndex) {
        if (track.rows.length > 1) panel.append('path').datum(track.rows)
          .attr('class', 'compareTaxonTrendsSeriesLine').attr('data-series', series)
          .attr('fill', 'none').attr('stroke', colours(series)).attr('stroke-width', 2)
          .attr('stroke-dasharray', trackIndex % 2 ? '6 4' : null)
          .attr('d', d3.svg.line().interpolate(lineStyle).x(pointX).y(yValue))
          .on('mouseenter', function() { highlightSeries(series); })
          .on('mouseleave', function() { highlightSeries(null); });
      });
    });
    panel.selectAll('.compareTaxonTrendsPoint').data(panelRows).enter().append('circle')
      .attr('class', 'compareTaxonTrendsPoint').attr('cx', pointX).attr('cy', yValue)
      .attr('r', 4.5).attr('fill', function(row) { return row.series ? colours(row.series) : '#888'; })
      .attr('stroke', '#fff').attr('stroke-width', 1.5).attr('tabindex', 0)
      .attr('aria-label', function(row) { return row.label + ', ' + title + ', ' + row.percent.toFixed(3) + '%'; })
      .on('mouseenter', function(row) { showNearby(row, d3.event, true); })
      .on('mousemove', function(row) { showNearby(row, d3.event, false); })
      .on('mouseleave', function() { compareTaxonTrendsHideTooltip(); highlightSeries(null); })
      .on('blur', function() { compareTaxonTrendsHideTooltip(); highlightSeries(null); })
      .on('focus', function(row) { var bounds = this.getBoundingClientRect();
        showNearby(row, { clientX: bounds.right, clientY: bounds.top }, true); });
  });
  if (legendLayout) {
    var legend = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + legendTop + ')');
    legendLayout.items.forEach(function(entry) {
      var item = legend.append('g').attr('class', 'compareTaxonTrendsLegendItem')
        .attr('tabindex', 0).attr('role', 'img')
        .attr('aria-label', entry.group + ': highlight matching samples');
      item.append('rect').attr('x', entry.x - 6).attr('y', entry.y - 14)
        .attr('width', entry.width + 8).attr('height', entry.height + 10)
        .attr('fill', 'transparent');
      item.append('rect').attr('x', entry.x - 6).attr('y', entry.y - 10)
        .attr('width', 12).attr('height', 12)
        .attr('fill', colours(entry.group)).attr('stroke', '#333').attr('stroke-width', 0.8);
      var label = item.append('text').attr('x', entry.x + 16).attr('y', entry.y)
        .attr('font-size', 12).attr('fill', '#444');
      entry.lines.forEach(function(line, index) {
        label.append('tspan').attr('x', entry.x + 16).attr('dy', index ? 16 : 0).text(line);
      });
      legendElements.push({ series: entry.group, element: item, label: label });
      item.on('mouseenter', function() { compareTaxonTrendsHideTooltip(); highlightSeries(entry.group); })
        .on('mouseleave', function() { highlightSeries(null); })
        .on('focus', function() { compareTaxonTrendsHideTooltip(); highlightSeries(entry.group); })
        .on('blur', function() { highlightSeries(null); });
    });
  }
  svg.selectAll('text').style('font-family', 'Arial, Helvetica, sans-serif');
}

function compareTaxonTrendsFilename(suffix) {
  return 'marti_compare_taxon_trends_lca_' + lcaAbundanceCompare + '_' + getDate() + '_' + getTime() + '.' + suffix;
}

function compareTaxonTrendsExportPlot(format) {
  var svg = document.getElementById('compareTaxonTrendsSvg');
  if (!svg) return;
  var source = new XMLSerializer().serializeToString(svg);
  if (format === 'svg') {
    saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareTaxonTrendsFilename('svg'));
    return;
  }
  var url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  var image = new Image();
  image.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = Number(svg.getAttribute('width')) * 2;
    canvas.height = Number(svg.getAttribute('height')) * 2;
    var context = canvas.getContext('2d');
    context.scale(2, 2);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    canvas.toBlob(function(blob) { if (blob) saveAs(blob, compareTaxonTrendsFilename('png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function() { URL.revokeObjectURL(url); };
  image.src = url;
}

function compareTaxonTrendsExportCsv() {
  if (!compareTaxonTrendsRows.length) return;
  function field(value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'; }
  var unit = plotLevelSelectedCompareId === 'base' ? 'Bases' : 'Reads';
  var records = [['Run', 'Sample ID', 'Display name', 'Sampling date', 'Location', 'Series', 'NCBI taxon ID', 'Taxon name',
    unit, 'Denominator ' + unit.toLowerCase(), 'Abundance (%)']];
  compareTaxonTrendsRows.forEach(function(row) {
    records.push([row.runId, row.sampleId, row.label, row.date, row.location, row.series, row.taxonId, row.taxonName,
      row.count, row.denominator, row.percent]);
  });
  var csv = records.map(function(record) { return record.map(field).join(','); }).join('\r\n') + '\r\n';
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), compareTaxonTrendsFilename('csv'));
}
