# Ecwid Quickstart for This Repository

This quickstart describes the implementation that actually exists in this repo.

## What You Are Running

- A static merchant dashboard at `public/index.html`
- A local storefront preview at `public/storefront-test.html`
- Shared logic in `src/shared/core.js`
- No production backend, database, Redis, OAuth flow, or webhook endpoint

## Local Setup

```bash
npm install
npm run lint
npm test
npm run preview
```

Open the preview URL printed by the static server.

## Merchant Workflow

1. Open the merchant control room.
2. Adjust tracking and overlay settings.
3. Copy the generated storefront loader snippet.
4. Install it using one of two methods:
   - **Option A (Instant Site):** Paste the snippet into Ecwid Admin → Website → Design → Custom JavaScript code. The snippet includes its own `<script>` tags — paste it exactly as copied.
   - **Option B (App endpoint):** Set `customJsUrl` and `customCssUrl` in your app's details at `#develop-apps`. This is the recommended approach for published apps.
5. Use the storefront collector during merchant QA walkthroughs.

## Architectural Constraint

This project intentionally stops short of any feature that requires hosted infrastructure.

That means:

- settings are local to the browser unless exported through the generated snippet
- captured QA events are local to the current browser session/storage
- there is no shared live dashboard across devices

If you later need multi-store installs, shared analytics, private API access, or durable cross-device history, create a separate backend-enabled track instead of changing the default architecture implicitly.
