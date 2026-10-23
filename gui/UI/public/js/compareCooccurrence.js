/* global $, currentPage, compareTreeDataGlobal, taxonomicRankSelectedCompare, taxonomicLevelDictRev, lcaAbundanceCompare, compareTaxonCorrelationCounts, compareOrdinationSvgElement, toolTipDiv, tooltipPos, tooltipPosY, saveAs, getDate, getTime */

var compareCooccurrenceResult = null;
var compareCooccurrenceTimer = null;
var compareCooccurrenceCounts = typeof compareTaxonCorrelationCounts === 'function'
  ? compareTaxonCorrelationCounts : require('./compareTaxonCorrelation').compareTaxonCorrelationCounts;

function calculateCompareCooccurrence(entries, options) {
  var rank = Number(options.rank), topN = Number(options.topN);
  var presenceReads = Number(options.presenceReads), minimumPrevalence = Number(options.minimumPrevalence);
  var minimumShared = Number(options.minimumShared), minimumJaccard = Number(options.minimumJaccard);
  var maxLinks = Number(options.maxLinks);
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) throw new Error('Choose a single taxonomic rank.');
  if (!Number.isInteger(topN) || topN < 2 || topN > 20) throw new Error('Show between 2 and 20 taxa.');
  if (!Number.isInteger(presenceReads) || presenceReads < 1) throw new Error('Minimum reads for presence must be a positive whole number.');
  if (!Number.isInteger(minimumPrevalence) || minimumPrevalence < 1) throw new Error('Minimum prevalence must be a positive whole number.');
  if (!Number.isInteger(minimumShared) || minimumShared < 1) throw new Error('Minimum shared samples must be a positive whole number.');
  if (!Number.isFinite(minimumJaccard) || minimumJaccard < 0 || minimumJaccard > 1) throw new Error('Jaccard overlap must be between 0 and 1.');
  if (!Number.isInteger(maxLinks) || maxLinks < 1 || maxLinks > 100) throw new Error('Show between 1 and 100 links.');

  var samples = (entries || []).map(function (entry) {
    var data = compareCooccurrenceCounts(entry && entry.tree && entry.tree.tree, rank);
    var total = Array.from(data.counts.values()).reduce(function (sum, value) { return sum + value; }, 0);
    return { counts: data.counts, names: data.names, total: total };
  }).filter(function (sample) { return sample.total > 0; });
  if (samples.length < 3) throw new Error('Select at least three samples with taxa at this rank and LCA cutoff.');

  var names = new Map(), prevalence = new Map(), abundance = new Map();
  samples.forEach(function (sample) {
    sample.counts.forEach(function (count, id) {
      if (!names.has(id)) names.set(id, sample.names.get(id));
      if (count < presenceReads) return;
      prevalence.set(id, (prevalence.get(id) || 0) + 1);
      abundance.set(id, (abundance.get(id) || 0) + count / sample.total);
    });
  });
  var taxa = Array.from(prevalence.keys()).filter(function (id) {
    return prevalence.get(id) >= minimumPrevalence;
  }).map(function (id) {
    return { id: id, name: names.get(id), prevalence: prevalence.get(id),
      meanAbundance: (abundance.get(id) || 0) / samples.length };
  }).sort(function (a, b) {
    return b.prevalence - a.prevalence || b.meanAbundance - a.meanAbundance ||
      a.id.localeCompare(b.id, undefined, { numeric: true });
  }).slice(0, topN);
  if (taxa.length < 2) throw new Error('Fewer than two taxa meet the prevalence and read thresholds.');

  var edges = [];
  for (var i = 0; i < taxa.length; i++) {
    for (var j = i + 1; j < taxa.length; j++) {
      var both = 0;
      samples.forEach(function (sample) {
        if ((sample.counts.get(taxa[i].id) || 0) >= presenceReads &&
            (sample.counts.get(taxa[j].id) || 0) >= presenceReads) both++;
      });
      if (both < minimumShared) continue;
      var either = taxa[i].prevalence + taxa[j].prevalence - both;
      var jaccard = both / either;
      if (jaccard < minimumJaccard) continue;
      edges.push({ source: i, target: j, both: both, either: either, jaccard: jaccard });
    }
  }
  edges.sort(function (a, b) {
    return b.jaccard - a.jaccard || b.both - a.both || a.source - b.source || a.target - b.target;
  });
  return { taxa: taxa, edges: edges.slice(0, maxLinks), eligibleLinkCount: edges.length,
    sampleCount: samples.length, excludedCount: (entries || []).length - samples.length,
    rank: rank, presenceReads: presenceReads, minimumPrevalence: minimumPrevalence,
    minimumShared: minimumShared, minimumJaccard: minimumJaccard, maxLinks: maxLinks };
}

