const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../src/shared/core');

test('getDefaultSettings returns a fresh clone', () => {
  const first = core.getDefaultSettings();
  const second = core.getDefaultSettings();

  first.enabled = false;
  first.previewScenario = 'catalog-walkthrough';

  assert.equal(second.enabled, true);
  assert.equal(second.previewScenario, 'checkout-friction');
});

test('normalizeSettings clamps values, preserves booleans, and falls back for invalid inputs', () => {
  const settings = core.normalizeSettings({
    enabled: 'yes',
    trackCatalog: 'no',
    bufferTtl: 5,
    maxEventsPerSecond: 99,
    maxBufferEvents: 10,
    overlayVisible: false,
    autoOpenOverlay: true,
    previewScenario: 'does-not-exist',
    snippetBaseUrl: '   ',
  });

  assert.equal(settings.enabled, true);
  assert.equal(settings.trackCatalog, false);
  assert.equal(settings.bufferTtl, 30);
  assert.equal(settings.maxEventsPerSecond, 50);
  assert.equal(settings.maxBufferEvents, 25);
  assert.equal(settings.overlayVisible, false);
  assert.equal(settings.autoOpenOverlay, true);
  assert.equal(settings.previewScenario, 'checkout-friction');
  assert.equal(settings.snippetBaseUrl, core.DEFAULT_SNIPPET_BASE_URL);
});

test('buildStorageKeys sanitizes store ids for local storage usage', () => {
  const keys = core.buildStorageKeys('Store #123 / Demo');

  assert.equal(keys.settings, 'afo_ecwid_v1_settings_Store__123___Demo');
  assert.equal(keys.events, 'afo_ecwid_v1_events_Store__123___Demo');
});

test('getPreviewScenarios returns a clone of preview metadata', () => {
  const scenarios = core.getPreviewScenarios();
  scenarios['checkout-friction'].label = 'Mutated';

  const fresh = core.getPreviewScenarios();
  assert.equal(fresh['checkout-friction'].label, 'Checkout Recovery Demo');
});

test('sanitizeEvent rejects invalid payloads and unknown event types', () => {
  assert.equal(core.sanitizeEvent(null, 1700000000), null);
  assert.equal(core.sanitizeEvent({ type: 'unknown_type' }, 1700000000), null);
});

test('sanitizeEvent strips html, drops unknown details, and normalizes unsupported page and surface', () => {
  const safeEvent = core.sanitizeEvent({
    type: 'dead_click',
    page: 'Checkout<script>',
    surface: 'floating-panel',
    details: {
      issue: '<b>cta_not_responding</b>',
      overlay: '  shipping_modal  ',
      attack: 'should_not_survive',
    },
  }, 1700000000);

  assert.equal(safeEvent.type, 'dead_click');
  assert.equal(safeEvent.page, 'other');
  assert.equal(safeEvent.surface, 'generic');
  assert.deepEqual(safeEvent.details, {
    issue: 'cta_not_responding',
    overlay: 'shipping_modal',
  });
  assert.equal(safeEvent.occurredAt, 1700000000);
  assert.equal(typeof safeEvent.id, 'string');
  assert.equal(Boolean(safeEvent.id), true);
});

test('sanitizeEvent preserves explicit timestamps and preview flags', () => {
  const safeEvent = core.sanitizeEvent({
    id: 'explicit-id',
    type: 'recovery',
    page: 'checkout',
    surface: 'modal',
    details: { recoveryType: 'escape_released' },
    occurredAt: 42,
    isPreview: 1,
  }, 1700000000);

  assert.equal(safeEvent.id, 'explicit-id');
  assert.equal(safeEvent.occurredAt, 42);
  assert.equal(safeEvent.isPreview, true);
});

test('sanitizeBatch drops invalid events, truncates details, and respects the limit', () => {
  const longText = 'x'.repeat(100);
  const events = core.sanitizeBatch([
    {
      type: 'dead_click',
      page: 'product',
      surface: 'button',
      details: { issue: longText },
    },
    {
      type: 'focus_visibility_issue',
      page: 'product',
      surface: 'button',
      details: { issue: 'missing_focus_indicator' },
    },
    {
      type: 'unknown_type',
      page: 'product',
      surface: 'button',
    },
  ], 1700000000, 2);

  assert.equal(events.length, 2);
  assert.equal(events[0].details.issue.length, 64);
  assert.equal(events[1].type, 'focus_visibility_issue');
});

