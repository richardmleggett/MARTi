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
  $('#compareDiversityPlotMetric, #compareDiversityPlotOrder, #compareDiversityPlotView').off('.diversityPlot')
    .on('change.diversityPlot', renderCompareDiversityPlot);
  $('#compareDiversityPlotExportSvg').off('.diversityPlot').on('click.diversityPlot', function (event) {
    event.preventDefault(); compareDiversityExportPlot('svg');
  });
  $('#compareDiversityPlotExportPng').off('.diversityPlot').on('click.diversityPlot', function (event) {
    event.preventDefault(); compareDiversityExportPlot('png');
  });
  $('#compareDiversityPlotExportCsv').off('.diversityPlot').on('click.diversityPlot', function (event) {
    event.preventDefault(); compareDiversityExportGroupCsv();
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

function compareDiversityGroupRows(points, groupValue, displayName) {
  var rows = [];
  var assigned = new Map();
  var ungroupedNames = {};
  points.forEach(function(point) {
    var metadata = point.record.metadata;
    if (String(groupValue(metadata.pathRun, metadata.pathName) || '').trim()) return;
    var display = displayName(metadata);
    ungroupedNames[display] = (ungroupedNames[display] || 0) + 1;
  });
  points.forEach(function(point) {
    var metadata = point.record.metadata;
    var name = String(groupValue(metadata.pathRun, metadata.pathName) || '').trim();
    if (!name) {
      var display = displayName(metadata);
      rows.push({ label: 'Ungrouped · ' + display + (ungroupedNames[display] > 1 ?
        ' · ' + metadata.runId : ''), kind: 'sample', members: [point] });
    } else {
      if (!assigned.has(name)) {
        var row = { label: name, kind: 'group', members: [] };
        assigned.set(name, row);
        rows.push(row);
      }
      assigned.get(name).members.push(point);
    }
  });
  rows.forEach(function(row) {
    row.validMembers = row.members.filter(function(point) {
      return point.value != null && isFinite(point.value);
    });
    var values = row.validMembers.map(function(point) { return Number(point.value); });
    row.value = values.length ? values.reduce(function(sum, value) { return sum + value; }, 0) / values.length : null;
    row.minimum = values.length ? Math.min.apply(null, values) : null;
    row.maximum = values.length ? Math.max.apply(null, values) : null;
  });
  return rows;
}

function compareDiversityGroupCsv(rows, detail, rank, cutoff, unit, depth) {
  function quote(value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'; }
  var output = [['Row', 'Type', 'Samples with value (n)', 'Samples total', 'Mean', 'Minimum', 'Maximum',
    'Measure', 'Rank', 'Minimum abundance (%)', 'Unit', 'Rarefaction depth (reads)']];
  rows.forEach(function(row) {
    output.push([row.label, row.kind === 'group' ? 'Group' : 'Ungrouped sample', row.validMembers.length,
      row.members.length, row.value, row.minimum, row.maximum, detail.label, rank, cutoff, unit,
      depth || '']);
  });
  return output.map(function(line) { return line.map(quote).join(','); }).join('\r\n');
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
  $('<strong></strong>').text(compareSampleDisplayName(point.record.metadata.pathRun,
    point.record.metadata.pathName, point.record.metadata.id)).appendTo(tooltip);
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

function compareDiversityShowGroupTooltip(row, detail, clientX, clientY) {
  var tooltip = $('#compareDiversityTooltip').empty();
  var meanDecimals = Math.max(2, detail.decimals);
  $('<strong></strong>').text(row.label).appendTo(tooltip);
  $('<div></div>').text('Samples with a value: ' + row.validMembers.length + ' of ' + row.members.length).appendTo(tooltip);
  $('<div></div>').text('Mean ' + detail.label + ': ' + compareDiversityNumber(row.value, meanDecimals)).appendTo(tooltip);
  if (row.validMembers.length > 1) {
    $('<div></div>').text('Observed range: ' + compareDiversityNumber(row.minimum, detail.decimals) +
      '–' + compareDiversityNumber(row.maximum, detail.decimals)).appendTo(tooltip);
  }
  tooltip.prop('hidden', false);
  tooltip.css({
    left: Math.max(8, Math.min(clientX + 14, window.innerWidth - tooltip.outerWidth() - 8)) + 'px',
    top: Math.max(8, Math.min(clientY + 14, window.innerHeight - tooltip.outerHeight() - 8)) + 'px'
  });
}

function compareDiversityCurrentGroupRows(metric, order) {
  var points = compareDiversityRecords.map(function(record) {
    return { record: record, value: compareDiversityMetricValue(record, metric) };
  });
  var rows = compareDiversityGroupRows(points, compareSampleGroupValue, function(metadata) {
    return compareSampleDisplayName(metadata.pathRun, metadata.pathName, metadata.id);
  });
  return compareDiversitySortPlotRows(rows, order);
}

function renderCompareDiversityPlot() {
  var holder = $('#compareDiversityPlot').empty();
  if (!holder.length) return;
  compareDiversityHideTooltip();
  var metric = $('#compareDiversityPlotMetric').val() || 'richness';
  var detail = compareDiversityPlotMetrics[metric];
  if (!detail) return;
  var hasAssignedGroups = compareDiversityRecords.some(function(record) {
    return Boolean(compareSampleGroupValue(record.metadata.pathRun, record.metadata.pathName));
  });
  $('#compareDiversityPlotView option[value="groups"]').prop('disabled', !hasAssignedGroups);
  if (!hasAssignedGroups && $('#compareDiversityPlotView').val() === 'groups') {
    $('#compareDiversityPlotView').val('samples');
  }
  var grouped = $('#compareDiversityPlotView').val() === 'groups';
  $('#compareDiversityPlotExportCsv').prop('hidden', !grouped);
  var order = $('#compareDiversityPlotOrder').val() || 'sample';
  var points = compareDiversityRecords.map(function (record) {
    return { record: record, value: compareDiversityMetricValue(record, metric) };
  });
  var rows = grouped ? compareDiversityCurrentGroupRows(metric, order) : compareDiversitySortPlotRows(points, order);
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
  $('#compareDiversityPlotNote').append(grouped ?
    ' Each group dot is the mean of its available sample values; the line shows the observed minimum–maximum range, not a confidence interval. Individual samples remain visible. Ungrouped samples have separate rows.' : '');
  $('#compareDiversityPlotNote').append(order === 'descending' ? ' Plot ordered highest to lowest.'
    : order === 'ascending' ? ' Plot ordered lowest to highest.'
      : grouped ? ' Groups follow their first sample in the Samples card.' : ' Samples follow the order in the Samples card.');
  if (!rows.length) {
    $('<p class="text-muted text-center py-5 mb-0"></p>')
      .text(compareDiversityRecords.length ? 'No values available for this measure.' : 'Select samples to compare diversity.')
      .appendTo(holder);
    return;
  }

  var width = 960, left = 250, right = 80, top = 45, rowHeight = grouped ? 42 : 34;
  var axisY = 30;
  var height = top + rows.length * rowHeight + 42;
  var maximum = (grouped ? d3.max(rows, function(row) { return row.maximum; }) :
    d3.max(validRows, function(point) { return point.value; })) || 0;
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
  if (grouped) chartTitle += ' · group mean and observed range';
  svg.attr('aria-label', chartTitle);
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

  if (grouped) {
    var meanDecimals = Math.max(2, detail.decimals);
    var groupRows = svg.selectAll('.diversityGroup').data(rows).enter().append('g')
      .attr('class', 'diversityGroup')
      .attr('transform', function(row, index) { return 'translate(0,' + (top + (index + 0.5) * rowHeight) + ')'; });
    groupRows.append('rect').attr('x', 0).attr('y', -rowHeight / 2).attr('width', width).attr('height', rowHeight)
      .style('fill', 'transparent');
    groupRows.append('line').attr('x1', left).attr('x2', width - right).attr('y1', 0).attr('y2', 0)
      .style('stroke', '#edf0f5');
    groupRows.append('text').attr('x', left - 12).attr('y', 4).attr('text-anchor', 'end')
      .style('fill', '#3a3b45').style('font-size', '12px')
      .text(function(row) {
        var label = row.label + (row.kind === 'group' ? ' (n=' + row.validMembers.length + ')' : '');
        return label.length > 34 ? label.slice(0, 31) + '…' : label;
      });
    var rangeRows = groupRows.filter(function(row) {
      return row.kind === 'group' && row.validMembers.length > 1 && row.minimum < row.maximum;
    });
    rangeRows.append('line').attr('x1', function(row) { return x(row.minimum); })
      .attr('x2', function(row) { return x(row.maximum); }).attr('y1', 0).attr('y2', 0)
      .style('stroke', '#3a3b45').style('stroke-width', 2);
    [-1, 1].forEach(function(side) {
      rangeRows.append('line').attr('x1', function(row) { return x(side < 0 ? row.minimum : row.maximum); })
        .attr('x2', function(row) { return x(side < 0 ? row.minimum : row.maximum); })
        .attr('y1', -5).attr('y2', 5).style('stroke', '#3a3b45').style('stroke-width', 2);
    });
    groupRows.each(function(row) {
      var holder = d3.select(this);
      holder.selectAll('circle.compareDiversityMember').data(row.validMembers).enter().append('circle')
        .attr('class', 'compareDiversityMember')
        .attr('cx', function(point) { return x(point.value); })
        .attr('cy', function(point, index) { return row.kind === 'sample' ? 0 : (index % 2 ? 11 : -11); })
        .attr('r', row.kind === 'sample' ? 6 : 4)
        .attr('fill', row.kind === 'sample' ? '#4e73df' : '#a8baf0')
        .attr('stroke', '#526daf').attr('stroke-width', 1)
        .attr('tabindex', 0).attr('role', 'img')
        .attr('aria-label', function(point) {
          return compareSampleDisplayName(point.record.metadata.pathRun, point.record.metadata.pathName,
            point.record.metadata.id) + ', ' + detail.label + ' ' + compareDiversityNumber(point.value, detail.decimals);
        })
        .on('mouseenter', function(point) {
          d3.event.stopPropagation();
          compareDiversityShowTooltip(point, d3.event.clientX, d3.event.clientY);
        }).on('mousemove', function(point) {
          d3.event.stopPropagation();
          compareDiversityShowTooltip(point, d3.event.clientX, d3.event.clientY);
        })
        .on('mouseleave', compareDiversityHideTooltip)
        .on('focus', function(point) {
          var bounds = this.getBoundingClientRect();
          compareDiversityShowTooltip(point, bounds.right, bounds.top);
        }).on('blur', compareDiversityHideTooltip);
      if (row.kind === 'group' && row.value != null) {
        holder.append('circle').attr('class', 'compareDiversityGroupMean')
          .attr('cx', x(row.value)).attr('cy', 0).attr('r', 7)
          .attr('fill', '#4e73df').attr('stroke', '#1f2937').attr('stroke-width', 2)
          .attr('tabindex', 0).attr('role', 'img')
          .attr('aria-label', row.label + ', mean ' + detail.label + ' ' +
            compareDiversityNumber(row.value, meanDecimals) + ', ' + row.validMembers.length + ' samples')
          .on('mouseenter', function() {
            d3.event.stopPropagation();
            compareDiversityShowGroupTooltip(row, detail, d3.event.clientX, d3.event.clientY);
          }).on('mousemove', function() {
            d3.event.stopPropagation();
            compareDiversityShowGroupTooltip(row, detail, d3.event.clientX, d3.event.clientY);
          })
          .on('mouseleave', compareDiversityHideTooltip)
          .on('focus', function() {
            var bounds = this.getBoundingClientRect();
            compareDiversityShowGroupTooltip(row, detail, bounds.right, bounds.top);
          }).on('blur', compareDiversityHideTooltip);
      }
    });
    groupRows.append('text').attr('x', function(row) { return row.value == null ? left + 11 : x(row.value) + 11; })
      .attr('y', 4).style('fill', '#5a5c69').style('font-size', '11px')
      .text(function(row) { return compareDiversityNumber(row.value, meanDecimals); });
    groupRows.on('mouseenter', function(row) {
      d3.select(this).select('rect').style('fill', '#f8f9fc');
      if (row.kind === 'group') compareDiversityShowGroupTooltip(row, detail, d3.event.clientX, d3.event.clientY);
    }).on('mousemove', function(row) {
      d3.select(this).select('rect').style('fill', '#f8f9fc');
      if (row.kind === 'group') compareDiversityShowGroupTooltip(row, detail, d3.event.clientX, d3.event.clientY);
    }).on('mouseleave', function() {
      d3.select(this).select('rect').style('fill', 'transparent');
      compareDiversityHideTooltip();
    });
    return;
  }

  var names = {};
  rows.forEach(function (point) {
    var name = compareSampleDisplayName(point.record.metadata.pathRun,
      point.record.metadata.pathName, point.record.metadata.id);
    names[name] = (names[name] || 0) + 1;
  });
  var groups = svg.selectAll('.diversitySample').data(rows).enter().append('g').attr('class', 'diversitySample')
    .attr('transform', function (point, index) { return 'translate(0,' + (top + (index + 0.5) * rowHeight) + ')'; });
  groups.append('rect').attr('x', 0).attr('y', -rowHeight / 2).attr('width', width).attr('height', rowHeight)
    .style('fill', 'transparent');
  groups.append('line').attr('x1', left).attr('x2', width - right).attr('y1', 0).attr('y2', 0)
    .style('stroke', '#edf0f5');
  groups.append('text').attr('x', left - 12).attr('y', 4).attr('text-anchor', 'end')
    .style('fill', '#3a3b45').style('font-size', '12px')
    .text(function (point) {
      var name = compareSampleDisplayName(point.record.metadata.pathRun,
        point.record.metadata.pathName, point.record.metadata.id);
      var label = name + (names[name] > 1
        ? ' · ' + point.record.metadata.runId : '');
      return label.length > 34 ? label.slice(0, 31) + '…' : label;
    });
  groups.filter(function (point) { return point.value != null && isFinite(point.value); })
    .append('circle').attr('cx', function (point) { return x(point.value); }).attr('cy', 0).attr('r', 6)
    .attr('class', 'compareDiversityPoint')
    .attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', function (point) {
      return compareSampleDisplayName(point.record.metadata.pathRun,
        point.record.metadata.pathName, point.record.metadata.id) + ', run ' + point.record.metadata.runId + ', ' + detail.label +
        ' ' + compareDiversityNumber(point.value, detail.decimals);
    })
    .attr('fill', '#4e73df').attr('stroke', '#284fad').attr('stroke-width', 1);
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
    ($('#compareDiversityPlotView').val() === 'groups' ? 'groups_' : 'samples_') +
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

function compareDiversityExportGroupCsv() {
  if ($('#compareDiversityPlotView').val() !== 'groups') return;
  var metric = $('#compareDiversityPlotMetric').val();
  var rows = compareDiversityCurrentGroupRows(metric, $('#compareDiversityPlotOrder').val() || 'sample');
  var csv = compareDiversityGroupCsv(rows, compareDiversityPlotMetrics[metric],
    taxonomicRankSelectedCompareText, lcaAbundanceCompare,
    metric === 'rarefied' ? 'reads' : compareDiversityUnit(),
    metric === 'rarefied' ? compareDiversityDepth : '');
  export_as_csv(csv, 'marti_compare_diversity_' + metric + '_groups_' + getDate() + '_' + getTime());
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
    var result = martiTreeDiversity(tree, taxonomicRankSelectedCompare,
      { chao1Valid: false, useYield: unit === 'bases' });
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
    return [compareSampleDisplayName(record.metadata.pathRun, record.metadata.pathName,
      record.metadata.id), record.metadata.runId, compareDiversityTableCell(d.N, 0),
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
  compareDiversityGroupRows: compareDiversityGroupRows,
  compareDiversityGroupCsv: compareDiversityGroupCsv,
  compareDiversityNumericCompare: compareDiversityNumericCompare,
  compareDiversityTableCell: compareDiversityTableCell
};
