(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.AccessibilityFrictionOverlayEcwidCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_PREFIX = 'afo_ecwid_v1';
  var MAX_EVENT_DETAILS_LENGTH = 64;
  var DEFAULT_SNIPPET_BASE_URL = 'https://YOUR-STATIC-HOST';

  var ALLOWED_TYPES = {
    keyboard_navigation: true,
    focus_visibility_issue: true,
    dead_click: true,
    false_interactivity: true,
    aria_relationship_warning: true,
    keyboard_trap_risk: true,
    repeated_tab_loop: true,
    inaccessible_form_warning: true,
    recovery: true,
  };

  var ALLOWED_PAGES = {
    checkout: true,
    cart: true,
    product: true,
    shop: true,
    other: true,
  };

  var ALLOWED_SURFACES = {
    button: true,
    link: true,
    input: true,
    text: true,
    image: true,
    modal: true,
    drawer: true,
    form: true,
    navigation: true,
    generic: true,
  };

  var ALLOWED_DETAILS = {
    navigation: true,
    issue: true,
    overlay: true,
    fingerprint: true,
    field: true,
    xBucket: true,
    yBucket: true,
    loopBucket: true,
    recoveryType: true,
    countBucket: true,
  };

  var DEFAULT_SETTINGS = {
    enabled: true,
    trackCatalog: true,
    bufferTtl: 90,
    maxEventsPerSecond: 20,
    maxBufferEvents: 150,
    overlayVisible: false,
    autoOpenOverlay: false,
    previewScenario: 'checkout-friction',
    snippetBaseUrl: DEFAULT_SNIPPET_BASE_URL,
    debugToken: '',
  };

  var PREVIEW_SCENARIOS = {
    'checkout-friction': {
      label: 'Checkout Recovery Demo',
      outcome: 'Best for revenue reviews and final-step checkout QA.',
      events: [
        createSeed('dead_click', 'checkout', 'button', {
          issue: 'cta_not_responding',
          fingerprint: 'checkout_primary_action',
          xBucket: '60',
          yBucket: '42',
        }),
        createSeed('focus_visibility_issue', 'checkout', 'input', {
          issue: 'missing_focus_indicator',
          fingerprint: 'billing_email',
        }),
        createSeed('inaccessible_form_warning', 'checkout', 'input', {
          field: 'input',
          issue: 'repeated_invalid',
          fingerprint: 'postcode_field',
        }),
        createSeed('aria_relationship_warning', 'checkout', 'form', {
          issue: 'describedby_missing',
          fingerprint: 'payment_section',
        }),
        createSeed('keyboard_trap_risk', 'checkout', 'modal', {
          overlay: 'shipping_modal',
          fingerprint: 'shipping_modal',
        }),
        createSeed('recovery', 'checkout', 'modal', {
          recoveryType: 'escape_released',
          fingerprint: 'shipping_modal',
        }),
      ],
    },
    'keyboard-audit': {
      label: 'Keyboard Navigation Audit',
      outcome: 'Best for accessibility walkthroughs focused on focus flow and overlay behavior.',
      events: [
        createSeed('keyboard_navigation', 'cart', 'navigation', {
          navigation: 'tab',
          overlay: 'cart_drawer',
        }),
        createSeed('focus_visibility_issue', 'cart', 'link', {
          issue: 'missing_focus_indicator',
          fingerprint: 'cart_drawer_link',
        }),
        createSeed('repeated_tab_loop', 'cart', 'drawer', {
          overlay: 'cart_drawer',
          loopBucket: 'tight',
          fingerprint: 'cart_drawer_loop',
        }),
        createSeed('keyboard_trap_risk', 'cart', 'modal', {
          overlay: 'mini_cart',
          fingerprint: 'mini_cart_overlay',
        }),
        createSeed('aria_relationship_warning', 'cart', 'navigation', {
          issue: 'controls_missing',
          fingerprint: 'drawer_toggle',
        }),
        createSeed('recovery', 'cart', 'drawer', {
          recoveryType: 'focus_restored',
          fingerprint: 'cart_drawer_loop',
        }),
      ],
    },
    'catalog-walkthrough': {
      label: 'Catalog Browse Walkthrough',
      outcome: 'Best for product-detail reviews and merchandising QA.',
      events: [
        createSeed('false_interactivity', 'product', 'image', {
          issue: 'gallery_tile_looks_clickable',
          fingerprint: 'product_gallery_tile',
          countBucket: '3+',
        }),
        createSeed('dead_click', 'shop', 'image', {
          issue: 'promo_tile_not_linked',
          fingerprint: 'featured_promo_tile',
          xBucket: '31',
          yBucket: '24',
        }),
        createSeed('aria_relationship_warning', 'product', 'form', {
          issue: 'describedby_missing',
          fingerprint: 'variation_form',
        }),
        createSeed('focus_visibility_issue', 'product', 'button', {
          issue: 'missing_focus_indicator',
          fingerprint: 'add_to_cart_button',
        }),
        createSeed('inaccessible_form_warning', 'product', 'input', {
          field: 'input',
          issue: 'option_required',
          fingerprint: 'variation_selector',
        }),
        createSeed('recovery', 'product', 'form', {
          recoveryType: 'option_selected',
          fingerprint: 'variation_selector',
        }),
      ],
    },
    'payment-failure': {
      label: 'Payment Failure Drill',
      outcome: 'Best for payment incident reviews and last-step conversion triage.',
      events: [
        createSeed('inaccessible_form_warning', 'checkout', 'form', {
          field: 'input',
          issue: 'payment_error_not_announced',
          fingerprint: 'payment_form',
        }),
        createSeed('focus_visibility_issue', 'checkout', 'button', {
          issue: 'retry_button_no_focus_state',
          fingerprint: 'retry_payment',
        }),
        createSeed('aria_relationship_warning', 'checkout', 'form', {
          issue: 'error_summary_missing',
          fingerprint: 'payment_error_summary',
        }),
        createSeed('dead_click', 'checkout', 'button', {
          issue: 'retry_cta_stalled',
          fingerprint: 'retry_payment',
          xBucket: '57',
          yBucket: '67',
        }),
        createSeed('keyboard_trap_risk', 'checkout', 'modal', {
          overlay: 'payment_sheet',
          fingerprint: 'payment_sheet',
        }),
        createSeed('recovery', 'checkout', 'form', {
          recoveryType: 'payment_method_swapped',
          fingerprint: 'payment_form',
        }),
      ],
    },
  };

  function createSeed(type, page, surface, details) {
    return {
      type: type,
      page: page,
      surface: surface,
      details: details || {},
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowInSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value === 'true' || value === '1' || value === 'yes') {
        return true;
      }

      if (value === 'false' || value === '0' || value === 'no') {
        return false;
      }
    }

    return fallback;
  }

  function normalizeInteger(value, fallback, minimum, maximum) {
    var parsed = parseInt(value, 10);

    if (!isFinite(parsed)) {
      return fallback;
    }

    if (parsed < minimum) {
      return minimum;
    }

    if (parsed > maximum) {
      return maximum;
    }

    return parsed;
  }

  function normalizeText(value, fallback) {
    if (typeof value !== 'string') {
      return fallback;
    }

    var trimmed = value.trim();
    return trimmed ? trimmed : fallback;
  }

  function getDefaultSettings() {
    return clone(DEFAULT_SETTINGS);
  }

  function normalizeSettings(input) {
    var source = input || {};
    var previewScenario = normalizeText(source.previewScenario, DEFAULT_SETTINGS.previewScenario);

    if (!PREVIEW_SCENARIOS[previewScenario]) {
      previewScenario = DEFAULT_SETTINGS.previewScenario;
    }

    return {
      enabled: normalizeBoolean(source.enabled, DEFAULT_SETTINGS.enabled),
      trackCatalog: normalizeBoolean(source.trackCatalog, DEFAULT_SETTINGS.trackCatalog),
      bufferTtl: normalizeInteger(source.bufferTtl, DEFAULT_SETTINGS.bufferTtl, 30, 300),
      maxEventsPerSecond: normalizeInteger(source.maxEventsPerSecond, DEFAULT_SETTINGS.maxEventsPerSecond, 5, 50),
      maxBufferEvents: normalizeInteger(source.maxBufferEvents, DEFAULT_SETTINGS.maxBufferEvents, 25, 500),
      overlayVisible: normalizeBoolean(source.overlayVisible, DEFAULT_SETTINGS.overlayVisible),
      autoOpenOverlay: normalizeBoolean(source.autoOpenOverlay, DEFAULT_SETTINGS.autoOpenOverlay),
      previewScenario: previewScenario,
      snippetBaseUrl: normalizeText(source.snippetBaseUrl, DEFAULT_SETTINGS.snippetBaseUrl),
      debugToken: normalizeText(source.debugToken, DEFAULT_SETTINGS.debugToken),
    };
  }

  function buildStorageKeys(storeId) {
    var normalizedStoreId = normalizeText(String(storeId || 'default'), 'default').replace(/[^a-zA-Z0-9_-]/g, '_');

    return {
      settings: STORAGE_PREFIX + '_settings_' + normalizedStoreId,
      events: STORAGE_PREFIX + '_events_' + normalizedStoreId,
    };
  }

  function getPreviewScenarios() {
    return clone(PREVIEW_SCENARIOS);
  }

  function createPreviewEvents(slug, currentTime) {
    var scenario = PREVIEW_SCENARIOS[slug] || PREVIEW_SCENARIOS[DEFAULT_SETTINGS.previewScenario];
    var timestamp = typeof currentTime === 'number' ? currentTime : nowInSeconds();

    return scenario.events.map(function (event, index) {
      return {
        id: 'preview-' + slug + '-' + index + '-' + timestamp,
        type: event.type,
        page: event.page,
        surface: event.surface,
        details: clone(event.details || {}),
        occurredAt: timestamp - ((scenario.events.length - index - 1) * 7),
        isPreview: true,
      };
    });
  }

  function sanitizeKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  function sanitizeText(value) {
    return String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_EVENT_DETAILS_LENGTH);
  }

  function sanitizeEvent(event, currentTime) {
    if (!event || typeof event !== 'object') {
      return null;
    }

    var type = sanitizeKey(event.type);
    if (!ALLOWED_TYPES[type]) {
      return null;
    }

    var page = sanitizeKey(event.page) || 'other';
    var surface = sanitizeKey(event.surface) || 'generic';
    var details = {};
    var key;

    if (!ALLOWED_PAGES[page]) {
      page = 'other';
    }

    if (!ALLOWED_SURFACES[surface]) {
      surface = 'generic';
    }

    if (event.details && typeof event.details === 'object') {
      for (key in event.details) {
        if (ALLOWED_DETAILS[key]) {
          details[key] = sanitizeText(event.details[key]);
        }
      }
    }

    return {
      id: sanitizeText(event.id) || generateIdentifier(),
      type: type,
      page: page,
      surface: surface,
      details: details,
      occurredAt: typeof event.occurredAt === 'number' ? event.occurredAt : (typeof currentTime === 'number' ? currentTime : nowInSeconds()),
      isPreview: Boolean(event.isPreview),
    };
  }

  function sanitizeBatch(events, currentTime, maximumEvents) {
    if (!Array.isArray(events)) {
      return [];
    }

    var sanitized = [];
    var limit = typeof maximumEvents === 'number' ? maximumEvents : 10;

    events.some(function (event) {
      var safeEvent = sanitizeEvent(event, currentTime);
      if (safeEvent) {
        sanitized.push(safeEvent);
      }

      return sanitized.length >= limit;
    });

    return sanitized;
  }

  function pruneEvents(events, currentTime, ttl, maxEvents) {
    var now = typeof currentTime === 'number' ? currentTime : nowInSeconds();
    var minimumTimestamp = now - ttl;
    var filtered = (Array.isArray(events) ? events : []).filter(function (event) {
      return event && typeof event.occurredAt === 'number' && event.occurredAt >= minimumTimestamp;
    });

    filtered.sort(function (left, right) {
      return Number(left.occurredAt || 0) - Number(right.occurredAt || 0);
    });

    if (filtered.length > maxEvents) {
      filtered = filtered.slice(filtered.length - maxEvents);
    }

    return filtered;
  }

  function appendEvents(existingEvents, incomingEvents, settings, currentTime) {
    var merged = (Array.isArray(existingEvents) ? existingEvents.slice() : []).concat(Array.isArray(incomingEvents) ? incomingEvents : []);
    var normalizedSettings = normalizeSettings(settings);

    return pruneEvents(merged, currentTime, normalizedSettings.bufferTtl, normalizedSettings.maxBufferEvents);
  }

  function buildSummary(events) {
    var source = Array.isArray(events) ? events : [];
    var countsByType = {};
    var countsByPage = {};
    var hotspots = {};

    source.forEach(function (event) {
      if (!event) {
        return;
      }

      var type = event.type || 'unknown';
      var page = event.page || 'other';
      var surface = event.surface || 'generic';
      var hotspotKey = page + ':' + surface;

      countsByType[type] = (countsByType[type] || 0) + 1;
      countsByPage[page] = (countsByPage[page] || 0) + 1;
      hotspots[hotspotKey] = (hotspots[hotspotKey] || 0) + 1;
    });

    return {
      total: source.length,
      countsByType: countsByType,
      countsByPage: countsByPage,
      hotspots: Object.keys(hotspots)
        .map(function (label) {
          return { label: label, count: hotspots[label] };
        })
        .sort(function (left, right) {
          return right.count - left.count;
        })
        .slice(0, 6),
    };
  }

  function buildRecommendations(summary) {
    var snapshot = summary || { total: 0, countsByType: {} };
    var counts = snapshot.countsByType || {};
    var recommendations = [];

    if (!snapshot.total) {
      return [
        {
          tone: 'note',
          title: 'No live friction yet',
          body: 'Start a preview scenario to see sample data here, or open your live storefront with the debug token URL to capture real accessibility events in the storefront overlay.',
          action: 'Run a preview drill here or browse your storefront to collect live data.',
        },
      ];
    }

    if (counts.keyboard_trap_risk || counts.repeated_tab_loop) {
      recommendations.push({
        tone: 'critical',
        title: 'Audit overlays first',
        body: 'Dialog and drawer behavior is the highest-risk pattern in this snapshot. Trap loops and broken escape behavior block checkout recovery.',
        action: 'Verify focus entry, tab order, and Escape close behavior for every modal and cart drawer.',
      });
    }

    if (counts.inaccessible_form_warning || counts.aria_relationship_warning) {
      recommendations.push({
        tone: 'warning',
        title: 'Tighten field messaging',
        body: 'Missing labels and broken ARIA references make correction steps harder right where conversion depends on form completion.',
        action: 'Review labels, described-by targets, and error announcement patterns on form controls.',
      });
    }

    if (counts.false_interactivity || counts.dead_click) {
      recommendations.push({
        tone: 'note',
        title: 'Remove misleading affordances',
        body: 'People are being invited to click surfaces that do not respond or do not behave as they appear to behave.',
        action: 'Align visual affordances with working links, buttons, and product-media interactions.',
      });
    }

    if (counts.focus_visibility_issue && recommendations.length < 3) {
      recommendations.push({
        tone: 'note',
        title: 'Restore visible focus',
        body: 'Keyboard progress becomes expensive when active focus is hard to detect across buttons, links, and cart controls.',
        action: 'Add a clear outline or contrast-safe focus treatment to interactive elements.',
      });
    }

    return recommendations.slice(0, 3);
  }

  function humanize(value) {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/(^|\s)\S/g, function (match) {
        return match.toUpperCase();
      });
  }

  function generateIdentifier() {
    return 'afo-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
  }

  function generateDebugToken() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.prototype.map.call(bytes, function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    }
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  return {
    DEFAULT_SNIPPET_BASE_URL: DEFAULT_SNIPPET_BASE_URL,
    appendEvents: appendEvents,
    buildRecommendations: buildRecommendations,
    buildStorageKeys: buildStorageKeys,
    buildSummary: buildSummary,
    createPreviewEvents: createPreviewEvents,
    generateDebugToken: generateDebugToken,
    generateIdentifier: generateIdentifier,
    getDefaultSettings: getDefaultSettings,
    getPreviewScenarios: getPreviewScenarios,
    humanize: humanize,
    normalizeSettings: normalizeSettings,
    nowInSeconds: nowInSeconds,
    pruneEvents: pruneEvents,
    sanitizeBatch: sanitizeBatch,
    sanitizeEvent: sanitizeEvent,
  };
});