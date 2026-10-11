/** Resolve public files and internal links under Astro's configured base path. */
export function withBasePath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!base || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === base || path.startsWith(`${base}/`)
    || path.startsWith(`${base}?`) || path.startsWith(`${base}#`)) return path;
  return `${base}${path}`;
}
