/* Taxon overlap across Compare samples or their assigned groups. */
var compareUpSetResult = null;
var compareUpSetTimer = null;
var compareUpSetByUserChosen = false;
var compareUpSetBroadGroups = ['Bacteria', 'Archaea', 'Fungi', 'Plants', 'Animals', 'Viruses', 'Other'];
var compareUpSetBroadColours = {
  Bacteria: '#1f77b4', Archaea: '#9467bd', Fungi: '#ff7f0e', Plants: '#2ca02c',
  Animals: '#d62728', Viruses: '#17becf', Other: '#7f7f7f'
};

function compareUpSetBroadGroup(id, inherited) {
  var names = { '2': 'Bacteria', '2157': 'Archaea', '4751': 'Fungi',
    '33090': 'Plants', '33208': 'Animals', '10239': 'Viruses' };
  return names[String(id)] || inherited || 'Other';
}

function compareUpSetGroupCounts(ids, taxonGroups) {
  var counts = new Map();
  ids.forEach(function(id) {
    var group = taxonGroups.get(id) || 'Other';
    counts.set(group, (counts.get(group) || 0) + 1);
  });
  return compareUpSetBroadGroups.filter(function(group) { return counts.has(group); })
    .map(function(group) { return { group: group, count: counts.get(group) }; });
}

function compareUpSetLegendLayout(groups, width) {
  var x = 16, row = 0;
  var items = groups.map(function(group) {
    var itemWidth = Math.ceil(group.length * 8 + 45);
    if (x > 16 && x + itemWidth > width - 16) { x = 16; row++; }
    var item = { group: group, x: x, row: row, width: itemWidth };
    x += itemWidth;
    return item;
  });
  return { items: items, rows: groups.length ? row + 1 : 0 };
}

function compareUpSetIntersectionTooltipLines(item, sets, stacked, taxonGroups) {
  var names = sets.filter(function(_, index) { return item.mask & (1 << index); })
    .map(function(set) { return set.label; });
  return [item.count + ' taxa in intersection', names.join(' & ')].concat(stacked ?
    compareUpSetGroupCounts(item.taxa, taxonGroups).map(function(segment) {
      return segment.group + ': ' + segment.count;
    }) : []);
}

function compareUpSetTaxa(root, rank, minReads, minPercent) {
  var total = Number(root && root.summedValue);
  var counts = new Map(), names = new Map(), groups = new Map();
  if (!Number.isFinite(total) || total <= 0) return null;
  var stack = [{ node: root, group: 'Other' }];
  while (stack.length) {
    var current = stack.pop(), node = current.node;
    var broadGroup = compareUpSetBroadGroup(node.ncbiID, current.group);
    if (Number(node.rank) === rank) {
      var id = String(node.ncbiID), value = Number(node.summedValue);
      if (/^\d+$/.test(id) && id !== '0' && id !== '1' &&
          String(node.name || '').toLowerCase() !== 'unclassified' && Number.isFinite(value) && value > 0) {
        counts.set(id, (counts.get(id) || 0) + value);
        if (!names.has(id)) names.set(id, node.name || id);
        if (!groups.has(id) || groups.get(id) === 'Other') groups.set(id, broadGroup);
      }
      continue;
    }
    if (Array.isArray(node.children)) node.children.forEach(function(child) {
      stack.push({ node: child, group: broadGroup });
    });
  }
  var present = new Set();
  counts.forEach(function(count, id) {
    if (count >= minReads && count / total * 100 >= minPercent) present.add(id);
  });
  return { present: present, names: names, groups: groups };
}

