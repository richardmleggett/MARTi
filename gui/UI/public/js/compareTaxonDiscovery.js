/* Strongest-pairs discovery card; calculations are shared with the correlation matrix. */
var compareTaxonDiscoveryResult = null;
var compareTaxonDiscoveryTimer = null;
var compareTaxonDiscoveryWorker = null;
var compareTaxonDiscoveryPrepared = null;
var compareTaxonDiscoveryOptionsKey = '';
var compareTaxonDiscoveryPairKey = '';
var compareTaxonDiscoveryDefaultsSet = false;

function stopCompareTaxonDiscoverySearch() {
  if (compareTaxonDiscoveryWorker) compareTaxonDiscoveryWorker.terminate();
  compareTaxonDiscoveryWorker = null;
}

function initialiseCompareTaxonDiscovery() {
  stopCompareTaxonDiscoverySearch();
  clearTimeout(compareTaxonDiscoveryTimer);
  compareTaxonDiscoveryResult = null;
  compareTaxonDiscoveryDefaultsSet = false;
  $('#compareTaxonDiscoverySettingsButton').off('.taxonDiscovery').on('click.taxonDiscovery', function() {
    var opening = $('#compareTaxonDiscoverySettings').prop('hidden');
    $('#compareTaxonDiscoverySettings').prop('hidden', !opening);
    $(this).attr('aria-expanded', String(opening));
    if (opening) $('#compareTaxonDiscoverySettingsTitle').trigger('focus');
    requestAnimationFrame(renderCompareTaxonDiscovery);
  });
  $('#compareTaxonDiscoverySettingsClose').off('.taxonDiscovery').on('click.taxonDiscovery', function() {
    $('#compareTaxonDiscoverySettings').prop('hidden', true);
    $('#compareTaxonDiscoverySettingsButton').attr('aria-expanded', 'false').trigger('focus');
    requestAnimationFrame(renderCompareTaxonDiscovery);
  });
  $('#compareTaxonDiscoveryMethod, #compareTaxonDiscoveryDirection').off('.taxonDiscovery').on('change.taxonDiscovery', renderCompareTaxonDiscovery);
  $('#compareTaxonDiscoveryPrevalence, #compareTaxonDiscoveryMinimumReads, #compareTaxonDiscoveryPairCount').off('.taxonDiscovery')
    .on('input.taxonDiscovery change.taxonDiscovery', function() {
      compareTaxonDiscoveryDefaultsSet = true;
      stopCompareTaxonDiscoverySearch(); clearTimeout(compareTaxonDiscoveryTimer);
      compareTaxonDiscoveryTimer = setTimeout(renderCompareTaxonDiscovery, 250);
    });
  $('#compareTaxonDiscoveryScatterColour').off('.taxonDiscovery').on('change.taxonDiscovery', drawCompareTaxonDiscoveryResult);
  $('#exportCompareTaxonDiscoverySVG').off('.taxonDiscovery').on('click.taxonDiscovery', function(event) { event.preventDefault(); compareTaxonDiscoveryExportSvg(); });
  $('#exportCompareTaxonDiscoveryPNG').off('.taxonDiscovery').on('click.taxonDiscovery', function(event) { event.preventDefault(); compareTaxonDiscoveryExportPng(); });
  $('#exportCompareTaxonDiscoveryCSV').off('.taxonDiscovery').on('click.taxonDiscovery', function(event) { event.preventDefault(); compareTaxonDiscoveryExportCsv(); });
}

function compareTaxonDiscoveryHideTooltip() {
  if (typeof toolTipDiv !== 'undefined') toolTipDiv.interrupt().style('opacity', 0).style('max-height', null).style('overflow-y', null);
}

