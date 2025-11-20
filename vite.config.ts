import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { defineConfig } from 'vite'

const dataDir = path.resolve(__dirname, 'data')
const categoriesFile = path.join(dataDir, 'categories.json')
const processesDir = path.join(dataDir, 'processes')
const originalsDir = path.join(dataDir, 'original')

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const readJson = (filePath: string) => JSON.parse(fs.readFileSync(filePath, 'utf-8'))

const writeJson = (filePath: string, data: unknown) =>
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

const processFileName = (categoryId: string, processId: string) =>
  `${categoryId}-${processId}.json`

const getProcessPath = (categoryId: string, processId: string) =>
  path.join(processesDir, processFileName(categoryId, processId))

const getOriginalPath = (categoryId: string, processId: string) =>
  path.join(originalsDir, processFileName(categoryId, processId))

const toTitleCase = (value: string) =>
  value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')

const defaultProcessDocument = (
  categoryId: string,
  categoryName: string,
  processId: string,
  processName: string
) => {
  const baseId = `${categoryId}-${processId}`
  const titleCategory = categoryName || toTitleCase(categoryId)
  const titleProcess = processName || toTitleCase(processId)
  const now = new Date().toISOString()

  return {
    meta: {
      categoryId,
      processId,
      title: `${titleCategory} ${titleProcess} Flow`,
      description: `Auto-generated process for ${titleCategory} · ${titleProcess}`,
      updatedAt: now
    },
    nodes: [
      {
        id: `${baseId}-step-1`,
        type: 'processNode',
        position: { x: 280, y: -20 },
        data: {
          title: 'New step',
          description: 'Describe this step so teammates know what needs to happen.'
        }
      },
      {
        id: `${baseId}-step-2`,
        type: 'processNode',
        position: { x: 480, y: 120 },
        data: {
          title: 'New step',
          description: 'Describe this step so teammates know what needs to happen.'
        }
      },
      {
        id: `${baseId}-step-3`,
        type: 'processNode',
        position: { x: 80, y: 120 },
        data: {
          title: 'New step',
          description: 'Describe this step so teammates know what needs to happen.'
        }
      }
    ],
    edges: [
      {
        id: `${baseId}-edge-1`,
        type: 'processEdge',
        source: `${baseId}-step-1`,
        sourceHandle: 'right',
        target: `${baseId}-step-2`,
        targetHandle: 'top',
        data: {
          label: 'Yes',
          color: '#94a3b8',
          lineStyle: 'solid',
          arrow: 'arrow',
          branchStyle: 'default'
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#94a3b8'
        }
      },
      {
        id: `${baseId}-edge-2`,
        type: 'processEdge',
        source: `${baseId}-step-1`,
        sourceHandle: 'left',
        target: `${baseId}-step-3`,
        targetHandle: 'top',
        data: {
          label: 'No',
          color: '#94a3b8',
          lineStyle: 'solid',
          arrow: 'arrow',
          branchStyle: 'default'
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#94a3b8'
        }
      }
    ]
  }
}

const readBody = async (req: IncomingMessage) =>
  await new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', (err) => reject(err))
  })

const parseJsonBody = async <T>(req: IncomingMessage) => {
  const raw = await readBody(req)
  if (!raw) {
    return {} as T
  }
  return JSON.parse(raw) as T
}

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const ensureOriginalSnapshots = () => {
  ensureDir(originalsDir)
  if (!fs.existsSync(processesDir)) return
  const files = fs.readdirSync(processesDir)
  files.forEach((file) => {
    const source = path.join(processesDir, file)
    const destination = path.join(originalsDir, file)
    if (!fs.existsSync(destination)) {
      fs.copyFileSync(source, destination)
    }
  })
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'processes-fs-api',
      configureServer(server) {
        ensureDir(dataDir)
        ensureDir(processesDir)
        ensureOriginalSnapshots()

        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/')) {
            return next()
          }

          const url = new URL(req.url, 'http://localhost')
          const method = req.method?.toUpperCase() ?? 'GET'

          try {
            if (url.pathname === '/api/categories') {
              if (method === 'GET') {
                if (!fs.existsSync(categoriesFile)) {
                  writeJson(categoriesFile, { categories: [] })
                }
                const categories = readJson(categoriesFile)
                return sendJson(res, 200, categories)
              }

              if (method === 'PUT') {
                const body = await parseJsonBody<{ categories: unknown }>(req)
                if (!body || typeof body !== 'object' || !('categories' in body)) {
                  return sendJson(res, 400, { message: 'Invalid categories payload' })
                }
                writeJson(categoriesFile, body)
                return sendJson(res, 200, body)
              }
            }

            if (url.pathname === '/api/process' && method === 'POST') {
              const body = await parseJsonBody<{
                categoryId: string
                categoryName?: string
                processId: string
                processName?: string
              }>(req)

              if (!body.categoryId || !body.processId) {
                return sendJson(res, 400, { message: 'Missing identifiers' })
              }

              const doc = defaultProcessDocument(
                body.categoryId,
                body.categoryName ?? '',
                body.processId,
                body.processName ?? ''
              )
              const filePath = getProcessPath(body.categoryId, body.processId)
              writeJson(filePath, doc)
              ensureDir(originalsDir)
              fs.copyFileSync(filePath, getOriginalPath(body.categoryId, body.processId))
              return sendJson(res, 201, doc)
            }

            const parts = url.pathname.split('/').filter(Boolean)
            if (parts[0] === 'api' && parts[1] === 'process' && parts.length >= 4) {
              const [, , categoryId, processId, action] = parts
              const processPath = getProcessPath(categoryId, processId)
              const originalPath = getOriginalPath(categoryId, processId)

              if (action === 'reset' && method === 'POST') {
                if (!fs.existsSync(originalPath)) {
                  ensureDir(originalsDir)
                  if (fs.existsSync(processPath)) {
                    fs.copyFileSync(processPath, originalPath)
                  } else {
                    const doc = defaultProcessDocument(categoryId, '', processId, '')
                    writeJson(originalPath, doc)
                  }
                }
                fs.copyFileSync(originalPath, processPath)
                const doc = readJson(processPath)
                return sendJson(res, 200, doc)
              }

              if (method === 'GET' && parts.length === 4) {
                if (!fs.existsSync(processPath)) {
                  return sendJson(res, 404, { message: 'Process not found' })
                }
                const doc = readJson(processPath)
                return sendJson(res, 200, doc)
              }

              if (method === 'PUT' && parts.length === 4) {
                if (!fs.existsSync(processPath)) {
                  return sendJson(res, 404, { message: 'Process not found' })
                }
                const body = await parseJsonBody<Record<string, unknown>>(req)
                if (typeof body !== 'object' || !body) {
                  return sendJson(res, 400, { message: 'Invalid process payload' })
                }
                if ('meta' in body && typeof body.meta === 'object' && body.meta) {
                  ;(body.meta as Record<string, unknown>).updatedAt = new Date().toISOString()
                }
                writeJson(processPath, body)
                return sendJson(res, 200, body)
              }

              if (method === 'DELETE' && parts.length === 4) {
                if (fs.existsSync(processPath)) {
                  fs.unlinkSync(processPath)
                }
                if (fs.existsSync(originalPath)) {
                  fs.unlinkSync(originalPath)
                }
                return sendJson(res, 204, {})
              }
            }

            return sendJson(res, 404, { message: 'Not found' })
          } catch (error) {
            console.error('[processes-fs-api]', error)
            return sendJson(res, 500, { message: 'Internal server error' })
          }
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/plugins': path.resolve(__dirname, 'plugins')
    }
  }
})

