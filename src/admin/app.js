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
    snippetPreview: document.getElementById('deployment-snippet-preview'),
    scenario: document.getElementById('preview-scenario'),
    scenarioMenu: document.getElementById('preview-scenario-menu'),
    scenarioToggle: document.getElementById('preview-scenario-toggle'),
    scenarioLabel: document.getElementById('preview-scenario-label'),
    scenarioOptions: document.getElementById('preview-scenario-options'),
    baseUrl: document.getElementById('snippet-base-url'),
    enabled: document.getElementById('feature-enabled'),
    trackCatalog: document.getElementById('track-catalog'),
    overlayVisible: document.getElementById('overlay-visible'),
    autoOpenOverlay: document.getElementById('auto-open-overlay'),
    bufferTtl: document.getElementById('buffer-ttl'),
    maxEventsPerSecond: document.getElementById('max-events-per-second'),
    maxBufferEvents: document.getElementById('max-buffer-events'),
    outcome: document.getElementById('preview-outcome'),
    checkSnippetButton: document.getElementById('check-snippet-btn'),
    snippetHealth: document.getElementById('snippet-health'),
    snippetHealthSummary: document.getElementById('snippet-health-summary'),
    snippetHealthDetails: document.getElementById('snippet-health-details'),
  };

  var appConfig = window.AccessibilityFrictionOverlayEcwidAdminConfig || {};
  var storeId = '';
  var hasEcwidContext = false;
  var settings = core.getDefaultSettings();
  var previewEnabled = false;
  var previewTimer = null;
  var currentSnippet = '';
  var scenarioMenuOpen = false;

  bindEvents();
  initContext();

  function bindEvents() {
    elements.saveButton.addEventListener('click', saveSettings);
    elements.copyButton.addEventListener('click', copySnippet);
    elements.previewButton.addEventListener('click', togglePreview);
    elements.checkSnippetButton.addEventListener('click', checkSnippetHealth);
    [
      elements.enabled,
      elements.trackCatalog,
      elements.overlayVisible,
      elements.autoOpenOverlay,
      elements.bufferTtl,
      elements.maxEventsPerSecond,
      elements.maxBufferEvents,
      elements.baseUrl,
    ].forEach(function (element) {
      element.addEventListener('input', handleLiveUpdate);
      element.addEventListener('change', handleLiveUpdate);
    });
    elements.scenario.addEventListener('change', function () {
      settings.previewScenario = elements.scenario.value;
      persistSettings();
      syncScenarioMenu();
      updatePreview();
      updateSnippet();
    });
    elements.scenarioToggle.addEventListener('click', toggleScenarioMenu);
    elements.scenarioToggle.addEventListener('keydown', handleScenarioToggleKeydown);
    elements.scenarioOptions.addEventListener('click', handleScenarioOptionClick);
    elements.scenarioOptions.addEventListener('keydown', handleScenarioOptionsKeydown);
    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleDocumentKeydown);
    document.addEventListener('focusin', handleDocumentFocusIn);
    window.addEventListener('blur', handleWindowBlur);
  }

  function initContext() {
    var payload = null;

    if (window.EcwidApp && typeof window.EcwidApp.init === 'function') {
      hasEcwidContext = true;
      window.EcwidApp.init({
        app_id: appConfig.appId || 'accessibility-friction-overlay',
        autoloadedflag: true,
        autoheight: true,
      });

      listenForUninstall();

      // EcwidApp.getPayload() is synchronous — returns the decoded payload
      // object directly (parsed from the URL hash set by the Ecwid CP iframe).
      if (typeof window.EcwidApp.getPayload === 'function') {
        var payload = window.EcwidApp.getPayload();
      }
    }

    // Detect Ecwid context even when the SDK script fails to load (CDN
    // blocked, ad-blocker, etc.).  Being inside an iframe whose referrer
    // belongs to *.ecwid.com is a reliable signal.
    if (!hasEcwidContext) {
      var ref = String(document.referrer || '');
      if (/\.ecwid\.com\b/i.test(ref)) {
        hasEcwidContext = true;
      } else {
        try { if (window.self !== window.top) { hasEcwidContext = true; } } catch { hasEcwidContext = true; }
      }
    }

    storeId = resolveStoreId(payload);

    initializeDashboard();
  }

  function resolveStoreId(payload) {
    if (payload && payload.store_id) {
      return String(payload.store_id);
    }

    var storePattern = /\/store\/(\d+)(?:\/|$)/;

    var pathMatch = String(window.location.pathname || '').match(storePattern);
    if (pathMatch && pathMatch[1]) {
      hasEcwidContext = true;
      return pathMatch[1];
    }

    // The Ecwid CP loads this page in a cross-origin iframe.  The iframe's
    // own URL never contains /store/<id>, but document.referrer usually
    // carries the parent admin URL (e.g. https://my.ecwid.com/store/123456).
    var referrerMatch = String(document.referrer || '').match(storePattern);
    if (referrerMatch && referrerMatch[1]) {
      hasEcwidContext = true;
      return referrerMatch[1];
    }

    return '';
  }

  function initializeDashboard() {
    scenarioMenuOpen = false;
    loadSettings();
    hydrateScenarioOptions();
    hydrateForm();
    renderScenarioMenuState();
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

    elements.storeLabel.textContent = storeId || (hasEcwidContext ? 'Store context unavailable' : 'Preview mode');
  }

  function hydrateScenarioOptions() {
    var scenarios = core.getPreviewScenarios();
    elements.scenario.innerHTML = Object.keys(scenarios).map(function (slug) {
      var selected = slug === settings.previewScenario ? ' selected' : '';
      return '<option value="' + escapeHtml(slug) + '"' + selected + '>' + escapeHtml(scenarios[slug].label) + '</option>';
    }).join('');

    elements.scenarioOptions.innerHTML = Object.keys(scenarios).map(function (slug) {
      return [
        '<button type="button" class="afo-menu__option" data-scenario-value="' + escapeHtml(slug) + '">',
        escapeHtml(scenarios[slug].label),
        '</button>',
      ].join('');
    }).join('');

    syncScenarioMenu();
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
    syncScenarioMenu();
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

    if (settings.snippetBaseUrl && settings.snippetBaseUrl.indexOf('http://') === 0) {
      showStatus('Warning: The base URL uses HTTP. Production deployments must use HTTPS.', 'error');
      return;
    }

    persistSettings();
    updateSnippet();
    updatePreview();
    showStatus('Saved locally in this browser. The storefront uses the generated snippet, not a backend.', 'success');
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
    currentSnippet = snippet;

    if (elements.snippetPreview) {
      elements.snippetPreview.textContent = snippet;
    }

    resizeIframe();
  }

  function buildLoaderSnippet(snapshot) {
    var baseUrl = snapshot.snippetBaseUrl.replace(/\/$/, '');
    var assetSuffix = getAssetQuerySuffix();
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
      '<script>',
      'window.AccessibilityFrictionOverlayEcwidConfig = ' + JSON.stringify(payload, null, 2) + ';',
      '(function () {',
      '  function loadScript(src, onload) {',
      '    var s = document.createElement("script");',
      '    s.src = src;',
      '    if (onload) { s.onload = onload; }',
      '    document.head.appendChild(s);',
      '  }',
      '',
      '  var css = document.createElement("link");',
      '  css.rel = "stylesheet";',
      "  css.href = '" + baseUrl + "/src/storefront/custom-storefront.css" + assetSuffix + "';",
      '  document.head.appendChild(css);',
      '',
      "  loadScript('" + baseUrl + "/src/shared/core.js" + assetSuffix + "', function () {",
      "    loadScript('" + baseUrl + "/src/storefront/custom-storefront.js" + assetSuffix + "');",
      '  });',
      '})();',
      '</script>'
    ].join('\n');
  }

  function copySnippet() {
    var value = currentSnippet || (elements.snippetPreview && elements.snippetPreview.textContent) || '';

    if (!value) {
      showStatus('Nothing to copy yet. Wait for the loader snippet to render.', 'error');
      return;
    }

    // Try execCommand synchronously first — must happen within the user-gesture
    // tick. navigator.clipboard.writeText() is not reliable inside Ecwid's
    // iframe because Ecwid does not grant clipboard-write permission to embedded
    // apps, so any async fallback loses the user-gesture context.
    if (tryCopyExecCommand(value)) {
      showStatus('Snippet copied. Paste it into Design > Custom JavaScript.', 'success');
      return;
    }

    // Secondary: async Clipboard API for top-level secure contexts where
    // execCommand is unavailable (e.g. Firefox without user prefs).
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value)
        .then(function () {
          showStatus('Snippet copied. Paste it into Design > Custom JavaScript.', 'success');
        })
        .catch(function () {
          showStatus('Copy failed. Select the snippet text manually and copy it.', 'error');
        });
      return;
    }

    showStatus('Copy failed. Select the snippet text manually and copy it.', 'error');
  }

  function checkSnippetHealth() {
    var snapshot = readForm();
    var baseUrl = snapshot.snippetBaseUrl.replace(/\/$/, '');
    var assetSuffix = getAssetQuerySuffix();

    var assets = [
      { label: 'core.js', url: baseUrl + '/src/shared/core.js' + assetSuffix },
      { label: 'custom-storefront.js', url: baseUrl + '/src/storefront/custom-storefront.js' + assetSuffix },
      { label: 'custom-storefront.css', url: baseUrl + '/src/storefront/custom-storefront.css' + assetSuffix },
    ];

    elements.snippetHealth.hidden = false;
    elements.snippetHealthSummary.textContent = 'Checking assets…';
    elements.snippetHealthSummary.className = 'afo-health__summary is-pending';
    elements.snippetHealthDetails.innerHTML = assets.map(function (asset) {
      return [
        '<div class="afo-health__row">',
        '<span class="afo-health__icon">—</span>',
        '<span class="afo-health__label">' + escapeHtml(asset.label) + '</span>',
        '<span class="afo-health__status" style="color: var(--afo-muted);">checking</span>',
        '</div>',
      ].join('');
    }).join('');
    resizeIframe();

    var results = [];
    var completed = 0;

    assets.forEach(function (asset, index) {
      fetch(asset.url, { method: 'HEAD', mode: 'cors', cache: 'no-cache' })
        .then(function (response) {
          results[index] = { ok: response.ok, status: response.status, label: asset.label, url: asset.url };
        })
        .catch(function () {
          results[index] = { ok: false, status: 0, label: asset.label, url: asset.url };
        })
        .finally(function () {
          completed += 1;
          if (completed === assets.length) {
            renderSnippetHealthResults(results);
          }
        });
    });
  }

  function renderSnippetHealthResults(results) {
    var allOk = results.every(function (r) { return r.ok; });
    var anyOk = results.some(function (r) { return r.ok; });

    if (allOk) {
      elements.snippetHealthSummary.textContent = 'All assets reachable';
      elements.snippetHealthSummary.className = 'afo-health__summary is-ok';
    } else if (anyOk) {
      elements.snippetHealthSummary.textContent = 'Some assets unreachable';
      elements.snippetHealthSummary.className = 'afo-health__summary is-fail';
    } else {
      elements.snippetHealthSummary.textContent = 'No assets reachable — check base URL';
      elements.snippetHealthSummary.className = 'afo-health__summary is-fail';
    }

    elements.snippetHealthDetails.innerHTML = results.map(function (r) {
      var icon = r.ok ? '✓' : '✗';
      var statusClass = r.ok ? 'afo-health__status is-ok' : 'afo-health__status is-fail';
      var statusText = r.ok ? 'Reachable' : (r.status ? 'HTTP ' + r.status : 'Unreachable');

      return [
        '<div class="afo-health__row">',
        '<span class="afo-health__icon">' + icon + '</span>',
        '<span class="afo-health__label">' + escapeHtml(r.label) + '</span>',
        '<span class="' + statusClass + '">' + escapeHtml(statusText) + '</span>',
        '</div>',
      ].join('');
    }).join('');

    resizeIframe();
  }

  function handleLiveUpdate() {
    updateSnippet();
  }

  function syncScenarioMenu() {
    var selectedOption = elements.scenario.options[elements.scenario.selectedIndex] || elements.scenario.options[0];

    if (selectedOption && elements.scenarioLabel) {
      elements.scenarioLabel.textContent = selectedOption.textContent;
    }

    Array.prototype.forEach.call(elements.scenarioOptions.querySelectorAll('[data-scenario-value]'), function (button) {
      var isActive = button.getAttribute('data-scenario-value') === elements.scenario.value;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    renderScenarioMenuState();
  }

  function toggleScenarioMenu() {
    scenarioMenuOpen = !scenarioMenuOpen;
    renderScenarioMenuState();

    if (scenarioMenuOpen) {
      focusScenarioOption(elements.scenario.value, 0);
    }
  }

  function closeScenarioMenu() {
    scenarioMenuOpen = false;
    renderScenarioMenuState();
  }

  function renderScenarioMenuState() {
    elements.scenarioOptions.hidden = !scenarioMenuOpen;
    elements.scenarioToggle.setAttribute('aria-expanded', scenarioMenuOpen ? 'true' : 'false');
  }

  function handleScenarioOptionClick(event) {
    var button = event.target.closest('[data-scenario-value]');
    if (!button) {
      return;
    }

    elements.scenario.value = button.getAttribute('data-scenario-value') || settings.previewScenario;
    closeScenarioMenu();
    elements.scenario.dispatchEvent(new Event('change', { bubbles: true }));
    elements.scenarioToggle.focus();
  }

  function handleDocumentPointerDown(event) {
    if (!scenarioMenuOpen) {
      return;
    }

    if (elements.scenarioMenu.contains(event.target)) {
      return;
    }

    closeScenarioMenu();
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape' && scenarioMenuOpen) {
      closeScenarioMenu();
      elements.scenarioToggle.focus();
    }
  }

  function handleDocumentFocusIn(event) {
    if (!scenarioMenuOpen) {
      return;
    }

    if (elements.scenarioMenu.contains(event.target)) {
      return;
    }

    closeScenarioMenu();
  }

  function handleWindowBlur() {
    if (scenarioMenuOpen) {
      closeScenarioMenu();
    }
  }

  function handleScenarioToggleKeydown(event) {
    if (event.key === 'Tab' && scenarioMenuOpen) {
      closeScenarioMenu();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!scenarioMenuOpen) {
        scenarioMenuOpen = true;
        renderScenarioMenuState();
      }
      focusScenarioOption(elements.scenario.value, 0);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!scenarioMenuOpen) {
        scenarioMenuOpen = true;
        renderScenarioMenuState();
      }
      focusScenarioOption(elements.scenario.value, -1);
    }
  }

  function handleScenarioOptionsKeydown(event) {
    var buttons = getScenarioButtons();
    var currentIndex = buttons.indexOf(document.activeElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusScenarioButtonByIndex(currentIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusScenarioButtonByIndex(currentIndex - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusScenarioButtonByIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusScenarioButtonByIndex(buttons.length - 1);
      return;
    }

    if (event.key === 'Tab') {
      closeScenarioMenu();
    }
  }

  function getScenarioButtons() {
    return Array.prototype.slice.call(elements.scenarioOptions.querySelectorAll('[data-scenario-value]'));
  }

  function focusScenarioOption(value, offset) {
    var buttons = getScenarioButtons();
    var index = buttons.findIndex(function (button) {
      return button.getAttribute('data-scenario-value') === value;
    });

    if (index < 0) {
      index = 0;
    }

    if (offset > 0) {
      index = Math.min(buttons.length - 1, index + offset);
    }

    if (offset < 0) {
      index = Math.max(0, index + offset);
    }

    focusScenarioButtonByIndex(index);
  }

  function focusScenarioButtonByIndex(index) {
    var buttons = getScenarioButtons();
    if (!buttons.length) {
      return;
    }

    var safeIndex = index;
    if (safeIndex < 0) {
      safeIndex = buttons.length - 1;
    }
    if (safeIndex >= buttons.length) {
      safeIndex = 0;
    }

    buttons[safeIndex].focus();
  }

  function tryCopyExecCommand(value) {
    try {
      var textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.cssText = 'position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, value.length);
      var result = document.execCommand('copy');
      document.body.removeChild(textarea);
      return !!result;
    } catch {
      return false;
    }
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
    if (appConfig.snippetBaseUrl) {
      return appConfig.snippetBaseUrl;
    }

    var href = String(window.location.href).split('?')[0].split('#')[0];
    return href.slice(0, href.indexOf('/public/') > -1 ? href.indexOf('/public/') : href.lastIndexOf('/'));
  }

  function getAssetQuerySuffix() {
    if (!appConfig.assetVersion) {
      return '';
    }

    return '?v=' + encodeURIComponent(String(appConfig.assetVersion));
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
