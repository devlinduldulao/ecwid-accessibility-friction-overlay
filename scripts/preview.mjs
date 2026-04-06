import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const requestedBaseDir = path.resolve(rootDir, process.argv[2] || '.');
const preferredPort = Number(process.env.PORT || 5000);

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const relativePath = decodeURIComponent(requestUrl.pathname);
    const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, '');
    let filePath = path.join(requestedBaseDir, safePath);

    if (!filePath.startsWith(requestedBaseDir)) {
      respond(response, 403, 'Forbidden');
      return;
    }

    let fileStats = await statOrNull(filePath);
    if (fileStats && fileStats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fileStats = await statOrNull(filePath);
    }

    if (!fileStats || !fileStats.isFile()) {
      respond(response, 404, 'Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'no-store',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    respond(response, 500, error instanceof Error ? error.message : 'Internal server error');
  }
});

await access(requestedBaseDir);
await listen(preferredPort);

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function respond(response, statusCode, message) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(`${message}\n`);
}

async function statOrNull(filePath) {
  try {
    return await stat(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function listen(port) {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };

    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  }).catch(async (error) => {
    if (error && error.code === 'EADDRINUSE' && port !== 0) {
      await listen(0);
      return;
    }

    throw error;
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  process.stdout.write(`Preview server running at http://127.0.0.1:${actualPort}\n`);
}