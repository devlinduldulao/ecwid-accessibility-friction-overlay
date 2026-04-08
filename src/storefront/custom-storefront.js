/**
 * Static Ecwid storefront tracker for Accessibility Friction Overlay.
 *
 * Events stay in the local browser used for merchant walkthroughs. There is no
 * server, database, Redis cache, or webhook dependency in this implementation.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  var storefront = factory();
  root.AccessibilityFrictionOverlayEcwidStorefront = storefront;
  storefront.init(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var _destroy = null;

  function init(windowObject) {
    var window = windowObject;
    var document = window && window.document;
    var HTMLElement = window && window.HTMLElement;
    var URLSearchParams = window && window.URLSearchParams;
    var core = window && window.AccessibilityFrictionOverlayEcwidCore;
    var suppliedConfig = window && window.AccessibilityFrictionOverlayEcwidConfig || {};
    var config = core ? core.normalizeSettings(suppliedConfig) : null;

    if (!window || !document || !HTMLElement || !URLSearchParams || !core || !config || !config.enabled) {
      return false;
    }

  var interactiveSelector = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    'summary',
    'label[for]',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="tab"]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');

  var pageTypeMap = {
    CATEGORY: 'shop',
    PRODUCT: 'product',
    CART: 'cart',
    SEARCH: 'shop',
    ORDER_CONFIRMATION: 'checkout',
    CHECKOUT_PAYMENT_DETAILS: 'checkout',
    CHECKOUT_SHIPPING_DETAILS: 'checkout',
    CHECKOUT_PICKUP_DETAILS: 'checkout',
  };

  var storageKey = core.buildStorageKeys(window.location.host || 'storefront').events;
  var state = {
    currentPageType: detectPageTypeFromLocation(),
    queue: [],
    flushTimer: null,
    keyboardMode: false,
    issueCooldowns: new Map(),
    deadClickMap: new Map(),
    invalidFieldMap: new Map(),
    overlayCycles: new Map(),
    rateWindowSecond: 0,
    rateWindowCount: 0,
    overlayOpen: Boolean(config.autoOpenOverlay || hasDebugFlag()),
    overlayRoot: null,
  };

  bindListeners();
  hydrateOverlay();
  refreshOverlay();
  runPreviewScenarioIfRequested();

    if (window.Ecwid && window.Ecwid.OnPageLoaded && window.Ecwid.OnPageLoaded.add) {
      window.Ecwid.OnPageLoaded.add(function (page) {
      state.currentPageType = mapEcwidPage(page && page.type);
      window.setTimeout(refreshOverlay, 350);
      });
    }

  function bindListeners() {
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('invalid', handleInvalid, true);
    document.addEventListener('input', handleFieldRecovery, true);
    document.addEventListener('change', handleFieldRecovery, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushQueue, { capture: true });
  }

  function handleKeydown(event) {
    if (event.altKey && event.shiftKey && String(event.key).toLowerCase() === 'f') {
      toggleOverlay();
      return;
    }

    if (event.key !== 'Tab' && event.key !== 'Escape') {
      return;
    }

    state.keyboardMode = true;

    queueEvent('keyboard_navigation', detectSurface(document.activeElement || event.target), {
      navigation: event.key === 'Escape' ? 'escape' : (event.shiftKey ? 'shift_tab' : 'tab'),
      overlay: detectOverlayType(document.activeElement || event.target),
    });

    if (event.key === 'Tab') {
      trackOverlayCycle(document.activeElement || event.target);
    }

    if (event.key === 'Escape') {
      trackEscapeRecovery(document.activeElement || event.target);
    }
  }

  function handleFocusIn(event) {
    var element = event.target instanceof HTMLElement ? event.target : null;
    if (!element) {
      return;
    }

    detectAriaMismatch(element);
    detectUnlabelledField(element);

    if (state.keyboardMode) {
      detectMissingFocusIndicator(element);
    }
  }

  function handleClick(event) {
    var target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) {
      return;
    }

    if (!config.trackCatalog && state.currentPageType === 'shop') {
      return;
    }

    var interactiveElement = target.closest(interactiveSelector);
    if (interactiveElement) {
      return;
    }

    var fingerprint = getFingerprint(target);
    var now = Date.now();
    var existing = state.deadClickMap.get(fingerprint) || [];
    var recent = existing.filter(function (value) {
      return (now - value) <= 10000;
    });

    recent.push(now);
    state.deadClickMap.set(fingerprint, recent);

    queueEvent('dead_click', detectSurface(target), {
      fingerprint: fingerprint,
      xBucket: bucketPercent(event.clientX, window.innerWidth),
      yBucket: bucketPercent(event.clientY, window.innerHeight),
    });

    if (recent.length >= 3) {
      queueIssueOnce('false_interactivity', target, {
        fingerprint: fingerprint,
        countBucket: '3+',
      });
      state.deadClickMap.set(fingerprint, []);
    }
  }

  function handleInvalid(event) {
    var field = event.target instanceof HTMLElement ? event.target : null;
    if (!field) {
      return;
    }

    var fingerprint = getFingerprint(field);
    var attempts = (state.invalidFieldMap.get(fingerprint) || 0) + 1;
    state.invalidFieldMap.set(fingerprint, attempts);

    if (attempts >= 2) {
      queueIssueOnce('inaccessible_form_warning', field, {
        fingerprint: fingerprint,
        field: detectSurface(field),
        issue: 'repeated_invalid',
      });
    }
  }

  function handleFieldRecovery(event) {
    var field = event.target instanceof HTMLElement ? event.target : null;
    if (!field) {
      return;
    }

    var fingerprint = getFingerprint(field);
    if (!state.invalidFieldMap.has(fingerprint)) {
      return;
    }

    if (isFieldValid(field)) {
      state.invalidFieldMap.delete(fingerprint);
      queueEvent('recovery', detectSurface(field), {
        recoveryType: 'field_valid',
        fingerprint: fingerprint,
      });
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      flushQueue();
    }
  }

  function trackOverlayCycle(source) {
    var overlay = getOverlayElement(source);
    if (!overlay) {
      return;
    }

    var overlayKey = getFingerprint(overlay);
    var focusFingerprint = getFingerprint(document.activeElement || source);
    var cycle = state.overlayCycles.get(overlayKey) || [];

    cycle.push(focusFingerprint);

    while (cycle.length > 8) {
      cycle.shift();
    }

    state.overlayCycles.set(overlayKey, cycle);

    if (cycle.length >= 6 && new Set(cycle.slice(-6)).size <= 3) {
      queueIssueOnce('repeated_tab_loop', overlay, {
        overlay: detectOverlayType(overlay),
        loopBucket: 'tight',
        fingerprint: overlayKey,
      });
    }
  }

  function trackEscapeRecovery(source) {
    var overlay = getOverlayElement(source);
    if (!overlay) {
      return;
    }

    var overlayKey = getFingerprint(overlay);
    window.setTimeout(function () {
      if (document.body.contains(overlay) && overlay.contains(document.activeElement)) {
        queueIssueOnce('keyboard_trap_risk', overlay, {
          overlay: detectOverlayType(overlay),
          fingerprint: overlayKey,
        });
        return;
      }

      queueEvent('recovery', detectSurface(overlay), {
        recoveryType: 'escape_released',
        fingerprint: overlayKey,
      });
    }, 160);
  }

  function detectMissingFocusIndicator(element) {
    var style = window.getComputedStyle(element);
    var hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0;
    var hasShadow = style.boxShadow && style.boxShadow !== 'none';
    var hasAccentBorder = style.borderStyle !== 'none' && parseFloat(style.borderWidth || '0') >= 2;

    if (hasOutline || hasShadow || hasAccentBorder) {
      return;
    }

    queueIssueOnce('focus_visibility_issue', element, {
      issue: 'missing_focus_indicator',
      fingerprint: getFingerprint(element),
    });
  }

  function detectAriaMismatch(element) {
    ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns'].forEach(function (attribute) {
      var value = element.getAttribute(attribute);
      if (!value) {
        return;
      }

      var missing = value.split(/\s+/).filter(function (id) {
        return id && !document.getElementById(id);
      });

      if (!missing.length) {
        return;
      }

      queueIssueOnce('aria_relationship_warning', element, {
        issue: attribute.replace('aria-', '') + '_missing',
        fingerprint: getFingerprint(element),
      });
    });
  }

  function detectUnlabelledField(element) {
    if (!isFormField(element)) {
      return;
    }

    var hasAriaLabel = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
    var hasWrappedLabel = Boolean(element.closest('label'));
    var hasForLabel = Boolean(element.id && document.querySelector('label[for="' + escapeSelector(element.id) + '"]'));

    if (hasAriaLabel || hasWrappedLabel || hasForLabel) {
      return;
    }

    queueIssueOnce('inaccessible_form_warning', element, {
      issue: 'missing_label',
      fingerprint: getFingerprint(element),
      field: detectSurface(element),
    });
  }

  function queueIssueOnce(type, element, details) {
    var issue = details.issue || details.recoveryType || details.overlay || 'general';
    var fingerprint = details.fingerprint || getFingerprint(element);
    var key = [type, issue, fingerprint].join(':');
    var now = Date.now();
    var lastSeen = state.issueCooldowns.get(key) || 0;

    if ((now - lastSeen) < 30000) {
      return;
    }

    state.issueCooldowns.set(key, now);
    queueEvent(type, detectSurface(element), details);
  }

  function queueEvent(type, surface, details) {
    if (isRateLimited()) {
      return;
    }

    state.queue.push({
      type: type,
      page: state.currentPageType,
      surface: surface || 'generic',
      details: details || {},
    });

    if (state.queue.length >= 5) {
      flushQueue();
      return;
    }

    if (!state.flushTimer) {
      state.flushTimer = window.setTimeout(flushQueue, 1500);
    }
  }

  function flushQueue() {
    if (!state.queue.length) {
      return;
    }

    window.clearTimeout(state.flushTimer);
    state.flushTimer = null;

    var now = core.nowInSeconds();
    var batch = core.sanitizeBatch(state.queue.splice(0, state.queue.length), now, 10);
    if (!batch.length) {
      return;
    }

    saveEvents(core.appendEvents(readEvents(), batch, config, now));
    refreshOverlay();
  }

  function isRateLimited() {
    var currentSecond = core.nowInSeconds();

    if (state.rateWindowSecond !== currentSecond) {
      state.rateWindowSecond = currentSecond;
      state.rateWindowCount = 0;
    }

    state.rateWindowCount += 1;
    return state.rateWindowCount > config.maxEventsPerSecond;
  }

  function readEvents() {
    try {
      var raw = window.localStorage.getItem(storageKey);
      var parsed = raw ? JSON.parse(raw) : [];
      return core.pruneEvents(parsed, core.nowInSeconds(), config.bufferTtl, config.maxBufferEvents);
    } catch {
      return [];
    }
  }

  function saveEvents(events) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(events));
    } catch {
      return;
    }
  }

  function clearEvents() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      return;
    }
  }

  function hydrateOverlay() {
    if (!config.overlayVisible && !hasDebugFlag()) {
      return;
    }

    if (document.getElementById('afo-ecwid-overlay')) {
      state.overlayRoot = document.getElementById('afo-ecwid-overlay');
      return;
    }

    var root = document.createElement('aside');
    root.id = 'afo-ecwid-overlay';
    root.className = 'afo-ecwid-overlay';
    root.innerHTML = [
      '<button type="button" class="afo-ecwid-overlay__toggle" aria-expanded="false">Accessibility Friction Overlay</button>',
      '<div class="afo-ecwid-overlay__panel" hidden>',
      '<div class="afo-ecwid-overlay__header">',
      '<div>',
      '<p class="afo-ecwid-overlay__eyebrow">Merchant Debug Panel</p>',
      '<h2>Current QA Session</h2>',
      '</div>',
      '<button type="button" class="afo-ecwid-overlay__clear">Clear</button>',
      '</div>',
      '<div class="afo-ecwid-overlay__metrics"></div>',
      '<div class="afo-ecwid-overlay__recommendations"></div>',
      '<div class="afo-ecwid-overlay__feed"></div>',
      '<p class="afo-ecwid-overlay__hint">Press Alt+Shift+F to open or close this panel.</p>',
      '</div>',
    ].join('');

    document.body.appendChild(root);
    state.overlayRoot = root;

    root.querySelector('.afo-ecwid-overlay__toggle').addEventListener('click', toggleOverlay);
    root.querySelector('.afo-ecwid-overlay__clear').addEventListener('click', function () {
      clearEvents();
      refreshOverlay();
    });

    applyOverlayState();
  }

  function toggleOverlay() {
    if (!state.overlayRoot) {
      hydrateOverlay();
    }

    state.overlayOpen = !state.overlayOpen;
    applyOverlayState();
    refreshOverlay();
  }

  function applyOverlayState() {
    if (!state.overlayRoot) {
      return;
    }

    state.overlayRoot.classList.toggle('is-open', state.overlayOpen);
    state.overlayRoot.querySelector('.afo-ecwid-overlay__toggle').setAttribute('aria-expanded', state.overlayOpen ? 'true' : 'false');
    state.overlayRoot.querySelector('.afo-ecwid-overlay__panel').hidden = !state.overlayOpen;
  }

  function refreshOverlay() {
    if (!state.overlayRoot || !state.overlayOpen) {
      return;
    }

    var events = readEvents().sort(function (left, right) {
      return Number(right.occurredAt || 0) - Number(left.occurredAt || 0);
    });
    var summary = core.buildSummary(events);
    var recommendations = core.buildRecommendations(summary);
    var metricsRoot = state.overlayRoot.querySelector('.afo-ecwid-overlay__metrics');
    var recommendationsRoot = state.overlayRoot.querySelector('.afo-ecwid-overlay__recommendations');
    var feedRoot = state.overlayRoot.querySelector('.afo-ecwid-overlay__feed');

    metricsRoot.innerHTML = [
      metricCard('Active Warnings', summary.total),
      metricCard('Keyboard Trap Risk', summary.countsByType.keyboard_trap_risk || 0),
      metricCard('False Interactivity', summary.countsByType.false_interactivity || 0),
      metricCard('Focus Visibility', summary.countsByType.focus_visibility_issue || 0),
    ].join('');

    recommendationsRoot.innerHTML = recommendations.map(function (recommendation) {
      return [
        '<article class="afo-ecwid-overlay__recommendation">',
        '<strong>' + escapeHtml(recommendation.title) + '</strong>',
        '<p>' + escapeHtml(recommendation.action) + '</p>',
        '</article>',
      ].join('');
    }).join('');

    if (!events.length) {
      feedRoot.innerHTML = '<p class="afo-ecwid-overlay__empty">No merchant QA events in this browser session yet.</p>';
      return;
    }

    feedRoot.innerHTML = events.slice(0, 8).map(function (event) {
      var details = event.details || {};
      var issue = details.issue || details.recoveryType || details.overlay || 'general';

      return [
        '<article class="afo-ecwid-overlay__event">',
        '<header><strong>' + escapeHtml(core.humanize(event.type)) + '</strong><span>' + escapeHtml(formatTime(event.occurredAt)) + '</span></header>',
        '<p>' + escapeHtml(core.humanize(event.page) + ' / ' + core.humanize(event.surface) + ' / ' + core.humanize(issue)) + '</p>',
        '</article>',
      ].join('');
    }).join('');
  }

  function metricCard(label, value) {
    return [
      '<div class="afo-ecwid-overlay__metric">',
      '<span>' + escapeHtml(label) + '</span>',
      '<strong>' + escapeHtml(String(value)) + '</strong>',
      '</div>',
    ].join('');
  }

  function runPreviewScenarioIfRequested() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('afo_preview');

    if (!slug) {
      return;
    }

    saveEvents(core.appendEvents(readEvents(), core.createPreviewEvents(slug, core.nowInSeconds()), config, core.nowInSeconds()));
    state.overlayOpen = true;
    applyOverlayState();
    refreshOverlay();
  }

  function detectSurface(element) {
    if (!(element instanceof HTMLElement)) {
      return 'generic';
    }

    var tagName = element.tagName.toLowerCase();
    var role = (element.getAttribute('role') || '').toLowerCase();

    if (tagName === 'button' || role === 'button') {
      return 'button';
    }

    if (tagName === 'a' || role === 'link') {
      return 'link';
    }

    if (isFormField(element)) {
      return 'input';
    }

    if (getOverlayElement(element)) {
      return detectOverlayType(element);
    }

    if (tagName === 'img' || tagName === 'svg') {
      return 'image';
    }

    if (tagName === 'nav' || tagName === 'menu' || role === 'navigation') {
      return 'navigation';
    }

    if (tagName === 'form') {
      return 'form';
    }

    return ['p', 'span', 'div', 'strong', 'em', 'h1', 'h2', 'h3', 'h4'].indexOf(tagName) !== -1 ? 'text' : 'generic';
  }

  function getOverlayElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    return element.closest('[role="dialog"],[aria-modal="true"],.ec-modal,.ec-popup,.modal,.drawer,[data-overlay]');
  }

  function detectOverlayType(element) {
    var overlay = getOverlayElement(element);
    if (!overlay) {
      return 'generic';
    }

    if (overlay.matches('.drawer,[data-overlay="drawer"]')) {
      return 'drawer';
    }

    return 'modal';
  }

  function getFingerprint(element) {
    if (!(element instanceof HTMLElement)) {
      return 'unknown';
    }

    var parts = [];
    var current = element;
    var depth = 0;

    while (current && depth < 3) {
      var tagName = current.tagName.toLowerCase();
      var role = current.getAttribute('role');
      var identifier = current.id ? '#' + current.id : '';
      var className = current.className && typeof current.className === 'string'
        ? '.' + current.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';

      parts.push(tagName + identifier + className + (role ? '[role=' + role + ']' : ''));
      current = current.parentElement;
      depth += 1;
    }

    return parts.join('>');
  }

  function bucketPercent(value, total) {
    if (!total) {
      return '0';
    }

    return String(Math.max(0, Math.min(100, Math.round((value / total) * 100))));
  }

  function isFormField(element) {
    return element instanceof HTMLElement && ['input', 'select', 'textarea'].indexOf(element.tagName.toLowerCase()) !== -1;
  }

  function isFieldValid(field) {
    if (typeof field.checkValidity === 'function') {
      return field.checkValidity();
    }

    return true;
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }

    return String(value).replace(/([ #;?%&,.+*~\':"!^$\[\]()=>|/@])/g, '\\$1');
  }

  function mapEcwidPage(type) {
    return pageTypeMap[type] || detectPageTypeFromLocation();
  }

  function detectPageTypeFromLocation() {
    var url = String(window.location.href).toLowerCase();

    if (url.indexOf('cart') !== -1 || url.indexOf('bag') !== -1) {
      return 'cart';
    }

    if (url.indexOf('checkout') !== -1 || url.indexOf('order') !== -1) {
      return 'checkout';
    }

    if (url.indexOf('product') !== -1) {
      return 'product';
    }

    return 'shop';
  }

  function hasDebugFlag() {
    if (!config.debugToken) { return false; }
    var params = new URLSearchParams(window.location.search);
    return params.get('afo_debug') === config.debugToken;
  }

  function formatTime(timestamp) {
    if (!timestamp) {
      return 'just now';
    }

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
    _destroy = function () {
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('invalid', handleInvalid, true);
      document.removeEventListener('input', handleFieldRecovery, true);
      document.removeEventListener('change', handleFieldRecovery, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushQueue, { capture: true });

      flushQueue();

      if (state.overlayRoot && state.overlayRoot.parentNode) {
        state.overlayRoot.parentNode.removeChild(state.overlayRoot);
        state.overlayRoot = null;
      }

      state.queue = [];
      state.issueCooldowns.clear();
      state.deadClickMap.clear();
      state.invalidFieldMap.clear();
      state.overlayCycles.clear();
      _destroy = null;
    };

    return true;
  }

  function destroy() {
    if (typeof _destroy === 'function') {
      _destroy();
    }
  }

  return {
    init: init,
    destroy: destroy,
  };
});
