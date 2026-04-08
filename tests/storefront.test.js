const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const core = require('../src/shared/core');
const storefront = require('../src/storefront/custom-storefront');

function createHarness(options = {}) {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="target">Target</div></body></html>',
    {
      url: options.url || 'https://demo.example.com/product/widget',
      pretendToBeVisual: true,
    }
  );

  const { window } = dom;
  const addedPageHandlers = [];

  window.AccessibilityFrictionOverlayEcwidCore = core;
  window.AccessibilityFrictionOverlayEcwidConfig = Object.assign({
    enabled: true,
    trackCatalog: true,
    overlayVisible: false,
    autoOpenOverlay: false,
    bufferTtl: 90,
    maxEventsPerSecond: 20,
    maxBufferEvents: 150,
    previewScenario: 'checkout-friction',
    debugToken: '',
  }, options.config || {});
  window.Ecwid = {
    OnPageLoaded: {
      add(handler) {
        addedPageHandlers.push(handler);
      },
    },
  };

  const initialized = storefront.init(window);
  const storageKey = core.buildStorageKeys(window.location.host || 'storefront').events;

  function readEvents() {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  function flush() {
    window.dispatchEvent(new window.Event('pagehide'));
  }

  return {
    dom,
    window,
    document: window.document,
    initialized,
    storageKey,
    readEvents,
    flush,
    addedPageHandlers,
  };
}

function click(window, element, x = 20, y = 10) {
  element.dispatchEvent(new window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  }));
}

test('storefront collector initializes only when enabled and dependencies exist', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://demo.example.com/shop',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  assert.equal(storefront.init(window), false);

  window.AccessibilityFrictionOverlayEcwidCore = core;
  window.AccessibilityFrictionOverlayEcwidConfig = { enabled: false };
  assert.equal(storefront.init(window), false);
});

test('storefront collector captures live dead-click events and persists them on flush', () => {
  const harness = createHarness({
    url: 'https://demo.example.com/product/widget',
  });

  const target = harness.document.getElementById('target');
  click(harness.window, target, 30, 40);
  click(harness.window, target, 30, 40);
  harness.flush();

  const events = harness.readEvents();
  assert.equal(harness.initialized, true);
  assert.equal(events.length, 2);
  assert.equal(events[0].type, 'dead_click');
  assert.equal(events[0].page, 'product');
  assert.equal(events[0].surface, 'text');
});

test('storefront collector records repeated invalid fields and recovery for real form interactions', () => {
  const harness = createHarness({
    url: 'https://demo.example.com/checkout',
  });
  const field = harness.document.createElement('input');
  field.id = 'email';
  harness.document.body.appendChild(field);

  field.dispatchEvent(new harness.window.Event('invalid', { bubbles: true, cancelable: true }));
  field.dispatchEvent(new harness.window.Event('invalid', { bubbles: true, cancelable: true }));
  field.checkValidity = function () {
    return true;
  };
  field.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
  harness.flush();

  const events = harness.readEvents();
  assert.equal(events.some((event) => event.type === 'inaccessible_form_warning'), true);
  assert.equal(events.some((event) => event.type === 'recovery' && event.details.recoveryType === 'field_valid'), true);
});

test('storefront collector ignores catalog-area clicks when catalog tracking is disabled', () => {
  const harness = createHarness({
    url: 'https://demo.example.com/shop',
    config: {
      trackCatalog: false,
    },
  });

  click(harness.window, harness.document.getElementById('target'));
  harness.flush();

  assert.deepEqual(harness.readEvents(), []);
});

test('storefront collector survives malformed stored data and still writes sanitized live events', () => {
  const harness = createHarness({
    url: 'https://demo.example.com/product/widget',
  });

  harness.window.localStorage.setItem(harness.storageKey, 'not-json');
  click(harness.window, harness.document.getElementById('target'));
  harness.flush();

  const events = harness.readEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'dead_click');
});

test('storefront collector enforces rate limits for live shopper events', () => {
  const harness = createHarness({
    url: 'https://demo.example.com/product/widget',
    config: {
      maxEventsPerSecond: 5,
    },
  });

  const target = harness.document.getElementById('target');
  click(harness.window, target);
  click(harness.window, target);
  click(harness.window, target);
  click(harness.window, target);
  click(harness.window, target);
  click(harness.window, target);
  harness.flush();

  const events = harness.readEvents();
  assert.equal(events.length, 5);
  assert.equal(events[0].type, 'dead_click');
});

test('storefront collector captures keyboard and aria issues and respects Ecwid page updates', () => {
  const harness = createHarness({
    url: 'https://demo.example.com/shop',
  });
  const button = harness.document.createElement('button');
  button.textContent = 'Continue';
  button.setAttribute('aria-describedby', 'missing-description');
  button.style.outline = 'none';
  button.style.boxShadow = 'none';
  button.style.border = '0 solid transparent';
  harness.document.body.appendChild(button);

  assert.equal(harness.addedPageHandlers.length, 1);
  harness.addedPageHandlers[0]({ type: 'CHECKOUT_PAYMENT_DETAILS' });

  button.dispatchEvent(new harness.window.KeyboardEvent('keydown', {
    bubbles: true,
    key: 'Tab',
  }));
  button.dispatchEvent(new harness.window.FocusEvent('focusin', {
    bubbles: true,
  }));
  harness.flush();

  const events = harness.readEvents();
  assert.equal(events.some((event) => event.type === 'keyboard_navigation'), true);
  assert.equal(events.some((event) => event.type === 'aria_relationship_warning'), true);
  assert.equal(events.some((event) => event.type === 'focus_visibility_issue'), true);
  assert.equal(events.every((event) => event.page === 'checkout'), true);
});