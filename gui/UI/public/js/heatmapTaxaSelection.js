(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HeatmapTaxaSelection = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function parseTaxonIds(text) {
    var tokens = String(text || '').split(/[\s,;]+/).filter(Boolean);
    var ids = [];
    var invalid = [];
    var seen = new Set();
    tokens.forEach(function(token) {
      if (!/^\d+$/.test(token)) {
        invalid.push(token);
      } else if (!seen.has(token)) {
        seen.add(token);
        ids.push(token);
      }
    });
    return { ids: ids, invalid: invalid };
  }

  function buildSampleCells(tree, ids, denominatorId, minimumRootPercent) {
    var nodes = {};
    var stack = tree ? [tree] : [];
    while (stack.length) {
      var node = stack.pop();
      nodes[String(node.ncbiID)] = node;
      if (Array.isArray(node.children)) stack.push.apply(stack, node.children);
    }

    var root = nodes['1'] || tree;
    var rootCount = root ? Number(root.summedValue) || 0 : 0;
    var denominatorNode = nodes[String(denominatorId)];
    var denominator = denominatorNode ? Number(denominatorNode.summedValue) || 0 : 0;
    var minimumCount = rootCount * minimumRootPercent / 100;
    var cells = {};
    ids.forEach(function(id) {
      var node = nodes[id];
      var count = node ? Number(node.summedValue) || 0 : 0;
      if (count < minimumCount) count = 0;
      cells[id] = {
        name: node ? node.name : id,
        rank: node ? node.ncbiRank : '',
        value: count,
        proportion: denominator > 0 ? count / denominator : 0
      };
    });
    return { cells: cells, denominator: denominator, missingDenominator: denominator <= 0 };
  }

  function resolveColourThresholds(values, observedLow, observedHigh, percentMode) {
    var fields = [values.low, values.mid, values.high].map(function(value) {
      return String(value == null ? '' : value).trim();
    });
    var factor = percentMode ? 100 : 1;
    if (fields.every(function(value) { return value === ''; })) {
      var low = Number.isFinite(observedLow) && observedLow > 0 ? observedLow : 0;
      var high = Number.isFinite(observedHigh) && observedHigh > low ?
        observedHigh : low + 1 / factor;
      return { domain: [low, (low + high) / 2, high], error: '' };
    }
    var numbers = fields.map(Number);
    if (fields.some(function(value) { return value === ''; }) ||
        numbers.some(function(value) { return !Number.isFinite(value); }) ||
        numbers[0] < 0 || numbers[0] >= numbers[1] || numbers[1] >= numbers[2]) {
      return {
        domain: resolveColourThresholds({ low: '', mid: '', high: '' }, observedLow, observedHigh, percentMode).domain,
        error: 'Enter all three thresholds in increasing order: low < middle < high.'
      };
    }
    return { domain: numbers.map(function(value) { return value / factor; }), error: '' };
  }

  return {
    parseTaxonIds: parseTaxonIds,
    buildSampleCells: buildSampleCells,
    resolveColourThresholds: resolveColourThresholds
  };
});
