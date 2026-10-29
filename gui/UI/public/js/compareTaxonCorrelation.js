/* Shared correlation calculations and abundance-matrix card. */
var compareTaxonCorrelationResult = null;
var compareTaxonCorrelationTimer = null;
var compareTaxonCorrelationPrepared = null;

function getCompareTaxonCorrelationPrepared() {
  if (!compareTaxonCorrelationPrepared || compareTaxonCorrelationPrepared.entries !== compareTreeDataGlobal || compareTaxonCorrelationPrepared.rank !== taxonomicRankSelectedCompare) {
    compareTaxonCorrelationPrepared = { entries: compareTreeDataGlobal, rank: taxonomicRankSelectedCompare,
      prepared: prepareCompareTaxonCorrelationEntries(compareTreeDataGlobal, taxonomicRankSelectedCompare) };
  }
  return compareTaxonCorrelationPrepared;
}

function compareTaxonCorrelationCounts(tree, rank) {
  var counts = new Map();
  var names = new Map();
  var stack = tree ? [tree] : [];
  while (stack.length) {
    var node = stack.pop();
    if (Number(node.rank) === rank && /^\d+$/.test(String(node.ncbiID))) {
      var count = Number(node.summedValue);
      if (Number.isFinite(count) && count > 0) {
        var id = String(node.ncbiID);
        counts.set(id, (counts.get(id) || 0) + count);
        names.set(id, node.name || id);
      }
      continue;
    }
    if (Array.isArray(node.children)) stack.push.apply(stack, node.children);
  }
  return { counts: counts, names: names };
}

function compareTaxonCorrelationRanks(values) {
  var sorted = values.map(function (value, index) { return { value: value, index: index }; })
    .sort(function (a, b) { return a.value - b.value; });
  var ranks = Array(values.length);
  for (var start = 0; start < sorted.length;) {
    var end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end++;
    var average = (start + end + 1) / 2;
    for (var i = start; i < end; i++) ranks[sorted[i].index] = average;
    start = end;
  }
  return ranks;
}

function compareTaxonCorrelationPearson(a, b) {
  if (!a.length || a.length !== b.length || a.every(function(value) { return value === a[0]; }) || b.every(function(value) { return value === b[0]; })) return null;
  var meanA = a.reduce(function (sum, value) { return sum + value; }, 0) / a.length;
  var meanB = b.reduce(function (sum, value) { return sum + value; }, 0) / b.length;
  var cross = 0, squareA = 0, squareB = 0;
  for (var i = 0; i < a.length; i++) {
    var da = a[i] - meanA, db = b[i] - meanB;
    cross += da * db;
    squareA += da * da;
    squareB += db * db;
  }
  if (squareA === 0 || squareB === 0) return null;
  return Math.max(-1, Math.min(1, cross / Math.sqrt(squareA * squareB)));
}

function prepareCompareTaxonCorrelationEntries(entries, rank) {
  return (entries || []).map(function(entry, index) {
    if (entry && entry.correlationCounts) return entry;
    var data = compareTaxonCorrelationCounts(entry && entry.tree && entry.tree.tree, rank);
    return { name: entry && (entry.id || entry.name) || 'Sample ' + (index + 1),
      runId: entry && entry.runId || '', correlationCounts: Array.from(data.counts, function(item) {
        return [item[0], item[1], data.names.get(item[0])];
      }) };
  });
}

