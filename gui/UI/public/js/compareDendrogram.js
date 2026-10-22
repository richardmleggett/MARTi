/* global $, socket, uuid, currentPage, lcaAbundanceCompare, taxonomicRankSelectedCompare, taxonomicLevelDictRev, selectedCompareMetaDataArray, compareSampleGroupValue, compareOrdinationHasAssignedGroups, compareOrdinationDisplayName, compareOrdinationLegendLayout, compareOrdinationSvgElement, colourPalettes, toolTipDiv, tooltipPos, tooltipPosY, saveAs, getDate, getTime */

var compareDendrogramResult = null;
var compareDendrogramRequestSerial = 0;
var compareDendrogramTimer = null;

function compareDendrogramActive() {
  return currentPage === 'Compare' && !$('#compareOrdinationView').prop('hidden');
}

function initialiseCompareDendrogram() {
  compareDendrogramResult = null;
  compareDendrogramRequestSerial++;
  $('#compareDendrogramSettingsButton').off('.dendrogram').on('click.dendrogram', function () {
    var open = $('#compareDendrogramSettings').prop('hidden');
    $('#compareDendrogramSettings').prop('hidden', !open);
    $(this).attr('aria-expanded', String(open));
    if (open) $('#compareDendrogramSettingsTitle').trigger('focus');
    requestAnimationFrame(renderCompareDendrogram);
  });
  $('#compareDendrogramSettingsClose').off('.dendrogram').on('click.dendrogram', function () {
    $('#compareDendrogramSettings').prop('hidden', true);
    $('#compareDendrogramSettingsButton').attr('aria-expanded', 'false').trigger('focus');
    requestAnimationFrame(renderCompareDendrogram);
  });
  $('#compareDendrogramMethod').off('.dendrogram').on('change.dendrogram', function () {
    $('#compareDendrogramPseudocountGroup').prop('hidden', this.value !== 'aitchison');
    requestCompareDendrogram();
  });
  $('#compareDendrogramPrevalence, #compareDendrogramPseudocount').off('.dendrogram')
    .on('input.dendrogram change.dendrogram', function () {
      clearTimeout(compareDendrogramTimer);
      compareDendrogramTimer = setTimeout(requestCompareDendrogram, 300);
    });
  $('#exportCompareDendrogramSVG').off('.dendrogram').on('click.dendrogram', function (event) {
    event.preventDefault(); compareDendrogramExportSvg();
  });
  $('#exportCompareDendrogramPNG').off('.dendrogram').on('click.dendrogram', function (event) {
    event.preventDefault(); compareDendrogramExportPng();
  });
  $(window).off('resize.compareDendrogram').on('resize.compareDendrogram', function () {
    if (compareDendrogramActive()) renderCompareDendrogram();
  });
}

function requestCompareDendrogram() {
  if (!compareDendrogramActive()) return;
  compareDendrogramHideTooltip();
  var serial = ++compareDendrogramRequestSerial;
  var prevalence = Number($('#compareDendrogramPrevalence').val());
  var pseudocount = Number($('#compareDendrogramPseudocount').val());
  if (!Number.isInteger(prevalence) || prevalence < 1 || !Number.isFinite(pseudocount) || pseudocount < 0) {
    compareDendrogramResult = null;
    $('#compareDendrogramStatus').text('Enter a positive whole number for prevalence and a nonnegative pseudocount.');
    $('#compareDendrogramPlot').empty();
    return;
  }
  compareDendrogramResult = null;
  $('#compareDendrogramPlot').empty();
  $('#compareDendrogramStatus').text('Calculating clustering…');
  socket.emit('compare-dendrogram-request', {
    clientId: uuid, lca: 'lca_' + lcaAbundanceCompare, rank: taxonomicRankSelectedCompare,
    method: $('#compareDendrogramMethod').val(), minimumPrevalence: prevalence, pseudocount: pseudocount
  }, function (response) {
    if (serial !== compareDendrogramRequestSerial || !compareDendrogramActive()) return;
    if (!response || response.error) {
      compareDendrogramResult = null;
      $('#compareDendrogramStatus').text(response && response.error || 'Could not calculate clustering.');
      $('#compareDendrogramPlot').empty();
      return;
    }
    compareDendrogramResult = response.data;
    renderCompareDendrogram();
  });
}

function compareDendrogramLayout(tree, rowHeight, top) {
  var leaves = [];
  function assign(node) {
    if (!node.children) {
      node.y = top + leaves.length * rowHeight;
      leaves.push(node);
    } else {
      node.children.forEach(assign);
      node.y = (node.children[0].y + node.children[1].y) / 2;
    }
  }
  assign(tree);
  return leaves;
}

