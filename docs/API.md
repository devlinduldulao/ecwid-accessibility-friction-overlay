# API Notes

This repository does not expose a production backend API in its default architecture.

## What Exists

- The merchant dashboard is a static page served from `public/index.html`.
- Configuration is stored in browser local storage.
- The generated deployment snippet writes configuration into `window.AccessibilityFrictionOverlayEcwidConfig` for use by the storefront collector.

## Data Flow

1. The merchant changes settings in the control room.
2. `src/admin/app.js` normalizes and persists those settings locally.
3. The control room generates a paste-ready Ecwid Custom JavaScript snippet.
4. When that snippet is installed, `src/storefront/custom-storefront.js` collects merchant QA events in the browser.
5. Shared summarization logic in `src/shared/core.js` turns those events into dashboard metrics and recommendations.

## Explicit Non-Goals

- No OAuth install flow.
- No webhook receiver.
- No server-side REST proxy.
- No shared cross-device event stream.

If a future requirement needs shared persistence, private API access, or multi-store installs, that would be a separate backend-enabled architecture decision.
