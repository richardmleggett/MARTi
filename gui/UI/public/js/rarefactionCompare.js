/* Accumulation and historical alpha diversity, shared by Compare and Dashboard. */
var rareMetric = 'taxa';
var accumulationData = [];
var rareMargin = { top: 25, right: 40, bottom: 55, left: 85 };
var rareWidth = 835, rareHeight = 420;
var rarefactionCompareSVG;
var rc_x = d3.scale.linear().range([0, rareWidth]);
var rc_y = d3.scale.linear().range([rareHeight, 0]);
var rc_xAxis = d3.svg.axis().scale(rc_x).ticks(8).orient('bottom');
var rc_yAxis = d3.svg.axis().scale(rc_y).orient('left');

function initialiseCompareAccumulation() {
  $('#compareRarefactionPlot').empty();
  rarefactionCompareSVG = d3.select('#compareRarefactionPlot').append('svg')
    .attr('viewBox', '0 0 ' + (rareWidth + rareMargin.left + rareMargin.right) + ' ' + (rareHeight + rareMargin.top + rareMargin.bottom))
    .append('g').attr('transform', 'translate(' + rareMargin.left + ',' + rareMargin.top + ')');
  rarefactionCompareSVG.append('g').attr('class', 'x axis');
  rarefactionCompareSVG.append('g').attr('class', 'y axis');
  rarefactionCompareSVG.append('text').attr('id', 'yAxisLabelAccumulation')
    .attr('text-anchor', 'middle').attr('transform', 'translate(-60,' + rareHeight / 2 + ')rotate(-90)');
  rarefactionCompareSVG.append('text').attr('id', 'xAxisLabelAccumulation')
    .attr('text-anchor', 'middle').attr('transform', 'translate(' + rareWidth / 2 + ',' + (rareHeight + 43) + ')');

  $('#rareMetric').val(rareMetric);
  if (!$('#rareMetric').val()) { rareMetric = 'taxa'; $('#rareMetric').val(rareMetric); }
  $('#rareMetric,#rareTaxaSeries,#rareXAxis,#rareLine,#rareXAxisMax').off('.diversityPlot')
    .on('change.diversityPlot input.diversityPlot', function () {
      if (this.id === 'rareMetric') rareMetric = this.value;
      if (typeof rareData !== 'undefined' && rareData) plotRarefactionCompare(rareData);
    });
  $('#diversityPlotSettingsButton').off('.diversityPlot').on('click.diversityPlot', function () {
    var opening = $('#diversityPlotSettings').prop('hidden');
    $('#diversityPlotSettings').prop('hidden', !opening);
    $(this).attr('aria-expanded', String(opening));
    if (opening) $('#diversityPlotSettingsTitle').trigger('focus');
  });
  $('#diversityPlotSettingsClose').off('.diversityPlot').on('click.diversityPlot', function () {
    $('#diversityPlotSettings').prop('hidden', true);
    $('#diversityPlotSettingsButton').attr('aria-expanded', 'false').trigger('focus');
  });
  $('#downloadAccumulationData').off('.diversityPlot').on('click.diversityPlot', function (event) {
    event.preventDefault();
    var page = currentPage === 'Dashboard' ? 'dashboard' : 'compare';
    export_as_csv(convertAccumulationDataToCSV(accumulationData),
      page + '_diversity_' + rareMetric + '_' + getDate() + '_' + getTime());
  });
}