function calculateCompareUpSet(entries, options, groupValue, displayName) {
  var rank = Number(options.rank), minReads = Number(options.minReads), minPercent = Number(options.minPercent);
  var minGroupSamples = Number(options.minGroupSamples), mode = options.mode;
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) throw new Error('Choose a single taxonomic rank.');
  if (!Number.isInteger(minReads) || minReads < 1) throw new Error('Minimum reads must be a positive whole number.');
  if (!Number.isFinite(minPercent) || minPercent < 0 || minPercent > 100) throw new Error('Minimum root abundance must be between 0 and 100%.');
  if (!Number.isInteger(minGroupSamples) || minGroupSamples < 1) throw new Error('Samples per group must be a positive whole number.');
  if (mode !== 'groups' && mode !== 'samples') throw new Error('Choose samples or assigned groups.');
  var sets = [], lookup = new Map(), taxonNames = new Map(), taxonGroups = new Map();
  var excludedUngrouped = 0, excludedNoRoot = 0;
  (entries || []).forEach(function(entry) {
    var run = entry && entry.runId, sample = entry && entry.id;
    var group = mode === 'groups' ? String(groupValue(run, sample) || '').trim() : '';
    if (mode === 'groups' && !group) { excludedUngrouped++; return; }
    var result = compareUpSetTaxa(entry && entry.tree && entry.tree.tree, rank, minReads, minPercent);
    if (!result) { excludedNoRoot++; return; }
    var key = mode === 'groups' ? 'group:' + group : JSON.stringify([String(run), String(sample)]);
    if (!lookup.has(key)) {
      var label = mode === 'groups' ? group : String(displayName(run, sample));
      var set = { key: key, label: label, sampleCount: 0, frequencies: new Map(), taxa: new Set() };
      lookup.set(key, set);
      sets.push(set);
    }
    var current = lookup.get(key);
    current.sampleCount++;
    result.present.forEach(function(id) {
      current.frequencies.set(id, (current.frequencies.get(id) || 0) + 1);
      if (!taxonNames.has(id)) taxonNames.set(id, result.names.get(id) || id);
      var broadGroup = result.groups.get(id) || 'Other';
      if (!taxonGroups.has(id) || taxonGroups.get(id) === 'Other') taxonGroups.set(id, broadGroup);
    });
  });
  if (sets.length < 2) throw new Error('Select at least two ' + (mode === 'groups' ? 'assigned groups' : 'samples') + ' with taxon data.');
  if (sets.length > 8) throw new Error('UpSet supports up to eight sets. Select fewer samples or use assigned groups.');
  if (mode === 'samples') {
    var labels = new Map();
    sets.forEach(function(set) { labels.set(set.label, (labels.get(set.label) || 0) + 1); });
    sets.forEach(function(set) {
      if (labels.get(set.label) > 1) set.label += ' (' + JSON.parse(set.key)[0] + ')';
    });
  }
  sets.forEach(function(set) {
    set.frequencies.forEach(function(frequency, id) {
      if (frequency >= (mode === 'groups' ? minGroupSamples : 1)) set.taxa.add(id);
    });
  });
  var allTaxa = new Set();
  sets.forEach(function(set) { set.taxa.forEach(function(id) { allTaxa.add(id); }); });
  var intersections = new Map();
  allTaxa.forEach(function(id) {
    var mask = 0;
    sets.forEach(function(set, index) { if (set.taxa.has(id)) mask |= 1 << index; });
    if (!intersections.has(mask)) intersections.set(mask, { mask: mask, taxa: [] });
    intersections.get(mask).taxa.push(id);
  });
  var columns = Array.from(intersections.values()).map(function(item) {
    item.count = item.taxa.length;
    item.degree = sets.filter(function(_, index) { return Boolean(item.mask & (1 << index)); }).length;
    return item;
  }).sort(function(a, b) { return b.count - a.count || b.degree - a.degree || a.mask - b.mask; });
  return { sets: sets, intersections: columns, taxonNames: taxonNames, taxonGroups: taxonGroups, taxa: allTaxa,
    excludedUngrouped: excludedUngrouped, excludedNoRoot: excludedNoRoot,
    rank: rank, minReads: minReads, minPercent: minPercent,
    minGroupSamples: minGroupSamples, mode: mode };
}

function compareUpSetPresenceCsv(result) {
  function field(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }
  var rows = [['NCBI taxon ID', 'Taxon name', 'Broad taxonomic group'].concat(result.sets.map(function(set) { return set.label; }), ['Intersection'])];
  Array.from(result.taxa).sort(function(a, b) { return Number(a) - Number(b); }).forEach(function(id) {
    var member = result.sets.map(function(set) { return set.taxa.has(id); });
    rows.push([id, result.taxonNames.get(id) || id, result.taxonGroups.get(id) || 'Other']
      .concat(member.map(function(value) { return value ? 'TRUE' : 'FALSE'; }),
      [result.sets.filter(function(_, index) { return member[index]; }).map(function(set) { return set.label; }).join(' & ')]));
  });
  return rows.map(function(row) { return row.map(field).join(','); }).join('\r\n') + '\r\n';
}

