# Development Guide

This Ecwid workspace now targets a static, merchant-facing deployment model. Development is centered on browser-side behavior, shared event logic, and a static admin page that generates the store loader snippet.

## Local Setup

```bash
npm install
npm run preview
```

Open these pages locally:

- `http://localhost:5000/public/index.html`
- `http://localhost:5000/public/storefront-test.html`

## Local Workflow

### Storefront work

Edit:

- `src/storefront/custom-storefront.js`
- `src/storefront/custom-storefront.css`
- `src/shared/core.js` when a change affects settings, summaries, preview scenarios, or sanitization

Use `public/storefront-test.html` for manual testing.

Important details:

- Replace `STORE_ID` in `public/storefront-test.html` with a real Ecwid store ID.
- Add `?afo_debug=1` to force the merchant debug overlay open.
- Add `?afo_preview=checkout-friction` to inject a synthetic preview batch into the storefront overlay.
- Press `Alt+Shift+F` on the storefront to toggle the merchant debug overlay.

### Admin/control-room work

Edit:

- `public/index.html`
- `src/admin/app.js`

The admin page does three things for the business owner:

- Saves local configuration in the current browser only
- Runs synthetic preview scenarios using shared logic from `src/shared/core.js`
- Generates the Ecwid Custom JavaScript loader snippet for production use

### Shared logic

Edit `src/shared/core.js` when changing:

- default settings
- preview scenarios
- event sanitization
- event pruning
- hotspot summaries
- recommendation rules

That file is shared by both browser code and Node unit tests.

## Testing

Run:

```bash
npm test
```

Current automated coverage is focused on the shared static logic in `tests/core.test.js`:

- settings normalization and clamping
- event sanitization
- event pruning and buffer limits
- summary and recommendation generation
- preview event generation

Run lint checks with:

```bash
npm run lint
```

## Deployment-Oriented Development Rules

- Do not introduce server-only assumptions into the main Ecwid path.
- Do not depend on a database, Redis, or durable backend state for core storefront behavior.
- Keep store-specific configuration serializable into the generated snippet.
- Be explicit when a requested feature would require backend infrastructure.

## Browser Storage Model

The static implementation uses two different local storage contexts:

- The admin page stores its local configuration in the browser where the admin page is opened.
- The storefront script stores its event buffer in the browser session running the Ecwid storefront during merchant walkthroughs.

Those contexts are not shared across origins or devices. That is the main tradeoff for a zero-backend deployment.

## Owner-Facing Product Note

This Ecwid version is built first for a store owner using the dashboard and preview tools. Any storefront-side panel is a merchant QA aid, not a customer-facing feature.

| Element | Convention | Example |
|---------|-----------|---------|
| File names | kebab-case | `custom-storefront.js` |
| Variables | camelCase | `merchantMode`, `eventBuffer` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_SETTINGS` |
| Snippet globals | PascalCase with product prefix | `window.AccessibilityFrictionOverlayEcwidConfig` |
| CSS classes | prefixed component names | `.afo-merchant-panel` |
| Commits | Conventional style | `feat: refine merchant debug overlay defaults` |
