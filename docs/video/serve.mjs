/**
 * Serves docs/ over the LAN with range request support.
 *
 * Python's http.server answers a Range request with the whole file and a 200,
 * so a browser cannot seek: dragging the scrubber on the half hour deep dive
 * restarts it, and the embedded chapter markers become decorative. Video needs
 * 206 Partial Content, which is all this adds.
 *
 *   node serve.mjs                 → 0.0.0.0:8081
 *   node serve.mjs --port 8080 --host 192.168.88.99
 */

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import path from 'node:path'

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag)
  return i === -1 ? fallback : process.argv[i + 1]
}

const PORT = Number(arg('--port', 8081))
const HOST = arg('--host', '0.0.0.0')
const ROOT = path.resolve(import.meta.dirname, '..')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0])
    let file = path.join(ROOT, url)

    // Contain the served tree: a request for ../../ must not escape docs/.
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden')
      return
    }

    let info
    try {
      info = await stat(file)
    } catch {
      res.writeHead(404).end('not found')
      return
    }
    if (info.isDirectory()) {
      file = path.join(file, 'index.html')
      try {
        info = await stat(file)
      } catch {
        res.writeHead(404).end('not found')
        return
      }
    }

    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
    const range = req.headers.range

    // The point of this server. Without a 206 and a Content-Range, a browser
    // cannot jump to a timestamp in a video it has not downloaded in full.
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range)
      if (m) {
        const start = m[1] ? Number(m[1]) : 0
        const end = m[2] ? Number(m[2]) : info.size - 1
        if (start >= info.size || end >= info.size || start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end()
          return
        }
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Range': `bytes ${start}-${end}/${info.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Cache-Control': 'no-cache',
        })
        createReadStream(file, { start, end }).pipe(res)
        return
      }
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': info.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    })
    createReadStream(file).pipe(res)
  } catch (err) {
    res.writeHead(500).end(String(err))
  }
}).listen(PORT, HOST, () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address)
  console.log(`serving ${ROOT}`)
  for (const ip of ips) console.log(`  http://${ip}:${PORT}/video/`)
})
