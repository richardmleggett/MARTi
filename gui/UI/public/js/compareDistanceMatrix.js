/* global $, socket, uuid, currentPage, lcaAbundanceCompare, taxonomicRankSelectedCompare, taxonomicLevelDictRev, compareOrdinationDisplayName, compareOrdinationSvgElement, toolTipDiv, tooltipPos, tooltipPosY, saveAs, getDate, getTime */

var compareDistanceMatrixResult = null;
var compareDistanceMatrixDisplayed = null;
var compareDistanceMatrixRequestSerial = 0;
var compareDistanceMatrixTimer = null;

function compareDistanceMatrixActive() {
  return currentPage === 'Compare' && !$('#compareOrdinationView').prop('hidden');
}

function compareDistanceMatrixKey(sample) {
  return JSON.stringify([String(sample.runId), String(sample.name)]);
}

function compareDistanceMatrixOrder(result, orderedKeys) {
  var positions = new Map();
  result.samples.forEach(function (sample, index) { positions.set(compareDistanceMatrixKey(sample), index); });
  var seen = new Set();
  var indices = [];
  (orderedKeys || []).forEach(function (key) {
    var index = positions.get(key);
    if (index !== undefined && !seen.has(index)) {
      indices.push(index);
      seen.add(index);
    }
  });
  result.samples.forEach(function (_, index) {
    if (!seen.has(index)) indices.push(index);
  });
  return Object.assign({}, result, {
    samples: indices.map(function (index) { return result.samples[index]; }),
    distances: indices.map(function (row) {
      return indices.map(function (column) { return result.distances[row][column]; });
    })
  });
}

function initialiseCompareDistanceMatrix() {
  compareDistanceMatrixResult = null;
  compareDistanceMatrixDisplayed = null;
  compareDistanceMatrixRequestSerial++;
  $('#compareDistanceMatrixSettingsButton').off('.distanceMatrix').on('click.distanceMatrix', function () {
    var opening = $('#compareDistanceMatrixSettings').prop('hidden');
    $('#compareDistanceMatrixSettings').prop('hidden', !opening);
    $(this).attr('aria-expanded', String(opening));
    if (opening) $('#compareDistanceMatrixSettingsTitle').trigger('focus');
    requestAnimationFrame(renderCompareDistanceMatrix);
  });
  $('#compareDistanceMatrixSettingsClose').off('.distanceMatrix').on('click.distanceMatrix', function () {
    $('#compareDistanceMatrixSettings').prop('hidden', true);
    $('#compareDistanceMatrixSettingsButton').attr('aria-expanded', 'false').trigger('focus');
    requestAnimationFrame(renderCompareDistanceMatrix);
  });
  $('#compareDistanceMatrixMethod').off('.distanceMatrix').on('change.distanceMatrix', function () {
    $('#compareDistanceMatrixPseudocountGroup').prop('hidden', this.value !== 'aitchison');
    requestCompareDistanceMatrix();
  });
  $('#compareDistanceMatrixPrevalence, #compareDistanceMatrixPseudocount').off('.distanceMatrix')
    .on('input.distanceMatrix change.distanceMatrix', function () {
      clearTimeout(compareDistanceMatrixTimer);
      compareDistanceMatrixTimer = setTimeout(requestCompareDistanceMatrix, 300);
    });
  $('#compareDistanceMatrixShowValues').off('.distanceMatrix').on('change.distanceMatrix', renderCompareDistanceMatrix);
  $('#exportCompareDistanceMatrixSVG').off('.distanceMatrix').on('click.distanceMatrix', function (event) { event.preventDefault(); compareDistanceMatrixExportSvg(); });
  $('#exportCompareDistanceMatrixPNG').off('.distanceMatrix').on('click.distanceMatrix', function (event) { event.preventDefault(); compareDistanceMatrixExportPng(); });
  $('#exportCompareDistanceMatrixCSV').off('.distanceMatrix').on('click.distanceMatrix', function (event) { event.preventDefault(); compareDistanceMatrixExportCsv(); });
  $(window).off('resize.compareDistanceMatrix').on('resize.compareDistanceMatrix', function () {
    if (compareDistanceMatrixActive()) renderCompareDistanceMatrix();
  });
}

