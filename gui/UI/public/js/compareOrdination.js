/* global $, socket, uuid, currentPage, clientProject, lcaAbundanceCompare, taxonomicRankSelectedCompare, taxonomicLevelDictRev, selectedCompareMetaDataArray, compareSampleGroupValue, colourPalettes, saveAs, getDate, getTime, compareTreeDataGlobal, updateComparePlots, toolTipDiv, tooltipPos, tooltipPosY */

var compareOrdinationResult = null;
var compareOrdinationRequestSerial = 0;
var compareOrdinationTimer = null;
var compareOrdinationColourByUserChosen = false;

function compareOrdinationActive() {
  return currentPage === 'Compare' && !$('#compareOrdinationView').prop('hidden');
}

function compareOrdinationMetadata(sample) {
  return (selectedCompareMetaDataArray || []).find(function (entry) {
    return String(entry.pathRun) === String(sample.runId) && entry.pathName === sample.name;
  });
}

function compareOrdinationDisplayName(sample) {
  var metadata = compareOrdinationMetadata(sample);
  return metadata && metadata.id || sample.name;
}

function compareOrdinationGroup(sample) {
  var mode = $('#compareOrdinationColourBy').val();
  if (mode === 'none') return 'All samples';
  if (mode === 'run') return String(sample.runId);
  if (mode === 'manual') return compareSampleGroupValue(sample.runId, sample.name) || 'Ungrouped';
  var metadata = compareOrdinationMetadata(sample);
  return metadata && metadata.metadatafile && metadata.metadatafile.locationName || 'No site';
}

function compareOrdinationHasAssignedGroups(samples, groupValue) {
  return samples.some(function (sample) {
    return Boolean(groupValue(sample.pathRun, sample.pathName));
  });
}

function compareOrdinationDefaultColour(samples, groupValue) {
  return compareOrdinationHasAssignedGroups(samples, groupValue) ? 'manual' : 'run';
}

function compareOrdinationApplyDefaultColour() {
  if (compareOrdinationColourByUserChosen) return;
  var samples = typeof selectedCompareMetaDataArray === 'undefined' ? [] : selectedCompareMetaDataArray;
  $('#compareOrdinationColourBy').val(compareOrdinationDefaultColour(samples, compareSampleGroupValue));
}

function initialiseCompareOrdination() {
  compareOrdinationResult = null;
  compareOrdinationRequestSerial++;
  compareOrdinationColourByUserChosen = false;
  compareOrdinationApplyDefaultColour();
  $('#compareOrdinationSettingsButton').off('.ordination').on('click.ordination', function () {
    var open = $('#compareOrdinationSettings').prop('hidden');
    $('#compareOrdinationSettings').prop('hidden', !open);
    $(this).attr('aria-expanded', String(open));
    if (open) $('#compareOrdinationSettingsTitle').trigger('focus');
    requestAnimationFrame(renderCompareOrdination);
  });
  $('#compareOrdinationSettingsClose').off('.ordination').on('click.ordination', function () {
    $('#compareOrdinationSettings').prop('hidden', true);
    $('#compareOrdinationSettingsButton').attr('aria-expanded', 'false').trigger('focus');
    requestAnimationFrame(renderCompareOrdination);
  });
  $('#compareOrdinationMethod').off('.ordination').on('change.ordination', function () {
    $('#compareOrdinationPseudocountGroup').prop('hidden', this.value !== 'aitchison');
    requestCompareOrdination();
  });
  $('#compareOrdinationPrevalence, #compareOrdinationPseudocount').off('.ordination').on('input.ordination change.ordination', function () {
    clearTimeout(compareOrdinationTimer);
    compareOrdinationTimer = setTimeout(requestCompareOrdination, 300);
  });
  $('#compareOrdinationColourBy').off('.ordination').on('change.ordination', function () {
    compareOrdinationColourByUserChosen = true;
    renderCompareOrdination();
  });
  $('#compareOrdinationShowLabels').off('.ordination').on('change.ordination', renderCompareOrdination);
  $('#exportCompareOrdinationSVG').off('.ordination').on('click.ordination', function (event) { event.preventDefault(); compareOrdinationExportSvg(); });
  $('#exportCompareOrdinationPNG').off('.ordination').on('click.ordination', function (event) { event.preventDefault(); compareOrdinationExportPng(); });
  $('#exportCompareOrdinationCoordinates').off('.ordination').on('click.ordination', function (event) { event.preventDefault(); compareOrdinationExportCoordinates(); });
  $('#exportCompareOrdinationDistances').off('.ordination').on('click.ordination', function (event) { event.preventDefault(); compareOrdinationExportDistances(); });
  $(window).off('resize.compareOrdination').on('resize.compareOrdination', function () {
    if (compareOrdinationActive()) renderCompareOrdination();
  });
}