function calculateCompareTaxonCorrelation(entries, options, onProgress) {
  var rank = Number(options.rank), topN = Number(options.topN);
  var selection = options.selection || 'abundance';
  var minimumPrevalence = Number(options.minimumPrevalence);
  var minimumReads = options.minimumReads === undefined ? 1 : Number(options.minimumReads);
  var pairCount = Number(options.pairCount), direction = options.direction || 'both';
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) throw new Error('Choose a single taxonomic rank.');
  if (selection !== 'abundance' && selection !== 'pairs') throw new Error('Choose an exploration mode.');
  if (selection === 'abundance' && (!Number.isInteger(topN) || topN < 2 || topN > 30)) throw new Error('Show between 2 and 30 taxa.');
  if (selection === 'pairs' && (!Number.isInteger(pairCount) || pairCount < 1 || pairCount > 50)) throw new Error('Show between 1 and 50 pairs per direction.');
  if (!['both', 'positive', 'negative'].includes(direction)) throw new Error('Choose a correlation direction.');
  if (!Number.isInteger(minimumPrevalence) || minimumPrevalence < 1) throw new Error('Minimum prevalence must be a positive whole number.');
  if (!Number.isInteger(minimumReads) || minimumReads < 1) throw new Error('Minimum reads must be a positive whole number.');
  if (options.method !== 'pearson' && options.method !== 'spearman') throw new Error('Choose Pearson or Spearman correlation.');
  var prepared = prepareCompareTaxonCorrelationEntries(entries, rank);
  var samples = prepared.map(function(entry) {
    var counts = new Map(entry.correlationCounts.map(function(item) { return [item[0], item[1]]; }));
    return { name: entry.name, runId: entry.runId, counts: counts,
      total: Array.from(counts.values()).reduce(function(sum, value) { return sum + value; }, 0) };
  }).filter(function(sample) { return sample.total > 0; });
  if (samples.length < 3) throw new Error('Select at least three samples with taxa at this rank and LCA cutoff.');
  var prevalence = new Map(), names = new Map();
  prepared.forEach(function(entry) {
    entry.correlationCounts.forEach(function(item) {
      if (item[1] >= minimumReads) prevalence.set(item[0], (prevalence.get(item[0]) || 0) + 1);
      if (!names.has(item[0])) names.set(item[0], item[2]);
    });
  });
  var taxa = Array.from(prevalence.keys()).filter(function(id) {
    return prevalence.get(id) >= minimumPrevalence;
  }).map(function(id) {
    var counts = samples.map(function(sample) { return sample.counts.get(id) || 0; });
    var values = samples.map(function(sample, index) { return counts[index] / sample.total; });
    return { id: id, name: names.get(id), values: values, counts: counts, prevalence: prevalence.get(id),
      mean: values.reduce(function(sum, value) { return sum + value; }, 0) / samples.length };
  }).sort(function(a, b) { return b.mean - a.mean || a.id.localeCompare(b.id, undefined, { numeric: true }); });
  if (selection === 'abundance') taxa = taxa.slice(0, topN);
  var constantCount = 0;
  taxa = taxa.filter(function(taxon) {
    var variable = compareTaxonCorrelationPearson(taxon.values, taxon.values) !== null;
    if (!variable) constantCount++;
    return variable;
  });
  if (taxa.length < 2) throw new Error('Fewer than two eligible taxa vary across samples. Try a different rank or evidence filters.');
  var vectors = taxa.map(function(taxon) {
    return options.method === 'spearman' ? compareTaxonCorrelationRanks(taxon.values) : taxon.values;
  });
  var result = { taxa: taxa, sampleCount: samples.length, samples: samples.map(function(sample) {
    return { name: sample.name, runId: sample.runId };
  }), excludedCount: (entries || []).length - samples.length, constantCount: constantCount,
    rank: rank, method: options.method, minimumPrevalence: minimumPrevalence, minimumReads: minimumReads,
    selection: selection, candidateCount: taxa.length };
  if (selection === 'abundance') {
    result.matrix = vectors.map(function(values, i) {
      return vectors.map(function(other, j) { return i === j ? 1 : compareTaxonCorrelationPearson(values, other); });
    });
    return result;
  }
  // Center and normalize once, then compute each pair with a dot product.
  vectors = vectors.map(function(values) {
    var mean = values.reduce(function(sum, value) { return sum + value; }, 0) / values.length;
    var centered = values.map(function(value) { return value - mean; });
    var norm = Math.sqrt(centered.reduce(function(sum, value) { return sum + value * value; }, 0));
    return centered.map(function(value) { return value / norm; });
  });
  var positive = [], negative = [], tested = 0, lastProgress = 0;
  var total = taxa.length * (taxa.length - 1) / 2;
  function keep(list, pair) {
    if (list.length === pairCount && Math.abs(pair.correlation) <= Math.abs(list[list.length - 1].correlation)) return;
    var index = list.findIndex(function(other) { return Math.abs(pair.correlation) > Math.abs(other.correlation); });
    if (index < 0) list.push(pair); else list.splice(index, 0, pair);
    if (list.length > pairCount) list.pop();
  }
  for (var i = 0; i < vectors.length; i++) {
    for (var j = i + 1; j < vectors.length; j++) {
      var correlation = 0;
      for (var k = 0; k < samples.length; k++) correlation += vectors[i][k] * vectors[j][k];
      correlation = Math.max(-1, Math.min(1, correlation));
      tested++;
      if (correlation > 0 && direction !== 'negative') keep(positive, { a: taxa[i], b: taxa[j], correlation: correlation });
      if (correlation < 0 && direction !== 'positive') keep(negative, { a: taxa[i], b: taxa[j], correlation: correlation });
    }
    if (onProgress && Date.now() - lastProgress > 150) {
      onProgress({ tested: tested, total: total }); lastProgress = Date.now();
    }
  }
  result.pairs = positive.concat(negative);
  result.pairs.forEach(function(pair) {
    pair.sharedSupport = pair.a.counts.filter(function(count, index) {
      return count >= minimumReads && pair.b.counts[index] >= minimumReads;
    }).length;
  });
  result.direction = direction;
  result.pairsTested = tested;
  result.taxa = Array.from(new Map(result.pairs.flatMap(function(pair) { return [[pair.a.id, pair.a], [pair.b.id, pair.b]]; })).values());
  return result;
}