function requestCompareDistanceMatrix() {
  if (!compareDistanceMatrixActive()) return;
  var serial = ++compareDistanceMatrixRequestSerial;
  var prevalence = Number($('#compareDistanceMatrixPrevalence').val());
  var pseudocount = Number($('#compareDistanceMatrixPseudocount').val());
  if (!Number.isInteger(prevalence) || prevalence < 1 || !Number.isFinite(pseudocount) || pseudocount < 0) {
    compareDistanceMatrixResult = null;
    compareDistanceMatrixDisplayed = null;
    $('#compareDistanceMatrixStatus').text('Enter a positive whole number for prevalence and a nonnegative pseudocount.');
    $('#compareDistanceMatrixPlot').empty();
    return;
  }
  compareDistanceMatrixResult = null;
  compareDistanceMatrixDisplayed = null;
  $('#compareDistanceMatrixPlot').empty();
  $('#compareDistanceMatrixStatus').text('Calculating distances…');
  socket.emit('compare-distance-matrix-request', {
    clientId: uuid, lca: 'lca_' + lcaAbundanceCompare, rank: taxonomicRankSelectedCompare,
    method: $('#compareDistanceMatrixMethod').val(), minimumPrevalence: prevalence,
    pseudocount: pseudocount
  }, function (response) {
    if (serial !== compareDistanceMatrixRequestSerial || !compareDistanceMatrixActive()) return;
    if (!response || response.error) {
      $('#compareDistanceMatrixStatus').text(response && response.error || 'Could not calculate distances.');
      $('#compareDistanceMatrixPlot').empty();
      return;
    }
    compareDistanceMatrixResult = response.data;
    renderCompareDistanceMatrix();
  });
}

function compareDistanceMatrixHideTooltip() {
  if (typeof toolTipDiv !== 'undefined') toolTipDiv.interrupt().style('opacity', 0);
}

function compareDistanceMatrixShowTooltip(first, second, distance, method, event) {
  toolTipDiv.interrupt().html('');
  var content = toolTipDiv.append('div').style('text-align', 'left')
    .style('max-width', 'min(400px, calc(100vw - 32px))')
    .style('white-space', 'normal').style('overflow-wrap', 'anywhere')
    .style('font-size', '0.8rem').style('line-height', '1.3');
  content.append('div').style('font-weight', 'bold').text(compareOrdinationDisplayName(first));
  content.append('div').text('Run: ' + first.runId);
  content.append('div').style('font-weight', 'bold').text(compareOrdinationDisplayName(second));
  content.append('div').text('Run: ' + second.runId);
  content.append('div').text((method === 'aitchison' ? 'Aitchison' : 'Bray–Curtis') +
    ' distance: ' + distance.toFixed(4));
  toolTipDiv.style('z-index', 1100).style('opacity', .95)
    .style('left', tooltipPos(event.pageX + 12) + 'px')
    .style('top', tooltipPosY(event.pageY + 12) + 'px');
}

function compareDistanceMatrixColour(distance, maximum) {
  var t = maximum > 0 ? Math.max(0, Math.min(1, distance / maximum)) : 0;
  var dark = [8, 81, 156], light = [247, 251, 255];
  return 'rgb(' + dark.map(function (value, i) {
    return Math.round(value + t * (light[i] - value));
  }).join(',') + ')';
}

