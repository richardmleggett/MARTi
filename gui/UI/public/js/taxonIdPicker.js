(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxonIdPicker = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function appendId(text, id) {
    var current = String(text || '').trim().replace(/[,;\s]+$/, '');
    var value = String(id);
    if (current.split(/[,;\s]+/).includes(value)) return String(text || '');
    return current ? current + ', ' + value : value;
  }

  function initialise(options) {
    var input = $('#' + options.searchId);
    if (!input.length) return;
    var list = $('#' + options.listId);
    var status = $('#' + options.statusId);
    var ids = $('#' + options.idsId);
    var namespace = '.taxonPicker' + options.searchId;
    var suggestions = [], active = -1, serial = 0, timer;

    function hide() {
      list.prop('hidden', true).empty();
      input.attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
      active = -1;
    }

    function choose(taxon) {
      var previous = ids.val();
      var next = appendId(previous, taxon.id);
      if (next !== previous) ids.val(next).trigger('input');
      input.val('');
      ++serial;
      clearTimeout(timer);
      hide();
      status.text(next === previous ? taxon.name + ' is already in the list.' :
        'Added ' + taxon.name + ' (NCBI ' + taxon.id + ').');
    }

    function render() {
      list.empty();
      active = -1;
      suggestions.forEach(function(taxon, index) {
        var option = $('<button type="button" class="list-group-item list-group-item-action"></button>')
          .attr('id', options.listId + 'Option' + index).attr('role', 'option')
          .attr('aria-selected', 'false')
          .on('mousedown', function(event) { event.preventDefault(); })
          .on('click', function() { choose(taxon); });
        $('<span></span>').text(taxon.name).appendTo(option);
        $('<small class="d-block text-muted"></small>')
          .text((taxon.rank ? taxon.rank + ' · ' : '') + 'NCBI ID ' + taxon.id)
          .appendTo(option);
        option.appendTo(list);
      });
      list.prop('hidden', !suggestions.length);
      input.attr('aria-expanded', String(suggestions.length > 0));
    }

    function request() {
      var query = input.val().trim();
      var requestSerial = ++serial;
      if (query.length < 2) return;
      var samples = (selectedCompareMetaDataArray || []).map(function(sample) {
        return { runId: sample.pathRun, name: sample.pathName };
      });
      if (!samples.length) {
        status.text('Select samples to search their taxa.');
        return;
      }
      var sampleKey = JSON.stringify(samples);
      socket.emit('sample-taxon-suggestions-request', { clientId: uuid, query: query, samples: samples },
        function(response) {
          if (requestSerial !== serial || !document.contains(input[0]) || document.activeElement !== input[0] ||
              query !== input.val().trim() || currentPage !== 'Compare' ||
              sampleKey !== JSON.stringify((selectedCompareMetaDataArray || []).map(function(sample) {
                return { runId: sample.pathRun, name: sample.pathName };
              }))) return;
          suggestions = response && Array.isArray(response.suggestions) ? response.suggestions : [];
          render();
          status.text(suggestions.length ? 'Choose a taxon to add its ID.' :
            'No matching taxa found in the selected samples.');
        });
    }

    input.off(namespace).on('input' + namespace, function() {
      ++serial;
      clearTimeout(timer);
      suggestions = [];
      hide();
      var query = this.value.trim();
      status.text(query ? query.length < 2 ? 'Type at least two characters.' : 'Searching taxon names…' : '');
      if (query.length >= 2) timer = setTimeout(request, 200);
    }).on('focus' + namespace, function() {
      if (this.value.trim().length < 2) return;
      suggestions = [];
      hide();
      status.text('Searching taxon names…');
      request();
    }).on('keydown' + namespace, function(event) {
      if (event.key === 'Escape') { hide(); return; }
      if (!suggestions.length || list.prop('hidden')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        var step = event.key === 'ArrowDown' ? 1 : -1;
        active = active < 0 ? (step > 0 ? 0 : suggestions.length - 1) :
          (active + step + suggestions.length) % suggestions.length;
        var listNode = list[0], option = document.getElementById(options.listId + 'Option' + active);
        list.find('[role="option"]').removeClass('active').attr('aria-selected', 'false');
        $(option).addClass('active').attr('aria-selected', 'true');
        input.attr('aria-activedescendant', option.id);
        var listBounds = listNode.getBoundingClientRect(), optionBounds = option.getBoundingClientRect();
        if (optionBounds.bottom > listBounds.bottom) listNode.scrollTop += optionBounds.bottom - listBounds.bottom;
        else if (optionBounds.top < listBounds.top) listNode.scrollTop -= listBounds.top - optionBounds.top;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(suggestions[active < 0 ? 0 : active]);
      }
    }).on('blur' + namespace, function() {
      setTimeout(function() { if (!$(document.activeElement).closest('.compareTaxonIdPicker').length) hide(); }, 0);
    });
    $(document).off('click' + namespace).on('click' + namespace, function(event) {
      if (!input.closest('.compareTaxonIdPicker')[0].contains(event.target)) hide();
    });
  }

  return { appendId: appendId, initialise: initialise };
});
