/* global importScripts, calculateCompareTaxonCorrelation */
importScripts('/js/compareTaxonCorrelation.js');
self.onmessage = function(event) {
  try {
    var result = calculateCompareTaxonCorrelation(event.data.entries, event.data.options, function(progress) {
      self.postMessage({ progress: progress });
    });
    self.postMessage({ result: result });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