test('sanitizeBatch returns an empty list for non-array input', () => {
  assert.deepEqual(core.sanitizeBatch(null, 1700000000, 10), []);
});

test('pruneEvents drops expired events, sorts them, and caps the buffer', () => {
  const pruned = core.pruneEvents([
    { id: 'old', occurredAt: 20 },
    { id: 'newest', occurredAt: 120 },
    { id: 'middle', occurredAt: 95 },
    { id: 'other', occurredAt: 110 },
  ], 120, 30, 2);

  assert.deepEqual(pruned.map((event) => event.id), ['other', 'newest']);
});

test('appendEvents prunes by ttl and max buffer size using normalized settings', () => {
  const existing = [
    { id: '1', type: 'dead_click', page: 'shop', surface: 'button', details: {}, occurredAt: 100, isPreview: false },
    { id: '2', type: 'dead_click', page: 'shop', surface: 'button', details: {}, occurredAt: 180, isPreview: false },
  ];
  const incoming = [
    { id: '3', type: 'dead_click', page: 'shop', surface: 'button', details: {}, occurredAt: 200, isPreview: false },
  ];

  const merged = core.appendEvents(existing, incoming, {
    bufferTtl: '90',
    maxBufferEvents: '2',
  }, 200);

  assert.deepEqual(merged.map((event) => event.id), ['2', '3']);
});

test('buildSummary reports totals by type, by page, and hotspot ordering', () => {
  const summary = core.buildSummary([
    { type: 'keyboard_trap_risk', page: 'checkout', surface: 'modal', details: {}, occurredAt: 10 },
    { type: 'keyboard_trap_risk', page: 'checkout', surface: 'modal', details: {}, occurredAt: 11 },
    { type: 'false_interactivity', page: 'product', surface: 'image', details: {}, occurredAt: 12 },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.countsByType.keyboard_trap_risk, 2);
  assert.equal(summary.countsByPage.checkout, 2);
  assert.equal(summary.hotspots[0].label, 'checkout:modal');
});

test('buildRecommendations returns the empty-state note when there are no events', () => {
  const recommendations = core.buildRecommendations(core.buildSummary([]));

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].title, 'No live friction yet');
});

test('buildRecommendations prioritizes overlay, form, and misleading interaction issues', () => {
  const summary = core.buildSummary([
    { type: 'keyboard_trap_risk', page: 'checkout', surface: 'modal', details: {}, occurredAt: 10 },
    { type: 'inaccessible_form_warning', page: 'checkout', surface: 'form', details: {}, occurredAt: 11 },
    { type: 'dead_click', page: 'product', surface: 'button', details: {}, occurredAt: 12 },
    { type: 'focus_visibility_issue', page: 'product', surface: 'button', details: {}, occurredAt: 13 },
  ]);
  const recommendations = core.buildRecommendations(summary);

  assert.equal(recommendations.length, 3);
  assert.deepEqual(recommendations.map((item) => item.title), [
    'Audit overlays first',
    'Tighten field messaging',
    'Remove misleading affordances',
  ]);
});

test('buildRecommendations adds focus guidance when focus loss is the main issue', () => {
  const summary = core.buildSummary([
    { type: 'focus_visibility_issue', page: 'product', surface: 'button', details: {}, occurredAt: 13 },
  ]);
  const recommendations = core.buildRecommendations(summary);

  assert.equal(recommendations[0].title, 'Restore visible focus');
});

test('humanize converts snake case tokens into readable labels', () => {
  assert.equal(core.humanize('keyboard_trap_risk'), 'Keyboard Trap Risk');
});

test('createPreviewEvents marks generated events as preview and preserves scenario ordering', () => {
  const events = core.createPreviewEvents('catalog-walkthrough', 1700000000);

  assert.equal(events.length > 0, true);
  assert.equal(events.every((event) => event.isPreview), true);
  assert.equal(events[0].occurredAt < events[events.length - 1].occurredAt, true);
});

test('createPreviewEvents falls back to the default scenario for unknown slugs', () => {
  const events = core.createPreviewEvents('unknown-scenario', 1700000000);

  assert.equal(events.length, 6);
  assert.equal(events[0].type, 'dead_click');
  assert.equal(events[0].page, 'checkout');
});