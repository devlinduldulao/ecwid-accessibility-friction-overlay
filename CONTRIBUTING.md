# Contributing

This repository currently targets a static, merchant-facing Ecwid app path.

## Getting Started

1. Clone the repo
2. Run `npm install`
3. Run `npm run preview`
4. Open `/public/index.html` for the merchant control room
5. Open `/public/storefront-test.html` if you want to exercise the storefront collector locally

No `.env` file or Ecwid secret is required for the default local workflow.

## Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make focused changes
3. Run `npm run lint`
4. Run `npm test`
5. Run `npm run build` if the change affects packaging, publishing assets, or generated pages
6. Push and open a PR

## Code Style

- Preserve the current static-first architecture unless the task explicitly requires backend work
- Keep merchant-facing wording accurate: this app is a QA and diagnostics tool, not an order-management app
- Keep customer-facing overlay behavior hidden by default
- Do not introduce secrets into source files, screenshots, docs, or generated artifacts

## Where To Make Changes

- `public/index.html` and `src/admin/app.js` for the merchant control room
- `src/storefront/custom-storefront.js` for storefront collection and merchant debug overlay behavior
- `src/storefront/custom-storefront.css` for storefront debug overlay styling
- `src/shared/core.js` for shared settings, sanitization, summaries, and preview scenarios
- `config/publishing-profile.json` for marketplace-facing copy and publishing metadata
- `assets/marketplace/` for listing assets and screenshots

## Important Rules

- Never commit Ecwid secrets, client secrets, or per-store tokens
- Do not claim order-management, catalog-management, or live multi-device monitoring features unless the code actually supports them
- Prefer the current static deployment path for the default Ecwid app architecture
- Add tests for live collector behavior when changing storefront tracking logic
- Re-capture marketplace screenshots when the merchant UI changes materially
