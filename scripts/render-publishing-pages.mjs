import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const configPath = path.join(rootDir, 'config', 'publishing-profile.json');

async function main() {
  const profile = JSON.parse(await readFile(configPath, 'utf8'));
  const normalized = normalizeProfile(profile);

  await mkdir(path.join(rootDir, 'public'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs'), { recursive: true });

  await writeFile(path.join(rootDir, 'public', 'support.html'), renderSupportPage(normalized), 'utf8');
  await writeFile(path.join(rootDir, 'public', 'privacy.html'), renderPrivacyPage(normalized), 'utf8');
  await writeFile(path.join(rootDir, 'public', 'terms.html'), renderTermsPage(normalized), 'utf8');
  await writeFile(
    path.join(rootDir, 'docs', 'app-submission-template.json'),
    `${JSON.stringify(renderSubmissionTemplate(normalized), null, 2)}\n`,
    'utf8'
  );

  process.stdout.write(`Rendered publishing pages from ${configPath}\n`);
}

function normalizeProfile(profile) {
  const source = profile || {};
  const baseUrl = String(source.hostBaseUrl || '').replace(/\/$/, '');

  return {
    appName: String(source.appName || 'Accessibility Friction Overlay for Ecwid'),
    tagline: String(source.tagline || ''),
    shortDescription: String(source.shortDescription || ''),
    category: String(source.category || ''),
    hostBaseUrl: baseUrl,
    businessName: String(source.businessName || 'Configured marketplace publisher'),
    supportEmail: String(source.supportEmail || ''),
    supportResponseWindow: String(source.supportResponseWindow || 'Reply within 2 business days'),
    supportTimezone: String(source.supportTimezone || 'UTC'),
    supportUrl: joinUrl(baseUrl, source.supportUrl || '/public/support.html'),
    privacyPolicyUrl: joinUrl(baseUrl, source.privacyPolicyUrl || '/public/privacy.html'),
    termsOfServiceUrl: joinUrl(baseUrl, source.termsOfServiceUrl || '/public/terms.html'),
    demoUrl: joinUrl(baseUrl, source.demoUrl || '/public/index.html'),
    legalEffectiveDate: String(source.legalEffectiveDate || new Date().toISOString().slice(0, 10)),
    privacyContactBlurb: String(source.privacyContactBlurb || 'Contact the support channel listed in the live marketplace listing for privacy requests.'),
    termsWarrantyBlurb: String(source.termsWarrantyBlurb || 'This app is provided as described in the active marketplace listing and any separate merchant agreement published with the app.'),
    screenshots: Array.isArray(source.screenshots) ? source.screenshots.slice() : [],
    assets: source.assets || {},
    technicalNotes: source.technicalNotes || {},
  };
}

function joinUrl(baseUrl, resourcePath) {
  const safePath = String(resourcePath || '').startsWith('/') ? resourcePath : `/${String(resourcePath || '')}`;
  return baseUrl ? `${baseUrl}${safePath}` : safePath;
}

function renderPage(title, body) {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>',
    '    body {',
    '      margin: 0;',
    '      font-family: "Avenir Next", "Segoe UI", sans-serif;',
    '      color: #1d2421;',
    '      background: linear-gradient(180deg, #fbf7ef 0%, #efe4cf 100%);',
    '    }',
    '    main {',
    '      max-width: 860px;',
    '      margin: 0 auto;',
    '      padding: 48px 20px 72px;',
    '      line-height: 1.7;',
    '    }',
    '    h1,',
    '    h2 {',
    '      font-family: "Iowan Old Style", "Palatino Linotype", serif;',
    '    }',
    '    section, .card {',
    '      padding: 20px 0;',
    '      border-top: 1px solid rgba(29, 36, 33, 0.12);',
    '    }',
    '    .card {',
    '      padding: 20px;',
    '      border-radius: 24px;',
    '      background: rgba(255, 250, 242, 0.9);',
    '      border: 1px solid rgba(29, 36, 33, 0.12);',
    '      margin-top: 20px;',
    '    }',
    '    a {',
    '      color: #0f766e;',
    '    }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    body,
    '  </main>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function renderSupportPage(profile) {
  const contactLines = profile.supportEmail
    ? [`      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(profile.supportEmail)}">${escapeHtml(profile.supportEmail)}</a></p>`]
    : ['      <p><strong>Support:</strong> Contact details are published in the live marketplace listing and merchant onboarding materials.</p>'];

  const body = [
    `    <p>${escapeHtml(profile.appName)}</p>`,
    '    <h1>Support</h1>',
    `    <p>${escapeHtml(profile.shortDescription)}</p>`,
    '    <div class="card">',
    '      <h2>Contact</h2>',
    `      <p><strong>Business:</strong> ${escapeHtml(profile.businessName)}</p>`,
    ...contactLines,
    `      <p><strong>Response window:</strong> ${escapeHtml(profile.supportResponseWindow)}</p>`,
    `      <p><strong>Timezone:</strong> ${escapeHtml(profile.supportTimezone)}</p>`,
    '    </div>',
    '    <div class="card">',
    '      <h2>Current Scope</h2>',
    '      <p>This app supports merchant-facing accessibility walkthroughs, preview drills with fake data, and snippet-based deployment to Ecwid storefront customization.</p>',
    '    </div>',
    '    <div class="card">',
    '      <h2>Reference Links</h2>',
    `      <p><a href="${escapeHtml(profile.demoUrl)}">Merchant control room demo</a></p>`,
    `      <p><a href="${escapeHtml(profile.privacyPolicyUrl)}">Privacy policy</a></p>`,
    `      <p><a href="${escapeHtml(profile.termsOfServiceUrl)}">Terms of service</a></p>`,
    '    </div>',
  ].join('\n');

  return renderPage(`Support - ${profile.appName}`, body);
}

function renderPrivacyPage(profile) {
  const contactLines = [
    `      <p>${escapeHtml(profile.privacyContactBlurb)}</p>`,
  ];

  if (profile.supportEmail) {
    contactLines.push(`      <p><a href="mailto:${escapeHtml(profile.supportEmail)}">${escapeHtml(profile.supportEmail)}</a></p>`);
  }

  const body = [
    `    <p>${escapeHtml(profile.appName)}</p>`,
    '    <h1>Privacy Policy</h1>',
    `    <p><strong>Effective date:</strong> ${escapeHtml(profile.legalEffectiveDate)}</p>`,
    '    <section>',
    '      <h2>Service Model</h2>',
    '      <p>This static Ecwid app is designed for merchant-run accessibility QA and control-room walkthroughs. In its default architecture, it stores settings and event buffers in the local browser used by the merchant.</p>',
    '    </section>',
    '    <section>',
    '      <h2>Data Handling</h2>',
    '      <p>By default, this app does not require a production database, a Redis cache, or a long-running backend service. Event data generated in preview mode is synthetic. Event data gathered during merchant QA sessions stays in browser-local storage unless you intentionally extend the app with your own backend.</p>',
    '    </section>',
    '    <section>',
    '      <h2>Personal Data</h2>',
    '      <p>The default implementation is not intended to collect customer profiles or build cross-device visitor histories. If you later add hosted persistence or third-party analytics, update this policy before publishing or deployment.</p>',
    '    </section>',
    '    <section>',
    '      <h2>Contact</h2>',
    ...contactLines,
    '    </section>',
  ].join('\n');

  return renderPage(`Privacy Policy - ${profile.appName}`, body);
}

function renderTermsPage(profile) {
  const supportLine = profile.supportEmail
    ? `      <p><strong>Support:</strong> <a href="mailto:${escapeHtml(profile.supportEmail)}">${escapeHtml(profile.supportEmail)}</a></p>`
    : '      <p><strong>Support:</strong> Contact the support address published in the live marketplace listing.</p>';

  const body = [
    `    <p>${escapeHtml(profile.appName)}</p>`,
    '    <h1>Terms of Use</h1>',
    `    <p><strong>Effective date:</strong> ${escapeHtml(profile.legalEffectiveDate)}</p>`,
    '    <section>',
    '      <h2>Service Scope</h2>',
    '      <p>The default implementation provides a static merchant dashboard, local preview scenarios, and snippet-based storefront instrumentation.</p>',
    '    </section>',
    '    <section>',
    '      <h2>Publishing Profile</h2>',
    `      <p><strong>Business:</strong> ${escapeHtml(profile.businessName)}</p>`,
    supportLine,
    '    </section>',
    '    <section>',
    '      <h2>Warranty and Liability</h2>',
    `      <p>${escapeHtml(profile.termsWarrantyBlurb)}</p>`,
    '    </section>',
  ].join('\n');

  return renderPage(`Terms - ${profile.appName}`, body);
}

function renderSubmissionTemplate(profile) {
  return {
    appName: profile.appName,
    tagline: profile.tagline,
    shortDescription: profile.shortDescription,
    category: profile.category,
    supportUrl: profile.supportUrl,
    privacyPolicyUrl: profile.privacyPolicyUrl,
    termsOfServiceUrl: profile.termsOfServiceUrl,
    demoUrl: profile.demoUrl,
    assets: {
      ...profile.assets,
      screenshots: profile.screenshots,
    },
    technicalNotes: profile.technicalNotes,
    submissionChecklist: [
      'Confirm support, privacy, terms, and demo URLs match the final production host if absolute URLs are required',
      'Review the business name, support contact, and legal copy in config/publishing-profile.json',
      'Export any additional marketplace-specific PNG sizes if required',
    ],
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
