import got, { type ExtendOptions } from 'got'
import { HttpsProxyAgent } from 'https-proxy-agent'
import type { Agent as HttpsAgent } from 'node:https'
import { SocksProxyAgent } from 'socks-proxy-agent'
import * as tough from 'tough-cookie'

import { JAVBUS_TIMEOUT, USER_AGENT } from './constants.js'
import ENV from './env.js'

const cookieJar = new tough.CookieJar()

const PROXY_URL = ENV.HTTP_PROXY ?? ENV.HTTPS_PROXY

export let agent: HttpsAgent | undefined = undefined

if (PROXY_URL) {
  if (/^https?:\/\//.test(PROXY_URL)) {
    agent = new HttpsProxyAgent(PROXY_URL) as HttpsAgent
  } else if (PROXY_URL.startsWith('socks')) {
    agent = new SocksProxyAgent(PROXY_URL) as HttpsAgent
  }
}

const extendOptions: ExtendOptions = {
  headers: {
    'User-Agent': USER_AGENT,
    'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  },
  timeout: {
    request: JAVBUS_TIMEOUT,
  },
}

if (agent) {
  extendOptions.agent = { http: agent, https: agent }
}

const client = got.extend({
  ...extendOptions,
  cookieJar,
  retry: {
    limit: 2,
    methods: ['GET'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
    errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN'],
    maxRetryAfter: undefined,
  },
})

export default client
