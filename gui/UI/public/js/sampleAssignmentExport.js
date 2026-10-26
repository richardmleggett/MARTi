(function(root) {
  'use strict';

  var lineageRanks = ['Domain', 'Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species'];

  function serializeDelimitedRows(rows, delimiter) {
    var separator = delimiter === '\\t' ? '\t' : delimiter;
    return rows.map(function(row) {
      return row.map(function(value) {
        var field = value == null ? '' : String(value);
        return field.indexOf(separator) !== -1 || /["\r\n]/.test(field)
          ? '"' + field.replace(/"/g, '""') + '"' : field;
      }).join(separator);
    }).join('\n');
  }

  function buildSampleAssignmentExport(selectedSamples, treeResponses, options) {
    var treeBySample = new Map();
    (treeResponses || []).forEach(function(sample) {
      treeBySample.set(JSON.stringify([sample.runId, sample.id]), sample.tree && sample.tree.tree);
    });

    var columns = options.columns || {};
    var headers = ['Sample ID', 'Run ID', 'Barcode'];
    var fields = [
      ['name', 'Name', function(node) { return node.name; }],
      ['ncbiId', 'NCBI ID', function(node) { return node.ncbiID; }],
      ['ncbiRank', 'Rank', function(node) { return node.ncbiRank; }],
      ['rankNumber', 'Rank number', function(node) { return node.rank; }],
      ['readCount', 'Direct read count', function(node) { return node.value; }],
      ['summedCount', 'Summed read count', function(node) { return node.summedValue; }],
      ['meanIdentity', 'Mean identity', function(node) { return node.meanIdentity == null ? '-' : node.meanIdentity; }],
      ['meanMaxIdentity', 'Mean max identity', function(node) { return node.meanMaxIdentity == null ? '-' : node.meanMaxIdentity; }]
    ].filter(function(field) { return columns[field[0]]; });
    fields.forEach(function(field) { headers.push(field[1]); });
    if (options.lineageIds) lineageRanks.forEach(function(rank) { headers.push(rank); });
    if (options.lineageNames) lineageRanks.forEach(function(rank) { headers.push(rank + '_name'); });

    var rows = [headers];
    var missingSamples = [];
    var targetRank = Number(options.rankNum);
    var allLevels = targetRank === 10;
    var rankOnly = options.rankScope === 'rank_only';

    (selectedSamples || []).forEach(function(sample) {
      var runId = sample.pathRun || sample.runId;
      var directory = sample.pathName || sample.name;
      var tree = treeBySample.get(JSON.stringify([runId, directory]));
      if (!tree) {
        missingSamples.push({ sampleId: sample.id || directory, runId: runId, directory: directory });
        return;
      }

      function visit(node, parentLineage) {
        var rank = Number(node.rank);
        var lineage = parentLineage.slice();
        if (rank >= 1 && rank <= lineageRanks.length) {
          lineage[rank - 1] = { id: node.ncbiID, name: node.name };
        }
        var unclassified = String(node.ncbiID) === '0' && node.name === 'unclassified';
        var include = unclassified ? options.includeUnclassified !== false
          : allLevels || (rankOnly ? rank === targetRank : rank <= targetRank);
        if (include) {
          var row = [sample.id || directory, runId, sample.barcode == null ? '' : sample.barcode];
          fields.forEach(function(field) { row.push(field[2](node)); });
          if (options.lineageIds) lineageRanks.forEach(function(rank, index) {
            row.push(lineage[index] ? lineage[index].id : '');
          });
          if (options.lineageNames) lineageRanks.forEach(function(rank, index) {
            row.push(lineage[index] ? lineage[index].name : '');
          });
          rows.push(row);
        }
        if (allLevels || rank < targetRank) {
          (node.children || []).forEach(function(child) { visit(child, lineage); });
        }
      }

      visit(tree, Array(lineageRanks.length));
    });

    return {
      text: serializeDelimitedRows(rows, options.delimiter || ','),
      rowCount: rows.length - 1,
      missingSamples: missingSamples
    };
  }

  root.buildSampleAssignmentExport = buildSampleAssignmentExport;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildSampleAssignmentExport: buildSampleAssignmentExport, serializeDelimitedRows: serializeDelimitedRows };
  }
})(typeof window !== 'undefined' ? window : globalThis);