function requestCompareOrdination() {
  if (!compareOrdinationActive()) return;
  var serial = ++compareOrdinationRequestSerial;
  var prevalence = Number($('#compareOrdinationPrevalence').val());
  var pseudocount = Number($('#compareOrdinationPseudocount').val());
  if (!Number.isInteger(prevalence) || prevalence < 1 || !Number.isFinite(pseudocount) || pseudocount < 0) {
    compareOrdinationResult = null;
    $('#compareOrdinationStatus').text('Enter a positive whole number for prevalence and a nonnegative pseudocount.');
    $('#compareOrdinationPlot').empty();
    return;
  }
  compareOrdinationResult = null;
  $('#compareOrdinationPlot').empty();
  $('#compareOrdinationStatus').text('Calculating ordination…');
  socket.emit('compare-ordination-request', {
    clientId: uuid, lca: 'lca_' + lcaAbundanceCompare, rank: taxonomicRankSelectedCompare,
    method: $('#compareOrdinationMethod').val(), minimumPrevalence: prevalence, pseudocount: pseudocount
  }, function (response) {
    if (serial !== compareOrdinationRequestSerial || !compareOrdinationActive()) return;
    if (!response || response.error) {
      compareOrdinationResult = null;
      $('#compareOrdinationStatus').text(response && response.error || 'Could not calculate ordination.');
      $('#compareOrdinationPlot').empty();
      return;
    }
    compareOrdinationResult = response.data;
    renderCompareOrdination();
  });
}

function compareOrdinationSvgElement(tag, attributes, parent, label) {
  var element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.keys(attributes || {}).forEach(function (key) { element.setAttribute(key, attributes[key]); });
  if (label != null) element.textContent = label;
  parent.appendChild(element);
  return element;
}

function compareOrdinationHideTooltip() {
  toolTipDiv.interrupt().style('opacity', 0);
}

function compareOrdinationShowTooltip(samples, event) {
  toolTipDiv.interrupt().html('');
  var showGroups = compareOrdinationHasAssignedGroups(selectedCompareMetaDataArray || [], compareSampleGroupValue);
  var content = toolTipDiv.append('div').style('text-align', 'left')
    .style('max-width', 'min(400px, calc(100vw - 32px))')
    .style('white-space', 'normal').style('overflow-wrap', 'anywhere');
  content.append('small').attr('class', 'text-gray-800')
    .text(samples.length === 1 ? 'Sample' : samples.length + ' samples near this point');
  samples.forEach(function (sample, index) {
    content.append('div').style('font-weight', 'bold').style('font-size', '0.9rem')
      .text(compareOrdinationDisplayName(sample) + (index === 0 && samples.length > 1 ? ' (hovered)' : ''));
    content.append('div').append('small').attr('class', 'text-gray-800')
      .text('Run: ' + sample.runId);
    if (showGroups) {
      content.append('div').append('small').attr('class', 'text-gray-800')
        .text('Group: ' + (compareSampleGroupValue(sample.runId, sample.name) || 'Ungrouped'));
    }
  });
  if (samples.length === 1) {
    content.append('hr').attr('class', 'toolTipLine');
    content.append('small').text('PC1: ' + samples[0].x.toFixed(4) + ' · PC2: ' + samples[0].y.toFixed(4));
  }
  toolTipDiv.style('z-index', 1100).style('opacity', .95)
    .style('left', tooltipPos(event.pageX + 12) + 'px')
    .style('top', tooltipPosY(event.pageY + 12) + 'px');
}

