(function() {
  var layoutSelector = '.comparePlotLayout, .diversityPlotLayout, .compareOrdinationLayout, ' +
    '.dashboardPlotLayout, #heatmapTaxaCard .compareHmTaxaLayout';
  var settingsSelector = '.comparePlotSettings, .diversityPlotSettings, .compareOrdinationSettings, ' +
    '.dashboardPlotSettings, .compareHmTaxaSettings';
  var panels = new Map();
  var resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(function(entries) {
    entries.forEach(function(entry) {
      panels.forEach(function(panel) {
        if (panel.content === entry.target || panel.children.indexOf(entry.target) !== -1) updatePanel(panel);
      });
    });
  }) : null;

  function contentHeight(content) {
    var top = content.getBoundingClientRect().top;
    var bottom = top;
    Array.prototype.forEach.call(content.children, function(child) {
      if (child.getClientRects().length) bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
    });
    return Math.ceil(bottom - top + (parseFloat(getComputedStyle(content).paddingBottom) || 0));
  }

  function updateScrollbar(settings) {
    var hiddenHeight = settings.scrollHeight - settings.clientHeight;
    var overflowing = !settings.hidden && hiddenHeight > 2;
    settings.classList.toggle('plotSettingsOverflowing', overflowing);
    if (!overflowing) return;
    var trackHeight = settings.clientHeight;
    var thumbHeight = Math.max(28, Math.round(trackHeight * settings.clientHeight / settings.scrollHeight));
    var thumbTop = Math.round((trackHeight - thumbHeight) * settings.scrollTop / hiddenHeight);
    settings.style.setProperty('--plot-settings-thumb-height', thumbHeight + 'px');
    settings.style.setProperty('--plot-settings-thumb-top', thumbTop + 'px');
  }

  function updatePanel(panel) {
    if (!panel.settings.isConnected || !panel.content.isConnected) return;
    var viewportHeight = Math.max(240, window.innerHeight - 112);
    var plotHeight = contentHeight(panel.content);
    panel.settings.style.maxHeight = Math.max(viewportHeight, plotHeight) + 'px';
    updateScrollbar(panel.settings);
  }

  function observeChildren(panel) {
    if (!resizeObserver) return;
    panel.children.forEach(function(child) { resizeObserver.unobserve(child); });
    panel.children = Array.prototype.slice.call(panel.content.children);
    panel.children.forEach(function(child) { resizeObserver.observe(child); });
  }

  function installPanels() {
    panels.forEach(function(panel, settings) {
      if (settings.isConnected) return;
      if (resizeObserver) {
        resizeObserver.unobserve(panel.content);
        panel.children.forEach(function(child) { resizeObserver.unobserve(child); });
      }
      panel.childObserver.disconnect();
      panel.visibilityObserver.disconnect();
      panels.delete(settings);
    });
    document.querySelectorAll(layoutSelector).forEach(function(layout) {
      var settings = Array.prototype.find.call(layout.children, function(child) { return child.matches(settingsSelector); });
      var content = Array.prototype.find.call(layout.children, function(child) { return child !== settings; });
      if (!settings || !content || panels.has(settings)) return;
      var panel = { settings: settings, content: content, children: [], childObserver: null,
        visibilityObserver: null };
      panels.set(settings, panel);
      settings.addEventListener('scroll', function() { updateScrollbar(settings); }, { passive: true });
      panel.childObserver = new MutationObserver(function() {
        observeChildren(panel);
        updatePanel(panel);
      });
      panel.childObserver.observe(content, { childList: true });
      panel.visibilityObserver = new MutationObserver(function() { updatePanel(panel); });
      panel.visibilityObserver.observe(settings, { attributes: true, attributeFilter: ['hidden'] });
      if (resizeObserver) resizeObserver.observe(content);
      observeChildren(panel);
      updatePanel(panel);
    });
  }

  function scheduleInstall() { window.requestAnimationFrame(installPanels); }
  $(function() {
    var response = document.getElementById('response');
    if (response) new MutationObserver(scheduleInstall).observe(response, { childList: true });
    $(window).on('resize.plotSettings', function() { panels.forEach(updatePanel); });
    installPanels();
  });
})();