function compareUpSetActive() {
  return currentPage === 'Compare' && !$('#compareTaxonRelationshipsView').prop('hidden');
}

function compareUpSetHideTooltip() {
  if (typeof toolTipDiv !== 'undefined') toolTipDiv.interrupt().style('opacity', 0);
}

function compareUpSetTooltip(lines, event) {
  toolTipDiv.interrupt().html('');
  var content = toolTipDiv.append('div').style('text-align', 'left')
    .style('font-size', '0.82rem')
    .style('line-height', '1.25')
    .style('max-width', 'min(350px, calc(100vw - 32px))')
    .style('white-space', 'normal').style('overflow-wrap', 'anywhere');
  lines.forEach(function(line, index) {
    content.append('div').style('font-weight', index === 0 ? 'bold' : 'normal').text(line);
  });
  toolTipDiv.style('z-index', 1100).style('opacity', .95)
    .style('left', tooltipPos(event.pageX + 12) + 'px')
    .style('top', tooltipPosY(event.pageY + 12) + 'px');
}

function initialiseCompareUpSet() {
  compareUpSetResult = null;
  compareUpSetByUserChosen = false;
  $('#compareUpSetSettingsButton').off('.upset').on('click.upset', function() {
    var opening = $('#compareUpSetSettings').prop('hidden');
    $('#compareUpSetSettings').prop('hidden', !opening);
    $(this).attr('aria-expanded', String(opening));
    if (opening) $('#compareUpSetSettingsTitle').trigger('focus');
  });
  $('#compareUpSetSettingsClose').off('.upset').on('click.upset', function() {
    $('#compareUpSetSettings').prop('hidden', true);
    $('#compareUpSetSettingsButton').attr('aria-expanded', 'false').trigger('focus');
  });
  $('#compareUpSetBy, #compareUpSetGroupMin, #compareUpSetReads, #compareUpSetPercent, #compareUpSetStack, #compareUpSetTop')
    .off('.upset').on('change.upset input.upset', function() {
      if (this.id === 'compareUpSetBy') compareUpSetByUserChosen = true;
      clearTimeout(compareUpSetTimer);
      compareUpSetTimer = setTimeout(renderCompareUpSet, 250);
    });
  $('#compareUpSetExportSvg').off('.upset').on('click.upset', function(event) { event.preventDefault(); compareUpSetExportSvg(); });
  $('#compareUpSetExportPng').off('.upset').on('click.upset', function(event) { event.preventDefault(); compareUpSetExportPng(); });
  $('#compareUpSetExportCsv').off('.upset').on('click.upset', function(event) { event.preventDefault(); compareUpSetExportCsv(); });
  $(window).off('resize.compareUpSet').on('resize.compareUpSet', function() {
    if (compareUpSetActive()) renderCompareUpSet();
  });
}

