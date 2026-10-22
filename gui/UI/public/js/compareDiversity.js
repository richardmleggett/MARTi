var compareDiversityTable;
var compareDiversityRows = [];
var compareDiversityRecords = [];
var compareDiversityDepth = 0;

var compareDiversityPlotMetrics = {
  richness: { label: 'Taxa (S)', decimals: 0 },
  shannon: { label: 'Shannon (H′)', decimals: 3 },
  invSimpson: { label: 'Inverse Simpson', decimals: 2 },
  pielou: { label: 'Pielou (J′)', decimals: 3 },
  rarefied: { label: 'Rarefied richness (reads)', decimals: 2 }
};

function compareDiversityUnit() {
  return plotLevelSelectedCompareId === 'base' ? 'bases' : 'reads';
}

function compareDiversityNLabel() {
  return compareDiversityUnit() === 'bases' ? 'Bases in included taxa (N, bp)' : 'Reads in included taxa (N)';
}

function compareDiversityNumericCompare(a, b, descending) {
  var aMissing = a == null || a === '' || !isFinite(Number(a));
  var bMissing = b == null || b === '' || !isFinite(Number(b));
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  if (aMissing) return 0;
  var first = Number(a), second = Number(b);
  if (first === second) return 0;
  return (first < second ? -1 : 1) * (descending ? -1 : 1);
}

function compareDiversityTableCell(value, decimals) {
  return {
    display: compareDiversityNumber(value, decimals),
    sort: value == null || !isFinite(value) ? null : Number(value)
  };
}

function initialiseCompareDiversity() {
  compareDiversityRecords = [];
  compareDiversityDepth = 0;
  $('#compareDiversityTooltip').remove();
  $('<div id="compareDiversityTooltip" class="compareDiversityTooltip" role="tooltip" hidden></div>').appendTo('body');
  $('#compareDiversityPlotMetric, #compareDiversityPlotOrder').off('.diversityPlot')
    .on('change.diversityPlot', renderCompareDiversityPlot);
  $('#compareDiversityPlotExportSvg').off('.diversityPlot').on('click.diversityPlot', function (event) {
    event.preventDefault(); compareDiversityExportPlot('svg');
  });
  $('#compareDiversityPlotExportPng').off('.diversityPlot').on('click.diversityPlot', function (event) {
    event.preventDefault(); compareDiversityExportPlot('png');
  });
  $.fn.dataTable.ext.type.order['compare-diversity-number-asc'] = function (a, b) {
    return compareDiversityNumericCompare(a, b, false);
  };
  $.fn.dataTable.ext.type.order['compare-diversity-number-desc'] = function (a, b) {
    return compareDiversityNumericCompare(a, b, true);
  };
  compareDiversityTable = $('#compareDiversityTable').DataTable({
    data: [], paging: false, searching: false, info: false, order: [],
    dom: 'Bt',
    columnDefs: [{
      targets: [2, 3, 4, 5, 6, 7], type: 'compare-diversity-number', className: 'dt-right',
      render: function (data, type) {
        return type === 'sort' || type === 'type' ? data.sort : data.display;
      }
    }],
    columns: [
      { title: 'Sample' }, { title: 'Run' }, { title: 'Reads in included taxa (N)' },
      { title: 'Taxa (S)' }, { title: 'Rarefied S (reads)' }, { title: 'Shannon (H′)' },
      { title: 'Pielou (J′)' }, { title: 'Inverse Simpson' }
    ],
    buttons: [
      { extend: 'copy', className: 'd-none', attr: { id: 'compareDiversityCopyButton' } },
      { extend: 'csv', className: 'd-none', attr: { id: 'compareDiversityCsvButton' },
        filename: function () { return 'marti_compare_diversity_' + getDate() + '_' + getTime(); } }
    ]
  });
  $('#compareDiversityCopyExport').on('click', function (event) {
    event.preventDefault(); compareDiversityTable.button('#compareDiversityCopyButton').trigger();
  });
  $('#compareDiversityCsvExport').on('click', function (event) {
    event.preventDefault(); compareDiversityTable.button('#compareDiversityCsvButton').trigger();
  });
  $('#compareDiversityPlotMetric option[value="rarefied"]').prop('disabled', true);
  renderCompareDiversityPlot();
}