function compareTaxonDiscoveryShowTooltip(points, pair, event) {
  toolTipDiv.interrupt().html('');
  var content = toolTipDiv.append('div').style('text-align', 'left')
    .style('max-width', 'min(400px, calc(100vw - 32px))')
    .style('white-space', 'normal').style('overflow-wrap', 'anywhere');
  content.append('small').attr('class', 'text-gray-800')
    .text(points.length === 1 ? 'Sample' : points.length + ' samples near this point');
  points.slice(0, 3).forEach(function(point, index) {
    var i = point.index;
    if (index) content.append('hr').attr('class', 'toolTipLine');
    content.append('div').style('font-weight', 'bold').style('font-size', '0.9rem')
      .text(point.name + (index === 0 && points.length > 1 ? ' (hovered)' : ''));
    content.append('div').append('small').attr('class', 'text-gray-800').text('Run: ' + point.sample.runId);
    if (point.metadata && typeof compareSampleMetadataGroup === 'function') {
      var date = compareSampleMetadataGroup(point.metadata, 'date');
      var location = compareSampleMetadataGroup(point.metadata, 'location');
      if (date) content.append('div').append('small').text('Collected: ' + date);
      if (location) content.append('div').append('small').text('Location: ' + location);
    }
    [pair.a, pair.b].forEach(function(taxon) {
      content.append('div').append('small').text(taxon.name + ': ' +
        (taxon.values[i] * 100).toPrecision(4) + '% · ' + taxon.counts[i].toLocaleString() + ' reads');
    });
  });
  if (points.length > 3) content.append('small').text('And ' + (points.length - 3) + ' more nearby samples.');
  toolTipDiv.style('z-index', 1100).style('opacity', .95)
    .style('max-height', 'min(480px, calc(100vh - 32px))').style('overflow-y', 'auto')
    .style('left', tooltipPos(event.pageX + 12) + 'px')
    .style('top', tooltipPosY(event.pageY + 12) + 'px');
}

function drawCompareTaxonDiscoveryResult() {
  var holder = document.getElementById('compareTaxonDiscoveryPlot');
  if (!holder || !compareTaxonDiscoveryResult) return;
  compareTaxonDiscoveryHideTooltip();
  holder.textContent = '';
  renderCompareTaxonDiscoveryPairs(compareTaxonDiscoveryResult, holder);
  holder.scrollTop = 0;
}

