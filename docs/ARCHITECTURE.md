# Architecture

This Ecwid version is intentionally owner-facing and static-first.

## Product Shape

The main product surface is the merchant dashboard in `public/index.html`. That page is the control room a business owner uses to:

- configure the module locally
- run preview drills
- review hotspot summaries and recommended actions
- generate the Ecwid Custom JavaScript snippet

The storefront code exists as a lightweight collector for merchant QA and walkthroughs. It is not meant to present a public widget to store visitors.

## Runtime Model

```text
Ecwid Admin iframe
    -> public/index.html
    -> src/admin/app.js
    -> src/shared/core.js

Ecwid storefront
    -> generated Custom JavaScript snippet
    -> src/shared/core.js
    -> src/storefront/custom-storefront.js
    -> src/storefront/custom-storefront.css
```

## Components

### Admin control room

Files:

- `public/index.html`
- `src/admin/app.js`

Responsibilities:

- present merchant-facing settings
- generate the static asset loader snippet
- simulate preview scenarios
- explain deployment and tradeoffs clearly to the store owner

### Shared core

File:

- `src/shared/core.js`

Responsibilities:

- normalize settings
- sanitize collected events
- prune ephemeral buffers
- build summaries, hotspots, and recommendations
- generate synthetic preview events

### Storefront collector

Files:

- `src/storefront/custom-storefront.js`
- `src/storefront/custom-storefront.css`

Responsibilities:

- listen for friction signals during merchant-run walkthroughs
- keep a short local event buffer in the same browser
- optionally show a merchant debug panel when explicitly enabled

## Storage Model

The static version uses browser local storage only.

- The admin page stores owner settings locally in the admin browser.
- The storefront collector stores the short event buffer locally in the storefront browser.

These are not shared across browsers, users, or devices.

## Why No Backend

This repository is optimized for low-cost deployment:

- no database
- no Redis
- no Node.js server in production
- no OAuth callback handler
- no webhook endpoint

That keeps the Ecwid version cheap to host, but it also limits the product to merchant-led QA and dashboard storytelling instead of shared live monitoring.

## Future Expansion

Add a backend only if you need:

- shared live dashboards across devices
- centralized store settings
- webhook ingestion
- persistent event history
- secure private Ecwid REST API calls

## Public App Posture

For Ecwid App Market review, the current implementation should be described as:

- a merchant-facing accessibility QA and diagnostics app
- a control-room experience in Ecwid admin or on a hosted page
- a storefront collector for merchant testing and walkthroughs
- a static-hosted application by default

The current implementation should not be described as:

- an order-management integration
- a catalog-management integration
- a live analytics system with shared cross-device history
- a backend-dependent app