function renderCompareDistanceMatrix() {
  var result = compareDistanceMatrixResult;
  var holder = document.getElementById('compareDistanceMatrixPlot');
  if (!result || !holder || !compareDistanceMatrixActive()) return;
  compareDistanceMatrixHideTooltip();
  holder.textContent = '';
  var keys = [];
  $('#compareSampleNameList tr').each(function () {
    keys.push(JSON.stringify([String(this.getAttribute('data-pathrun')),
      String(this.getAttribute('data-pathname'))]));
  });
  result = compareDistanceMatrixOrder(result, keys);
  compareDistanceMatrixDisplayed = result;
  var n = result.samples.length;
  var cell = n > 40 ? 17 : n > 25 ? 21 : n > 15 ? 25 : 34;
  var size = n * cell, top = 190;
  var width = Math.max(700, 230 + size + 50);
  var left = Math.max(210, Math.floor((width - size) / 2));
  var height = top + size + 90;
  var maximum = result.method === 'brayCurtis' ? 1 : Math.max.apply(null,
    result.distances.map(function (row) { return Math.max.apply(null, row); }));
  var svg = compareOrdinationSvgElement('svg', {
    id: 'compareDistanceMatrixSvg', xmlns: 'http://www.w3.org/2000/svg',
    width: width, height: height, viewBox: '0 0 ' + width + ' ' + height,
    style: 'font-family: Arial, Helvetica, sans-serif', role: 'img',
    'aria-label': (result.method === 'aitchison' ? 'Aitchison' : 'Bray–Curtis') +
      ' distance heatmap for ' + n + ' samples'
  }, holder);
  compareOrdinationSvgElement('rect', { width: width, height: height, fill: '#fff' }, svg);
  compareOrdinationSvgElement('text', { x: width / 2, y: 27, 'text-anchor': 'middle',
    fill: '#333', 'font-size': 14, 'font-weight': 'bold' }, svg,
  (result.method === 'aitchison' ? 'Aitchison' : 'Bray–Curtis') + ' distance · ' +
    taxonomicLevelDictRev[result.rank] + ' · LCA ' + lcaAbundanceCompare + '%');
  var names = result.samples.map(compareOrdinationDisplayName);
  var counts = {};
  names.forEach(function (name) { counts[name] = (counts[name] || 0) + 1; });
  function label(sample, i) {
    return counts[names[i]] > 1 ? names[i] + ' (' + sample.runId + ')' : names[i];
  }
  function shorten(value, length) { return value.length > length ? value.slice(0, length - 1) + '…' : value; }
  result.samples.forEach(function (sample, i) {
    var name = label(sample, i);
    var row = compareOrdinationSvgElement('text', { x: left - 8,
      y: top + i * cell + cell * 0.68, 'text-anchor': 'end',
      fill: '#3a3b45', 'font-size': n > 40 ? 9 : 11 }, svg, shorten(name, 28));
    compareOrdinationSvgElement('title', {}, row, name);
    var x = left + i * cell + cell * 0.5;
    var column = compareOrdinationSvgElement('text', { x: x, y: top - 8,
      transform: 'rotate(-60 ' + x + ' ' + (top - 8) + ')',
      'text-anchor': 'start', fill: '#3a3b45', 'font-size': n > 40 ? 9 : 11 }, svg, shorten(name, 24));
    compareOrdinationSvgElement('title', {}, column, name);
  });
  var showValues = $('#compareDistanceMatrixShowValues').prop('checked') && cell >= 25;
  result.distances.forEach(function (row, i) {
    row.forEach(function (distance, j) {
      var x = left + j * cell, y = top + i * cell;
      var attributes = { x: x, y: y, width: cell, height: cell,
        fill: compareDistanceMatrixColour(distance, maximum), stroke: '#fff',
        'stroke-width': 1, role: 'img', 'data-row': i, 'data-column': j,
        'aria-label': label(result.samples[i], i) + ' and ' + label(result.samples[j], j) +
          ': distance ' + distance.toFixed(4) };
      if (n <= 30) attributes.tabindex = 0;
      compareOrdinationSvgElement('rect', attributes, svg);
      if (showValues) compareOrdinationSvgElement('text', { x: x + cell / 2,
        y: y + cell * 0.65, 'text-anchor': 'middle', 'pointer-events': 'none',
        fill: maximum > 0 && distance / maximum < 0.4 ? '#fff' : '#333',
        'font-size': cell >= 34 ? 10 : 8 }, svg, distance.toFixed(result.method === 'aitchison' ? 1 : 2));
    });
  });
  function tooltipForCell(event) {
    var target = event.target;
    if (!target || !target.hasAttribute('data-row')) return;
    var i = Number(target.getAttribute('data-row'));
    var j = Number(target.getAttribute('data-column'));
    compareDistanceMatrixShowTooltip(result.samples[i], result.samples[j],
      result.distances[i][j], result.method, event);
  }
  svg.addEventListener('mousemove', tooltipForCell);
  svg.addEventListener('mouseleave', compareDistanceMatrixHideTooltip);
  svg.addEventListener('focusin', function (event) {
    var bounds = event.target.getBoundingClientRect();
    tooltipForCell({ target: event.target, pageX: bounds.right + window.pageXOffset,
      pageY: bounds.top + window.pageYOffset });
  });
  svg.addEventListener('focusout', compareDistanceMatrixHideTooltip);
  var legendX = left + size / 2 - 100, legendY = top + size + 28;
  for (var step = 0; step < 40; step++) {
    compareOrdinationSvgElement('rect', { x: legendX + 5 * step, y: legendY,
      width: 5, height: 12, fill: compareDistanceMatrixColour(maximum * step / 39, maximum) }, svg);
  }
  compareOrdinationSvgElement('text', { x: legendX, y: legendY + 27,
    'text-anchor': 'middle', fill: '#555', 'font-size': 11 }, svg, '0');
  compareOrdinationSvgElement('text', { x: legendX + 200, y: legendY + 27,
    'text-anchor': 'middle', fill: '#555', 'font-size': 11 }, svg,
  maximum.toFixed(result.method === 'aitchison' ? 2 : 0));
  $('#compareDistanceMatrixStatus').text(result.sampleCount + ' samples · ' + result.featureCount +
    ' taxa' + (result.excludedCount ? ' · ' + result.excludedCount + ' excluded' : '') +
    (maximum === 0 ? ' · All retained profiles are identical' : '') + '.');
}

