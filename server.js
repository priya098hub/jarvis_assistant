/**
 * Zero-dependency local backend. It deliberately uses only Node's standard library,
 * so it can be started without an API key, database, or npm install.
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT || 3000);
const root = process.cwd();
const dataDir = join(root, 'data');
const recordingsDir = join(dataDir, 'recordings');
const tasksFile = join(dataDir, 'tasks.json');
const activityFile = join(dataDir, 'activity.json');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

async function ensureData() { await mkdir(recordingsDir, { recursive: true }); for (const file of [tasksFile, activityFile]) if (!existsSync(file)) await writeFile(file, '[]\n'); }
async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function body(request) { const chunks = []; for await (const chunk of request) chunks.push(chunk); return Buffer.concat(chunks); }
function send(response, status, content, type = 'application/json; charset=utf-8') { response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); response.end(type.includes('json') ? JSON.stringify(content) : content); }
async function log(message, type = 'info') { const activity = await readJson(activityFile); const entry = { id: randomUUID(), message, type, createdAt: new Date().toISOString() }; activity.unshift(entry); await writeFile(activityFile, JSON.stringify(activity.slice(0, 100), null, 2)); return entry; }

await ensureData();
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/api/health') return send(response, 200, { ok: true, service: 'jarvis-local-backend' });
    if (url.pathname === '/api/tasks' && request.method === 'GET') return send(response, 200, await readJson(tasksFile));
    if (url.pathname === '/api/activity' && request.method === 'GET') return send(response, 200, await readJson(activityFile));
    if (url.pathname === '/api/activity' && request.method === 'DELETE') { await writeFile(activityFile, '[]\n'); return send(response, 204, ''); }
    if (url.pathname === '/api/tasks' && request.method === 'POST') {
      const input = JSON.parse((await body(request)).toString() || '{}');
      if (!input.text?.trim()) return send(response, 400, { error: 'A task description is required.' });
      const tasks = await readJson(tasksFile); const task = { id: randomUUID(), text: input.text.trim().slice(0, 2000), agent: input.agent || 'Jarvis', status: 'queued', createdAt: new Date().toISOString() };
      tasks.unshift(task); await writeFile(tasksFile, JSON.stringify(tasks.slice(0, 100), null, 2)); await log(`${task.agent} received a new task.`); return send(response, 201, task);
    }
    if (url.pathname === '/api/recordings' && request.method === 'POST') {
      const content = await body(request); if (!content.length) return send(response, 400, { error: 'Recording is empty.' });
      const id = randomUUID(); const mime = request.headers['content-type'] || 'video/webm'; const extension = mime.includes('mp4') ? 'mp4' : 'webm';
      await writeFile(join(recordingsDir, `${id}.${extension}`), content); await log(`A ${extension} recording was saved locally.`); return send(response, 201, { id, bytes: content.length });
    }
    if (request.method === 'GET') {
      const relative = url.pathname === '/' ? '/index.html' : url.pathname; const file = normalize(join(root, relative));
      if (!file.startsWith(root) || !existsSync(file)) return send(response, 404, { error: 'Not found.' });
      return send(response, 200, await readFile(file), mimeTypes[extname(file)] || 'application/octet-stream');
    }
    send(response, 404, { error: 'Not found.' });
  } catch (error) { console.error(error); send(response, 500, { error: 'Local backend error.' }); }
}).listen(port, () => console.log(`Jarvis is ready at http://localhost:${port}`));