function compareCooccurrenceActive() {
  return currentPage === 'Compare' && !$('#compareTaxonRelationshipsView').prop('hidden');
}

function initialiseCompareCooccurrence() {
  compareCooccurrenceResult = null;
  $('#compareCooccurrenceSettingsButton').off('.cooccurrence').on('click.cooccurrence', function () {
    var opening = $('#compareCooccurrenceSettings').prop('hidden');
    $('#compareCooccurrenceSettings').prop('hidden', !opening);
    $(this).attr('aria-expanded', String(opening));
    if (opening) $('#compareCooccurrenceSettingsTitle').trigger('focus');
    requestAnimationFrame(renderCompareCooccurrence);
  });
  $('#compareCooccurrenceSettingsClose').off('.cooccurrence').on('click.cooccurrence', function () {
    $('#compareCooccurrenceSettings').prop('hidden', true);
    $('#compareCooccurrenceSettingsButton').attr('aria-expanded', 'false').trigger('focus');
    requestAnimationFrame(renderCompareCooccurrence);
  });
  $('#compareCooccurrenceTopN, #compareCooccurrencePresenceReads, #compareCooccurrencePrevalence, ' +
    '#compareCooccurrenceShared, #compareCooccurrenceJaccard, #compareCooccurrenceMaxLinks')
    .off('.cooccurrence').on('input.cooccurrence change.cooccurrence', function () {
      clearTimeout(compareCooccurrenceTimer);
      compareCooccurrenceTimer = setTimeout(renderCompareCooccurrence, 250);
    });
  $('#exportCompareCooccurrenceSVG').off('.cooccurrence').on('click.cooccurrence', function (event) { event.preventDefault(); compareCooccurrenceExportSvg(); });
  $('#exportCompareCooccurrencePNG').off('.cooccurrence').on('click.cooccurrence', function (event) { event.preventDefault(); compareCooccurrenceExportPng(); });
  $('#exportCompareCooccurrenceCSV').off('.cooccurrence').on('click.cooccurrence', function (event) { event.preventDefault(); compareCooccurrenceExportCsv(); });
  $(window).off('resize.compareCooccurrence').on('resize.compareCooccurrence', function () {
    if (compareCooccurrenceActive()) renderCompareCooccurrence();
  });
}

function compareCooccurrenceHideTooltip() {
  if (typeof toolTipDiv !== 'undefined') toolTipDiv.interrupt().style('opacity', 0);
}

function compareCooccurrenceTooltip(lines, event) {
  toolTipDiv.interrupt().html('');
  var content = toolTipDiv.append('div').style('text-align', 'left')
    .style('max-width', 'min(380px, calc(100vw - 32px))')
    .style('white-space', 'normal').style('overflow-wrap', 'anywhere');
  lines.forEach(function (line, index) {
    content.append('div').style('font-weight', index === 0 ? 'bold' : 'normal').text(line);
  });
  toolTipDiv.style('z-index', 1100).style('opacity', .95)
    .style('left', tooltipPos(event.pageX + 12) + 'px')
    .style('top', tooltipPosY(event.pageY + 12) + 'px');
}

