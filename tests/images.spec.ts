import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { publicImageSize, variantCacheKey, writeImageVariants } from '../src/lib/responsive-images';

/** Phase 2B: responsive images from public/images, the web font and a stable first layout, in the production build. */

const pages = ['', 'impressum/', 'datenschutz/'];

for (const path of pages) {
  test(`Bilder laden unter dem GitHub-Pages-Basispfad: /${path}`, async ({ page }) => {
    const failed: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    // Lazy images (also in closed project dialogs) are loaded on purpose, so every image of the page is checked.
    const images = await page.locator('img').evaluateAll(elements => Promise.all(elements.map(element => {
      const image = element as HTMLImageElement;
      image.loading = 'eager';
      return image.decode().then(() => ({ src: image.currentSrc, width: image.naturalWidth }), () => ({ src: image.currentSrc || image.src, width: 0 }));
    })));
    for (const { src, width } of images) {
      expect(new URL(src).pathname, src).toMatch(/^\/Tivi-Dev\//);
      expect(width, `${src} wurde nicht geladen`).toBeGreaterThan(0);
    }
    expect(failed).toEqual([]);
  });
}

test('Startseite: Keystatic-Bilder werden als AVIF in passender Breite geladen', async ({ page }) => {
  await page.goto('', { waitUntil: 'networkidle' });
  const pictures = page.locator('picture');
  expect(await pictures.count()).toBeGreaterThan(0);
  for (const picture of await pictures.all()) {
    const { sources, fallback } = await picture.evaluate(element => ({
      sources: [...element.querySelectorAll('source')].map(source => ({ type: source.type, srcset: source.srcset, sizes: source.sizes })),
      fallback: element.querySelector('img')!.getAttribute('src')!,
    }));
    // AVIF first, WebP second, the original PNG/JPEG as <img src>.
    expect(sources.map(source => source.type)).toEqual(['image/avif', 'image/webp']);
    expect(fallback).toMatch(/^\/Tivi-Dev\/images\/.+\.(png|jpe?g)$/i);
    for (const source of sources) {
      expect(source.sizes).not.toBe('');
      for (const candidate of source.srcset.split(', ')) expect(candidate).toMatch(/^\/Tivi-Dev\/images\/.+\.\d+w\.(avif|webp) \d+w$/);
    }
  }
  // The LCP photo: high priority, never lazy, and the browser picks an AVIF variant instead of the 1.5 MB PNG.
  const photo = page.locator('.home-photo img');
  await expect(photo).toHaveAttribute('fetchpriority', 'high');
  await expect(photo).not.toHaveAttribute('loading', 'lazy');
  const { src, drawnWidth, originalWidth } = await photo.evaluate((image: HTMLImageElement) => {
    // object-fit: cover crops the photo to its box, so it is drawn wider than the box when it is relatively wider
    // (the bounding box already includes the zoom transform). The aspect ratio does not depend on the chosen file.
    const box = image.getBoundingClientRect();
    const drawn = Math.max(box.width, box.height * image.naturalWidth / image.naturalHeight);
    return { src: image.currentSrc, drawnWidth: drawn * devicePixelRatio, originalWidth: Number(image.getAttribute('width')) };
  });
  expect(src).toMatch(/\.\d+w\.avif$/);
  // The chosen file has at least as many pixels as the photo is drawn wide, up to the original's own width.
  // naturalWidth cannot tell: with srcset it is in CSS pixels, so the width comes from the file name.
  expect(Number(src.match(/\.(\d+)w\.avif$/)![1])).toBeGreaterThanOrEqual(Math.min(Math.floor(drawnWidth), originalWidth));
});

test('Bildvarianten entsprechen dem Original (Seitenverhältnis, Breite)', async () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const variants = [...new Set([...html.matchAll(/\/Tivi-Dev(\/images\/[^ "]+\.(\d+)w\.(?:avif|webp))/g)].map(match => match[1]))];
  expect(variants.length).toBeGreaterThan(0);
  for (const variant of variants) {
    // The original keeps its own extension (PNG or JPEG, any case) next to the variants.
    const base = variant.replace(/\.\d+w\.(avif|webp)$/, '');
    const originalFile = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG'].map(extension => `dist${base}.${extension}`).find(file => existsSync(file));
    expect(originalFile, `Original zu ${variant}`).toBeDefined();
    const original = await sharp(originalFile).metadata();
    const metadata = await sharp(`dist${variant}`).metadata();
    expect(metadata.width, variant).toBe(Number(variant.match(/\.(\d+)w\./)![1]));
    expect(Math.abs(metadata.width! / metadata.height! - original.width! / original.height!), variant).toBeLessThan(.01);
  }
});

test('Bildmaße folgen einem unter gleichem Pfad ersetzten Bild (Keystatic, astro dev)', async () => {
  const publicDir = mkdtempSync(path.join(tmpdir(), 'responsive-images-'));
  try {
    mkdirSync(path.join(publicDir, 'images'));
    const file = path.join(publicDir, 'images', 'photo.png');
    const writeImage = (width: number, height: number) =>
      sharp({ create: { width, height, channels: 3, background: '#3a6' } }).png().toFile(file);
    await writeImage(400, 200);
    expect(await publicImageSize('/images/photo.png', publicDir)).toEqual({ width: 400, height: 200 });
    // Unchanged file: the cached result is reused.
    expect(publicImageSize('/images/photo.png', publicDir)).toBe(publicImageSize('/images/photo.png', publicDir));
    await writeImage(300, 300);
    expect(await publicImageSize('/images/photo.png', publicDir)).toEqual({ width: 300, height: 300 });
    rmSync(file);
    expect(await publicImageSize('/images/photo.png', publicDir)).toBeNull();
  } finally {
    rmSync(publicDir, { recursive: true, force: true });
  }
});

test('Build-Schritt erzeugt Varianten auch für JPEG-Originale', async () => {
  const distDir = mkdtempSync(path.join(tmpdir(), 'responsive-images-dist-'));
  try {
    mkdirSync(path.join(distDir, 'images', 'cards'), { recursive: true });
    const image = sharp({ create: { width: 500, height: 250, channels: 3, background: '#a63' } });
    await image.clone().jpeg().toFile(path.join(distDir, 'images', 'cards', 'photo.jpg'));
    await image.clone().jpeg().toFile(path.join(distDir, 'images', 'cards', 'scan.JPEG'));
    await writeImageVariants(distDir, () => {});
    for (const name of ['photo', 'scan']) {
      for (const width of [48, 96, 160, 320, 480, 500]) {
        for (const format of ['avif', 'webp']) {
          const metadata = await sharp(path.join(distDir, 'images', 'cards', `${name}.${width}w.${format}`)).metadata();
          expect([metadata.format, metadata.width, metadata.height]).toEqual([format === 'avif' ? 'heif' : 'webp', width, width / 2]);
        }
      }
    }
  } finally {
    rmSync(distDir, { recursive: true, force: true });
  }
});

test('Varianten-Cache: geänderte Encoder-Einstellungen ergeben einen neuen Schlüssel', () => {
  const key = variantCacheKey('abc', 640, 'avif');
  expect(variantCacheKey('abc', 640, 'avif')).toBe(key);
  expect(variantCacheKey('abc', 640, 'avif', { quality: 61 })).not.toBe(key);
  expect(variantCacheKey('abd', 640, 'avif')).not.toBe(key);
  expect(variantCacheKey('abc', 480, 'avif')).not.toBe(key);
  expect(variantCacheKey('abc', 640, 'webp')).not.toBe(key);
});

test('Schrift wird als WOFF2 vorgeladen und genutzt', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'font') fonts.push(new URL(request.url()).pathname); });
  await page.goto('', { waitUntil: 'networkidle' });
  const preload = await page.locator('link[rel="preload"][as="font"]').getAttribute('href');
  expect(preload).toMatch(/^\/Tivi-Dev\/_astro\/Manrope-VariableFont_wght\.[\w-]+\.woff2$/);
  expect(fonts).toEqual([preload]);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Manrope Variable"'))).toBe(true);
});

test('Ohne JavaScript bleibt das mobile Menü offen und erreichbar', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('#main-navigation')).toBeVisible();
  await expect(page.locator('.nav-toggle')).toBeHidden();
  await context.close();
});

