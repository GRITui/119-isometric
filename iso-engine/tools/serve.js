// serve.js — tiny static server for the iso-engine scene (lead-owned, no deps).
// Usage: node tools/serve.js [port]   (default 8652; PORT env also honored)
// Serves the iso-engine/ directory at http://localhost:<port>/
//   http://localhost:8652/            -> index.html (playable scene)
//   http://localhost:8652/data/...    -> tilemap/save JSON
//   http://localhost:8652/tools/tilemap-editor.html -> editor
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8652);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
};

http
  .createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (p === '/') p = '/index.html';
      const file = normalize(join(ROOT, p));
      if (file !== ROOT && !file.startsWith(ROOT + '/')) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  })
  .listen(PORT, () => {
    console.log(`iso-engine: serving ${ROOT} at http://localhost:${PORT}/`);
  });