function compareDendrogramHideTooltip() {
  toolTipDiv.interrupt().style('opacity', 0);
}

function compareDendrogramShowTooltip(sample, showGroups, event) {
  toolTipDiv.interrupt().html('');
  var content = toolTipDiv.append('div').style('text-align', 'left')
    .style('max-width', 'min(400px, calc(100vw - 32px))')
    .style('white-space', 'normal').style('overflow-wrap', 'anywhere');
  content.append('div').style('font-weight', 'bold').style('font-size', '0.9rem')
    .text(compareOrdinationDisplayName(sample));
  content.append('div').append('small').attr('class', 'text-gray-800')
    .text('Run: ' + sample.runId);
  if (showGroups) {
    content.append('div').append('small').attr('class', 'text-gray-800')
      .text('Group: ' + (compareSampleGroupValue(sample.runId, sample.name) || 'Ungrouped'));
  }
  toolTipDiv.style('z-index', 1100).style('opacity', .95)
    .style('left', tooltipPos(event.pageX + 12) + 'px')
    .style('top', tooltipPosY(event.pageY + 12) + 'px');
}

function renderCompareDendrogram() {
  var result = compareDendrogramResult;
  var holder = document.getElementById('compareDendrogramPlot');
  if (!result || !holder || !compareDendrogramActive()) return;
  compareDendrogramHideTooltip();
  holder.textContent = '';
  var width = Math.max(620, Math.min(960, Math.floor(holder.clientWidth || 700)));
  var left = 45, right = 265, top = 58, rowHeight = 28;
  var plotWidth = width - left - right;
  var leaves = compareDendrogramLayout(result.tree, rowHeight, top);
  var showGroups = compareOrdinationHasAssignedGroups(selectedCompareMetaDataArray || [], compareSampleGroupValue);
  var groupName = function (sample) {
    return showGroups ? compareSampleGroupValue(sample.runId, sample.name) || 'Ungrouped' : 'All samples';
  };
  var groups = Array.from(new Set(leaves.map(groupName))).sort();
  var palette = colourPalettes.tolColorBlindLight9;
  var colours = {};
  groups.forEach(function (group, index) { colours[group] = palette[index % palette.length]; });
  var axisY = top + leaves.length * rowHeight + 6;
  var legendTop = axisY + 55;
  var maximum = result.tree.distance;
  var labelContext = document.createElement('canvas').getContext('2d');
  if (labelContext) labelContext.font = '12px Arial';
  var labelWidth = function (value) {
    return labelContext ? labelContext.measureText(value).width : value.length * 7;
  };
  var legend = showGroups ? compareOrdinationLegendLayout(groups, width - 90, labelWidth) : null;
  var height = legend ? legendTop + legend.height + 20 : axisY + 48;
  var x = function (distance) {
    return maximum > 0 ? left + (maximum - distance) / maximum * plotWidth : left + plotWidth / 2;
  };
  var svg = compareOrdinationSvgElement('svg', {
    id: 'compareDendrogramSvg', xmlns: 'http://www.w3.org/2000/svg',
    width: width, height: height, viewBox: '0 0 ' + width + ' ' + height,
    role: 'img', 'aria-label': 'UPGMA dendrogram of selected samples'
  }, holder);
  compareOrdinationSvgElement('rect', { width: width, height: height, fill: '#fff' }, svg);
  compareOrdinationSvgElement('text', {
    x: width / 2, y: 25, 'text-anchor': 'middle', fill: '#333',
    'font-size': 14, 'font-weight': 'bold'
  }, svg, (result.method === 'aitchison' ? 'Aitchison (CLR)' : 'Bray–Curtis') +
    ' · ' + taxonomicLevelDictRev[result.rank] + ' · LCA ' + lcaAbundanceCompare + '%');
  function draw(node) {
    if (!node.children) {
      var name = compareOrdinationDisplayName(node);
      var label = name;
      while (label.length > 1 && labelWidth(label) > right - 30) {
        label = label.slice(0, -1);
      }
      if (label !== name) label = label.slice(0, -1) + '…';
      var circle = compareOrdinationSvgElement('circle', {
        class: 'compareDendrogramPoint', cx: x(0), cy: node.y, r: 5.5,
        fill: colours[groupName(node)], stroke: '#333', 'stroke-width': 0.8,
        tabindex: 0, role: 'img',
        'aria-label': name + ', run ' + node.runId + (showGroups ? ', group ' + groupName(node) : '')
      }, svg);
      circle.addEventListener('mouseenter', function (event) {
        compareDendrogramShowTooltip(node, showGroups, event);
      });
      circle.addEventListener('mousemove', function (event) {
        compareDendrogramShowTooltip(node, showGroups, event);
      });
      circle.addEventListener('mouseleave', compareDendrogramHideTooltip);
      circle.addEventListener('focus', function () {
        var bounds = circle.getBoundingClientRect();
        compareDendrogramShowTooltip(node, showGroups, {
          pageX: bounds.right + window.pageXOffset,
          pageY: bounds.top + window.pageYOffset
        });
      });
      circle.addEventListener('blur', compareDendrogramHideTooltip);
      var text = compareOrdinationSvgElement('text', {
        x: x(0) + 14, y: node.y + 4, fill: '#3a3b45', 'font-size': 12,
        'aria-label': name + ', run ' + node.runId
      }, svg, label);
      compareOrdinationSvgElement('title', {}, text, name + ' · Run: ' + node.runId);
      return;
    }
    var parentX = x(node.distance);
    var upper = node.children[0], lower = node.children[1];
    compareOrdinationSvgElement('line', {
      x1: parentX, y1: upper.y, x2: parentX, y2: lower.y,
      stroke: '#5a5c69', 'stroke-width': 1.5
    }, svg);
    node.children.forEach(function (child) {
      compareOrdinationSvgElement('line', {
        x1: parentX, y1: child.y, x2: x(child.distance), y2: child.y,
        stroke: '#5a5c69', 'stroke-width': 1.5
      }, svg);
      draw(child);
    });
  }
  draw(result.tree);
  compareOrdinationSvgElement('line', {
    x1: left, y1: axisY, x2: left + plotWidth, y2: axisY, stroke: '#858796'
  }, svg);
  for (var tick = 0; tick <= 4; tick++) {
    var tx = left + tick * plotWidth / 4;
    compareOrdinationSvgElement('line', {
      x1: tx, y1: axisY, x2: tx, y2: axisY + 5, stroke: '#858796'
    }, svg);
    compareOrdinationSvgElement('text', {
      x: tx, y: axisY + 18, 'text-anchor': 'middle', fill: '#666', 'font-size': 11
    }, svg, (maximum * (1 - tick / 4)).toFixed(maximum < 0.1 ? 3 : 2));
  }
  compareOrdinationSvgElement('text', {
    x: left + plotWidth / 2, y: axisY + 40, 'text-anchor': 'middle', fill: '#444', 'font-size': 12
  }, svg, 'Cluster distance');
  if (legend) legend.items.forEach(function (item) {
    var lx = left + item.x, ly = legendTop + item.y;
    compareOrdinationSvgElement('circle', {
      cx: lx, cy: ly - 4, r: 5, fill: colours[item.group],
      stroke: '#333', 'stroke-width': 0.8
    }, svg);
    var label = compareOrdinationSvgElement('text', {
      x: lx + 14, y: ly, fill: '#444', 'font-size': 11
    }, svg);
    item.lines.forEach(function (line, index) {
      compareOrdinationSvgElement('tspan', { x: lx + 14, dy: index ? 15 : 0 }, label, line);
    });
  });
  $('#compareDendrogramStatus').text(result.sampleCount + ' samples · ' + result.featureCount +
    ' taxa' + (result.excludedCount ? ' · ' + result.excludedCount + ' excluded' : '') +
    (maximum === 0 ? ' · Retained profiles are identical; cluster order is arbitrary' : '') + '.');
}

function compareDendrogramFilename(suffix) {
  return 'marti_upgma_' + getDate() + '_' + getTime() + '_' + suffix;
}

function compareDendrogramSvgString() {
  var svg = document.getElementById('compareDendrogramSvg');
  return svg && new XMLSerializer().serializeToString(svg);
}

function compareDendrogramExportSvg() {
  var source = compareDendrogramSvgString();
  if (source) saveAs(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), compareDendrogramFilename('plot.svg'));
}

function compareDendrogramExportPng() {
  var source = compareDendrogramSvgString();
  var svg = document.getElementById('compareDendrogramSvg');
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
    canvas.toBlob(function (blob) { if (blob) saveAs(blob, compareDendrogramFilename('plot.png')); }, 'image/png');
    URL.revokeObjectURL(url);
  };
  image.onerror = function () {
    URL.revokeObjectURL(url);
    $('#compareDendrogramStatus').text('PNG export failed. Try SVG export.');
  };
  image.src = url;
}
