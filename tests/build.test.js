const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');

test('build script creates the expected static package layout', () => {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'app-icon.svg')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'app-icon.png')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'listing-banner.svg')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'listing-banner.png')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'control-room-idle.png')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'control-room-preview.png')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'public', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'public', 'privacy.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'public', 'support.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'public', 'terms.html')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'docs', 'app-submission-template.json')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'src', 'shared', 'core.js')), true);

  const rootIndex = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');
  assert.match(rootIndex, /href="assets\/marketplace\/app-icon\.svg"/);
  assert.match(rootIndex, /src="src\/shared\/core\.js"/);
  assert.match(rootIndex, /id="deployment-snippet-preview"/);
  assert.match(rootIndex, /id="preview-scenario-toggle"/);
  assert.match(rootIndex, /id="preview-scenario-options"/);
  assert.doesNotMatch(rootIndex, /http-equiv="refresh"/);

  const adminApp = fs.readFileSync(path.join(projectRoot, 'src', 'admin', 'app.js'), 'utf8');
  assert.match(adminApp, /EcwidApp\.init\(\{\s*app_id:/s);
  assert.match(adminApp, /autoloadedflag:\s*true/);
  assert.match(adminApp, /autoheight:\s*true/);

  const buildInfo = JSON.parse(fs.readFileSync(path.join(distRoot, 'build-info.json'), 'utf8'));
  assert.equal(buildInfo.layout.appIcon, 'assets/marketplace/app-icon.svg');
  assert.equal(buildInfo.layout.admin, 'index.html');
  assert.equal(buildInfo.layout.idleScreenshot, 'assets/marketplace/control-room-idle.png');
  assert.equal(buildInfo.layout.listingBanner, 'assets/marketplace/listing-banner.svg');
  assert.equal(buildInfo.layout.privacy, 'public/privacy.html');
  assert.equal(buildInfo.layout.previewScreenshot, 'assets/marketplace/control-room-preview.png');
  assert.equal(buildInfo.layout.storefrontStyles, 'src/storefront/custom-storefront.css');
  assert.equal(buildInfo.layout.terms, 'public/terms.html');
});