function compareOrdinationWrapLegendLabel(label, maxWidth, measure) {
  var remaining = String(label).trim();
  var lines = [];
  while (remaining) {
    if (measure(remaining) <= maxWidth) {
      lines.push(remaining);
      break;
    }
    var length = 1;
    while (length < remaining.length && measure(remaining.slice(0, length + 1)) <= maxWidth) length++;
    var segment = remaining.slice(0, length);
    var separator = Math.max(segment.lastIndexOf(' '), segment.lastIndexOf('_'), segment.lastIndexOf('-'));
    if (separator >= Math.floor(length / 2)) length = separator + 1;
    lines.push(remaining.slice(0, length).trim());
    remaining = remaining.slice(length).trimStart();
  }
  return lines.length ? lines : [''];
}

function compareOrdinationLegendLayout(groups, availableWidth, measure) {
  var labelOffset = 14, itemGap = 22, lineHeight = 15, rowGap = 10;
  var x = 0, y = 0, rowHeight = 0;
  var items = groups.map(function (group) {
    var lines = compareOrdinationWrapLegendLabel(group, availableWidth - labelOffset - 4, measure);
    var width = labelOffset + Math.max.apply(null, lines.map(measure)) + 4;
    var height = lines.length * lineHeight;
    if (x > 0 && x + width > availableWidth) {
      x = 0;
      y += rowHeight + rowGap;
      rowHeight = 0;
    }
    var item = { group: group, x: x, y: y, width: width, height: height, lines: lines };
    x += width + itemGap;
    rowHeight = Math.max(rowHeight, height);
    return item;
  });
  return { items: items, height: y + rowHeight };
}

function compareOrdinationEqualAxisDomains(points, plotWidth, plotHeight) {
  var xs = points.map(function (point) { return point.x; });
  var ys = points.map(function (point) { return point.y; });
  var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
  var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
  var xpad = Math.max((xmax - xmin) * 0.1, 0.01);
  var ypad = Math.max((ymax - ymin) * 0.1, 0.01);
  var xspan = xmax - xmin + 2 * xpad;
  var yspan = ymax - ymin + 2 * ypad;
  var unitsPerPixel = Math.max(xspan / plotWidth, yspan / plotHeight);
  var xcentre = (xmin + xmax) / 2, ycentre = (ymin + ymax) / 2;
  return {
    xmin: xcentre - unitsPerPixel * plotWidth / 2,
    xmax: xcentre + unitsPerPixel * plotWidth / 2,
    ymin: ycentre - unitsPerPixel * plotHeight / 2,
    ymax: ycentre + unitsPerPixel * plotHeight / 2
  };
}

