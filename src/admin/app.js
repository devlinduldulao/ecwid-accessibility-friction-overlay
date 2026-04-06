/**
 * Static control-room dashboard for Ecwid deployment.
 *
 * Settings are stored in the merchant browser only. The actual storefront
 * deploy is handled through the generated Custom JavaScript snippet.
 */

(function () {
  'use strict';

  var core = window.AccessibilityFrictionOverlayEcwidCore;
  if (!core) {
    return;
  }

  var elements = {
    storeLabel: document.getElementById('afo-store-id'),
    saveButton: document.getElementById('save-btn'),
    copyButton: document.getElementById('copy-snippet-btn'),
    previewButton: document.getElementById('preview-toggle-btn'),
    previewStatus: document.getElementById('preview-status'),
    previewLabel: document.getElementById('preview-label'),
    status: document.getElementById('status-message'),
    metrics: document.getElementById('accessibility-friction-overlay-metrics'),
    feed: document.getElementById('accessibility-friction-overlay-feed'),
    hotspots: document.getElementById('accessibility-friction-overlay-hotspots'),
    recommendations: document.getElementById('accessibility-friction-overlay-recommendations'),
    snippet: document.getElementById('deployment-snippet'),
    scenario: document.getElementById('preview-scenario'),
    baseUrl: document.getElementById('snippet-base-url'),
    enabled: document.getElementById('feature-enabled'),
    trackCatalog: document.getElementById('track-catalog'),
    overlayVisible: document.getElementById('overlay-visible'),
    autoOpenOverlay: document.getElementById('auto-open-overlay'),
    bufferTtl: document.getElementById('buffer-ttl'),
    maxEventsPerSecond: document.getElementById('max-events-per-second'),
    maxBufferEvents: document.getElementById('max-buffer-events'),
    outcome: document.getElementById('preview-outcome'),
  };

  var appConfig = window.AccessibilityFrictionOverlayEcwidAdminConfig || {};
  var storeId = 'demo-store';
  var settings = core.getDefaultSettings();
  var previewEnabled = false;
  var previewTimer = null;

  bindEvents();
  initContext();

  function bindEvents() {
    elements.saveButton.addEventListener('click', saveSettings);
    elements.copyButton.addEventListener('click', copySnippet);
    elements.previewButton.addEventListener('click', togglePreview);
    elements.scenario.addEventListener('change', function () {
      settings.previewScenario = elements.scenario.value;
      persistSettings();
      updatePreview();
      updateSnippet();
    });
  }

  function initContext() {
    // Fallback for standalone local preview outside of Ecwid Control Panel
    if (window.self === window.top) {
      initializeDashboard();
      return;
    }

    if (window.EcwidApp && typeof window.EcwidApp.init === 'function') {
      var app = window.EcwidApp.init({ appId: appConfig.appId || 'accessibility-friction-overlay' });

      listenForUninstall();

      if (app && typeof app.getPayload === 'function') {
        app.getPayload(function (payload) {
          storeId = String(payload && payload.store_id || 'demo-store');
          initializeDashboard();
        });
        return;
      }

      if (typeof window.EcwidApp.getPayload === 'function') {
        window.EcwidApp.getPayload(function (payload) {
        storeId = String(payload && payload.store_id || 'demo-store');
        initializeDashboard();
        });
        return;
      }
    }

    initializeDashboard();
  }

  function initializeDashboard() {
    loadSettings();
    hydrateScenarioOptions();
    hydrateForm();
    updateSnippet();
    updatePreview();
    resizeIframe();
  }

  function loadSettings() {
    try {
      var raw = window.localStorage.getItem(core.buildStorageKeys(storeId).settings);
      settings = core.normalizeSettings(raw ? JSON.parse(raw) : {});
    } catch {
      settings = core.getDefaultSettings();
    }

    if (!settings.snippetBaseUrl || settings.snippetBaseUrl === core.DEFAULT_SNIPPET_BASE_URL) {
      settings.snippetBaseUrl = getSuggestedBaseUrl();
    }

    elements.storeLabel.textContent = storeId;
  }

  function hydrateScenarioOptions() {
    var scenarios = core.getPreviewScenarios();
    elements.scenario.innerHTML = Object.keys(scenarios).map(function (slug) {
      var selected = slug === settings.previewScenario ? ' selected' : '';
      return '<option value="' + escapeHtml(slug) + '"' + selected + '>' + escapeHtml(scenarios[slug].label) + '</option>';
    }).join('');
  }

  function hydrateForm() {
    elements.enabled.checked = settings.enabled;
    elements.trackCatalog.checked = settings.trackCatalog;
    elements.overlayVisible.checked = settings.overlayVisible;
    elements.autoOpenOverlay.checked = settings.autoOpenOverlay;
    elements.bufferTtl.value = String(settings.bufferTtl);
    elements.maxEventsPerSecond.value = String(settings.maxEventsPerSecond);
    elements.maxBufferEvents.value = String(settings.maxBufferEvents);
    elements.baseUrl.value = settings.snippetBaseUrl;
    elements.scenario.value = settings.previewScenario;
  }

  function readForm() {
    return core.normalizeSettings({
      enabled: elements.enabled.checked,
      trackCatalog: elements.trackCatalog.checked,
      overlayVisible: elements.overlayVisible.checked,
      autoOpenOverlay: elements.autoOpenOverlay.checked,
      bufferTtl: elements.bufferTtl.value,
      maxEventsPerSecond: elements.maxEventsPerSecond.value,
      maxBufferEvents: elements.maxBufferEvents.value,
      previewScenario: elements.scenario.value,
      snippetBaseUrl: elements.baseUrl.value,
    });
  }

  function saveSettings() {
    settings = readForm();
    persistSettings();
    updateSnippet();
    updatePreview();
    showStatus('Saved locally in this browser. The storefront uses the generated Ecwid snippet, not a backend.', 'success');
  }

  function persistSettings() {
    try {
      window.localStorage.setItem(core.buildStorageKeys(storeId).settings, JSON.stringify(settings));
    } catch {
      showStatus('Unable to write local settings in this browser.', 'error');
    }
  }

  function updateSnippet() {
    var snippet = buildLoaderSnippet(readForm());
    elements.snippet.value = snippet;
    resizeIframe();
  }

  function buildLoaderSnippet(snapshot) {
    var baseUrl = snapshot.snippetBaseUrl.replace(/\/$/, '');
    var payload = {
      enabled: snapshot.enabled,
      trackCatalog: snapshot.trackCatalog,
      bufferTtl: snapshot.bufferTtl,
      maxEventsPerSecond: snapshot.maxEventsPerSecond,
      maxBufferEvents: snapshot.maxBufferEvents,
      overlayVisible: snapshot.overlayVisible,
      autoOpenOverlay: snapshot.autoOpenOverlay,
      previewScenario: snapshot.previewScenario,
    };

    return [
      'window.AccessibilityFrictionOverlayEcwidConfig = ' + JSON.stringify(payload, null, 2) + ';',
      '(function () {',
      '  var assets = [',
      "    { tag: 'link', rel: 'stylesheet', href: '" + baseUrl + "/src/storefront/custom-storefront.css' },",
      "    { tag: 'script', src: '" + baseUrl + "/src/shared/core.js' },",
      "    { tag: 'script', src: '" + baseUrl + "/src/storefront/custom-storefront.js' }",
      '  ];',
      '  assets.forEach(function (asset) {',
      '    var element = document.createElement(asset.tag);',
      '    Object.keys(asset).forEach(function (key) {',
      "      if (key !== 'tag') {",
      '        element[key] = asset[key];',
      '      }',
      '    });',
      '    document.head.appendChild(element);',
      '  });',
      '})();'
    ].join('\n');
  }

  function copySnippet() {
    var value = elements.snippet.value;

    if (!navigator.clipboard || !value) {
      showStatus('Clipboard access is unavailable in this browser.', 'error');
      return;
    }

    navigator.clipboard.writeText(value)
      .then(function () {
        showStatus('Snippet copied. Paste it into Ecwid Design > Custom JavaScript.', 'success');
      })
      .catch(function () {
        showStatus('Copy failed. Select the snippet manually.', 'error');
      });
  }

  function togglePreview() {
    previewEnabled = !previewEnabled;
    elements.previewButton.textContent = previewEnabled ? 'Stop Preview' : 'Start Preview';
    elements.previewButton.setAttribute('aria-pressed', previewEnabled ? 'true' : 'false');

    if (previewEnabled) {
      previewTimer = window.setInterval(updatePreview, 6000);
    } else if (previewTimer) {
      window.clearInterval(previewTimer);
      previewTimer = null;
    }

    updatePreview();
  }

  function updatePreview() {
    var scenarioSlug = elements.scenario.value || settings.previewScenario;
    var scenarios = core.getPreviewScenarios();
    var scenario = scenarios[scenarioSlug] || scenarios['checkout-friction'];
    var events = previewEnabled ? core.createPreviewEvents(scenarioSlug, core.nowInSeconds()) : [];
    var summary = core.buildSummary(events);
    var recommendations = core.buildRecommendations(summary);

    renderPreviewControls(scenario);
    elements.outcome.textContent = scenario.outcome;
    renderMetrics(summary);
    renderFeed(events);
    renderHotspots(summary.hotspots || []);
    renderRecommendations(recommendations);
    resizeIframe();
  }

  function renderPreviewControls(scenario) {
    if (elements.previewStatus) {
      elements.previewStatus.textContent = previewEnabled ? 'Preview On' : 'Preview Off';
      elements.previewStatus.classList.toggle('is-active', previewEnabled);
    }

    if (elements.previewLabel) {
      elements.previewLabel.textContent = previewEnabled
        ? 'Synthetic accessibility events are running so you can demo the control room without live storefront traffic.'
        : 'Turn on preview to simulate merchant demo data without relying on live storefront traffic.';
    }

    if (elements.previewButton) {
      elements.previewButton.title = previewEnabled
        ? 'Stop the fake-data walkthrough for this scenario.'
        : 'Start a fake-data walkthrough for this scenario.';
    }

    if (elements.outcome && scenario && !previewEnabled) {
      elements.outcome.textContent = scenario.outcome;
    }
  }

  function renderMetrics(summary) {
    elements.metrics.innerHTML = [
      metricCard('Active Warnings', summary.total, 'Total buffered issues in the current preview drill.'),
      metricCard('Keyboard Trap Risk', summary.countsByType.keyboard_trap_risk || 0, 'Dialog and drawer moments that can block non-mouse shoppers.'),
      metricCard('False Interactivity', summary.countsByType.false_interactivity || 0, 'Click targets that look interactive without behaving like it.'),
      metricCard('Focus Visibility', summary.countsByType.focus_visibility_issue || 0, 'Places where keyboard progress becomes hard to follow.'),
    ].join('');
  }

  function renderFeed(events) {
    if (!events.length) {
      elements.feed.innerHTML = '<p class="afo-empty">Preview is idle. Start the scenario to simulate a live control-room walkthrough.</p>';
      return;
    }

    elements.feed.innerHTML = events.map(function (event) {
      var details = event.details || {};
      var issue = details.issue || details.recoveryType || details.overlay || 'general';

      return [
        '<article class="afo-feed-item">',
        '<header><strong>' + escapeHtml(core.humanize(event.type)) + '</strong><span>' + escapeHtml(formatTime(event.occurredAt)) + '</span></header>',
        '<span class="afo-feed-item__meta">Preview</span>',
        '<p>' + escapeHtml(core.humanize(event.page) + ' / ' + core.humanize(event.surface) + ' / ' + core.humanize(issue)) + '</p>',
        '</article>',
      ].join('');
    }).join('');
  }

  function renderHotspots(hotspots) {
    if (!hotspots.length) {
      elements.hotspots.innerHTML = '<p class="afo-empty">Hotspots appear as soon as a preview drill starts.</p>';
      return;
    }

    elements.hotspots.innerHTML = hotspots.map(function (hotspot) {
      var parts = String(hotspot.label || '').split(':');
      return [
        '<div class="afo-hotspot">',
        '<strong>' + escapeHtml(core.humanize(parts[0] || 'other')) + '</strong>',
        '<span>' + escapeHtml(core.humanize(parts[1] || 'generic')) + '</span>',
        '<b>' + escapeHtml(String(hotspot.count || 0)) + '</b>',
        '</div>',
      ].join('');
    }).join('');
  }

  function renderRecommendations(recommendations) {
    elements.recommendations.innerHTML = recommendations.map(function (recommendation) {
      return [
        '<article class="afo-recommendation">',
        '<span class="afo-recommendation__tone">' + escapeHtml((recommendation.tone || 'note').toUpperCase()) + '</span>',
        '<h3>' + escapeHtml(recommendation.title) + '</h3>',
        '<p>' + escapeHtml(recommendation.body) + '</p>',
        '<strong>' + escapeHtml(recommendation.action) + '</strong>',
        '</article>',
      ].join('');
    }).join('');
  }

  function metricCard(label, value, detail) {
    return [
      '<article class="afo-card">',
      '<h3>' + escapeHtml(label) + '</h3>',
      '<p>' + escapeHtml(String(value)) + '</p>',
      '<small>' + escapeHtml(detail) + '</small>',
      '</article>',
    ].join('');
  }

  function showStatus(message, type) {
    elements.status.innerHTML = '<div class="a-alert ' + (type === 'success' ? 'a-alert--success' : 'a-alert--error') + '">' + escapeHtml(message) + '</div>';
    window.setTimeout(function () {
      elements.status.innerHTML = '';
      resizeIframe();
    }, 5000);
    resizeIframe();
  }

  function getSuggestedBaseUrl() {
    var href = String(window.location.href);
    return href.slice(0, href.indexOf('/public/') > -1 ? href.indexOf('/public/') : href.lastIndexOf('/'));
  }

  function listenForUninstall() {
    if (window.EcwidApp && typeof window.EcwidApp.destroy === 'function') {
      window.EcwidApp.destroy = (function (originalDestroy) {
        return function () {
          cleanupLocalStorage();
          if (typeof originalDestroy === 'function') {
            originalDestroy.apply(this, arguments);
          }
        };
      })(window.EcwidApp.destroy);
    }

    window.addEventListener('message', function (event) {
      var data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (data && (data.method === 'destroyApp' || data.type === 'AppDestroyed')) {
        cleanupLocalStorage();
      }
    });
  }

  function cleanupLocalStorage() {
    try {
      var keys = core.buildStorageKeys(storeId);
      window.localStorage.removeItem(keys.settings);
      window.localStorage.removeItem(keys.events);
    } catch {
      // Ignore errors during cleanup
    }
  }

  function resizeIframe() {
    if (window.EcwidApp && typeof window.EcwidApp.setSize === 'function') {
      window.setTimeout(function () {
        window.EcwidApp.setSize({ height: document.body.scrollHeight + 24 });
      }, 60);
    }
  }

  function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
