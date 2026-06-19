import { Router } from 'express'
import got from 'got'
import { agent } from './client.js'

const router = Router()

// GET /image/base64?url=<encoded_url>&referer=<optional_referer>
router.get('/getImage', async (req, res, next) => {
  const url = (req.query.url as string) || ''
  if (!url) {
    res.status(400).json({ error: 'url is required' })
    return
  }
  try {
    const imageBuffer = got.stream(url, {
      agent: {
        http: agent,
        https: agent,
      },
      headers: {
        Referer: 'https://www.javbus.com/',
      },
    })
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=300')
    // 管道流直接输出到前端
    imageBuffer.pipe(res)
    // 流异常捕获，避免服务崩溃
    imageBuffer.on('error', (err) => {
      next(err)
    })
  } catch (e) {
    next(e)
  }
})

export default router