function compareTaxonCorrelationActive() {
  return currentPage === 'Compare' && !$('#compareTaxonRelationshipsView').prop('hidden');
}

function initialiseCompareTaxonCorrelation() {
  compareTaxonCorrelationResult = null;
  $('#compareTaxonCorrelationSettingsButton').off('.taxonCorrelation').on('click.taxonCorrelation', function() {
    var opening = $('#compareTaxonCorrelationSettings').prop('hidden');
    $('#compareTaxonCorrelationSettings').prop('hidden', !opening);
    $(this).attr('aria-expanded', String(opening));
    if (opening) $('#compareTaxonCorrelationSettingsTitle').trigger('focus');
    requestAnimationFrame(renderCompareTaxonCorrelationMatrix);
  });
  $('#compareTaxonCorrelationSettingsClose').off('.taxonCorrelation').on('click.taxonCorrelation', function() {
    $('#compareTaxonCorrelationSettings').prop('hidden', true);
    $('#compareTaxonCorrelationSettingsButton').attr('aria-expanded', 'false').trigger('focus');
    requestAnimationFrame(renderCompareTaxonCorrelationMatrix);
  });
  $('#compareTaxonCorrelationMethod, #compareTaxonCorrelationShowValues').off('.taxonCorrelation').on('change.taxonCorrelation', renderCompareTaxonCorrelationMatrix);
  $('#compareTaxonCorrelationTopN, #compareTaxonCorrelationPrevalence, #compareTaxonCorrelationMinimumReads').off('.taxonCorrelation')
    .on('input.taxonCorrelation change.taxonCorrelation', function() {
      clearTimeout(compareTaxonCorrelationTimer);
      compareTaxonCorrelationTimer = setTimeout(renderCompareTaxonCorrelationMatrix, 250);
    });
  $('#exportCompareTaxonCorrelationSVG').off('.taxonCorrelation').on('click.taxonCorrelation', function(event) { event.preventDefault(); compareTaxonCorrelationExportSvg(); });
  $('#exportCompareTaxonCorrelationPNG').off('.taxonCorrelation').on('click.taxonCorrelation', function(event) { event.preventDefault(); compareTaxonCorrelationExportPng(); });
  $('#exportCompareTaxonCorrelationCSV').off('.taxonCorrelation').on('click.taxonCorrelation', function(event) { event.preventDefault(); compareTaxonCorrelationExportCsv(); });
  $(window).off('resize.compareTaxonCorrelation').on('resize.compareTaxonCorrelation', function() {
    if (compareTaxonCorrelationActive()) renderCompareTaxonCorrelation();
  });
  initialiseCompareTaxonDiscovery();
}

