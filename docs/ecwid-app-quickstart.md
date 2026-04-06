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
3. Copy the generated Ecwid Custom JavaScript snippet.
4. Paste that snippet into the Ecwid storefront customization surface.
5. Use the storefront collector during merchant QA walkthroughs.

## Architectural Constraint

This project intentionally stops short of any feature that requires hosted infrastructure.

That means:

- settings are local to the browser unless exported through the generated snippet
- captured QA events are local to the current browser session/storage
- there is no shared live dashboard across devices

If you later need multi-store installs, shared analytics, private API access, or durable cross-device history, create a separate backend-enabled track instead of changing the default architecture implicitly.
