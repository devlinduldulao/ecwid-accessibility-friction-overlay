import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputDir = path.join(rootDir, 'assets', 'marketplace');
const idleTarget = path.join(outputDir, 'control-room-idle.png');
const previewTarget = path.join(outputDir, 'control-room-preview.png');

await mkdir(outputDir, { recursive: true });

const server = spawn(process.execPath, [path.join(scriptDir, 'preview.mjs'), '.'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  const baseUrl = await waitForPreviewUrl(server);
  await captureScreenshots(`${baseUrl}/public/index.html`);
  process.stdout.write(`Saved marketplace screenshots to ${outputDir}\n`);
} finally {
  server.kill('SIGTERM');
}

async function captureScreenshots(url) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 1800,
      },
      deviceScaleFactor: 1,
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const scenario = document.getElementById('preview-scenario');
      return Boolean(scenario && scenario.options.length > 0);
    });
    await page.screenshot({ path: idleTarget, fullPage: true });

    await page.click('#preview-toggle-btn');
    await page.waitForFunction(() => {
      return document.querySelectorAll('.afo-feed-item').length > 0;
    });
    await page.screenshot({ path: previewTarget, fullPage: true });
  } finally {
    await browser.close();
  }
}

function waitForPreviewUrl(serverProcess) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const onStdout = (chunk) => {
      const output = String(chunk);
      const match = output.match(/Preview server running at (http:\/\/127\.0\.0\.1:\d+)/);

      if (!match || settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(match[1]);
    };

    const onStderr = (chunk) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(String(chunk).trim() || 'Preview server failed to start'));
    };

    const onExit = (code) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(`Preview server exited before reporting a URL (code ${code ?? 'unknown'})`));
    };

    const cleanup = () => {
      serverProcess.stdout.off('data', onStdout);
      serverProcess.stderr.off('data', onStderr);
      serverProcess.off('exit', onExit);
    };

    serverProcess.stdout.on('data', onStdout);
    serverProcess.stderr.on('data', onStderr);
    serverProcess.on('exit', onExit);
  });
}