function updateAccumulationMetricOptions(data, selectedLca, unit) {
  var hasDiversity = data.length > 0 && data.every(function (sample) { return martiHasChunkDiversity(sample.data); });
  var chao1Ok = hasDiversity && Number(selectedLca) === 0 && unit === 'reads';
  $('#rareMetric option').each(function () {
    this.disabled = this.value !== 'taxa' && (!hasDiversity || (this.value === 'chao1' && !chao1Ok));
  });
  if ($('#rareMetric option:selected').prop('disabled')) $('#rareMetric').val('taxa');
  rareMetric = $('#rareMetric').val() || 'taxa';
  $('#rareMetricNote').prop('hidden', hasDiversity);
  var hasRaw = data.length > 0 && data.every(function (sample) {
    return sample.data && Array.isArray(sample.data.rawReads) && Array.isArray(sample.data.rawTime);
  });
  $('#rareTaxaSeries option[value="rawReads"]').prop('disabled', !hasRaw);
  if (!hasRaw && $('#rareTaxaSeries').val() === 'rawReads') $('#rareTaxaSeries').val('reads');
  $('#rareTaxaSeriesGroup').prop('hidden', rareMetric !== 'taxa' || !hasRaw);
  return hasRaw;
}

function formatAccumulationValue(value) {
  return Number(value).toFixed(MARTI_DIVERSITY_METRICS[rareMetric].decimals);
}

function accumulationSampleName(sample) {
  var meta = sampleMetaDataArray.find(function (entry) {
    return entry.pathName === sample.id && entry.pathRun === sample.runId;
  });
  return meta ? meta.id : sample.id;
}