function compareDiversityNumber(value, decimals) {
  return value == null || !isFinite(value) ? '—' : Number(value).toFixed(decimals);
}

function compareDiversitySampleKey(pathName, pathRun) {
  return JSON.stringify([String(pathName), String(pathRun)]);
}

function compareDiversitySortRecords(records, displayedSamples) {
  var positions = {};
  displayedSamples.forEach(function (sample, index) {
    positions[compareDiversitySampleKey(sample.pathName, sample.pathRun)] = index;
  });
  // The Samples card is the source of truth, including drag-and-drop order.
  // Its path identifiers distinguish samples with the same displayed name.
  if (!Object.keys(positions).length) {
    var fallbackOrder = typeof sortCompareNameArray === 'undefined' ? [] : sortCompareNameArray || [];
    fallbackOrder.forEach(function (sample, index) {
      records.forEach(function (record) {
        if (record.metadata.id === sample.name && String(record.metadata.runId) === String(sample.runId)) {
          positions[compareDiversitySampleKey(record.metadata.pathName, record.metadata.pathRun)] = index;
        }
      });
    });
  }
  return records.sort(function (a, b) {
    var aPosition = positions[compareDiversitySampleKey(a.metadata.pathName, a.metadata.pathRun)];
    var bPosition = positions[compareDiversitySampleKey(b.metadata.pathName, b.metadata.pathRun)];
    if (aPosition === undefined && bPosition === undefined) return 0;
    if (aPosition === undefined) return 1;
    if (bPosition === undefined) return -1;
    return aPosition - bPosition;
  });
}

function compareDiversityOrderRecords(records) {
  var displayedSamples = [];
  $('#compareSampleNameList tr').each(function () {
    displayedSamples.push(this.__data__ || {
      pathName: this.getAttribute('data-pathname'), pathRun: this.getAttribute('data-pathrun')
    });
  });
  return compareDiversitySortRecords(records, displayedSamples);
}

function compareDiversityMetricValue(record, metric) {
  if (metric === 'rarefied') return compareDiversityDepth > 0 && record.readResult
    ? martiRarefiedRichness(record.readResult.counts, compareDiversityDepth) : null;
  if (metric === 'richness') return record.result.S;
  return record.result[metric];
}

function compareDiversitySortPlotRows(rows, order) {
  if (order !== 'ascending' && order !== 'descending') return rows.slice();
  return rows.map(function (point, index) { return { point: point, index: index }; })
    .sort(function (a, b) {
      var aValid = a.point.value != null && isFinite(a.point.value);
      var bValid = b.point.value != null && isFinite(b.point.value);
      if (aValid !== bValid) return aValid ? -1 : 1;
      if (!aValid) return a.index - b.index;
      var difference = order === 'descending'
        ? b.point.value - a.point.value : a.point.value - b.point.value;
      return difference || a.index - b.index;
    })
    .map(function (entry) { return entry.point; });
}

function compareDiversityHideTooltip() {
  $('#compareDiversityTooltip').prop('hidden', true);
}

function compareDiversityShowTooltip(point, clientX, clientY) {
  var tooltip = $('#compareDiversityTooltip').empty();
  var metric = $('#compareDiversityPlotMetric').val();
  var detail = compareDiversityPlotMetrics[metric];
  var result = metric === 'rarefied' ? point.record.readResult : point.record.result;
  var nLabel = metric === 'rarefied' || compareDiversityUnit() === 'reads'
    ? 'Reads in included taxa (N)' : 'Bases in included taxa (N, bp)';
  $('<strong></strong>').text(point.record.metadata.id).appendTo(tooltip);
  $('<div></div>').text('Run: ' + point.record.metadata.runId).appendTo(tooltip);
  $('<div></div>').text(detail.label + ': ' + compareDiversityNumber(point.value, detail.decimals)).appendTo(tooltip);
  $('<div></div>').text(nLabel + ': ' + thousandsSeparators(result.N)).appendTo(tooltip);
  if (metric === 'rarefied') {
    $('<div></div>').text('Common depth: ' + thousandsSeparators(compareDiversityDepth) + ' reads').appendTo(tooltip);
  }
  tooltip.prop('hidden', false);
  tooltip.css({
    left: Math.max(8, Math.min(clientX + 14, window.innerWidth - tooltip.outerWidth() - 8)) + 'px',
    top: Math.max(8, Math.min(clientY + 14, window.innerHeight - tooltip.outerHeight() - 8)) + 'px'
  });
}

