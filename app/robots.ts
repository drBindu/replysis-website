import type { MetadataRoute } from 'next'

// Served at https://verchor.com/robots.txt — tells search engines they can crawl
// the public site and where to find the sitemap. Private/app routes are disallowed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    sitemap: 'https://verchor.com/sitemap.xml',
    host: 'https://verchor.com',
  }
}
