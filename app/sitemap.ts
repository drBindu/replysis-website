import type { MetadataRoute } from 'next'

// Served at https://verchor.com/sitemap.xml — the list of pages we want Google to
// index. Submit this URL in Google Search Console to speed up indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://verchor.com'
  const now = new Date()
  const pages: { path: string; priority: number }[] = [
    { path: '', priority: 1.0 },
    { path: '/features', priority: 0.9 },
    { path: '/how-it-works', priority: 0.9 },
    { path: '/pricing', priority: 0.9 },
    { path: '/terms', priority: 0.3 },
    { path: '/privacy', priority: 0.3 },
    { path: '/cookies', priority: 0.3 },
  ]
  return pages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: p.priority,
  }))
}
