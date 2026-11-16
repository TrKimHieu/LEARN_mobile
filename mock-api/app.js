'use strict';
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { createMockApi } = require('../src/lib/testing/core');
function createApp(options = {}) {
  const api = createMockApi(options);
  const server = http.createServer(async (req, res) => {
    if (options.latencyMs) await new Promise((r) => setTimeout(r, options.latencyMs));
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'x-request-id': randomUUID(), 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end(); }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const path = new URL(req.url, 'http://' + (req.headers.host ?? 'localhost'));
    if (req.method === 'PUT' && path.pathname.startsWith('/mock-storage/')) {
      const doc = api.getState().documents.find((d) => d.id === path.pathname.split('/').pop());
      if (doc) { doc.receivedBytes = raw.length; res.writeHead(200, headers); return res.end(); }
    }
    let body = null;
    try { if (raw.length) body = JSON.parse(raw.toString('utf8')); }
    catch { res.writeHead(422, headers); return res.end(JSON.stringify({ status: 422, code: 'VALIDATION_FAILED', detail: 'JSON kh?ng h?p l?.' })); }
    const result = api.request(path.href, { method: req.method, body, headers: req.headers });
    res.writeHead(result.status, headers);
    res.end(result.payload === undefined ? '' : JSON.stringify(result.payload));
  });
  return { server, getState: api.getState };
}
module.exports = { createApp };
