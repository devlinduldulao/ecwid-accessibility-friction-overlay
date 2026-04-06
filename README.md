# Accessibility Friction Overlay for Ecwid

Static Ecwid deployment for the Accessibility Friction Overlay project.

This version is intentionally built for low-cost hosting and for a merchant-facing Ecwid dashboard workflow:

- No database
- No Redis
- No long-running Node.js server in production
- No OAuth callback or webhook dependency for the main merchant dashboard flow

The storefront logic runs in browser-side JavaScript. The admin page is a static control room that lets a business owner tune settings, run preview drills, and generate the Ecwid Custom JavaScript loader snippet to paste into the store.

## What Works

- Browser-side accessibility friction tracking for merchant QA walkthroughs
- Ephemeral local event buffering in the local merchant browser
- Optional merchant debug overlay on the storefront, disabled by default
- Static admin/control-room page for preview scenarios and deployment setup
- Paste-ready loader snippet that pulls JS and CSS from any static HTTPS host

## Publishing Assets Status

Prepared now:

- starter app icon source at `assets/marketplace/app-icon.svg`
- starter listing/banner artwork at `assets/marketplace/listing-banner.svg`
- exported PNG icon and banner assets in `assets/marketplace/`
- real dashboard screenshots in `assets/marketplace/`
- support, privacy, and terms pages under `public/`
- centralized publishing profile at `config/publishing-profile.json`

Still missing today:

- final legal text and support contact details
- any extra marketplace-specific raster sizes beyond the included PNG exports

If you plan to publish this in an app marketplace, you still need to prepare those images separately.

If you plan to publish this in Ecwid App Market, you still need to finalize the business, legal, and hosting details referenced by those assets.

## Important Constraint

Without a backend, there is no shared live dashboard across devices or browsers. The current implementation is privacy-first and zero-infrastructure, but its event buffer is local to the browser session running the storefront script. In practice, that makes this Ecwid version best suited to owner-led QA and dashboard storytelling rather than passive live monitoring of shopper traffic.

## Project Structure

```text
accessibility-friction-overlay/
├── public/
│   ├── index.html                # Static admin/control-room page
│   └── storefront-test.html      # Local Ecwid storefront preview page
├── src/
│   ├── admin/
│   │   └── app.js                # Admin control-room logic
│   ├── shared/
│   │   └── core.js               # Shared settings, event, summary, preview logic
│   └── storefront/
│       ├── custom-storefront.css # Floating overlay styles
│       └── custom-storefront.js  # Browser-side tracker and overlay
├── tests/
│   └── core.test.js              # Unit tests for shared logic
└── docs/
    ├── DEVELOPMENT.md
    └── DEPLOYMENT.md
```

## Quick Start

```bash
npm install
npm run build
npm run preview
```

Then open:

- the preview URL printed by the server, followed by `/public/index.html`
- the preview URL printed by the server, followed by `/public/storefront-test.html`

Replace `STORE_ID` in the storefront test page with your real Ecwid store ID.

## Deployment Flow

1. Host this repo on any static HTTPS platform such as GitHub Pages, Netlify, Cloudflare Pages, or Vercel static hosting.
2. Open `public/index.html` from that host.
3. Set the static asset base URL.
4. Copy the generated loader snippet.
5. Paste it into Ecwid Control Panel → Design → Custom JavaScript.

The snippet loads:

- `src/shared/core.js`
- `src/storefront/custom-storefront.js`
- `src/storefront/custom-storefront.css`

## Available Scripts

- `npm run build` creates a deployable static package in `dist/`
- `npm run preview` serves the repo as static files and falls back to an open port if `5000` is busy
- `npm run preview:dist` serves the packaged `dist/` artifact for final smoke checks
- `npm run lint` runs ESLint on `src/` and `tests/`
- `npm test` runs the shared-core unit tests with Node's built-in test runner

## GitHub Actions

- `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm test`, and `npm run build` on pushes, pull requests, and manual dispatch.
- `.github/workflows/deploy-pages.yml` builds `dist/` and deploys it to GitHub Pages on pushes to `main` or `master`, or by manual dispatch.
- `.github/workflows/release.yml` validates the app, zips `dist/`, uploads the archive as an artifact, and attaches it to tagged GitHub releases.

The publishing pages and submission template are generated from `config/publishing-profile.json` during `npm run build`.

The build output preserves the current static layout:

- `dist/public/index.html`
- `dist/public/storefront-test.html`
- `dist/public/privacy.html`
- `dist/public/support.html`
- `dist/public/terms.html`
- `dist/src/shared/core.js`
- `dist/src/storefront/custom-storefront.js`
- `dist/src/storefront/custom-storefront.css`
- `dist/assets/marketplace/app-icon.svg`
- `dist/assets/marketplace/app-icon.png`
- `dist/assets/marketplace/listing-banner.svg`
- `dist/assets/marketplace/listing-banner.png`
- `dist/assets/marketplace/control-room-idle.png`
- `dist/assets/marketplace/control-room-preview.png`

Serve `dist/` as a static directory when you want a packaged artifact rather than the source workspace.

## Files To Edit

- `src/storefront/custom-storefront.js` for detection logic and overlay behavior
- `src/storefront/custom-storefront.css` for overlay styling and focus treatment
- `src/shared/core.js` for shared settings, event sanitization, summaries, and preview scenarios
- `public/index.html` and `src/admin/app.js` for the control-room experience and generated snippet

## Notes

- If you later need shared real-time dashboards, store-wide persistence, or webhook processing, that is the point where a backend becomes necessary.

## Docs

- See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for local workflow details.
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for static hosting and Ecwid setup steps.
- See [docs/PUBLISHING.md](docs/PUBLISHING.md) for publishing and submission prep.
- See [docs/SUBMISSION-PACKET.md](docs/SUBMISSION-PACKET.md) for paste-ready Ecwid submission answers.
- See [docs/PUBLISH-CHECKLIST.md](docs/PUBLISH-CHECKLIST.md) for a release-day publish checklist.
- See [docs/app-submission-template.json](docs/app-submission-template.json) for a submission metadata starter.

---

## License

MIT
