/** Resolve public files and internal links under Astro's configured base path. */
export function withBasePath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!base || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === base || path.startsWith(`${base}/`)
    || path.startsWith(`${base}?`) || path.startsWith(`${base}#`)) return path;
  return `${base}${path}`;
}

/** Absolute public URL (`site` + base path), e.g. for canonical links, Open Graph and the sitemap. */
export const absoluteUrl = (path: string) => new URL(withBasePath(path), import.meta.env.SITE).href;