function renderCompareDiversityPlot() {
  var holder = $('#compareDiversityPlot').empty();
  compareDiversityHideTooltip();
  var metric = $('#compareDiversityPlotMetric').val() || 'richness';
  var detail = compareDiversityPlotMetrics[metric];
  if (!detail) return;
  var order = $('#compareDiversityPlotOrder').val() || 'sample';
  var rows = compareDiversitySortPlotRows(compareDiversityRecords.map(function (record) {
    return { record: record, value: compareDiversityMetricValue(record, metric) };
  }), order);
  var validRows = rows.filter(function (point) { return point.value != null && isFinite(point.value); });
  var unit = compareDiversityUnit();
  $('#compareDiversityPlotNote').text(metric === 'rarefied'
    ? 'Expected richness at ' + thousandsSeparators(compareDiversityDepth) +
      ' included reads per sample. Rarefied richness always uses reads.'
    : metric === 'richness'
      ? 'Observed number of included taxa at the selected rank and minimum abundance. ' +
        'Counts are not adjusted for sequencing depth.'
    : (unit === 'bases' ? 'DNA yield weighted. ' : 'Read weighted. ') +
      'N in the tooltip is the ' + (unit === 'bases' ? 'basepairs' : 'reads') +
      ' in included taxa at the selected rank and minimum abundance. Final values can depend on sequencing depth.');
  $('#compareDiversityPlotNote').append(order === 'descending' ? ' Plot ordered highest to lowest.'
    : order === 'ascending' ? ' Plot ordered lowest to highest.'
      : ' Samples follow the order in the Samples card.');
  if (!rows.length) {
    $('<p class="text-muted text-center py-5 mb-0"></p>')
      .text(compareDiversityRecords.length ? 'No values available for this measure.' : 'Select samples to compare diversity.')
      .appendTo(holder);
    return;
  }

  var width = 960, left = 250, right = 80, top = 45, rowHeight = 34;
  var axisY = 30;
  var height = top + rows.length * rowHeight + 42;
  var maximum = d3.max(validRows, function (point) { return point.value; }) || 0;
  var x = d3.scale.linear().domain([0, metric === 'pielou' ? 1 : maximum > 0 ? maximum * 1.12 : 1])
    .range([left, width - right]);
  var svg = d3.select(holder[0]).append('svg').attr('id', 'compareDiversityPlotSvg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('width', width).attr('height', height).attr('viewBox', '0 0 ' + width + ' ' + height)
    .style('background', '#fff').style('font-family', 'Arial, Helvetica, sans-serif');
  var chartTitle = detail.label + ' · ' + taxonomicRankSelectedCompareText + ' · ' +
    (metric === 'rarefied' ? 'at ' + thousandsSeparators(compareDiversityDepth) + ' reads'
      : metric === 'richness' ? 'observed richness'
        : unit === 'bases' ? 'DNA yield weighted' : 'read weighted');
  svg.append('title').text(chartTitle);
  svg.append('rect').attr('width', width).attr('height', height).style('fill', '#fff');
  var axis = d3.svg.axis().scale(x).orient('top').ticks(6)
    .tickFormat(d3.format(metric === 'pielou' ? '.2f' : '.3g'));
  var axisGroup = svg.append('g').attr('transform', 'translate(0,' + axisY + ')').call(axis);
  axisGroup.selectAll('path,line').style('fill', 'none').style('stroke', '#858796');
  axisGroup.selectAll('text').style('fill', '#5a5c69').style('font-size', '11px');
  svg.append('text').attr('x', (left + width - right) / 2).attr('y', height - 7)
    .attr('text-anchor', 'middle').style('fill', '#3a3b45').style('font-size', '13px')
    .text(detail.label + (metric === 'rarefied' ? ' at ' + thousandsSeparators(compareDiversityDepth) + ' reads'
      : metric === 'richness' ? ''
        : unit === 'bases' ? ' (DNA yield weighted)' : ' (read weighted)'));

  var names = {};
  rows.forEach(function (point) { names[point.record.metadata.id] = (names[point.record.metadata.id] || 0) + 1; });
  var groups = svg.selectAll('.diversitySample').data(rows).enter().append('g').attr('class', 'diversitySample')
    .attr('transform', function (point, index) { return 'translate(0,' + (top + (index + 0.5) * rowHeight) + ')'; });
  groups.append('rect').attr('x', 0).attr('y', -rowHeight / 2).attr('width', width).attr('height', rowHeight)
    .style('fill', 'transparent');
  groups.append('line').attr('x1', left).attr('x2', width - right).attr('y1', 0).attr('y2', 0)
    .style('stroke', '#edf0f5');
  groups.append('text').attr('x', left - 12).attr('y', 4).attr('text-anchor', 'end')
    .style('fill', '#3a3b45').style('font-size', '12px')
    .text(function (point) {
      var label = point.record.metadata.id + (names[point.record.metadata.id] > 1
        ? ' · ' + point.record.metadata.runId : '');
      return label.length > 34 ? label.slice(0, 31) + '…' : label;
    });
  groups.filter(function (point) { return point.value != null && isFinite(point.value); })
    .append('circle').attr('cx', function (point) { return x(point.value); }).attr('cy', 0).attr('r', 6)
    .attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', function (point) {
      return point.record.metadata.id + ', run ' + point.record.metadata.runId + ', ' + detail.label +
        ' ' + compareDiversityNumber(point.value, detail.decimals);
    })
    .style('fill', '#4e73df').style('stroke', '#284fad').style('stroke-width', 1);
  groups.append('text').attr('x', function (point) {
    return point.value == null || !isFinite(point.value) ? left + 11 : x(point.value) + 11;
  }).attr('y', 4)
    .style('fill', '#5a5c69').style('font-size', '11px')
    .text(function (point) { return compareDiversityNumber(point.value, detail.decimals); });
  groups.on('mouseenter', function (point) {
    d3.select(this).select('rect').style('fill', '#f8f9fc');
    compareDiversityShowTooltip(point, d3.event.clientX, d3.event.clientY);
  }).on('mousemove', function (point) {
    compareDiversityShowTooltip(point, d3.event.clientX, d3.event.clientY);
  }).on('mouseleave', function () {
    d3.select(this).select('rect').style('fill', 'transparent');
    compareDiversityHideTooltip();
  });
  groups.select('circle').on('focus', function (point) {
    var bounds = this.getBoundingClientRect();
    compareDiversityShowTooltip(point, bounds.right, bounds.top);
  }).on('blur', compareDiversityHideTooltip);
}