function renderCompareOrdination() {
  compareOrdinationApplyDefaultColour();
  var result = compareOrdinationResult;
  var holder = document.getElementById('compareOrdinationPlot');
  if (!result || !holder || !compareOrdinationActive()) return;
  compareOrdinationHideTooltip();
  holder.textContent = '';
  var groups = [...new Set(result.points.map(compareOrdinationGroup))].sort();
  var palette = colourPalettes.tolColorBlindLight9;
  var colours = {};
  groups.forEach(function (group, i) { colours[group] = palette[i % palette.length]; });
  var width = Math.max(540, Math.min(900, Math.floor(holder.clientWidth || 700)));
  var plotWidth = width - 115;
  var plotHeight = 410;
  var legendLeft = 75, legendTop = 515, legendRight = 40;
  var context = document.createElement('canvas').getContext('2d');
  if (context) context.font = '11px Arial';
  var measureLegend = function (label) {
    return context ? context.measureText(label).width : String(label).length * 7;
  };
  var legend = compareOrdinationLegendLayout(groups, width - legendLeft - legendRight, measureLegend);
  var height = legendTop + legend.height + 20;
  var left = 75, top = 45;
  var svg = compareOrdinationSvgElement('svg', { id: 'compareOrdinationSvg', xmlns: 'http://www.w3.org/2000/svg', width: width, height: height, viewBox: '0 0 ' + width + ' ' + height, style: 'font-family: Arial, Helvetica, sans-serif', role: 'img', 'aria-label': 'PCoA of selected samples' }, holder);
  compareOrdinationSvgElement('rect', { width: width, height: height, fill: '#fff' }, svg);
  var domains = compareOrdinationEqualAxisDomains(result.points, plotWidth, plotHeight);
  var xmin = domains.xmin, xmax = domains.xmax;
  var ymin = domains.ymin, ymax = domains.ymax;
  var xscale = function (value) { return left + (value - xmin) / (xmax - xmin) * plotWidth; };
  var yscale = function (value) { return top + plotHeight - (value - ymin) / (ymax - ymin) * plotHeight; };
  for (var tick = 0; tick <= 4; tick++) {
    var tx = left + tick * plotWidth / 4;
    var ty = top + tick * plotHeight / 4;
    compareOrdinationSvgElement('line', { x1: tx, y1: top, x2: tx, y2: top + plotHeight, stroke: '#edf0f4' }, svg);
    compareOrdinationSvgElement('line', { x1: left, y1: ty, x2: left + plotWidth, y2: ty, stroke: '#edf0f4' }, svg);
    compareOrdinationSvgElement('text', { x: tx, y: top + plotHeight + 20, 'text-anchor': 'middle', fill: '#666', 'font-size': 11 }, svg, (xmin + tick * (xmax - xmin) / 4).toFixed(2));
    compareOrdinationSvgElement('text', { x: left - 10, y: ty + 4, 'text-anchor': 'end', fill: '#666', 'font-size': 11 }, svg, (ymax - tick * (ymax - ymin) / 4).toFixed(2));
  }
  compareOrdinationSvgElement('line', { x1: left, y1: top + plotHeight, x2: left + plotWidth, y2: top + plotHeight, stroke: '#858796' }, svg);
  compareOrdinationSvgElement('line', { x1: left, y1: top, x2: left, y2: top + plotHeight, stroke: '#858796' }, svg);
  result.points.forEach(function (point) {
    var circle = compareOrdinationSvgElement('circle', { class: 'compareOrdinationPoint', cx: xscale(point.x), cy: yscale(point.y), r: 7, fill: colours[compareOrdinationGroup(point)], stroke: '#333', 'stroke-width': 0.8, tabindex: 0, 'aria-label': compareOrdinationDisplayName(point) + ' (' + point.runId + ')' }, svg);
    var nearby = [point].concat(result.points.filter(function (other) {
      return other !== point && Math.hypot(xscale(other.x) - xscale(point.x), yscale(other.y) - yscale(point.y)) <= 6;
    }));
    circle.addEventListener('mouseenter', function (event) { compareOrdinationShowTooltip(nearby, event); });
    circle.addEventListener('mousemove', function (event) { compareOrdinationShowTooltip(nearby, event); });
    circle.addEventListener('mouseleave', compareOrdinationHideTooltip);
    circle.addEventListener('focus', function () {
      var rect = circle.getBoundingClientRect();
      compareOrdinationShowTooltip(nearby, { pageX: rect.right + window.pageXOffset, pageY: rect.top + window.pageYOffset });
    });
    circle.addEventListener('blur', compareOrdinationHideTooltip);
    if ($('#compareOrdinationShowLabels').prop('checked')) {
      compareOrdinationSvgElement('text', { x: xscale(point.x) + 9, y: yscale(point.y) - 8, fill: '#333', 'font-size': 11 }, svg, compareOrdinationDisplayName(point));
    }
  });
  compareOrdinationSvgElement('text', { x: left + plotWidth / 2, y: top + plotHeight + 45, 'text-anchor': 'middle', fill: '#444', 'font-size': 13 }, svg, 'PC1 (' + result.axisPercent[0].toFixed(1) + '%)');
  compareOrdinationSvgElement('text', { x: 18, y: top + plotHeight / 2, transform: 'rotate(-90 18 ' + (top + plotHeight / 2) + ')', 'text-anchor': 'middle', fill: '#444', 'font-size': 13 }, svg, 'PC2 (' + result.axisPercent[1].toFixed(1) + '%)');
  compareOrdinationSvgElement('text', { x: width / 2, y: 24, 'text-anchor': 'middle', fill: '#333', 'font-size': 14, 'font-weight': 'bold' }, svg, (result.method === 'aitchison' ? 'Aitchison (CLR)' : 'Bray–Curtis') + ' · ' + taxonomicLevelDictRev[result.rank] + ' · LCA ' + lcaAbundanceCompare + '%');
  legend.items.forEach(function (item) {
    var lx = legendLeft + item.x;
    var ly = legendTop + item.y;
    compareOrdinationSvgElement('circle', { cx: lx, cy: ly - 4, r: 5, fill: colours[item.group], stroke: '#333', 'stroke-width': 0.8 }, svg);
    var label = compareOrdinationSvgElement('text', { x: lx + 14, y: ly, fill: '#444', 'font-size': 11 }, svg);
    item.lines.forEach(function (line, index) {
      compareOrdinationSvgElement('tspan', { x: lx + 14, dy: index ? 15 : 0 }, label, line);
    });
  });
  $('#compareOrdinationStatus').text(result.sampleCount + ' samples · ' + result.featureCount + ' taxa' + (result.excludedCount ? ' · ' + result.excludedCount + ' excluded' : '') + (result.lingoesConstant ? ' · Lingoes correction applied to plot coordinates' : '') + '.');
}