function renderCompareUpSet() {
  if (!compareUpSetActive()) return;
  compareUpSetHideTooltip();
  var holder = document.getElementById('compareUpSetPlot');
  if (!holder) return;
  holder.textContent = '';
  compareUpSetResult = null;
  if (typeof compareTreeDataGlobal === 'undefined' || !Array.isArray(compareTreeDataGlobal)) {
    $('#compareUpSetStatus').text('Waiting for sample data…');
    return;
  }
  var hasGroups = compareTreeDataGlobal.some(function(entry) {
    return Boolean(compareSampleGroupValue(entry.runId, entry.id));
  });
  $('#compareUpSetBy option[value="groups"]').prop('disabled', !hasGroups);
  if (!compareUpSetByUserChosen) $('#compareUpSetBy').val(hasGroups ? 'groups' : 'samples');
  else if (!hasGroups && $('#compareUpSetBy').val() === 'groups') $('#compareUpSetBy').val('samples');
  var mode = $('#compareUpSetBy').val() || 'samples';
  $('#compareUpSetGroupMin').prop('disabled', mode !== 'groups');
  var top = Number($('#compareUpSetTop').val());
  if (!Number.isInteger(top) || top < 1 || top > 40) {
    $('#compareUpSetStatus').text('Show between 1 and 40 intersections.'); return;
  }
  try {
    compareUpSetResult = calculateCompareUpSet(compareTreeDataGlobal, {
      rank: taxonomicRankSelectedCompare, mode: mode,
      minReads: $('#compareUpSetReads').val(), minPercent: $('#compareUpSetPercent').val(),
      minGroupSamples: $('#compareUpSetGroupMin').val()
    }, compareSampleGroupValue, compareSampleDisplayNameById);
  } catch (error) {
    $('#compareUpSetStatus').text(error.message); return;
  }
  var result = compareUpSetResult, columns = result.intersections.slice(0, top);
  var stackByBroadGroup = $('#compareUpSetStack').val() === 'broad';
  var note = result.sets.length + ' sets · ' + result.taxa.size + ' taxa · ' + columns.length +
    ' of ' + result.intersections.length + ' intersections shown · ' +
    taxonomicLevelDictRev[result.rank] + ' · LCA ' + lcaAbundanceCompare + '%.';
  if (result.excludedUngrouped) note += ' ' + result.excludedUngrouped + ' ungrouped samples excluded.';
  if (result.excludedNoRoot) note += ' ' + result.excludedNoRoot + ' samples without usable counts excluded.';
  if (Number(lcaAbundanceCompare) > result.minPercent) note += ' Current LCA data exclude taxa below ' +
    lcaAbundanceCompare + '%; lower the page cutoff to apply the requested ' + result.minPercent + '% threshold fully.';
  $('#compareUpSetStatus').text(note);
  if (!columns.length) {
    holder.textContent = 'No taxa meet the presence thresholds.'; return;
  }
  var xStart = 310, columnWidth = 31, barBottom = 232, matrixTop = 270, rowHeight = 34;
  var width = Math.max(760, xStart + columns.length * columnWidth + 30);
  var legendGroups = stackByBroadGroup ? compareUpSetBroadGroups.filter(function(group) {
    return Array.from(result.taxa).some(function(id) { return (result.taxonGroups.get(id) || 'Other') === group; });
  }) : [];
  var legendTop = matrixTop + result.sets.length * rowHeight + 28;
  var legendWidth = Math.min(width, Math.max(240, holder.clientWidth - 32));
  var legendLayout = compareUpSetLegendLayout(legendGroups, legendWidth);
  var height = legendTop + (legendGroups.length ? legendLayout.rows * 23 + 22 : 27);
  var svg = compareOrdinationSvgElement('svg', {
    id: 'compareUpSetSvg', xmlns: 'http://www.w3.org/2000/svg',
    width: width, height: height, viewBox: '0 0 ' + width + ' ' + height,
    style: 'font-family: Arial, Helvetica, sans-serif', role: 'img',
    'aria-label': 'UpSet plot of ' + result.taxa.size + ' taxa across ' + result.sets.length + ' sets'
  }, holder);
  compareOrdinationSvgElement('rect', { width: width, height: height, fill: '#fff' }, svg);
  var legendItems = [];
  function highlightBroadGroup(selected) {
    Array.from(svg.querySelectorAll('.compareUpSetBarSegment')).forEach(function(rect) {
      var matching = selected && rect.getAttribute('data-broad-group') === selected;
      rect.style.opacity = !selected || matching ? '1' : '0.3';
      rect.style.stroke = matching ? '#1f1f1f' : 'none';
      rect.style.strokeWidth = matching ? '1.5px' : '';
    });
    legendItems.forEach(function(item) {
      item.element.style.opacity = !selected || item.name === selected ? '1' : '0.3';
      item.label.style.fontWeight = selected && item.name === selected ? 'bold' : 'normal';
    });
  }
  compareOrdinationSvgElement('text', { x: xStart, y: 27, fill: '#3a3b45', 'font-size': 13 }, svg,
    'Taxa in each exact intersection');
  compareOrdinationSvgElement('line', { x1: xStart - 10, x2: xStart + columns.length * columnWidth,
    y1: barBottom, y2: barBottom, stroke: '#858796' }, svg);
  var maxColumn = Math.max.apply(null, columns.map(function(item) { return item.count; }));
  var maxSet = Math.max.apply(null, result.sets.map(function(set) { return set.taxa.size; }));
  result.sets.forEach(function(set, index) {
    var y = matrixTop + index * rowHeight;
    if (index % 2 === 0) compareOrdinationSvgElement('rect', { x: 8, y: y - 16,
      width: width - 16, height: rowHeight, fill: '#f8f9fc' }, svg);
    var barWidth = maxSet ? 125 * set.taxa.size / maxSet : 0;
    var setGroup = compareOrdinationSvgElement('g', { tabindex: 0, role: 'img',
      'aria-label': set.label + ': ' + set.taxa.size + ' taxa' }, svg);
    compareOrdinationSvgElement('rect', { x: 8, y: y - 16, width: xStart - 18,
      height: rowHeight, fill: 'transparent' }, setGroup);
    var setSegments = stackByBroadGroup ? compareUpSetGroupCounts(set.taxa, result.taxonGroups)
      : [{ group: 'All taxa', count: set.taxa.size }];
    var setOffset = 0;
    setSegments.forEach(function(segment) {
      var segmentWidth = set.taxa.size ? barWidth * segment.count / set.taxa.size : 0;
      compareOrdinationSvgElement('rect', { x: 15 + 125 - barWidth + setOffset, y: y - 8,
        width: segmentWidth, height: 16,
        fill: stackByBroadGroup ? compareUpSetBroadColours[segment.group] : '#4e73df',
        class: stackByBroadGroup ? 'compareUpSetBarSegment' : '',
        'data-broad-group': stackByBroadGroup ? segment.group : '' }, setGroup);
      setOffset += segmentWidth;
    });
    compareOrdinationSvgElement('text', { x: 145, y: y + 4, fill: '#5a5c69', 'font-size': 12 }, setGroup,
      String(set.taxa.size));
    var fullLabel = set.label + (result.mode === 'groups' ? ' (n=' + set.sampleCount + ')' : '');
    var label = fullLabel.length > 24 ? fullLabel.slice(0, 23) + '…' : fullLabel;
    compareOrdinationSvgElement('text', { x: xStart - 18, y: y + 4, 'text-anchor': 'end',
      fill: '#3a3b45', 'font-size': 12 }, setGroup, label);
    function showSet(event) {
      compareUpSetTooltip([set.label + ' · ' + set.taxa.size + ' taxa',
        result.mode === 'groups' ? set.sampleCount + ' samples in group' : 'Individual sample']
        .concat(stackByBroadGroup ? setSegments.map(function(segment) {
          return segment.group + ': ' + segment.count;
        }) : []), event);
    }
    setGroup.addEventListener('mouseenter', showSet);
    setGroup.addEventListener('mousemove', showSet);
    setGroup.addEventListener('mouseleave', compareUpSetHideTooltip);
    setGroup.addEventListener('focus', function() {
      var bounds = setGroup.getBoundingClientRect();
      showSet({ pageX: bounds.right + window.pageXOffset, pageY: bounds.top + window.pageYOffset });
    });
    setGroup.addEventListener('blur', compareUpSetHideTooltip);
  });
  columns.forEach(function(item, columnIndex) {
    var x = xStart + columnIndex * columnWidth + columnWidth / 2;
    var group = compareOrdinationSvgElement('g', { tabindex: 0, role: 'img',
      'aria-label': item.count + ' taxa in ' + result.sets.filter(function(_, index) {
        return Boolean(item.mask & (1 << index));
      }).map(function(set) { return set.label; }).join(' and ') }, svg);
    compareOrdinationSvgElement('rect', { x: x - columnWidth / 2, y: 45, width: columnWidth,
      height: matrixTop + result.sets.length * rowHeight - 45, fill: 'transparent' }, group);
    var barHeight = maxColumn ? 155 * item.count / maxColumn : 0;
    var columnSegments = stackByBroadGroup ? compareUpSetGroupCounts(item.taxa, result.taxonGroups)
      : [{ group: 'All taxa', count: item.count }];
    var columnOffset = 0;
    columnSegments.forEach(function(segment) {
      var segmentHeight = item.count ? barHeight * segment.count / item.count : 0;
      var segmentTop = barBottom - columnOffset - segmentHeight;
      compareOrdinationSvgElement('rect', { x: x - 10, y: segmentTop,
        width: 20, height: segmentHeight,
        fill: stackByBroadGroup ? compareUpSetBroadColours[segment.group] : '#4e73df',
        class: stackByBroadGroup ? 'compareUpSetBarSegment' : '',
        'data-broad-group': stackByBroadGroup ? segment.group : '' }, group);
      columnOffset += segmentHeight;
    });
    compareOrdinationSvgElement('text', { x: x, y: barBottom - barHeight - 6,
      'text-anchor': 'middle', fill: '#3a3b45', 'font-size': 12 }, group, String(item.count));
    var included = result.sets.map(function(_, index) { return index; })
      .filter(function(index) { return Boolean(item.mask & (1 << index)); });
    if (included.length > 1) compareOrdinationSvgElement('line', { x1: x, x2: x,
      y1: matrixTop + included[0] * rowHeight, y2: matrixTop + included[included.length - 1] * rowHeight,
      stroke: '#252a34', 'stroke-width': 2 }, group);
    result.sets.forEach(function(_, index) {
      compareOrdinationSvgElement('circle', { cx: x, cy: matrixTop + index * rowHeight,
        r: 7, fill: item.mask & (1 << index) ? '#252a34' : '#d1d3e2' }, group);
    });
    function show(event) {
      compareUpSetTooltip(compareUpSetIntersectionTooltipLines(item, result.sets,
        stackByBroadGroup, result.taxonGroups), event);
    }
    group.addEventListener('mouseenter', show);
    group.addEventListener('mousemove', show);
    group.addEventListener('mouseleave', compareUpSetHideTooltip);
    group.addEventListener('focus', function() {
      var bounds = group.getBoundingClientRect();
      show({ pageX: bounds.right + window.pageXOffset, pageY: bounds.top + window.pageYOffset });
    });
    group.addEventListener('blur', compareUpSetHideTooltip);
  });
  legendLayout.items.forEach(function(item) {
    var group = item.group, x = item.x, y = legendTop + item.row * 23;
    var legend = compareOrdinationSvgElement('g', { class: 'compareUpSetLegendItem',
      tabindex: 0, role: 'img', 'aria-label': group + ': highlight matching bar sections' }, svg);
    compareOrdinationSvgElement('rect', { x: x - 4, y: y - 15, width: item.width,
      height: 22, fill: 'transparent' }, legend);
    compareOrdinationSvgElement('rect', { x: x, y: y - 9, width: 16, height: 12,
      fill: compareUpSetBroadColours[group] }, legend);
    var label = compareOrdinationSvgElement('text', { x: x + 21, y: y + 1, fill: '#3a3b45',
      'font-size': 13 }, legend, group);
    legendItems.push({ name: group, element: legend, label: label });
    legend.addEventListener('mouseenter', function() { compareUpSetHideTooltip(); highlightBroadGroup(group); });
    legend.addEventListener('mouseleave', function() { highlightBroadGroup(null); });
    legend.addEventListener('focus', function() { compareUpSetHideTooltip(); highlightBroadGroup(group); });
    legend.addEventListener('blur', function() { highlightBroadGroup(null); });
  });
  if (stackByBroadGroup) Array.from(svg.querySelectorAll('.compareUpSetBarSegment')).forEach(function(rect) {
    rect.addEventListener('mouseenter', function() { highlightBroadGroup(rect.getAttribute('data-broad-group')); });
    rect.addEventListener('mouseleave', function() { highlightBroadGroup(null); });
  });
}