function compareCooccurrenceLabelPositions(taxa, cx, cy, radius) {
  var positions = taxa.map(function (_, i) {
    var angle = -Math.PI / 2 + 2 * Math.PI * i / taxa.length;
    var side = Math.cos(angle) >= -1e-9 ? 1 : -1;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle),
      side: side, labelX: cx + side * (radius + 27), labelY: cy + radius * Math.sin(angle) + 4 };
  });
  [-1, 1].forEach(function (side) {
    var group = positions.filter(function (position) { return position.side === side; })
      .sort(function (a, b) { return a.labelY - b.labelY; });
    var minY = cy - radius - 12, maxY = cy + radius + 16;
    group.forEach(function (position, i) {
      position.labelY = Math.max(position.labelY, minY + i * 17);
      if (i) position.labelY = Math.max(position.labelY, group[i - 1].labelY + 17);
    });
    if (group.length && group[group.length - 1].labelY > maxY) {
      var shift = group[group.length - 1].labelY - maxY;
      group.forEach(function (position) { position.labelY -= shift; });
    }
  });
  return positions;
}

function renderCompareCooccurrence() {
  if (!compareCooccurrenceActive()) return;
  compareCooccurrenceHideTooltip();
  var holder = document.getElementById('compareCooccurrencePlot');
  if (!holder) return;
  holder.textContent = '';
  compareCooccurrenceResult = null;
  if (typeof compareTreeDataGlobal === 'undefined' || !Array.isArray(compareTreeDataGlobal)) {
    $('#compareCooccurrenceStatus').text('Waiting for sample data…');
    return;
  }
  try {
    compareCooccurrenceResult = calculateCompareCooccurrence(compareTreeDataGlobal, {
      rank: taxonomicRankSelectedCompare,
      topN: Number($('#compareCooccurrenceTopN').val()),
      presenceReads: Number($('#compareCooccurrencePresenceReads').val()),
      minimumPrevalence: Number($('#compareCooccurrencePrevalence').val()),
      minimumShared: Number($('#compareCooccurrenceShared').val()),
      minimumJaccard: Number($('#compareCooccurrenceJaccard').val()),
      maxLinks: Number($('#compareCooccurrenceMaxLinks').val())
    });
  } catch (error) {
    $('#compareCooccurrenceStatus').text(error.message);
    return;
  }
  var result = compareCooccurrenceResult;
  var width = Math.max(760, Math.min(1050, Math.floor(holder.clientWidth || 850)));
  var height = 635, cx = width / 2, cy = 315, radius = 210;
  var positions = compareCooccurrenceLabelPositions(result.taxa, cx, cy, radius);
  var svg = compareOrdinationSvgElement('svg', {
    id: 'compareCooccurrenceSvg', xmlns: 'http://www.w3.org/2000/svg',
    width: width, height: height, viewBox: '0 0 ' + width + ' ' + height,
    style: 'font-family: Arial, Helvetica, sans-serif', role: 'img',
    'aria-label': 'Co-occurrence network of ' + result.taxa.length + ' taxa across ' + result.sampleCount + ' samples'
  }, holder);
  compareOrdinationSvgElement('rect', { width: width, height: height, fill: '#fff' }, svg);
  compareOrdinationSvgElement('text', { x: cx, y: 27, 'text-anchor': 'middle',
    fill: '#333', 'font-size': 14, 'font-weight': 'bold' }, svg,
  'Taxon co-occurrence · ' + taxonomicLevelDictRev[result.rank] + ' · LCA ' + lcaAbundanceCompare + '%');

  var labelCounts = {};
  result.taxa.forEach(function (taxon) { labelCounts[taxon.name] = (labelCounts[taxon.name] || 0) + 1; });
  function label(taxon) { return labelCounts[taxon.name] > 1 ? taxon.name + ' (' + taxon.id + ')' : taxon.name; }
  function shorten(value) { return value.length > 23 ? value.slice(0, 22) + '…' : value; }
  var edgeElements = [];
  result.edges.forEach(function (edge) {
    var source = positions[edge.source], target = positions[edge.target];
    var line = compareOrdinationSvgElement('line', {
      x1: source.x, y1: source.y, x2: target.x, y2: target.y,
      stroke: '#4e73df', 'stroke-width': (1 + 3 * edge.jaccard).toFixed(2),
      opacity: 0.35 + 0.45 * edge.jaccard, 'pointer-events': 'none'
    }, svg);
    edgeElements.push({ data: edge, element: line });
  });
  var nodeElements = [];
  function reset() {
    edgeElements.forEach(function (item) { item.element.setAttribute('opacity', 0.35 + 0.45 * item.data.jaccard); });
    nodeElements.forEach(function (item) { item.element.setAttribute('opacity', 1); });
    compareCooccurrenceHideTooltip();
  }
  result.edges.forEach(function (edge, index) {
    var source = positions[edge.source], target = positions[edge.target];
    var targetArea = compareOrdinationSvgElement('line', {
      x1: source.x, y1: source.y, x2: target.x, y2: target.y,
      stroke: 'transparent', 'stroke-width': 12, 'pointer-events': 'stroke', tabindex: 0, role: 'img',
      'aria-label': label(result.taxa[edge.source]) + ' and ' + label(result.taxa[edge.target]) +
        ': ' + edge.both + ' shared samples, Jaccard ' + edge.jaccard.toFixed(3)
    }, svg);
    function show(event) {
      reset();
      edgeElements[index].element.setAttribute('opacity', 1);
      compareCooccurrenceTooltip([
        label(result.taxa[edge.source]) + ' × ' + label(result.taxa[edge.target]),
        'NCBI IDs: ' + result.taxa[edge.source].id + ' × ' + result.taxa[edge.target].id,
        'Together in ' + edge.both + ' of ' + result.sampleCount + ' samples',
        'Either taxon in ' + edge.either + ' samples · Jaccard ' + edge.jaccard.toFixed(3)
      ], event);
    }
    targetArea.addEventListener('mouseenter', show);
    targetArea.addEventListener('mousemove', show);
    targetArea.addEventListener('mouseleave', reset);
    targetArea.addEventListener('focus', function () {
      var bounds = targetArea.getBoundingClientRect();
      show({ pageX: bounds.right + window.pageXOffset, pageY: bounds.top + window.pageYOffset });
    });
    targetArea.addEventListener('blur', reset);
  });
  result.taxa.forEach(function (taxon, index) {
    var position = positions[index], nodeRadius = 7 + 9 * taxon.prevalence / result.sampleCount;
    compareOrdinationSvgElement('line', { x1: position.x + position.side * (nodeRadius + 3),
      y1: position.y, x2: position.labelX - position.side * 5,
      y2: position.labelY - 4, stroke: '#b7b9cc', 'stroke-width': 1 }, svg);
    var circle = compareOrdinationSvgElement('circle', {
      class: 'compareCooccurrenceNode', cx: position.x, cy: position.y, r: nodeRadius,
      fill: '#4e73df', stroke: '#254cba', 'stroke-width': 1, tabindex: 0,
      role: 'img', 'aria-label': label(taxon) + ': present in ' + taxon.prevalence +
        ' of ' + result.sampleCount + ' samples'
    }, svg);
    nodeElements.push({ data: taxon, element: circle });
    var text = compareOrdinationSvgElement('text', { x: position.labelX, y: position.labelY,
      'text-anchor': position.side === 1 ? 'start' : 'end', fill: '#3a3b45',
      'font-size': 11, 'pointer-events': 'none' }, svg, shorten(label(taxon)));
    compareOrdinationSvgElement('title', {}, text, label(taxon));
    function show(event) {
      reset();
      edgeElements.forEach(function (item) {
        item.element.setAttribute('opacity', item.data.source === index || item.data.target === index ? 0.95 : 0.08);
      });
      nodeElements.forEach(function (item, i) {
        item.element.setAttribute('opacity', i === index || result.edges.some(function (edge) {
          return edge.source === index && edge.target === i || edge.target === index && edge.source === i;
        }) ? 1 : 0.35);
      });
      compareCooccurrenceTooltip([label(taxon), 'NCBI taxon ID: ' + taxon.id,
        'Present in ' + taxon.prevalence + ' of ' + result.sampleCount + ' samples',
        'Mean share of reads at this rank: ' + (taxon.meanAbundance * 100).toFixed(2) + '%'], event);
    }
    circle.addEventListener('mouseenter', show);
    circle.addEventListener('mousemove', show);
    circle.addEventListener('mouseleave', reset);
    circle.addEventListener('focus', function () {
      var bounds = circle.getBoundingClientRect();
      show({ pageX: bounds.right + window.pageXOffset, pageY: bounds.top + window.pageYOffset });
    });
    circle.addEventListener('blur', reset);
  });
  svg.addEventListener('mouseleave', reset);
  compareOrdinationSvgElement('text', { x: cx, y: 601, 'text-anchor': 'middle',
    fill: '#666', 'font-size': 11 }, svg,
  'Node size: sample prevalence · Link width: Jaccard overlap');
  $('#compareCooccurrenceStatus').text(result.sampleCount + ' samples · ' + result.taxa.length +
    ' taxa · ' + result.edges.length + ' links shown' +
    (result.eligibleLinkCount > result.edges.length ? ' of ' + result.eligibleLinkCount + ' meeting thresholds' : '') +
    (result.excludedCount ? ' · ' + result.excludedCount + ' samples without taxa at this rank excluded' : '') +
    (result.edges.length ? '.' : '. Lower the link thresholds to show connections.'));
}

