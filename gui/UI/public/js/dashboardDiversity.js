var dashboardDiversityResult = null;

function dashboardDiversityUnit() {
  return plotLevelSelectedDashboardId === 'base' ? 'bases' : 'reads';
}

function dashboardDiversityNLabel() {
  return dashboardDiversityUnit() === 'bases' ? 'Bases in included taxa (N, bp)' : 'Reads in included taxa (N)';
}

function initialiseDashboardDiversity() {
  dashboardDiversityResult = null;
  $('#dashboardDiversityRow').prop('hidden', true);
  $('#dashboardDiversityExport').hide();
  $('#dashboardDiversityInfo').popover({
    title: 'About N', trigger: 'hover focus', placement: 'auto', container: 'body',
    content: function () { return $(this).attr('data-explanation'); }
  });
  $('#dashboardDiversityExport').off('.dashboardDiversity').on('click.dashboardDiversity', function (event) {
    event.preventDefault();
    if (!dashboardDiversityResult) return;
    var d = dashboardDiversityResult;
    var rows = [['Sample', 'Run', 'Rank', dashboardDiversityNLabel(), 'Taxa (S)',
      'Shannon (H)', 'Pielou (J)', 'Inverse Simpson'],
      [$('#dashboardSampleName').text() || dashboardSampleName, dashboardSampleRunId, taxonomicRankSelectedDashboardText,
        d.N, d.S, d.shannon, d.pielou, d.invSimpson]];
    export_as_csv(rows.map(function (row) {
      return row.map(function (value) {
        return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n'), 'marti_sample_diversity_' + getDate() + '_' + getTime());
  });
}

function updateDashboardDiversity() {
  var unit = dashboardDiversityUnit();
  $('#dashboardDiversityCardTitle').text('Sample diversity — ' + taxonomicRankSelectedDashboardText);
  var tree = treeDataBoth2 && treeDataBoth2[unit === 'bases' ? 'treeYield' : 'tree'];
  dashboardDiversityResult = martiTreeDiversity(tree, taxonomicRankSelected,
    { chao1Valid: false, useYield: unit === 'bases' });
  if (!dashboardDiversityResult) {
    $('#dashboardDiversityRow').prop('hidden', true);
    $('#dashboardDiversityExport').hide();
    return;
  }
  $('#dashboardDiversityRow').prop('hidden', false);
  $('#dashboardDiversityExport').show();
  $('#accumulationChartRow').css('display', 'flex');
  $('#dashboardDiversityTitle').text('Diversity metrics' +
    (unit === 'bases' ? ' (DNA yield weighted)' : ' (read weighted)'));
  var d = dashboardDiversityResult;
  var items = [
    [dashboardDiversityNLabel(), d.N, 0], ['Taxa (S)', d.S, 0], ['Shannon (H′)', d.shannon, 3],
    ['Pielou (J′)', d.pielou, 3], ['Inverse Simpson', d.invSimpson, 2]
  ];
  var container = $('#dashboardDiversityMetrics').empty();
  items.forEach(function (item) {
    var box = $('<div class="mr-4 mb-3"></div>');
    $('<div class="small text-muted"></div>').text(item[0]).appendTo(box);
    $('<div class="font-weight-bold"></div>').text(
      item[1] == null ? '—' : item[2] === 0 ? thousandsSeparators(item[1]) : Number(item[1]).toFixed(item[2])
    ).appendTo(box);
    container.append(box);
  });
  $('#dashboardDiversityInfo').attr('data-explanation', (unit === 'bases'
    ? 'N is the sum of classified basepairs assigned to the taxa included in these measures; it is DNA yield, not a number of reads or organisms. '
    : 'N is the sum of classified reads assigned to the taxa included in these measures; it is not a number of organisms. ') +
    'N can be less than the total classified ' + (unit === 'bases' ? 'yield' : 'reads') +
    ' because taxa are selected at this rank and minimum abundance.');
}