// Find the closest place on a rendered path near the cursor's x position. Using
// the SVG path keeps hover accurate for straight, step, and smooth lines.
function accumulationPathPointNear(path, mouseX, mouseY) {
  var length = path.getTotalLength();
  function firstAtOrAfter(x) {
    var low = 0, high = length;
    for (var i = 0; i < 18; i++) {
      var middle = (low + high) / 2;
      if (path.getPointAtLength(middle).x < x) low = middle;
      else high = middle;
    }
    return path.getPointAtLength(high);
  }
  // The half-pixel window also captures the vertical stroke of a step curve.
  var a = firstAtOrAfter(mouseX - 0.5);
  var b = firstAtOrAfter(mouseX + 0.5);
  var dx = b.x - a.x, dy = b.y - a.y;
  var denominator = dx * dx + dy * dy;
  var t = denominator ? Math.max(0, Math.min(1,
    ((mouseX - a.x) * dx + (mouseY - a.y) * dy) / denominator)) : 0;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function plotRarefactionCompare(data) {
  if (!Array.isArray(data) || !rarefactionCompareSVG || !$('#compareRarefactionPlot').length) return;
  var selectedLca = currentPage === 'Dashboard' ? lcaAbundanceDashboard : lcaAbundanceCompare;
  var unit = (currentPage === 'Dashboard' ? plotLevelSelectedDashboardId : plotLevelSelectedCompareId) === 'base'
    ? 'bases' : 'reads';
  var hasRaw = updateAccumulationMetricOptions(data, selectedLca, unit);
  var xMode = $('#rareXAxis').val() || 'reads';
  var raw = rareMetric === 'taxa' && $('#rareTaxaSeries').val() === 'rawReads' && hasRaw;
  $('#rareUnitNote').text(rareMetric === 'taxa'
    ? 'Taxa accumulation counts taxa as reads are analysed; the read/basepair setting does not change this curve.'
    : unit === 'bases'
      ? 'DNA yield weighted: N is the sum of classified basepairs assigned to included taxa at each point, not the number of reads or organisms.'
      : 'Read weighted: N is the sum of classified reads assigned to included taxa at each point, not the number of organisms.');
  var key = raw ? (xMode === 'time' ? 'rawTime' : 'rawReads') : xMode;
  var maxText = $('#rareXAxisMax').val();
  var requestedMax = maxText === '' ? null : Number(maxText);
  if (requestedMax !== null && (!isFinite(requestedMax) || requestedMax <= 0)) requestedMax = null;
  var ordered = data.slice().sort(function (a, b) {
    if (currentPage === 'Dashboard' || !Array.isArray(sortCompareNameArray)) return 0;
    var aName = accumulationSampleName(a), bName = accumulationSampleName(b);
    var ai = sortCompareNameArray.findIndex(function (s) { return s.name === aName && s.runId === a.runId; });
    var bi = sortCompareNameArray.findIndex(function (s) { return s.name === bName && s.runId === b.runId; });
    return ai - bi;
  });
  accumulationData = ordered.map(function (sample) {
    var points = rareMetric === 'taxa' ? (sample.data && sample.data[key]) || []
      : martiChunkDiversitySeries(sample.data, rareMetric, unit, xMode);
    var values = points.filter(function (point) {
      return Array.isArray(point) && isFinite(point[0]) && isFinite(point[1]) &&
        (requestedMax === null || point[0] <= requestedMax);
    }).map(function (point) { return { x: Number(point[0]), y: Number(point[1]) }; });
    return { name: accumulationSampleName(sample), values: values };
  }).filter(function (sample) { return sample.values.length; });
  var mayDecrease = rareMetric === 'taxa' && Number(selectedLca) !== 0 && (raw || !hasRaw);
  $('#accumulationPlotWarning').toggle(mayDecrease);
  $('#accumulationPlotWarning a').text(raw
    ? 'Per-chunk taxa counts can decrease when assignments change between chunks.'
    : 'Older accumulation data can decrease when the minimum abundance cutoff is above 0%.');
  $('#no-data-accumulation').toggleClass('d-none', accumulationData.length > 0);
  $('#no-data-accumulation h3').text('Data Not Available');
  $('#no-data-accumulation h4').text(rareMetric === 'taxa'
    ? 'No accumulation points available for this selection.'
    : 'No historical diversity points available for this selection.');
  var plotTitle = rareMetric === 'taxa' ? 'Taxa accumulation' : MARTI_DIVERSITY_METRICS[rareMetric].label +
    (unit === 'bases' ? ' (DNA yield weighted)' : ' (read weighted)');
  $('#rarefactionCardTitleCompare').text(plotTitle + ' — ' + taxonomicRankSelectedText);
  $('#rarefactionCardTitleDashboard').text(plotTitle);
  $('#xAxisLabelAccumulation').text(xMode === 'time' ? 'Elapsed time (minutes)' : 'Reads analysed');
  $('#yAxisLabelAccumulation').text(rareMetric === 'taxa' ? taxonomicRankSelectedText + ' count'
    : MARTI_DIVERSITY_METRICS[rareMetric].label + (unit === 'bases' ? ' (bp weighted)' : ' (read weighted)'));

  var all = [].concat.apply([], accumulationData.map(function (sample) { return sample.values; }));
  var xMax = requestedMax || d3.max(all, function (point) { return point.x; }) || 1;
  var yMin = Math.min(0, d3.min(all, function (point) { return point.y; }) || 0);
  var yMax = d3.max(all, function (point) { return point.y; }) || 1;
  if (yMax <= yMin) yMax = yMin + 1;
  rc_x.domain([0, xMax]); rc_y.domain([yMin, yMax]);
  rc_yAxis.tickFormat(d3.format(rareMetric === 'taxa' ? 'd' : yMax >= 20 ? '.1f' : '.2f'));
  rarefactionCompareSVG.select('.x.axis').attr('transform', 'translate(0,' + rareHeight + ')').call(rc_xAxis);
  rarefactionCompareSVG.select('.y.axis').call(rc_yAxis);
  var line = d3.svg.line().interpolate($('#rareLine').val() || 'linear')
    .x(function (point) { return rc_x(point.x); }).y(function (point) { return rc_y(point.y); });
  var palette = dashboardPlotColorPalette;
  palette.domain(accumulationData.map(function (sample) { return sample.name; }));
  var lines = rarefactionCompareSVG.selectAll('.sampleLine').data(accumulationData, function (sample) { return sample.name; });
  lines.enter().append('path').attr('class', 'sampleLine line').style('fill', 'none').style('stroke-width', '2px');
  lines.attr('d', function (sample) {
    // Add a visual origin for taxa curves. Keep saved points unchanged for
    // hover values and CSV export; diversity indices are undefined at zero reads.
    var values = rareMetric === 'taxa' && sample.values[0].x > 0
      ? [{ x: 0, y: 0 }].concat(sample.values) : sample.values;
    return line(values);
  })
    .style('stroke', function (sample) { return palette(sample.name); });
  lines.exit().remove();
  var legends = d3.select('#compareRarefactionPlotLegend').selectAll('.rarefactionCompareLegend')
    .data(accumulationData, function (sample) { return sample.name; });
  var enter = legends.enter().append('svg').attr('class', 'rarefactionCompareLegend').attr('height', 20).append('g');
  enter.append('rect').attr('width', 16).attr('height', 12).attr('y', 4);
  enter.append('text').attr('x', 21).attr('y', 14).style('font-size', '13px');
  legends.select('rect').style('fill', function (sample) { return palette(sample.name); });
  legends.select('text').text(function (sample) { return sample.name; });
  legends.attr('width', function (sample) { return 25 + sample.name.length * 8; });
  legends.exit().remove();
  rarefactionCompareSVG.selectAll('.mouse-over-effects').remove();
  $('#accumulationHoverTooltip').remove();
  if (!accumulationData.length) return;
  var tooltip = $('<div id="accumulationHoverTooltip" class="accumulationHoverTooltip" role="tooltip"></div>')
    .prop('hidden', true).appendTo('#compareRarefactionPlot');
  function highlight(names) {
    var selected = names && names.length ? names : null;
    lines.style('opacity', function (sample) { return !selected || selected.indexOf(sample.name) !== -1 ? 1 : 0.15; })
      .style('stroke-width', function (sample) { return selected && selected.indexOf(sample.name) !== -1 ? '4px' : '2.5px'; });
    legends.style('opacity', function (sample) { return !selected || selected.indexOf(sample.name) !== -1 ? 1 : 0.3; })
      .select('text').style('font-weight', function (sample) {
        return selected && selected.indexOf(sample.name) !== -1 ? 'bold' : 'normal';
      });
  }
  legends.on('mouseenter', function (sample) {
    tooltip.prop('hidden', true); highlight([sample.name]);
  }).on('mouseleave', function () { highlight(null); });
  var hover = rarefactionCompareSVG.append('g').attr('class', 'mouse-over-effects');
  var guide = hover.append('line').style('stroke', '#858796').style('stroke-dasharray', '3,3')
    .style('pointer-events', 'none').style('visibility', 'hidden');
  hover.append('rect').attr('width', rareWidth).attr('height', rareHeight).style('fill', 'none')
    .style('pointer-events', 'all').on('mouseout', function () {
      guide.style('visibility', 'hidden');
      hover.selectAll('.hoverPoint').remove();
      tooltip.prop('hidden', true);
      highlight(null);
    }).on('mousemove', function () {
      var mouse = d3.mouse(this);
      var svg = $('#compareRarefactionPlot svg')[0];
      var scale = (rareWidth + rareMargin.left + rareMargin.right) / svg.getBoundingClientRect().width;
      var candidates = [];
      lines.each(function (sample) {
        var point = accumulationPathPointNear(this, mouse[0], mouse[1]);
        if (rareMetric === 'taxa' && point.x < rc_x(sample.values[0].x) - 5 * scale) return;
        var distance = Math.hypot(point.x - mouse[0], point.y - mouse[1]);
        candidates.push({ sample: sample, point: point, distance: distance });
      });
      candidates.sort(function (a, b) { return a.distance - b.distance; });
      var matches = candidates.length && candidates[0].distance <= 24 * scale
        ? candidates.filter(function (candidate) {
            return candidate.distance <= Math.min(24 * scale, candidates[0].distance + 4 * scale);
          }).slice(0, 3) : [];
      if (!matches.length) {
        guide.style('visibility', 'hidden');
        hover.selectAll('.hoverPoint').remove();
        tooltip.prop('hidden', true);
        highlight(null);
        return;
      }
      // The path determines which line is under the cursor. Report only a
      // recorded point from that line, never a value interpolated by the SVG.
      matches.forEach(function (match) {
        match.observed = match.sample.values.reduce(function (best, point) {
          if (!best) return point;
          var pointDx = Math.abs(rc_x(point.x) - match.point.x);
          var bestDx = Math.abs(rc_x(best.x) - match.point.x);
          if (pointDx < bestDx) return point;
          if (pointDx === bestDx && Math.abs(rc_y(point.y) - mouse[1]) < Math.abs(rc_y(best.y) - mouse[1])) return point;
          return best;
        }, null);
      });
      var names = matches.map(function (match) { return match.sample.name; });
      highlight(names);
      guide.attr('x1', rc_x(matches[0].observed.x)).attr('x2', rc_x(matches[0].observed.x))
        .attr('y1', 0).attr('y2', rareHeight).style('visibility', 'visible');
      var marks = hover.selectAll('.hoverPoint').data(matches, function (match) { return match.sample.name; });
      marks.enter().append('circle').attr('class', 'hoverPoint').attr('r', 6)
        .style('fill', 'white').style('stroke-width', '2px').style('pointer-events', 'none');
      marks.attr('cx', function (match) { return rc_x(match.observed.x); })
        .attr('cy', function (match) { return rc_y(match.observed.y); })
        .style('stroke', function (match) { return palette(match.sample.name); });
      marks.exit().remove();
      tooltip.empty();
      matches.forEach(function (match) {
        var x = match.observed.x, y = match.observed.y;
        var row = $('<div class="accumulationHoverRow"></div>').appendTo(tooltip);
        $('<span class="accumulationHoverSwatch"></span>').css('background-color', palette(match.sample.name)).appendTo(row);
        var details = $('<div class="accumulationHoverDetails"></div>').appendTo(row);
        $('<strong></strong>').text(match.sample.name).appendTo(details);
        $('<span></span>').text(formatAccumulationValue(y) + ' (' +
          (xMode === 'time' ? x.toFixed(1) + ' min' : thousandsSeparators(Math.round(x)) + ' reads') + ')').appendTo(details);
      });
      var plotBox = document.getElementById('compareRarefactionPlot').getBoundingClientRect();
      var left = d3.event.clientX - plotBox.left + 14;
      var top = d3.event.clientY - plotBox.top + 14;
      tooltip.prop('hidden', false);
      tooltip.css({ left: Math.max(8, Math.min(left, plotBox.width - tooltip.outerWidth() - 8)) + 'px',
        top: Math.max(8, Math.min(top, plotBox.height - tooltip.outerHeight() - 8)) + 'px' });
    });
}

function convertAccumulationDataToCSV(data) {
  var xLabel = $('#rareXAxis').val() === 'time' ? 'elapsed minutes' : 'reads analysed';
  var unit = (currentPage === 'Dashboard' ? plotLevelSelectedDashboardId : plotLevelSelectedCompareId) === 'base'
    ? 'bases' : 'reads';
  var metric = rareMetric === 'taxa' ? 'taxa count' : MARTI_DIVERSITY_METRICS[rareMetric].label +
    (unit === 'bases' ? ' (DNA yield weighted; N in bp)' : ' (read weighted; N in reads)');
  var rows = [];
  var header = [];
  data.forEach(function (sample) { header.push(sample.name + ' ' + xLabel, sample.name + ' ' + metric); });
  rows.push(header);
  var length = Math.max.apply(null, [0].concat(data.map(function (sample) { return sample.values.length; })));
  for (var i = 0; i < length; i++) {
    var row = [];
    data.forEach(function (sample) {
      var value = sample.values[i]; row.push(value ? value.x : '', value ? value.y : '');
    });
    rows.push(row);
  }
  return rows.map(function (row) {
    return row.map(function (value) { return '"' + String(value).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');
}
