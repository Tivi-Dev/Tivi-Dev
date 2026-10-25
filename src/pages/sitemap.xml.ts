import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/site-url';

// The indexable pages. Not listed: the 404 page and the redirect pages /skills/, /projekte/, … (noindex, they lead to
// sections of the start page). A robots.txt cannot point here: crawlers read it only at the domain root, which
// belongs to another repository on GitHub Pages (see audits/phase2c-seo.md).
const pages = ['/', '/impressum/', '/datenschutz/'];

export const GET: APIRoute = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    pages.map(page => `  <url><loc>${absoluteUrl(page)}</loc></url>`).join('\n')
  }\n</urlset>\n`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