function compareUpSetFilename(suffix) {
  return 'marti_shared_taxa_upset_' + getDate() + '_' + getTime() + '_' + suffix;
}

function compareUpSetSvgString() {
  var svg = document.getElementById('compareUpSetSvg');
  return svg && new XMLSerializer().serializeToString(svg);
}

function compareUpSetExportSvg() {
  var source = compareUpSetSvgString();
  if (source) saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareUpSetFilename('plot.svg'));
}

function compareUpSetExportPng() {
  var source = compareUpSetSvgString(), svg = document.getElementById('compareUpSetSvg');
  if (!source || !svg) return;
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
    canvas.toBlob(function(blob) { if (blob) saveAs(blob, compareUpSetFilename('plot.png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function() { URL.revokeObjectURL(url); $('#compareUpSetStatus').text('PNG export failed. Try SVG export.'); };
  image.src = url;
}

function compareUpSetExportCsv() {
  if (!compareUpSetResult) return;
  saveAs(new Blob([compareUpSetPresenceCsv(compareUpSetResult)], { type: 'text/csv;charset=utf-8' }),
    compareUpSetFilename('taxa.csv'));
}

if (typeof module !== 'undefined') module.exports = {
  calculateCompareUpSet: calculateCompareUpSet,
  compareUpSetPresenceCsv: compareUpSetPresenceCsv,
  compareUpSetGroupCounts: compareUpSetGroupCounts,
  compareUpSetLegendLayout: compareUpSetLegendLayout,
  compareUpSetIntersectionTooltipLines: compareUpSetIntersectionTooltipLines
};