function compareCooccurrenceFilename(suffix) {
  return 'marti_taxon_cooccurrence_' + getDate() + '_' + getTime() + '_' + suffix;
}

function compareCooccurrenceSvgString() {
  var svg = document.getElementById('compareCooccurrenceSvg');
  return svg && new XMLSerializer().serializeToString(svg);
}

function compareCooccurrenceExportSvg() {
  var source = compareCooccurrenceSvgString();
  if (source) saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareCooccurrenceFilename('plot.svg'));
}

function compareCooccurrenceExportPng() {
  var source = compareCooccurrenceSvgString();
  var svg = document.getElementById('compareCooccurrenceSvg');
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
    canvas.toBlob(function (blob) { if (blob) saveAs(blob, compareCooccurrenceFilename('plot.png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function () {
    URL.revokeObjectURL(url);
    $('#compareCooccurrenceStatus').text('PNG export failed. Try SVG export.');
  };
  image.src = url;
}

function compareCooccurrenceExportCsv() {
  var result = compareCooccurrenceResult;
  if (!result) return;
  function field(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }
  var rows = [['Source NCBI ID', 'Source taxon', 'Source prevalence',
    'Target NCBI ID', 'Target taxon', 'Target prevalence',
    'Shared samples', 'Either taxon samples', 'Jaccard overlap', 'Total samples']];
  result.edges.forEach(function (edge) {
    var source = result.taxa[edge.source], target = result.taxa[edge.target];
    rows.push([source.id, source.name, source.prevalence, target.id, target.name, target.prevalence,
      edge.both, edge.either, edge.jaccard.toPrecision(12), result.sampleCount]);
  });
  saveAs(new Blob([rows.map(function (row) { return row.map(field).join(','); }).join('\r\n') + '\r\n'],
    { type: 'text/csv;charset=utf-8' }), compareCooccurrenceFilename('links.csv'));
}

if (typeof module !== 'undefined') module.exports = {
  calculateCompareCooccurrence: calculateCompareCooccurrence,
  compareCooccurrenceLabelPositions: compareCooccurrenceLabelPositions
};