test('Startseite: kein Layout-Shift beim Laden auf langsamer Verbindung', async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  // Every shift counts: the test sends no input, yet Chromium flags the early shifts of an emulated phone with
  // hadRecentInput, so filtering on it (as CLS does for real input) would hide exactly the menu regression.
  await page.addInitScript(() => {
    (window as unknown as { layoutShift: number }).layoutShift = 0;
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      (window as unknown as { layoutShift: number }).layoutShift += (entry as unknown as { value: number }).value;
    })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('', { waitUntil: 'load', timeout: 60_000 });
  // Settled: web font applied, every image in the first viewport decoded, and two more frames for the observer.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images]
      .filter(image => image.getBoundingClientRect().top < innerHeight && image.loading !== 'lazy')
      .map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  // The throttled connection really exposes the late phase: the images arrive only after the first paint.
  const { firstPaint, imagesLoaded } = await page.evaluate(() => ({
    firstPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? Infinity,
    imagesLoaded: Math.max(0, ...(performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter(entry => entry.initiatorType === 'img' && new URL(entry.name).pathname.startsWith('/Tivi-Dev/images/'))
      .map(entry => entry.responseEnd)),
  }));
  expect(imagesLoaded).toBeGreaterThan(firstPaint);
  // The sum of all shifts is at least Lighthouse's CLS (its largest session window). Lighthouse rates
  // up to 0.1 as good. Before Phase 2B the mobile menu collapsed only once its script had run (0.19–0.26 on
  // phones); the class `js` is now set in <head>, before the first paint.
  expect(await page.evaluate(() => (window as unknown as { layoutShift: number }).layoutShift)).toBeLessThan(.05);
});