function compareOrdinationFilename(suffix) {
  return 'marti_ordination_' + getDate() + '_' + getTime() + '_' + suffix;
}

function compareOrdinationSvgString() {
  var svg = document.getElementById('compareOrdinationSvg');
  return svg && new XMLSerializer().serializeToString(svg);
}

function compareOrdinationExportSvg() {
  var source = compareOrdinationSvgString();
  if (source) saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareOrdinationFilename('plot.svg'));
}

function compareOrdinationExportPng() {
  var source = compareOrdinationSvgString();
  var svg = document.getElementById('compareOrdinationSvg');
  if (!source || !svg) return;
  var url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  var image = new Image();
  image.onload = function () {
    var canvas = document.createElement('canvas');
    canvas.width = Number(svg.getAttribute('width')) * 2;
    canvas.height = Number(svg.getAttribute('height')) * 2;
    var context = canvas.getContext('2d');
    context.scale(2, 2);
    context.drawImage(image, 0, 0);
    canvas.toBlob(function (blob) { if (blob) saveAs(blob, compareOrdinationFilename('plot.png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function () { URL.revokeObjectURL(url); $('#compareOrdinationStatus').text('PNG export failed. Try SVG export.'); };
  image.src = url;
}

function compareOrdinationCsvCell(value) {
  var text = String(value == null ? '' : value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function compareOrdinationSaveCsv(rows, suffix) {
  var csv = rows.map(function (row) { return row.map(compareOrdinationCsvCell).join(','); }).join('\r\n') + '\r\n';
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), compareOrdinationFilename(suffix));
}

function compareOrdinationExportCoordinates() {
  var result = compareOrdinationResult;
  if (!result) return;
  var rows = [['Run ID', 'Sample ID', 'Sample path', 'Group', 'PC1', 'PC2', 'PC1 variance %', 'PC2 variance %', 'Retained taxa', 'Coverage %', 'Method', 'Rank', 'LCA %', 'Minimum prevalence', 'Pseudocount', 'Lingoes constant']];
  result.points.forEach(function (point) {
    rows.push([point.runId, compareOrdinationDisplayName(point), point.name, compareOrdinationGroup(point), point.x, point.y, result.axisPercent[0], result.axisPercent[1], result.featureCount, point.coveragePercent, result.method, taxonomicLevelDictRev[result.rank], lcaAbundanceCompare, result.minimumPrevalence, result.pseudocount, result.lingoesConstant]);
  });
  compareOrdinationSaveCsv(rows, 'coordinates.csv');
}

function compareOrdinationExportDistances() {
  var result = compareOrdinationResult;
  if (!result) return;
  var names = result.points.map(function (point) { return point.runId + ' / ' + compareOrdinationDisplayName(point) + ' (' + point.name + ')'; });
  var rows = [[''].concat(names)];
  result.distances.forEach(function (row, i) { rows.push([names[i]].concat(row)); });
  compareOrdinationSaveCsv(rows, 'distances.csv');
}

if (typeof module !== 'undefined') module.exports = {
  compareOrdinationWrapLegendLabel: compareOrdinationWrapLegendLabel,
  compareOrdinationLegendLayout: compareOrdinationLegendLayout,
  compareOrdinationEqualAxisDomains: compareOrdinationEqualAxisDomains,
  compareOrdinationHasAssignedGroups: compareOrdinationHasAssignedGroups,
  compareOrdinationDefaultColour: compareOrdinationDefaultColour
};