function renderCompareTaxonCorrelation() {
  renderCompareTaxonCorrelationMatrix();
  renderCompareTaxonDiscovery();
}

function renderCompareTaxonCorrelationMatrix() {
  if (!compareTaxonCorrelationActive()) return;
  compareTaxonCorrelationHideTooltip();
  var holder = document.getElementById('compareTaxonCorrelationPlot');
  if (!holder) return;
  holder.textContent = '';
  compareTaxonCorrelationResult = null;
  if (typeof compareTreeDataGlobal === 'undefined' || !Array.isArray(compareTreeDataGlobal)) {
    $('#compareTaxonCorrelationStatus').text('Waiting for sample data…'); return;
  }
  try {
    compareTaxonCorrelationResult = calculateCompareTaxonCorrelation(getCompareTaxonCorrelationPrepared().prepared, {
      rank: taxonomicRankSelectedCompare, method: $('#compareTaxonCorrelationMethod').val(), selection: 'abundance',
      topN: Number($('#compareTaxonCorrelationTopN').val()),
      minimumPrevalence: Number($('#compareTaxonCorrelationPrevalence').val()),
      minimumReads: Number($('#compareTaxonCorrelationMinimumReads').val())
    });
    drawCompareTaxonCorrelationResult();
  } catch (error) { $('#compareTaxonCorrelationStatus').text(error.message); }
}

function compareTaxonCorrelationHideTooltip() {
  if (typeof toolTipDiv !== 'undefined') toolTipDiv.interrupt().style('opacity', 0);
}

function compareTaxonCorrelationShowTooltip(a, b, value, count, event) {
  toolTipDiv.interrupt().html('');
  var content = toolTipDiv.append('div').style('text-align', 'left')
    .style('max-width', 'min(380px, calc(100vw - 32px))').style('white-space', 'normal')
    .style('overflow-wrap', 'anywhere');
  content.append('div').style('font-weight', 'bold').text(a.name + ' × ' + b.name);
  content.append('div').text('NCBI IDs: ' + a.id + ' × ' + b.id);
  content.append('div').text('Correlation: ' + value.toFixed(3) + ' · ' + count + ' samples');
  toolTipDiv.style('z-index', 1100).style('opacity', .95)
    .style('left', tooltipPos(event.pageX + 12) + 'px')
    .style('top', tooltipPosY(event.pageY + 12) + 'px');
}

function compareTaxonCorrelationColour(value) {
  var start = value < 0 ? [49, 105, 174] : [255, 255, 255];
  var end = value < 0 ? [255, 255, 255] : [183, 38, 57];
  var t = value < 0 ? value + 1 : value;
  return 'rgb(' + start.map(function (channel, i) { return Math.round(channel + t * (end[i] - channel)); }).join(',') + ')';
}

