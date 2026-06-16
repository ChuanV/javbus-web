import { JAVBUS } from './constants.js'

export const PAGE_REG = /^[1-9]\d*$/

export function formatImageUrl(url?: string): string | undefined {
  if (!url) return undefined
  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // Handle relative URLs starting with //
  if (url.startsWith('//')) {
    return `https:${url}`
  }
  // Handle relative URLs starting with /
  if (url.startsWith('/')) {
    return `${JAVBUS}${url}`
  }
  // Handle relative URLs without leading slash
  return `${JAVBUS}/${url}`
}
