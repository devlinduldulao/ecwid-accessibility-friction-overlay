# Accessibility Friction Overlay for Ecwid — AI Agent Instructions

Project-specific instructions for AI coding agents working in this repository.

## Project Overview

| Key | Value |
|-----|-------|
| Product | Accessibility Friction Overlay for Ecwid |
| Platform | Ecwid by Lightspeed |
| Primary Surface | Merchant-facing admin/control-room dashboard |
| Runtime | Static HTML, CSS, and JavaScript |
| Backend | None in the intended production path |
| Storage | Browser local storage only |

## Core Intent

This Ecwid version is for the business owner using an admin dashboard and preview tools.

- It is not a public storefront widget for shoppers.
- Any storefront-side panel is a merchant QA aid only.
- Keep customer-facing UI hidden by default.

## Architecture Rules

- Do not reintroduce a required Node.js server, database, Redis, OAuth callback flow, or webhook pipeline into the default Ecwid path.
- The main product surface is `public/index.html` plus `src/admin/app.js`.
- Shared business logic belongs in `src/shared/core.js`.
- Storefront logic belongs in `src/storefront/custom-storefront.js` and should stay lightweight.

## File Map

| File | Purpose |
|------|---------|
| `public/index.html` | Merchant control-room UI |
| `src/admin/app.js` | Dashboard logic and snippet generation |
| `src/shared/core.js` | Shared settings, sanitization, summaries, preview scenarios |
| `src/storefront/custom-storefront.js` | Merchant QA collector and optional debug overlay |
| `src/storefront/custom-storefront.css` | Storefront debug overlay styles |
| `public/storefront-test.html` | Local preview page for merchant walkthroughs |
| `tests/core.test.js` | Unit tests for shared static logic |

## Guardrails

- Prefer owner-facing wording over shopper-facing wording in admin UI and docs.
- Keep the storefront overlay disabled by default unless explicitly enabled by the merchant.
- Keep configuration serializable into the generated Ecwid Custom JavaScript snippet.
- Be explicit when a requested feature would require backend infrastructure.

## Testing Requirements

- Add or update unit tests when shared logic changes.
- Run `npm run lint` and `npm test` after meaningful changes.
- Do not mark work complete while lint or tests are failing unless the environment prevents execution.

## Design System & Branding

Building an Ecwid-native look and feel is our number one priority. All UI components and layouts must adhere strictly to the [Lightspeed Design System](https://brand.lightspeedhq.com/document/170#/brand-system/logo-1) and brand guidelines.
- Use the official Lightspeed logo and Flame brandmark appropriately, maintaining clearspace (full flame width for logo, half width for flame), proper minimum scale (80px for logo, 15px for flame), and approved high-contrast color pairings.
- Never distort, rotate, outline, or add drop shadows to the brand marks.
- Follow cobranding and partner program guidelines for all merchant-facing app surfaces.