function renderCompareTaxonDiscovery() {
  if (!compareTaxonCorrelationActive()) { stopCompareTaxonDiscoverySearch(); return; }
  compareTaxonDiscoveryHideTooltip();
  var holder = document.getElementById('compareTaxonDiscoveryPlot');
  if (!holder) return;
  if (!compareTaxonDiscoveryDefaultsSet && Array.isArray(compareTreeDataGlobal) && compareTreeDataGlobal.length) {
    $('#compareTaxonDiscoveryPrevalence').val(Math.max(3, Math.ceil(compareTreeDataGlobal.length * 0.1)));
    compareTaxonDiscoveryDefaultsSet = true;
  }
  var options = {
    rank: taxonomicRankSelectedCompare, method: $('#compareTaxonDiscoveryMethod').val(),
    selection: 'pairs',
    minimumPrevalence: Number($('#compareTaxonDiscoveryPrevalence').val()),
    minimumReads: Number($('#compareTaxonDiscoveryMinimumReads').val()),
    pairCount: Number($('#compareTaxonDiscoveryPairCount').val()),
    direction: $('#compareTaxonDiscoveryDirection').val()
  };
  var key = JSON.stringify(options);
  if (typeof compareTreeDataGlobal === 'undefined' || !Array.isArray(compareTreeDataGlobal)) {
    stopCompareTaxonDiscoverySearch();
    holder.textContent = '';
    compareTaxonDiscoveryResult = null;
    $('#compareTaxonDiscoveryStatus').text('Waiting for sample data…');
    return;
  }
  var prepared = getCompareTaxonCorrelationPrepared();
  if (compareTaxonDiscoveryPrepared !== prepared) {
    stopCompareTaxonDiscoverySearch();
    compareTaxonDiscoveryPrepared = prepared;
    compareTaxonDiscoveryResult = null;
  }
  if (compareTaxonDiscoveryResult && compareTaxonDiscoveryOptionsKey === key) {
    drawCompareTaxonDiscoveryResult(); return;
  }
  if (compareTaxonDiscoveryWorker && compareTaxonDiscoveryOptionsKey === key) return;
  stopCompareTaxonDiscoverySearch();
  compareTaxonDiscoveryResult = null;
  compareTaxonDiscoveryOptionsKey = key;
  holder.textContent = '';
  if (options.selection === 'pairs') {
    $('#compareTaxonDiscoveryStatus').text('Searching eligible taxon pairs…');
    var cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn btn-sm btn-outline-secondary m-3';
    cancel.textContent = 'Cancel search';
    cancel.addEventListener('click', function() {
      stopCompareTaxonDiscoverySearch(); holder.textContent = '';
      $('#compareTaxonDiscoveryStatus').text('Search cancelled. Adjust the evidence filters to narrow the search.');
    });
    holder.appendChild(cancel);
    try {
      var worker = new Worker('/js/taxonCorrelationWorker.js');
      compareTaxonDiscoveryWorker = worker;
      worker.onmessage = function(event) {
        if (worker !== compareTaxonDiscoveryWorker) return;
        if (event.data.progress) {
          $('#compareTaxonDiscoveryStatus').text('Searching taxon pairs: ' + event.data.progress.tested.toLocaleString() + ' / ' + event.data.progress.total.toLocaleString());
          return;
        }
        stopCompareTaxonDiscoverySearch();
        holder.textContent = '';
        if (event.data.error) { $('#compareTaxonDiscoveryStatus').text(event.data.error); return; }
        compareTaxonDiscoveryResult = event.data.result;
        if (compareTaxonCorrelationActive()) drawCompareTaxonDiscoveryResult();
      };
      worker.onerror = function() {
        if (worker !== compareTaxonDiscoveryWorker) return;
        stopCompareTaxonDiscoverySearch(); holder.textContent = '';
        $('#compareTaxonDiscoveryStatus').text('The correlation search could not finish. Try narrowing the evidence filters or reloading the page.');
      };
      worker.postMessage({ entries: compareTaxonDiscoveryPrepared.prepared, options: options });
    } catch (error) {
      stopCompareTaxonDiscoverySearch(); holder.textContent = '';
      $('#compareTaxonDiscoveryStatus').text(error.message);
    }
    return;
  }
}

