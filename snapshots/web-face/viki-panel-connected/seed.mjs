#!/usr/bin/env node
/**
 * Deterministic OpenViking mock for the connected-state Viki scene. Serves exactly the
 * endpoints the Viki host route reads: /health, fs/ls, fs/attrs, stats/memories, tasks,
 * skills. One fixed memory row; no writes, no timestamps that drift.
 *
 * Run: node seed.mjs [--port 19433]   (stays alive; Ctrl-C to stop)
 */
import { createServer } from 'node:http'

const portArg = process.argv.indexOf('--port')
const port = portArg === -1 ? 19433 : Number(process.argv[portArg + 1])
const memoryUri = 'viking://user/default/memories/identity.md'

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  res.setHeader('content-type', 'application/json; charset=utf-8')
  if (url.pathname === '/health') {
    res.end(JSON.stringify({ status: 'ok', healthy: true, version: '0.5.1.1', auth_mode: 'dev' }))
    return
  }
  if (url.pathname === '/api/v1/fs/ls') {
    const uri = url.searchParams.get('uri')
    if (uri === 'viking://user/default/memories') {
      res.end(JSON.stringify({ status: 'ok', result: [{ uri: memoryUri, isDir: false, size: 96, modTime: '2026-09-30T00:00:00Z' }] }))
      return
    }
    res.end(JSON.stringify({ status: 'ok', result: [] }))
    return
  }
  if (url.pathname === '/api/v1/fs/attrs') {
    res.end(JSON.stringify({ status: 'ok', result: { attrs: { memory: { summary: '固定夹具：身份页摘要，用于 Viki 连接态 DOM 回归。', memory_type: 'identity' } } } }))
    return
  }
  if (url.pathname === '/api/v1/search/find') {
    res.end(JSON.stringify({ status: 'ok', result: [{ uri: memoryUri, score: 0.92, summary: '固定夹具：身份页摘要，用于 Viki 连接态 DOM 回归。' }] }))
    return
  }
  if (url.pathname === '/api/v1/stats/memories') {
    res.end(JSON.stringify({ status: 'ok', result: { memories: { events: 0 } } }))
    return
  }
  if (url.pathname === '/api/v1/tasks' || url.pathname === '/api/v1/skills') {
    res.end(JSON.stringify({ status: 'ok', result: [] }))
    return
  }
  res.statusCode = 404
  res.end(JSON.stringify({ status: 'error', error: 'not found' }))
})

server.listen(port, '127.0.0.1', () => console.log(`viki mock on http://127.0.0.1:${port}`))
