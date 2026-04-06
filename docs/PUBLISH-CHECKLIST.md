# Publish Checklist

Use this checklist on release day before submitting or updating the Ecwid App Market listing.

## Product Positioning

- [ ] The app is described as a merchant-facing accessibility QA and diagnostics tool
- [ ] The app is categorized under store design
- [ ] No docs or listing copy claim order-management or catalog-management features
- [ ] No docs or listing copy claim cross-device live monitoring unless that feature actually exists

## Security

- [ ] Rotate any Ecwid client secret, secret token, or access token that has been exposed during development or review
- [ ] Do not store Ecwid secrets in the repo, screenshots, docs, or build artifacts
- [ ] If a backend exists in the future, secrets are kept only in environment variables or CI secret storage

## Public App Configuration

- [ ] Requested scopes match the actual implementation
- [ ] Preferred scope set is limited to `public_storefront`, `read_store_profile`, `add_to_cp`, and `customize_storefront` when applicable
- [ ] No order or catalog write scopes are requested without corresponding shipped functionality

## Hosting And URLs

- [ ] The hosted `public/index.html` URL loads correctly
- [ ] The hosted `src/shared/core.js` URL loads correctly
- [ ] The hosted `src/storefront/custom-storefront.js` URL loads correctly
- [ ] The hosted `src/storefront/custom-storefront.css` URL loads correctly
- [ ] Support, privacy, and terms pages are public and final

## Marketplace Assets

- [ ] Listing icon and banner assets are present in `assets/marketplace/`
- [ ] Screenshots in `assets/marketplace/` match the current UI
- [ ] Additional Ecwid-required raster sizes have been exported if needed

## Quality Gates

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `dist/` contains the expected marketplace assets and static pages

## Final Review

- [ ] The submission form uses the final app name and description
- [ ] The company or product website URL is accurate
- [ ] The support email or support URL is final
- [ ] The demo URL points to the real hosted merchant control room