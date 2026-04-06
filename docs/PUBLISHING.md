# Publishing Checklist

This repository now includes the baseline pieces needed to package and host the app, plus starter assets for submission prep.

## Already Prepared

- `npm run build` creates a deployable `dist/` artifact
- CI and GitHub Pages workflows exist under `.github/workflows/`
- starter app icon source: `assets/marketplace/app-icon.svg`
- starter listing banner source: `assets/marketplace/listing-banner.svg`
- exported PNG icon: `assets/marketplace/app-icon.png`
- exported PNG listing banner: `assets/marketplace/listing-banner.png`
- real dashboard screenshots: `assets/marketplace/control-room-idle.png` and `assets/marketplace/control-room-preview.png`
- centralized publishing profile: `config/publishing-profile.json`
- static support page: `public/support.html`
- static privacy page: `public/privacy.html`
- static terms page: `public/terms.html`
- release automation: `.github/workflows/release.yml`
- submission metadata starter: `docs/app-submission-template.json`

## Still Required Before Submission

- replace placeholder support contact details with your real email or support URL
- replace placeholder legal text with your real privacy and terms language
- export any marketplace-required raster sizes from the SVG assets
- confirm the final GitHub Pages or static-host URL used for the app
- verify that the support, privacy, and terms URLs are public and stable

## Single-File Editing

Update `config/publishing-profile.json` first. The build now renders:

- `public/support.html`
- `public/privacy.html`
- `public/terms.html`
- `docs/app-submission-template.json`

from that single publishing profile.

## Suggested Publish URLs

If you host this repo on GitHub Pages, you can use URLs shaped like:

- `/public/index.html` for the merchant control room demo
- `/public/support.html` for support
- `/public/privacy.html` for privacy policy
- `/public/terms.html` for terms

## Platform Notes

Ecwid documentation provides routes for app support and public-app submission planning. This repository is prepared for a static-hosted merchant dashboard model, but you still need to complete marketplace copy, screenshots, and legal or business metadata before submission.

For publish-ready submission materials, see:

- `docs/SUBMISSION-PACKET.md`
- `docs/PUBLISH-CHECKLIST.md`