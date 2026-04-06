import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const distDir = path.join(rootDir, 'dist');

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await copyDirectory('assets');
  await copyDirectory('public');
  await copyDirectory('src');
  await copyFileIfPresent('_headers');
  await copyFileIfPresent('README.md');
  await copyFileIfPresent('LICENSE');
  await writeBuildInfo();
  await writeRootRedirect();

  process.stdout.write(`Built static package at ${distDir}\n`);
}

async function copyDirectory(relativePath) {
  await cp(path.join(rootDir, relativePath), path.join(distDir, relativePath), {
    recursive: true,
  });
}

async function copyFileIfPresent(relativePath) {
  try {
    const sourcePath = path.join(rootDir, relativePath);
    const targetPath = path.join(distDir, relativePath);
    const contents = await readFile(sourcePath, 'utf8');
    await writeFile(targetPath, contents, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}

async function writeRootRedirect() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=public/index.html">
  <title>Accessibility Friction Overlay for Ecwid</title>
</head>
<body>
  <a href="public/index.html">Open app</a>
</body>
</html>
`;
  await writeFile(path.join(distDir, 'index.html'), html, 'utf8');
}

async function writeBuildInfo() {
  const output = {
    builtAt: new Date().toISOString(),
    layout: {
      appIcon: 'assets/marketplace/app-icon.svg',
      admin: 'public/index.html',
      idleScreenshot: 'assets/marketplace/control-room-idle.png',
      listingBanner: 'assets/marketplace/listing-banner.svg',
      privacy: 'public/privacy.html',
      previewScreenshot: 'assets/marketplace/control-room-preview.png',
      storefrontPreview: 'public/storefront-test.html',
      support: 'public/support.html',
      sharedCore: 'src/shared/core.js',
      storefrontScript: 'src/storefront/custom-storefront.js',
      storefrontStyles: 'src/storefront/custom-storefront.css',
      terms: 'public/terms.html',
    },
  };

  await writeFile(
    path.join(distDir, 'build-info.json'),
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8'
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});