function renderCompareTaxonDiscoveryPairs(result, holder) {
  var positive = result.pairs.filter(function(pair) { return pair.correlation > 0; });
  var negative = result.pairs.filter(function(pair) { return pair.correlation < 0; });
  $('#compareTaxonDiscoveryStatus').text(result.sampleCount + ' samples · ' + result.candidateCount.toLocaleString() +
    ' eligible taxa · ' + result.pairsTested.toLocaleString() + ' pairs searched · ' + positive.length + ' positive and ' + negative.length +
    ' negative pairs shown' + (result.excludedCount ? ' · ' + result.excludedCount + ' samples without taxa at this rank excluded' : '') + '.');
  if (!result.pairs.length) {
    holder.textContent = 'No correlations in the selected direction. Try another direction or evidence filters.';
    return;
  }
  var instructions = document.createElement('p');
  instructions.className = 'small text-muted px-3 pt-2';
  instructions.textContent = 'Inspect a pair to see every sample. Support counts samples with at least ' + result.minimumReads +
    ' reads; mean abundance is a percentage of reads assigned at this rank. Zeros remain in the calculation.';
  holder.appendChild(instructions);
  var scatter = document.createElement('div');
  scatter.id = 'compareTaxonDiscoveryScatter'; holder.appendChild(scatter);
  var selected = result.pairs.find(function(pair) { return pair.a.id + ':' + pair.b.id === compareTaxonDiscoveryPairKey; }) || result.pairs[0];
  compareTaxonDiscoveryPairKey = selected.a.id + ':' + selected.b.id;
  [['Strongest positive correlations', positive], ['Strongest negative correlations', negative]].forEach(function(section) {
    if (!section[1].length) return;
    var heading = document.createElement('h6'); heading.className = 'px-3 pt-3 font-weight-bold'; heading.textContent = section[0];
    holder.appendChild(heading);
    var wrap = document.createElement('div'); wrap.className = 'table-responsive px-3';
    var table = document.createElement('table'); table.className = 'table table-sm table-hover correlationPairTable';
    table.setAttribute('aria-label', section[0]);
    var head = table.createTHead().insertRow();
    ['Taxon A', 'Taxon B', result.method === 'spearman' ? 'Spearman ρ' : 'Pearson r', 'Support A / B', 'Mean A / B (%)', 'Shared support', ''].forEach(function(label) {
      var th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.appendChild(th);
    });
    var body = table.createTBody();
    section[1].forEach(function(pair) {
      var row = body.insertRow();
      [pair.a, pair.b].forEach(function(taxon) {
        var cell = row.insertCell(); cell.textContent = taxon.name; cell.title = 'NCBI taxon ID: ' + taxon.id;
      });
      row.insertCell().textContent = (pair.correlation > 0 ? '+' : '') + pair.correlation.toFixed(3);
      row.insertCell().textContent = pair.a.prevalence + ' / ' + pair.b.prevalence;
      row.insertCell().textContent = (pair.a.mean * 100).toPrecision(3) + ' / ' + (pair.b.mean * 100).toPrecision(3);
      row.insertCell().textContent = pair.sharedSupport;
      var button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-sm btn-outline-primary';
      button.textContent = 'Inspect'; button.setAttribute('aria-label', 'Inspect ' + pair.a.name + ' and ' + pair.b.name);
      var key = pair.a.id + ':' + pair.b.id;
      button.setAttribute('aria-pressed', String(key === compareTaxonDiscoveryPairKey));
      button.addEventListener('click', function() {
        compareTaxonDiscoveryPairKey = key;
        holder.querySelectorAll('.correlationPairTable button').forEach(function(other) { other.setAttribute('aria-pressed', 'false'); });
        button.setAttribute('aria-pressed', 'true');
        renderCompareTaxonDiscoveryScatter(result, pair, scatter);
        scatter.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      row.insertCell().appendChild(button);
    });
    wrap.appendChild(table); holder.appendChild(wrap);
  });
  renderCompareTaxonDiscoveryScatter(result, selected, scatter);
}

function renderCompareTaxonDiscoveryScatter(result, pair, holder) {
  holder.textContent = '';
  var mode = $('#compareTaxonDiscoveryScatterColour').val() || 'date';
  var points = result.samples.map(function(sample, index) {
    var metadata = typeof compareOrdinationMetadata === 'function' ? compareOrdinationMetadata(sample) : null;
    var group = mode === 'run' ? sample.runId :
      metadata && typeof compareSampleMetadataGroup === 'function' ? compareSampleMetadataGroup(metadata, mode) : '';
    if (!group) group = mode === 'location' ? 'No location' : mode === 'date' ? 'No sampling date' : 'No run';
    return { sample: sample, index: index, group: group, metadata: metadata, name: typeof compareOrdinationDisplayName === 'function'
      ? compareOrdinationDisplayName(sample) : sample.name };
  });
  var groups = Array.from(new Set(points.map(function(point) { return point.group; }))).sort();
  var palette = ['#4477aa', '#ee6677', '#228833', '#ccbb44', '#66ccee', '#aa3377', '#bbbbbb', '#332288', '#44aa99', '#999933'];
  var colours = new Map(groups.map(function(group, index) { return [group, palette[index % palette.length]]; }));
  var width = Math.max(500, Math.min(1000, holder.clientWidth || 720));
  var left = 85, top = 65, plotWidth = width - left - 35, plotHeight = 300;
  var legendX = left, legendY = top + plotHeight + 90;
  var legend = groups.map(function(group) {
    var itemWidth = Math.min(width - left - 20, group.length * 7 + 32);
    if (legendX + itemWidth > width - 20) { legendX = left; legendY += 22; }
    var item = { name: group, x: legendX, y: legendY }; legendX += itemWidth; return item;
  });
  var height = legendY + 30;
  var svg = compareOrdinationSvgElement('svg', { id: 'compareTaxonDiscoverySvg', xmlns: 'http://www.w3.org/2000/svg',
    width: width, height: height, viewBox: '0 0 ' + width + ' ' + height,
    style: 'font-family: Arial, Helvetica, sans-serif', role: 'img',
    'aria-label': pair.a.name + ' versus ' + pair.b.name + ' across ' + result.sampleCount + ' samples' }, holder);
  compareOrdinationSvgElement('rect', { width: width, height: height, fill: '#fff' }, svg);
  var title = pair.a.name + ' × ' + pair.b.name;
  var titleNode = compareOrdinationSvgElement('text', { x: width / 2, y: 23, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 'bold', fill: '#333' }, svg,
    title.length > 90 ? title.slice(0, 89) + '…' : title);
  compareOrdinationSvgElement('title', {}, titleNode, title);
  compareOrdinationSvgElement('text', { x: width / 2, y: 43, 'text-anchor': 'middle', 'font-size': 12, fill: '#555' }, svg,
    (result.method === 'spearman' ? 'Spearman ρ' : 'Pearson r') + ' = ' + pair.correlation.toFixed(3) + ' · ' + result.sampleCount + ' samples · colour: ' +
    (mode === 'date' ? 'sampling date' : mode === 'location' ? 'location' : 'run'));
  var xmax = Math.max.apply(null, pair.a.values) * 100 * 1.05 || 1;
  var ymax = Math.max.apply(null, pair.b.values) * 100 * 1.05 || 1;
  function x(value) { return left + value / xmax * plotWidth; }
  function y(value) { return top + plotHeight - value / ymax * plotHeight; }
  for (var tick = 0; tick <= 5; tick++) {
    var xv = xmax * tick / 5, yv = ymax * tick / 5;
    compareOrdinationSvgElement('line', { x1: x(xv), x2: x(xv), y1: top, y2: top + plotHeight, stroke: '#eaecf4' }, svg);
    compareOrdinationSvgElement('line', { x1: left, x2: left + plotWidth, y1: y(yv), y2: y(yv), stroke: '#eaecf4' }, svg);
    compareOrdinationSvgElement('text', { x: x(xv), y: top + plotHeight + 19, 'text-anchor': 'middle', 'font-size': 11 }, svg, Number(xv.toPrecision(3)).toString());
    compareOrdinationSvgElement('text', { x: left - 9, y: y(yv) + 4, 'text-anchor': 'end', 'font-size': 11 }, svg, Number(yv.toPrecision(3)).toString());
  }
  compareOrdinationSvgElement('line', { x1: left, x2: left + plotWidth, y1: top + plotHeight, y2: top + plotHeight, stroke: '#555' }, svg);
  compareOrdinationSvgElement('line', { x1: left, x2: left, y1: top, y2: top + plotHeight, stroke: '#555' }, svg);
  function axisLabel(taxon) { return (taxon.name.length > 45 ? taxon.name.slice(0, 44) + '…' : taxon.name) + ' (%)'; }
  compareOrdinationSvgElement('text', { x: left + plotWidth / 2, y: top + plotHeight + 47, 'text-anchor': 'middle', 'font-size': 12 }, svg, axisLabel(pair.a));
  compareOrdinationSvgElement('text', { transform: 'translate(18 ' + (top + plotHeight / 2) + ') rotate(-90)', 'text-anchor': 'middle', 'font-size': 12 }, svg, axisLabel(pair.b));
  points.forEach(function(point) {
    var i = point.index;
    var text = point.name + ' · ' + point.sample.runId + ' · ' + point.group + '\n' +
      pair.a.name + ': ' + (pair.a.values[i] * 100).toPrecision(4) + '% (' + pair.a.counts[i] + ' reads)\n' +
      pair.b.name + ': ' + (pair.b.values[i] * 100).toPrecision(4) + '% (' + pair.b.counts[i] + ' reads)';
    var circle = compareOrdinationSvgElement('circle', { cx: x(pair.a.values[i] * 100), cy: y(pair.b.values[i] * 100),
      r: 5, fill: colours.get(point.group), 'fill-opacity': 0.75, stroke: '#333', 'stroke-width': 0.6,
      class: 'correlationScatterPoint', tabindex: 0, role: 'img', 'aria-label': text }, svg);
    var nearby = [point].concat(points.filter(function(other) {
      return other !== point && Math.hypot(x(pair.a.values[other.index] * 100) - x(pair.a.values[i] * 100),
        y(pair.b.values[other.index] * 100) - y(pair.b.values[i] * 100)) <= 6;
    }));
    var show = function(event) { compareTaxonDiscoveryShowTooltip(nearby, pair, event); };
    circle.addEventListener('mouseenter', show);
    circle.addEventListener('mousemove', show);
    circle.addEventListener('mouseleave', compareTaxonDiscoveryHideTooltip);
    circle.addEventListener('focus', function() {
      var bounds = circle.getBoundingClientRect();
      show({ pageX: bounds.right + window.pageXOffset, pageY: bounds.top + window.pageYOffset });
    });
    circle.addEventListener('blur', compareTaxonDiscoveryHideTooltip);
  });
  legend.forEach(function(item) {
    compareOrdinationSvgElement('circle', { cx: item.x, cy: item.y - 4, r: 4, fill: colours.get(item.name) }, svg);
    compareOrdinationSvgElement('text', { x: item.x + 10, y: item.y, 'font-size': 11 }, svg, item.name);
  });
}

function compareTaxonDiscoveryFilename(suffix) {
  return 'marti_strongest_taxon_correlations_' + getDate() + '_' + getTime() + '_' + suffix;
}

function compareTaxonDiscoverySvgString() {
  var svg = document.getElementById('compareTaxonDiscoverySvg');
  return svg && new XMLSerializer().serializeToString(svg);
}

function compareTaxonDiscoveryExportSvg() {
  var source = compareTaxonDiscoverySvgString();
  if (source) saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareTaxonDiscoveryFilename('plot.svg'));
}

function compareTaxonDiscoveryExportPng() {
  var source = compareTaxonDiscoverySvgString();
  var svg = document.getElementById('compareTaxonDiscoverySvg');
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
    canvas.toBlob(function (blob) { if (blob) saveAs(blob, compareTaxonDiscoveryFilename('plot.png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function () {
    URL.revokeObjectURL(url);
    $('#compareTaxonDiscoveryStatus').text('PNG export failed. Try SVG export.');
  };
  image.src = url;
}

function compareTaxonDiscoveryExportCsv() {
  var result = compareTaxonDiscoveryResult;
  if (!result) return;
  function field(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }
  var rows = compareTaxonCorrelationCsvRows(result, lcaAbundanceCompare);
  saveAs(new Blob([rows.map(function(row) { return row.map(field).join(','); }).join('\r\n') + '\r\n'],
    { type: 'text/csv;charset=utf-8' }), compareTaxonDiscoveryFilename(result.selection === 'pairs' ? 'pairs.csv' : 'matrix.csv'));
}