function drawCompareTaxonCorrelationResult() {
  var holder = document.getElementById('compareTaxonCorrelationPlot');
  if (!holder || !compareTaxonCorrelationResult) return;
  holder.textContent = '';
  var result = compareTaxonCorrelationResult;
  var n = result.taxa.length, cell = n > 22 ? 27 : 32;
  var left = 220, top = 190, size = n * cell;
  var width = left + size + 45, height = top + size + 85;
  var svg = compareOrdinationSvgElement('svg', {
    id: 'compareTaxonCorrelationSvg', xmlns: 'http://www.w3.org/2000/svg',
    width: width, height: height, viewBox: '0 0 ' + width + ' ' + height,
    style: 'font-family: Arial, Helvetica, sans-serif', role: 'img',
    'aria-label': 'Taxon correlation matrix for ' + n + ' taxa across ' + result.sampleCount + ' samples'
  }, holder);
  compareOrdinationSvgElement('rect', { width: width, height: height, fill: '#fff' }, svg);
  compareOrdinationSvgElement('text', { x: width / 2, y: 27, 'text-anchor': 'middle',
    fill: '#333', 'font-size': 14, 'font-weight': 'bold' }, svg,
  (result.method === 'spearman' ? 'Spearman' : 'Pearson') + ' correlation · ' +
    taxonomicLevelDictRev[result.rank] + ' · LCA ' + lcaAbundanceCompare + '%');
  var names = result.taxa.map(function (taxon) { return taxon.name; });
  var counts = {};
  names.forEach(function (name) { counts[name] = (counts[name] || 0) + 1; });
  function label(taxon) { return counts[taxon.name] > 1 ? taxon.name + ' (' + taxon.id + ')' : taxon.name; }
  function shorten(value, length) { return value.length > length ? value.slice(0, length - 1) + '…' : value; }
  result.taxa.forEach(function (taxon, i) {
    var y = top + i * cell + cell * 0.68;
    var row = compareOrdinationSvgElement('text', { x: left - 9, y: y, 'text-anchor': 'end',
      fill: '#3a3b45', 'font-size': 11 }, svg, shorten(label(taxon), 29));
    compareOrdinationSvgElement('title', {}, row, label(taxon));
    var x = left + i * cell + cell * 0.5;
    var column = compareOrdinationSvgElement('text', { x: x, y: top - 9,
      transform: 'rotate(-55 ' + x + ' ' + (top - 9) + ')',
      'text-anchor': 'start', fill: '#3a3b45', 'font-size': 11 }, svg, shorten(label(taxon), 24));
    compareOrdinationSvgElement('title', {}, column, label(taxon));
  });
  result.matrix.forEach(function (row, i) {
    row.forEach(function (value, j) {
      var x = left + j * cell, y = top + i * cell;
      var rect = compareOrdinationSvgElement('rect', { x: x, y: y, width: cell, height: cell,
        fill: compareTaxonCorrelationColour(value), stroke: '#fff', 'stroke-width': 1,
        tabindex: 0, role: 'img', 'aria-label': label(result.taxa[i]) + ' and ' +
          label(result.taxa[j]) + ': ' + value.toFixed(3) }, svg);
      var show = function (event) { compareTaxonCorrelationShowTooltip(result.taxa[i], result.taxa[j], value, result.sampleCount, event); };
      rect.addEventListener('mouseenter', show);
      rect.addEventListener('mousemove', show);
      rect.addEventListener('mouseleave', compareTaxonCorrelationHideTooltip);
      rect.addEventListener('focus', function () {
        var bounds = rect.getBoundingClientRect();
        show({ pageX: bounds.right + window.pageXOffset, pageY: bounds.top + window.pageYOffset });
      });
      rect.addEventListener('blur', compareTaxonCorrelationHideTooltip);
      if ($('#compareTaxonCorrelationShowValues').prop('checked')) {
        compareOrdinationSvgElement('text', { x: x + cell / 2, y: y + cell * 0.65,
          'text-anchor': 'middle', 'pointer-events': 'none',
          fill: Math.abs(value) > 0.6 ? '#fff' : '#333', 'font-size': n > 22 ? 9 : 10 }, svg, value.toFixed(2));
      }
    });
  });
  var legendY = top + size + 30, legendX = left;
  for (var step = 0; step < 40; step++) {
    compareOrdinationSvgElement('rect', { x: legendX + step * 5, y: legendY, width: 5, height: 12,
      fill: compareTaxonCorrelationColour(-1 + step * 2 / 39) }, svg);
  }
  [-1, 0, 1].forEach(function (value) {
    compareOrdinationSvgElement('text', { x: legendX + (value + 1) * 100, y: legendY + 27,
      'text-anchor': 'middle', fill: '#555', 'font-size': 11 }, svg, String(value));
  });
  $('#compareTaxonCorrelationStatus').text(result.sampleCount + ' samples · ' + n + ' taxa shown' +
    (result.excludedCount ? ' · ' + result.excludedCount + ' samples without taxa at this rank excluded' : '') +
    (result.constantCount ? ' · ' + result.constantCount + ' taxa with no variation omitted' : '') + '.');
}