function compareDiversityExportPlot(format) {
  var svg = document.getElementById('compareDiversityPlotSvg');
  if (!svg) return;
  var filename = 'marti_compare_diversity_' + $('#compareDiversityPlotMetric').val() + '_' +
    taxonomicRankSelectedCompareText.toLowerCase().replace(/\s+/g, '_') + '_lca_' + lcaAbundanceCompare + '_' +
    ($('#compareDiversityPlotMetric').val() === 'rarefied' ? 'reads' : compareDiversityUnit()) + '_' + getDate() + '_' + getTime();
  var source = new XMLSerializer().serializeToString(svg);
  if (format === 'svg') {
    saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), filename + '.svg');
    return;
  }
  var url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  var image = new Image();
  image.onload = function () {
    var canvas = document.createElement('canvas');
    canvas.width = Number(svg.getAttribute('width')) * 2;
    canvas.height = Number(svg.getAttribute('height')) * 2;
    var context = canvas.getContext('2d');
    context.scale(2, 2);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    canvas.toBlob(function (blob) { if (blob) saveAs(blob, filename + '.png'); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function () { URL.revokeObjectURL(url); };
  image.src = url;
}

function updateCompareDiversityTable(samples) {
  if (!compareDiversityTable || !Array.isArray(samples)) return;
  var unit = compareDiversityUnit();
  var records = [];
  samples.forEach(function (sample) {
    var metadata = selectedCompareMetaDataArray.find(function (entry) {
      return entry.pathName === sample.id && entry.pathRun === sample.runId;
    });
    var tree = sample.tree && sample.tree[unit === 'bases' ? 'treeYield' : 'tree'];
    var result = martiTreeDiversity(tree, taxonomicRankSelectedCompare, { chao1Valid: false });
    var readResult = unit === 'reads' ? result : martiTreeDiversity(
      sample.tree && sample.tree.tree, taxonomicRankSelectedCompare, { chao1Valid: false });
    if (metadata && result) records.push({ metadata: metadata, result: result, readResult: readResult });
  });
  var depth = records.length > 1 && records.every(function (record) { return record.readResult; })
    ? Math.min.apply(null, records.map(function (record) { return record.readResult.N; })) : 0;
  compareDiversityRecords = compareDiversityOrderRecords(records);
  compareDiversityDepth = depth;
  $('#compareDiversityPlotMetric option[value="rarefied"]').prop('disabled', depth <= 0);
  if (depth <= 0 && $('#compareDiversityPlotMetric').val() === 'rarefied') $('#compareDiversityPlotMetric').val('richness');
  compareDiversityRows = compareDiversityRecords.map(function (record) {
    var d = record.result;
    return [record.metadata.id, record.metadata.runId, compareDiversityTableCell(d.N, 0),
      compareDiversityTableCell(d.S, 0),
      compareDiversityTableCell(depth > 0 ? martiRarefiedRichness(record.readResult.counts, depth) : null, 2),
      compareDiversityTableCell(d.shannon, 3), compareDiversityTableCell(d.pielou, 3),
      compareDiversityTableCell(d.invSimpson, 2)];
  });
  $(compareDiversityTable.column(2).header()).text(compareDiversityNLabel());
  compareDiversityTable.clear().rows.add(compareDiversityRows).draw();
  renderCompareDiversityPlot();
  $('#compareDiversityPlotCardTitle').text('Diversity across samples — ' + taxonomicRankSelectedCompareText);
  $('#compareDiversityCardTitle').text('Diversity metrics — ' + taxonomicRankSelectedCompareText);
  $('#compareDiversityNote').text((unit === 'bases'
    ? 'Shannon, Pielou, and inverse Simpson are DNA yield weighted. N is the sum of classified basepairs assigned to the taxa included in these measures; it is DNA yield, not a number of reads or organisms. '
    : 'Shannon, Pielou, and inverse Simpson are read weighted. N is the sum of classified reads assigned to the taxa included in these measures; it is not a number of organisms. ') +
    'N can be less than the total classified ' + (unit === 'bases' ? 'yield' : 'reads') +
    ' because taxa are selected at this rank and minimum abundance. ' +
    (depth > 0 ? 'Rarefied S remains read based: expected taxa richness at ' + thousandsSeparators(depth) + ' included reads.' : ''));
}

function renderCompareDiversityTab() {
  updateCompareDiversityTable(compareTreeDataGlobal);
  if (compareDiversityTable) compareDiversityTable.columns.adjust();
  if (typeof rareData !== 'undefined' && rareData && compareAccumulationDataAvailable) plotRarefactionCompare(rareData);
}

if (typeof module !== 'undefined') module.exports = {
  compareDiversitySortRecords: compareDiversitySortRecords,
  compareDiversitySortPlotRows: compareDiversitySortPlotRows,
  compareDiversityNumericCompare: compareDiversityNumericCompare,
  compareDiversityTableCell: compareDiversityTableCell
};
