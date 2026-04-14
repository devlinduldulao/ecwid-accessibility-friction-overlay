import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as terserMinify } from 'terser';
import { transform as lightningTransform } from 'lightningcss';

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
  await minifySrc();
  await writeBuildInfo();
  await writeRootIndex();

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

async function writeRootIndex() {
  const sourcePath = path.join(rootDir, 'public', 'index.html');
  const targetPath = path.join(distDir, 'index.html');
  const sourceHtml = await readFile(sourcePath, 'utf8');
  const rootHtml = sourceHtml
    .replaceAll('../assets/', 'assets/')
    .replaceAll('../src/', 'src/');

  await writeFile(targetPath, rootHtml, 'utf8');
}

async function minifySrc() {
  const jsFiles = [
    'src/admin/app.js',
    'src/shared/core.js',
    'src/storefront/custom-storefront.js',
  ];

  for (const rel of jsFiles) {
    const filePath = path.join(distDir, rel);
    const source = await readFile(filePath, 'utf8');
    const result = await terserMinify(source, { sourceMap: false });
    await writeFile(filePath, result.code, 'utf8');
  }

  const cssFile = path.join(distDir, 'src/storefront/custom-storefront.css');
  const cssSource = await readFile(cssFile);
  const { code: minifiedCss } = lightningTransform({
    filename: 'custom-storefront.css',
    code: cssSource,
    minify: true,
  });
  await writeFile(cssFile, minifiedCss);
}

async function writeBuildInfo() {
  const output = {
    builtAt: new Date().toISOString(),
    layout: {
      appIcon: 'assets/marketplace/app-icon.svg',
      admin: 'index.html',
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