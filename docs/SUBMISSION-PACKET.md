# Ecwid Submission Packet

Use this document as a paste-ready reference when submitting the app to Ecwid App Market.

## App Identity

- App name: `Accessibility Friction Overlay for Ecwid`
- Category: `Store design`
- Reseller: `No`
- Audience estimate: `1 to 500`

## Short Description

Accessibility Friction Overlay for Ecwid is a merchant-facing accessibility QA and diagnostics app for Ecwid storefronts. It helps store owners review accessibility friction across product, cart, and checkout flows through a control-room dashboard with hotspots, recommendations, and guided preview scenarios.

## Long Description

Accessibility Friction Overlay for Ecwid is a merchant-facing accessibility QA and diagnostics app for Ecwid storefronts. It helps store owners detect and review accessibility friction during walkthroughs of product, cart, and checkout flows by collecting browser-side interaction signals, surfacing hotspots, and generating recommended fixes inside a control-room dashboard. The app supports guided preview scenarios for demos and QA, and it can also observe real storefront interactions during merchant-led testing sessions. It is designed to help merchants identify issues such as missing focus indicators, keyboard trap risks, misleading interactions, broken ARIA relationships, and inaccessible form behavior. The storefront-side overlay is intended for merchant QA and is hidden from customers by default.

## Public App Configuration Recommendation

Recommended scopes for the app as implemented today:

- `public_storefront`
- `read_store_profile`
- `add_to_cp`
- `customize_storefront`

Avoid requesting these scopes unless the codebase gains real features that require them:

- `update_catalog`
- `create_catalog`
- `read_catalog`
- `read_orders`
- `update_orders`

## Endpoint Recommendation

Use static hosted URLs for the current implementation:

- `iframeUrl`: hosted `public/index.html`
- `customJsUrl`: hosted `src/storefront/custom-storefront.js`
- `customCssUrl`: hosted `src/storefront/custom-storefront.css`

## Review Positioning

Describe the app as:

- a merchant-facing accessibility QA and diagnostics app
- a store-design and storefront-usability tool
- a static-hosted admin control room plus storefront collector

Do not describe the app as:

- an order-management integration
- a catalog-management integration
- a backend analytics system
- a cross-device live monitoring tool

## Required Public URLs

Before submission, confirm these are public and stable:

- company or product website URL
- support URL
- privacy policy URL
- terms of service URL
- demo URL for the merchant control room

## Security Notes

- Do not paste client secrets, secret tokens, or per-store secret access tokens into Ecwid market request forms
- Treat any previously exposed secret as compromised and rotate it before production release