function compareTaxonCorrelationFilename(suffix) {
  return 'marti_taxon_correlations_' + getDate() + '_' + getTime() + '_' + suffix;
}

function compareTaxonCorrelationSvgString() {
  var svg = document.getElementById('compareTaxonCorrelationSvg');
  return svg && new XMLSerializer().serializeToString(svg);
}

function compareTaxonCorrelationExportSvg() {
  var source = compareTaxonCorrelationSvgString();
  if (source) saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareTaxonCorrelationFilename('plot.svg'));
}

function compareTaxonCorrelationExportPng() {
  var source = compareTaxonCorrelationSvgString();
  var svg = document.getElementById('compareTaxonCorrelationSvg');
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
    canvas.toBlob(function (blob) { if (blob) saveAs(blob, compareTaxonCorrelationFilename('plot.png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function () {
    URL.revokeObjectURL(url);
    $('#compareTaxonCorrelationStatus').text('PNG export failed. Try SVG export.');
  };
  image.src = url;
}

function compareTaxonCorrelationCsvRows(result, lca) {
  if (result.selection === 'pairs') {
    var pairs = [['Taxon A ID', 'Taxon A name', 'Taxon B ID', 'Taxon B name', 'Correlation', 'Direction', 'Method', 'Samples', 'Support A', 'Support B', 'Shared support', 'Mean A (%)', 'Mean B (%)', 'Minimum reads', 'Minimum prevalence', 'Rank', 'LCA (%)', 'Pairs searched']].concat(result.pairs.map(function(pair) {
      return [pair.a.id, pair.a.name, pair.b.id, pair.b.name, pair.correlation.toPrecision(12), pair.correlation > 0 ? 'positive' : 'negative', result.method,
        result.sampleCount, pair.a.prevalence, pair.b.prevalence, pair.sharedSupport, pair.a.mean * 100, pair.b.mean * 100, result.minimumReads, result.minimumPrevalence, result.rank, lca, result.pairsTested];
    }));
    return pairs;
  }
  var header = ['NCBI taxon ID', 'Taxon name'].concat(result.taxa.map(function (taxon) { return taxon.name + ' (' + taxon.id + ')'; }));
  var rows = [header].concat(result.taxa.map(function (taxon, i) {
    return [taxon.id, taxon.name].concat(result.matrix[i].map(function (value) { return value.toPrecision(12); }));
  }));
  return rows;
}

function compareTaxonCorrelationExportCsv() {
  var result = compareTaxonCorrelationResult;
  if (!result) return;
  function field(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }
  var rows = compareTaxonCorrelationCsvRows(result, lcaAbundanceCompare);
  saveAs(new Blob([rows.map(function(row) { return row.map(field).join(','); }).join('\r\n') + '\r\n'],
    { type: 'text/csv;charset=utf-8' }), compareTaxonCorrelationFilename(result.selection === 'pairs' ? 'pairs.csv' : 'matrix.csv'));
}

if (typeof module !== 'undefined') module.exports = {
  prepareCompareTaxonCorrelationEntries: prepareCompareTaxonCorrelationEntries,
  compareTaxonCorrelationCsvRows: compareTaxonCorrelationCsvRows,
  compareTaxonCorrelationCounts: compareTaxonCorrelationCounts,
  compareTaxonCorrelationRanks: compareTaxonCorrelationRanks,
  compareTaxonCorrelationPearson: compareTaxonCorrelationPearson,
  calculateCompareTaxonCorrelation: calculateCompareTaxonCorrelation
};
