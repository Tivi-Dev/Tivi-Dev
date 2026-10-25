import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Responsive variants of the raster images that Keystatic stores in public/images. The originals stay where they are
 * (and remain the fallback); `astro build` adds smaller AVIF and WebP copies next to them in dist, e.g.
 * /images/cards/mini-mail/image.png → image.640w.avif / image.640w.webp. Component and build step share these rules.
 */
const candidateWidths = [48, 96, 160, 320, 480, 640, 960, 1280, 1600];
export const variantFormats = ['avif', 'webp'] as const;
type VariantFormat = (typeof variantFormats)[number];
const encoderOptions = { avif: { quality: 60 }, webp: { quality: 82 } } satisfies Record<VariantFormat, object>;

export const isOptimizable = (src: string) => /^\/images\/.+\.(png|jpe?g)$/i.test(src);

/** Widths generated for an image: every candidate below its own width, plus the original width. */
export const variantWidths = (originalWidth: number) => [...candidateWidths.filter(width => width < originalWidth), originalWidth];

export const variantPath = (src: string, width: number, format: VariantFormat) => src.replace(/\.[^./]+$/, `.${width}w.${format}`);

type ImageSize = { width: number; height: number };
const metadataCache = new Map<string, { version: string; size: Promise<ImageSize | null> }>();

/**
 * Pixel size of a file in public/ (null if it is missing or unreadable, e.g. a path that Keystatic no longer has).
 * Keystatic replaces an image under the same path, and `astro dev` keeps this module loaded, so a cached size is only
 * reused while the file's modification time and byte size are unchanged.
 */
export const publicImageSize = (src: string, publicDir = path.join(process.cwd(), 'public')) => {
  const file = path.join(publicDir, src);
  const stats = existsSync(file) ? statSync(file) : null;
  const version = stats ? `${stats.mtimeMs}:${stats.size}` : 'missing';
  const cached = metadataCache.get(file);
  if (cached?.version === version) return cached.size;
  const size = stats
    ? sharp(file).metadata().then(({ width, height }) => (width && height ? { width, height } : null), () => null)
    : Promise.resolve(null);
  metadataCache.set(file, { version, size });
  return size;
};

/**
 * How much wider than its box an image is drawn with object-fit: cover (and an optional zoom), so that `sizes` asks for
 * enough pixels: a 16:9 photo in a square box shows only its middle, at 1.78 × the box width.
 */
export const coverScale = (size: { width: number; height: number } | null, boxAspect: number, zoom = 1) =>
  Number(((size ? Math.max(1, size.width / size.height / boxAspect) : 1) * Math.max(1, zoom)).toFixed(2));

const cacheDir = path.join(process.cwd(), 'node_modules', '.cache', 'responsive-images');

/** Raise to discard all cached variants, e.g. after a change to how they are resized. */
const cacheVersion = 1;

/**
 * Cache key of one encoded variant: the source content plus everything that changes the output (width, format,
 * encoder settings, sharp/libvips version), so changed settings never reuse an outdated file.
 */
export const variantCacheKey = (sourceHash: string, width: number, format: VariantFormat, options: object = encoderOptions[format]) =>
  createHash('sha256')
    .update(JSON.stringify({ cacheVersion, sourceHash, width, format, options, sharp: sharp.versions }))
    .digest('hex').slice(0, 32);

/** Build step: writes all variants for every PNG/JPEG under `<dist>/images`. Encoded files are cached (see above). */
export async function writeImageVariants(distDir: string, log: (message: string) => void) {
  const imagesDir = path.join(distDir, 'images');
  if (!existsSync(imagesDir)) return;
  await mkdir(cacheDir, { recursive: true });
  const files = (await readdir(imagesDir, { recursive: true }))
    .map(file => `/images/${file.split(path.sep).join('/')}`)
    .filter(isOptimizable);
  let written = 0;
  for (const src of files) {
    const source = await readFile(path.join(distDir, src));
    const hash = createHash('sha256').update(source).digest('hex');
    const { width } = await sharp(source).metadata();
    if (!width) continue;
    for (const variantWidth of variantWidths(width)) {
      for (const format of variantFormats) {
        const cached = path.join(cacheDir, `${variantCacheKey(hash, variantWidth, format)}.${format}`);
        if (!existsSync(cached)) {
          const image = sharp(source).resize({ width: variantWidth, withoutEnlargement: true });
          await writeFile(cached, await (format === 'avif' ? image.avif(encoderOptions.avif) : image.webp(encoderOptions.webp)).toBuffer());
        }
        await writeFile(path.join(distDir, variantPath(src, variantWidth, format)), await readFile(cached));
        written++;
      }
    }
  }
  log(`${written} Bildvarianten für ${files.length} Bilder geschrieben`);
}
