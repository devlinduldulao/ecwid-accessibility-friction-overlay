# Deployment Guide

This repository now targets static hosting for the main Ecwid deployment path.

## Goal

Host HTML, JS, and CSS on a static HTTPS host, then install the storefront collector on your Ecwid store using one of two methods.

That gives you:

- no database
- no Redis
- no production Node.js process
- no webhook endpoint
- no OAuth callback requirement for the main merchant dashboard and storefront collector

## Recommended Static Hosts

Any static HTTPS host works, including:

- GitHub Pages
- Netlify
- Cloudflare Pages
- Vercel static hosting
- Amazon S3 + CloudFront

## Static Deployment Steps

1. Deploy this repo as static files.
2. Open your hosted root page (the merchant control room).
3. Enter the base URL where the repo is hosted.
4. Copy the generated snippet.
5. Install the snippet using one of the two options below.

The snippet loads three assets from your static host:

- `src/shared/core.js`
- `src/storefront/custom-storefront.js`
- `src/storefront/custom-storefront.css`

## Installing The Storefront Snippet

There are two ways to get the storefront collector running on your Ecwid store.

### Option A — Instant Site Custom Code (quickest)

Use this if you run an Ecwid Instant Site and want to get started immediately.

1. Go to **Ecwid Admin → Website → Design**.
2. Find the **Custom JavaScript code** section (near the bottom).
3. Paste the generated snippet exactly as copied. It already includes its own `<script>` tags — do not add extra tags or wrappers.
4. Save.

The snippet will run on every page of your Instant Site.

### Option B — App `customJsUrl` Endpoint (recommended for published apps)

Use this if you are publishing the app through the Ecwid App Market, or if you prefer Ecwid to manage the script injection automatically.

1. Go to **Ecwid Admin → #develop-apps** (or the app dashboard in your developer account).
2. Open your app and go to its **Details** tab.
3. Set `customJsUrl` to your hosted storefront JS file, for example:
   ```
   https://your-static-host/src/storefront/custom-storefront.js
   ```
4. Optionally set `customCssUrl` to your hosted CSS file:
   ```
   https://your-static-host/src/storefront/custom-storefront.css
   ```
5. Your app must have the `customize_storefront` scope.

With this approach, Ecwid injects the JS and CSS automatically when the app is installed. You still need a way to deliver the config object — either through `EcwidApp.getAppPublicConfig()` or by including a small config bootstrap in the storefront JS itself.

> **Note:** The old "Control Panel → Design → Custom JavaScript" textarea referenced in older Ecwid guides no longer exists in modern Ecwid. Use one of the two options above.

## Manual Ecwid Setup

### Control room page

If you want the admin-style control room available in Ecwid admin, point your Ecwid iframe page to:

`https://your-static-host/.../`

This page is static. It does not need a backend API. It is the primary experience a business owner uses to configure and preview the module.

### Storefront injection

Use Option A or Option B above. The generated snippet handles both the CSS and JS asset loading, so you do not need a separate manual CSS paste step unless you prefer one.

## Tradeoffs Of The Static Model

- The storefront event buffer is local to the browser session where the storefront script runs.
- The admin/control-room page stores settings in its own browser context.
- There is no shared live stream between storefront and admin without adding backend infrastructure.
- The customer-facing storefront should treat the overlay as a merchant QA tool, not a public widget.

## When You Would Need A Backend Again

Add a backend only if you need one of these:

- shared real-time dashboards across devices
- persistent store-wide settings managed centrally
- webhook ingestion
- secure server-side REST API calls with secret tokens

Published multi-store apps can still use a static hosting model for the merchant UI and storefront assets. A backend becomes necessary only when your published app needs server-side token exchange, secret handling, or private REST API access.

## Static Hosting Checklist

- [ ] Your host serves over HTTPS
- [ ] The root `index.html` page is reachable publicly
- [ ] `src/shared/core.js` is reachable publicly
- [ ] `src/storefront/custom-storefront.js` is reachable publicly
- [ ] `src/storefront/custom-storefront.css` is reachable publicly
- [ ] The generated base URL matches the real deployed path
- [ ] The Ecwid store uses the copied Custom JavaScript snippet

## Local Verification Before Deploy

```bash
npm install
npm run preview
npm test
npm run lint
```

## Scope Guidance For This Repository

The current codebase supports a minimal public-app posture. For the app as implemented today, request only the scopes you can justify in review.

Recommended scopes for the current feature set:

- `public_storefront`
- `read_store_profile`
- `add_to_cp` if you ship the control room inside Ecwid admin
- `customize_storefront` if you use the official storefront customization route

Do not request order or catalog write scopes unless you add features that actually use them.
