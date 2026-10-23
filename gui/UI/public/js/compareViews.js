function compareViewActive(view) {
  return currentPage === 'Compare' && !$('#compare' + view + 'View').prop('hidden');
}

// Keep the existing PCoA storage key so previously assigned groups still load.
var compareSampleGroups = {};
var manualSortCompareSamplePaths = [];

function compareSampleOrderKey(runId, sampleName) {
  return JSON.stringify([String(runId), String(sampleName)]);
}

function compareSampleOrderStorageKey() {
  return 'martiCompareSampleOrder:' + (clientProject || 'default');
}

function compareSampleOrderLoad() {
  try {
    var saved = JSON.parse(localStorage.getItem(compareSampleOrderStorageKey()) || '[]');
    var seen = new Set();
    manualSortCompareSamplePaths = Array.isArray(saved) ? saved.filter(function(sample) {
      if (!Array.isArray(sample) || sample.length !== 2) return false;
      if (typeof sample[0] !== 'string' || typeof sample[1] !== 'string') return false;
      var key = compareSampleOrderKey(sample[0], sample[1]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) : [];
  } catch (_) {
    manualSortCompareSamplePaths = [];
  }
}

function compareSampleOrderSort(samples) {
  var positions = new Map(manualSortCompareSamplePaths.map(function(sample, index) {
    return [compareSampleOrderKey(sample[0], sample[1]), index];
  }));
  return samples.slice().sort(function(a, b) {
    var aPosition = positions.get(compareSampleOrderKey(a.pathRun, a.pathName));
    var bPosition = positions.get(compareSampleOrderKey(b.pathRun, b.pathName));
    if (aPosition !== undefined && bPosition !== undefined) return aPosition - bPosition;
    if (aPosition !== undefined) return -1;
    if (bPosition !== undefined) return 1;
    return String(a.id).localeCompare(String(b.id)) ||
      String(a.pathRun).localeCompare(String(b.pathRun)) ||
      String(a.pathName).localeCompare(String(b.pathName));
  });
}

function compareSampleOrderSave(visibleSamples) {
  var seen = new Set();
  var ordered = visibleSamples.filter(function(sample) {
    if (!Array.isArray(sample) || sample.length !== 2) return false;
    var key = compareSampleOrderKey(sample[0], sample[1]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  var next = 0;
  var retained = manualSortCompareSamplePaths.map(function(sample) {
    return seen.has(compareSampleOrderKey(sample[0], sample[1])) ? ordered[next++] : sample;
  });
  manualSortCompareSamplePaths = retained.concat(ordered.slice(next));
  try {
    localStorage.setItem(compareSampleOrderStorageKey(), JSON.stringify(manualSortCompareSamplePaths));
    $('#compareOrderStatus').text('');
  } catch (_) {
    $('#compareOrderStatus').text('Manual order could not be saved in this browser.');
  }
}

function compareSampleGroupKey(runId, sampleName) {
  return JSON.stringify([String(runId), String(sampleName)]);
}

function compareSampleGroupsStorageKey() {
  return 'martiCompareOrdinationGroups:' + (clientProject || 'default');
}

function compareSampleGroupsLoad() {
  try {
    var saved = JSON.parse(localStorage.getItem(compareSampleGroupsStorageKey()) || '{}');
    compareSampleGroups = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch (_) {
    compareSampleGroups = {};
  }
}

function compareSampleGroupValue(runId, sampleName) {
  return String(compareSampleGroups[compareSampleGroupKey(runId, sampleName)] || '').trim();
}

function updateCompareGroupSuggestions() {
  var groups = Array.from(new Set(Object.keys(compareSampleGroups).map(function(key) {
    return String(compareSampleGroups[key] || '').trim();
  }).filter(Boolean))).sort();
  var suggestions = $('#compareGroupSuggestions').empty();
  groups.forEach(function(group) {
    $('<option>').val(group).appendTo(suggestions);
  });
}

function updateCompareSampleGroupInputs() {
  $('#compareSampleNameList tr').each(function() {
    var group = compareSampleGroupValue(this.getAttribute('data-pathrun'), this.getAttribute('data-pathname'));
    $(this).find('.compareSampleGroupInput').val(group);
  });
  updateCompareGroupSuggestions();
}

function setCompareSampleGroup(runId, sampleName, group) {
  var key = compareSampleGroupKey(runId, sampleName);
  var value = String(group || '').trim();
  if (value) compareSampleGroups[key] = value;
  else delete compareSampleGroups[key];
  try {
    localStorage.setItem(compareSampleGroupsStorageKey(), JSON.stringify(compareSampleGroups));
    $('#compareGroupsStatus').text('');
  } catch (_) {
    $('#compareGroupsStatus').text('Groups could not be saved in this browser.');
  }
  updateCompareGroupSuggestions();
  if (typeof renderCompareOrdination === 'function') renderCompareOrdination();
  if (typeof renderCompareDendrogram === 'function') renderCompareDendrogram();
}

function updateCompareSampleSummary() {
  var names = [];
  $('#compareSampleNameList tr').each(function () {
    var name = $(this).attr('data-id');
    var run = $(this).attr('data-run');
    names.push(run ? name + ' (' + run + ')' : name);
  });
  $('#compareSamplesCount').text(names.length + (names.length === 1 ? ' sample' : ' samples'));
  $('#compareSamplesNames').text(names.join(' · '));
  $('#compareSamplesOrder').text('Order: ' + (sampleOrdertype || 'ID asc'));
}

function setCompareView(view) {
  if (['Plots', 'Diversity', 'Ordination', 'TaxonRelationships', 'Amr'].indexOf(view) === -1) return;
  if (typeof compareOrdinationHideTooltip === 'function') compareOrdinationHideTooltip();
  if (typeof compareDiversityHideTooltip === 'function') compareDiversityHideTooltip();
  if (typeof compareTaxonCorrelationHideTooltip === 'function') compareTaxonCorrelationHideTooltip();
  if (typeof compareCooccurrenceHideTooltip === 'function') compareCooccurrenceHideTooltip();
  if (typeof compareDistanceMatrixHideTooltip === 'function') compareDistanceMatrixHideTooltip();
  ['Plots', 'Diversity', 'Ordination', 'TaxonRelationships', 'Amr'].forEach(function (name) {
    var selected = name === view;
    $('#compare' + name + 'View').prop('hidden', !selected);
    $('#compare' + name + 'Tab').toggleClass('active', selected).attr('aria-selected', String(selected));
  });
  $('#compareTaxonomyOptionsBar').prop('hidden', view === 'Amr');
  $('#compareSamplesSummary').toggleClass('mt-5', view !== 'Amr').toggleClass('mt-3', view === 'Amr');
  if (view === 'Plots' && Array.isArray(compareTreeDataGlobal)) {
    updateComparePlots(compareTreeDataGlobal, true);
  } else if (view === 'Amr' && compareAmrDataAvailable && $('#compareAmrEmpty').prop('hidden') && Array.isArray(orderedAmrHmData)) {
    window.requestAnimationFrame(function () {
      plotAmrHm(orderedAmrHmData, compareAmrHmGenes);
    });
  } else if (view === 'Diversity') {
    if (typeof renderCompareDiversityTab === 'function') renderCompareDiversityTab();
  } else if (view === 'Ordination') {
    requestCompareOrdination();
    requestCompareDendrogram();
    requestCompareDistanceMatrix();
  } else if (view === 'TaxonRelationships') {
    renderCompareTaxonCorrelation();
    renderCompareCooccurrence();
  }
}

function initialiseCompareViews() {
  compareSampleGroupsLoad();
  ['Plots', 'Diversity', 'Ordination', 'TaxonRelationships', 'Amr'].forEach(function (name) {
    $('#compare' + name + 'Tab').off('.compareView').on('click.compareView', function () {
      setCompareView(name);
    });
  });
  $('#compareSamplesToggle').off('.compareView').on('click.compareView', function () {
    var opening = $('#compareSamplesDetails').prop('hidden');
    $('#compareSamplesDetails').prop('hidden', !opening);
    $(this).attr('aria-expanded', String(opening)).text(opening ? 'Hide samples' : 'Show samples');
  });
  $('#compareSampleNameList').off('input.compareGroups').on('input.compareGroups', '.compareSampleGroupInput', function() {
    var row = this.closest('tr');
    setCompareSampleGroup(row.getAttribute('data-pathrun'), row.getAttribute('data-pathname'), this.value);
  });
  $(window).off('storage.compareGroups').on('storage.compareGroups', function(event) {
    if (event.originalEvent.key !== compareSampleGroupsStorageKey()) return;
    compareSampleGroupsLoad();
    updateCompareSampleGroupInputs();
    if (typeof renderCompareOrdination === 'function') renderCompareOrdination();
    if (typeof renderCompareDendrogram === 'function') renderCompareDendrogram();
  });
  $(window).off('storage.compareOrder').on('storage.compareOrder', function(event) {
    if (event.originalEvent.key !== compareSampleOrderStorageKey()) return;
    compareSampleOrderLoad();
    if (currentPage === 'Compare' && sampleOrdertype === 'Manual' &&
        typeof refreshCompareSampleOrder === 'function') refreshCompareSampleOrder();
  });
  updateCompareGroupSuggestions();
  updateCompareSampleSummary();
}