function compareDistanceMatrixFilename(suffix) {
  return 'marti_sample_distances_' + getDate() + '_' + getTime() + '_' + suffix;
}

function compareDistanceMatrixSvgString() {
  var svg = document.getElementById('compareDistanceMatrixSvg');
  return svg && new XMLSerializer().serializeToString(svg);
}

function compareDistanceMatrixExportSvg() {
  var source = compareDistanceMatrixSvgString();
  if (source) saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareDistanceMatrixFilename('plot.svg'));
}

function compareDistanceMatrixExportPng() {
  var source = compareDistanceMatrixSvgString();
  var svg = document.getElementById('compareDistanceMatrixSvg');
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
    canvas.toBlob(function (blob) { if (blob) saveAs(blob, compareDistanceMatrixFilename('plot.png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function () {
    URL.revokeObjectURL(url);
    $('#compareDistanceMatrixStatus').text('PNG export failed. Try SVG export.');
  };
  image.src = url;
}

function compareDistanceMatrixExportCsv() {
  var result = compareDistanceMatrixDisplayed;
  if (!result) return;
  function field(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }
  var labels = result.samples.map(function (sample) {
    return compareOrdinationDisplayName(sample) + ' (' + sample.runId + ')';
  });
  var rows = [['Sample', 'Run'].concat(labels)];
  result.samples.forEach(function (sample, i) {
    rows.push([compareOrdinationDisplayName(sample), sample.runId].concat(
      result.distances[i].map(function (value) { return value.toPrecision(12); })));
  });
  saveAs(new Blob([rows.map(function (row) { return row.map(field).join(','); }).join('\r\n') + '\r\n'],
    { type: 'text/csv;charset=utf-8' }), compareDistanceMatrixFilename('matrix.csv'));
}

if (typeof module !== 'undefined') module.exports = {
  compareDistanceMatrixOrder: compareDistanceMatrixOrder,
  compareDistanceMatrixColour: compareDistanceMatrixColour
};
