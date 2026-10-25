import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { metaDescriptionLength, metaDescriptionSchema } from '../src/lib/meta-description';
import { metaDescriptionField } from '../src/lib/meta-description-field';
import { renderSocialPreview, socialPreviewSource } from '../src/lib/social-preview';

/** Phase 2C: metadata, canonical URLs, link previews, sitemap and crawlable links in the production build. */

// The published GitHub Pages address (repository Tivi-Dev/Tivi-Dev, base /Tivi-Dev).
const publicOrigin = 'https://tivi-dev.github.io';
const publicBase = `${publicOrigin}/Tivi-Dev/`;
const indexable = ['', 'impressum/', 'datenschutz/'];
const redirects = ['skills', 'projekte', 'ueber-mich', 'kontakt'];

// The checks read the built HTML; they do not depend on the viewport.
test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'desktop', 'Metadaten sind unabhängig vom Viewport'));

/** Maps a public URL to the local preview server, which serves the same build under the same base path. */
const local = (url: string, baseURL: string) => url.replace(publicOrigin, new URL(baseURL).origin);

const head = (page: Page) => page.evaluate(() => {
  const meta = (key: string) => document.querySelector<HTMLMetaElement>(`meta[property="${key}"], meta[name="${key}"]`)?.content ?? null;
  return {
    title: document.title,
    description: meta('description'),
    robots: meta('robots'),
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? null,
    og: Object.fromEntries([...document.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]')].map(tag => [tag.getAttribute('property')!, tag.content])),
    twitterCard: meta('twitter:card'),
  };
});

/** Head tags that must appear at most once; a second copy with another value leaves crawlers to guess. */
const repeatedTags = (page: Page) => page.evaluate(() => {
  // HTML compares rel, name and property without regard to case, and so do crawlers: DESCRIPTION is a description.
  const keys = [
    ...[...document.querySelectorAll('link[rel~="canonical" i]')].map(() => 'canonical'),
    ...[...document.querySelectorAll<HTMLMetaElement>('meta[name], meta[property]')]
      .map(tag => (tag.getAttribute('property') ?? tag.getAttribute('name')!).trim().toLowerCase())
      .filter(key => /^(description|robots|og:.+|twitter:.+)$/.test(key)),
  ];
  return [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
});

/** Characters as Keystatic and the content schema count them: code points of the trimmed text. */
const descriptionLength = (description: string) => Array.from(description.trim()).length;

test('Titel, Beschreibung, Canonical und Open Graph sind je Seite korrekt und eindeutig', async ({ page }) => {
  const titles: string[] = [];
  const descriptions: string[] = [];
  for (const path of indexable) {
    await page.goto(path);
    const { title, description, robots, canonical, og, twitterCard } = await head(page);
    const url = `${publicBase}${path}`;
    expect(await repeatedTags(page), path).toEqual([]);
    expect(robots, path).toBeNull();
    expect(canonical, path).toBe(url);
    expect(description, path).not.toMatch(/^(test|todo|lorem|beschreibung)\b/i);
    expect(descriptionLength(description!), `${path}: ${description}`).toBeGreaterThanOrEqual(50);
    expect(descriptionLength(description!), `${path}: ${description}`).toBeLessThanOrEqual(160);
    expect(og).toMatchObject({
      'og:type': 'website', 'og:locale': 'de_DE', 'og:title': title, 'og:description': description, 'og:url': url,
      'og:image': `${publicBase}social-preview.jpg`, 'og:image:type': 'image/jpeg', 'og:image:width': '1200', 'og:image:height': '630',
    });
    expect(og['og:site_name']).toBeTruthy();
    expect(twitterCard).toBe('summary_large_image');
    titles.push(title);
    descriptions.push(description!);
  }
  expect(new Set(titles).size).toBe(indexable.length);
  expect(new Set(descriptions).size).toBe(indexable.length);
});

test('Vorschaubild: erreichbar, JPEG in 1200 × 630, mit Beschreibung des Fotos', async ({ page, request, baseURL }) => {
  await page.goto('');
  const { og } = await head(page);
  const response = await request.get(local(og['og:image'], baseURL!));
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/jpeg');
  const body = await response.body();
  // Small enough for messengers that skip large previews (WhatsApp: about 600 KB).
  expect(body.length).toBeLessThan(300_000);
  const { format, width, height } = await sharp(body).metadata();
  expect([format, width, height]).toEqual(['jpeg', 1200, 630]);
  // The preview shows the start page photo, so it carries the same description.
  expect(og['og:image:alt']).toBe(await page.locator('.home-photo img').getAttribute('alt'));
});

test('Sitemap listet genau die indexierbaren Seiten mit ihrer öffentlichen Adresse', async ({ page, request, baseURL }) => {
  const response = await request.get('sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('xml');
  const locations = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(locations).toEqual(indexable.map(path => `${publicBase}${path}`));
  for (const location of locations) {
    await page.goto(local(location, baseURL!));
    const { canonical, robots } = await head(page);
    expect(canonical).toBe(location);
    expect(robots).toBeNull();
  }
});

test('404-Seite und Weiterleitungsseiten werden nicht indexiert', async ({ page }) => {
  const notFound = await page.goto('gibt-es-nicht/');
  expect(notFound?.status()).toBe(404);
  expect(await head(page)).toMatchObject({ robots: 'noindex', canonical: null });
  expect(await repeatedTags(page)).toEqual([]);
  for (const id of redirects) {
    // Old section addresses lead to the section on the start page; they are not separate pages.
    await page.goto(`${id}/`, { waitUntil: 'commit' });
    expect(await page.locator('meta[name="robots"]').getAttribute('content'), id).toBe('noindex');
    await expect(page).toHaveURL(new RegExp(`/Tivi-Dev/#${id}$`), { timeout: 10_000 });
  }
});

test('Doppelte Canonical-, Description-, Robots-, Open-Graph- und X-Tags werden erkannt, auch in anderer Schreibweise', async ({ page }) => {
  // The checks above pass only because the pages are clean; here each injected pair has to be found on its own.
  await page.goto('');
  expect(await repeatedTags(page)).toEqual([]);
  const pairs: [string, string, string][] = [
    ['canonical', '<link rel="canonical" href="https://example.org/a">', '<link rel="canonical" href="https://example.org/b">'],
    ['canonical', '<link rel="canonical" href="https://example.org/a">', '<link rel="CANONICAL" href="https://example.org/b">'],
    ['description', '<meta name="description" content="a">', '<meta name="DESCRIPTION" content="b">'],
    ['og:title', '<meta property="og:title" content="a">', '<meta property="OG:TITLE" content="b">'],
    ['og:image', '<meta property="og:image" content="a">', '<meta property="og:image" content="b">'],
    ['twitter:card', '<meta name="twitter:card" content="summary">', '<meta name="TWITTER:CARD" content="summary">'],
    ['robots', '<meta name="robots" content="noindex">', '<meta name="ROBOTS" content="index">'],
  ];
  for (const [key, ...tags] of pairs) {
    // Pages that already carry the tag need only one more copy; the others get both.
    const added = await page.evaluate(([key, ...tags]) => {
      const present = key === 'canonical' ? document.querySelector('link[rel="canonical"]') : document.querySelector(`meta[name="${key}"], meta[property="${key}"]`);
      const elements = (present ? tags.slice(1) : tags).map(html => document.createRange().createContextualFragment(html).firstElementChild!);
      elements.forEach(element => element.setAttribute('data-test-copy', ''));
      document.head.append(...elements);
      return elements.length;
    }, [key, ...tags]);
    expect(await repeatedTags(page), `${tags.join(' + ')} (${added} eingefügt)`).toEqual([key]);
    await page.evaluate(() => document.querySelectorAll('[data-test-copy]').forEach(element => element.remove()));
  }
  expect(await repeatedTags(page)).toEqual([]);
});

test('Beschreibung: Keystatic und Build zählen gleich, 50 bis 160 Unicode-Zeichen ohne Leerzeichen am Rand', () => {
  const keystatic = (value: string) => {
    try {
      metaDescriptionField.validate(value, undefined);
      return true;
    } catch {
      return false;
    }
  };
  const build = (value: string) => metaDescriptionSchema.safeParse(value);
  // Independent reference: code points of the trimmed text, so an emoji counts once.
  const expected = (value: string) => {
    const length = [...value.trim()].length;
    return length >= metaDescriptionLength.min && length <= metaDescriptionLength.max;
  };
  const check = (value: string, label: string) => {
    expect(keystatic(value), `Keystatic: ${label}`).toBe(expected(value));
    const result = build(value);
    expect(result.success, `Build: ${label}`).toBe(expected(value));
    // Text accepted in the editor is published without the surrounding spaces.
    if (result.success) expect(result.data, label).toBe(value.trim());
  };
  expect(metaDescriptionLength).toEqual({ min: 50, max: 160 });

  // The reported case: 50 UTF-16 units, but only 49 characters.
  expect(keystatic('A'.repeat(48) + '😀')).toBe(false);
  expect(build('A'.repeat(48) + '😀').success).toBe(false);
  expect(keystatic('A'.repeat(49) + '😀')).toBe(true);
  expect(build('A'.repeat(49) + '😀').success).toBe(true);
  // Upper limit: 161 UTF-16 units, but 160 characters, so the editor, the build and the page check accept it.
  const longest = 'A'.repeat(159) + '😀';
  expect([longest.length, descriptionLength(longest)]).toEqual([161, 160]);
  expect(keystatic(longest)).toBe(true);
  expect(build(longest).success).toBe(true);

  for (const value of ['', ' ', ' '.repeat(80), '\n\t \n', '\u00a0\u3000'.repeat(60)]) check(value, `nur Leerraum ${JSON.stringify(value)}`);
  // Single code units, characters outside the BMP (two units each) and an emoji sequence of three code points.
  const fillers = ['a', 'ä', '中', '😀', '𝔄', '👩‍💻'];
  const paddings = ['', '   ', '\n\t', '\u00a0', '\u3000', '\ufeff'];
  for (const filler of fillers) {
    for (const length of [49, 50, 160, 161]) {
      // Cut by code points; a cut emoji sequence still has the counted number of code points.
      const text = [...filler.repeat(length)].slice(0, length).join('');
      expect([...text].length).toBe(length);
      for (const padding of paddings) check(padding + text + padding, `${filler} × ${length} mit ${JSON.stringify(padding)}`);
    }
  }
  // Mixed text with an emoji at both edges, where a pattern without the u flag would match only half of it.
  for (const length of [49, 50, 160, 161]) check('😀' + 'ä'.repeat(length - 2) + '😀', `Emoji am Rand, ${length}`);
});

test('Vorschaubild liest nur Dateien aus public/images/homepage', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'social-preview-'));
  try {
    const dir = path.join(root, 'public', 'images', 'homepage');
    mkdirSync(path.join(dir, 'sub'), { recursive: true });
    await sharp({ create: { width: 300, height: 400, channels: 4, background: '#0000' } }).png().toFile(path.join(dir, 'sub', 'photo.png'));
    writeFileSync(path.join(root, 'secret.png'), 'nicht öffentlich');
    symlinkSync(path.join(root, 'secret.png'), path.join(dir, 'link.png'));

    expect(socialPreviewSource('/images/homepage/sub/photo.png', dir)).toBe(path.join(dir, 'sub', 'photo.png'));
    const { format, width, height } = await sharp(await renderSocialPreview('/images/homepage/sub/photo.png', dir)).metadata();
    expect([format, width, height]).toEqual(['jpeg', 1200, 630]);

    for (const photo of [
      '/images/homepage/../../../secret.png', '/images/homepage/sub/../../../../secret.png', '/images/homepage/..',
      '/images/homepage/', '/images/homepage', '/images/other/photo.png', '/secret.png', '../secret.png',
      path.join(root, 'secret.png'), '/images/homepage/link.png', '/images/homepage/photo.png\0.png',
    ]) {
      expect(() => socialPreviewSource(photo, dir), photo).toThrow(/außerhalb von \/images\/homepage\//);
      await expect(renderSocialPreview(photo, dir), photo).rejects.toThrow(/außerhalb/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** Every same-site link of a page: path under the base, target reachable, fragment present on the target page. */
const checkLinks = async (page: Page, request: APIRequestContext, path: string) => {
  await page.goto(path);
  const hrefs = await page.locator('a[href]').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
  const origin = new URL(page.url()).origin;
  const internal = [...new Set(hrefs)].filter(href => new URL(href).origin === origin);
  expect(internal.length, path).toBeGreaterThan(0);
  const current = new URL(page.url());
  for (const href of internal) {
    const url = new URL(href);
    expect(url.pathname, `${path} → ${href}`).toMatch(/^\/Tivi-Dev\//);
    // A fragment on the same page (skip link): the target must exist here; the page itself was already loaded.
    if (url.pathname === current.pathname && url.hash) {
      expect(await page.locator(url.hash).count(), `${path} → ${href}`).toBe(1);
      continue;
    }
    expect((await request.get(href)).status(), `${path} → ${href}`).toBe(200);
    if (!url.hash) continue;
    const target = await page.context().newPage();
    await target.goto(href);
    expect(await target.locator(url.hash).count(), `${path} → ${href}`).toBe(1);
    await target.close();
  }
};

for (const path of [...indexable, 'gibt-es-nicht/']) {
  test(`Interne Links und Anker funktionieren unter dem Basispfad: /${path}`, async ({ page, request }) => {
    await checkLinks(page, request, path);
  });
}

test('Strukturierte Daten: ProfilePage mit der auf der Seite genannten Person', async ({ page, request, baseURL }) => {
  await page.goto('');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);
  const data = JSON.parse(blocks[0]);
  expect(data).toMatchObject({ '@context': 'https://schema.org', '@type': 'ProfilePage', url: publicBase, mainEntity: { '@type': 'Person' } });
  // The name is the visible H1, not a separate value that could drift apart from the page.
  const heading = (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim();
  expect(data.mainEntity.name).toBe(heading);
  expect((await request.get(local(data.mainEntity.image, baseURL!))).status()).toBe(200);
  for (const path of ['impressum/', 'datenschutz/']) {
    await page.goto(path);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
});

test('Alt-Texte: Fotos beschrieben, Symbole neben ihrem Namen dekorativ', async ({ page }) => {
  await page.goto('');
  const images = await page.locator('img').evaluateAll(elements => elements.map(element => ({
    src: (element as HTMLImageElement).getAttribute('src'),
    alt: element.getAttribute('alt'),
    labelled: Boolean(element.closest('.skill-item, .project-card, [data-project-thumbnail]')?.textContent?.trim()),
  })));
  // Every image has an alt attribute; an empty one marks it as decorative for screen readers and search engines.
  for (const { src, alt } of images) expect(alt, src!).not.toBeNull();
  for (const selector of ['.home-photo img', '.profile-map__portrait img']) {
    const alt = await page.locator(selector).first().getAttribute('alt');
    expect(alt?.trim().length, selector).toBeGreaterThan(10);
  }
  // Empty alt only where visible text already names the image (skill icons, project cards, numbered thumbnails).
  for (const { src, alt, labelled } of images) if (alt === '') expect(labelled, `${src} ohne Alt-Text und ohne sichtbaren Namen`).toBe(true);
});
