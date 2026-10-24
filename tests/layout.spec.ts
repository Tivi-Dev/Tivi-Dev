import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { computedAlpha, contrastRatio, readableHeading, readableTextColor, shadowedBackground, shadowedContrast } from '../src/lib/contrast';
import { shadowAlpha, shadowValue } from '../src/lib/shadows';

const pages = [
  { name: 'Startseite', path: '' },
  { name: 'Impressum', path: 'impressum/' },
  { name: 'Datenschutz', path: 'datenschutz/' },
];

/** Heading levels in document order, without headings of closed dialogs (they are not exposed). */
const headingOutline = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')]
  .filter(heading => !heading.closest('dialog:not([open])'))
  .map(heading => ({ level: Number(heading.tagName[1]), text: heading.textContent!.trim().replace(/\s+/g, ' ') })));

/**
 * Independent contrast check from what the browser actually renders: computed text colour and text shadow, and the
 * background layers painted under the text's centre (document.elementsFromPoint). Translucent layers are composited
 * over the first opaque one. If unknown content lies underneath instead (an image, or an unrelated element such as a
 * decorative SVG drawn above the backdrop), the worst case over anything from black to white is used. Returns null
 * when no bound can be given at all (e.g. text directly on a gradient or image background).
 */
const renderedContrast = async (element: Locator) => {
  const rendered = await element.evaluate(node => {
    const rgba = (value: string) => { const [r, g, b, a = 1] = value.match(/[\d.]+/g)!.map(Number); return [r, g, b, a]; };
    const style = getComputedStyle(node);
    node.scrollIntoView({ block: 'center', behavior: 'instant' });
    const bounds = node.getBoundingClientRect();
    const layers: number[][] = [];
    let base: number[] | null = null;
    for (const painted of document.elementsFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)) {
      if (painted === node && getComputedStyle(painted).backgroundColor === 'rgba(0, 0, 0, 0)') continue;
      if (node.contains(painted) && painted !== node) continue;
      if (!painted.contains(node)) break; // unrelated element painted between text and backdrop: unknown content
      const background = getComputedStyle(painted);
      if (background.backgroundImage !== 'none') break;
      const colour = rgba(background.backgroundColor);
      if (colour[3] === 1) { base = colour.slice(0, 3); break; }
      if (colour[3] > 0) layers.push(colour);
    }
    if (!base && !layers.length) return null;
    const shadow = style.textShadow === 'none' ? null : style.textShadow.match(/rgba?\(([^)]+)\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);
    if (style.textShadow !== 'none' && !shadow) return null;
    return {
      color: rgba(style.color).slice(0, 3),
      layers,
      base,
      shadow: shadow && { color: rgba(`(${shadow[1]})`), offsetX: Number(shadow[2]), offsetY: Number(shadow[3]), blur: Number(shadow[4]) },
      fontSize: Number.parseFloat(style.fontSize),
      bold: Number.parseInt(style.fontWeight, 10) >= 700,
    };
  });
  if (!rendered) return null;
  const { shadow } = rendered;
  // Every layer is composited twice: exactly, and with each channel rounded to an integer as axe-core does.
  const backdrop = (start: number[], quantize: boolean) => {
    const over = (top: number[], bottom: number[]) => bottom.map((value, index) => {
      const channel = top[index] * top[3] + value * (1 - top[3]);
      return quantize ? Math.round(channel) : channel;
    });
    let colour = [...rendered.layers].reverse().reduce((under, layer) => over(layer, under), start);
    // A blurred shadow darkens the backdrop around the glyphs; same model as axe-core (alpha × 0.185 / (blur/size + 0.4)).
    if (shadow && shadow.blur >= Math.abs(shadow.offsetX) && shadow.blur >= Math.abs(shadow.offsetY)) {
      const alpha = shadow.color[3] * (shadow.blur === 0 ? 1 : .185 / (shadow.blur / rendered.fontSize + .4));
      colour = over([...shadow.color.slice(0, 3), alpha], colour);
    }
    return colour;
  };
  const ratioFor = (quantize: boolean) => {
    const candidates = rendered.base ? [backdrop(rendered.base, quantize)] : [backdrop([0, 0, 0], quantize), backdrop([255, 255, 255], quantize)];
    // Unknown content: the text colour itself may lie between the two extremes, then no contrast is guaranteed.
    const textBetween = candidates.length === 2 && contrastRatio(candidates[0], rendered.color) * contrastRatio(rendered.color, candidates[1]) <= contrastRatio(candidates[0], candidates[1]) + 1e-9;
    return textBetween ? 1 : Math.min(...candidates.map(candidate => contrastRatio(rendered.color, candidate)));
  };
  const exact = ratioFor(false);
  const quantized = ratioFor(true);
  const large = rendered.fontSize >= 24 || (rendered.bold && rendered.fontSize >= 18.66);
  // The less favourable variant decides.
  return { ratio: Math.min(exact, quantized), exact, quantized, required: large ? 3 : 4.5, worstCase: !rendered.base };
};

/** Glass header and footer: translucent gradient over blurred page content, which axe (bgGradient) cannot measure. */
const glassSurfaces = '.site-header, .site-footer';

/**
 * axe's "incomplete" colour-contrast results are not a pass. Each one needs the rendered-style proof above;
 * text on the glass header/footer cannot be proven either way and is reported as unresolved.
 */
const resolveIncompleteContrast = async (page: Page, incomplete: Awaited<ReturnType<AxeBuilder['analyze']>>['incomplete']) => {
  const unresolved: string[] = [];
  for (const node of incomplete.filter(result => result.id === 'color-contrast').flatMap(result => result.nodes)) {
    const target = node.target.join(' ');
    const reason = node.any[0]?.data?.messageKey ?? 'unbekannt';
    const element = page.locator(target).first();
    if (await element.evaluate((element, glass) => Boolean(element.closest(glass)), glassSurfaces)) {
      test.info().annotations.push({ type: 'Kontrast ungeklärt', description: `${target} (axe: ${reason}, Glas-Hintergrund)` });
      continue;
    }
    const proof = await renderedContrast(element);
    if (!proof) unresolved.push(`${target} (axe: ${reason}, auch rechnerisch nicht bestimmbar)`);
    else if (proof.ratio < proof.required) unresolved.push(`${target} (axe: ${reason}, rechnerisch ${proof.ratio.toFixed(2)}:1 < ${proof.required}:1)`);
    else test.info().annotations.push({ type: 'Kontrast rechnerisch', description: `${target}: axe ${reason}, gerendert ${proof.worstCase ? 'im ungünstigsten Fall ' : ''}${proof.ratio.toFixed(2)}:1` });
  }
  expect(unresolved, 'Kontraste, die weder axe noch die Berechnung bestätigt').toEqual([]);
};

const expectNoSkippedLevels = (outline: { level: number; text: string }[]) => {
  expect(outline[0]?.level, 'die erste Überschrift ist ein h1').toBe(1);
  outline.slice(1).forEach((heading, index) => {
    expect(heading.level, `„${heading.text}“ folgt auf h${outline[index].level}`).toBeLessThanOrEqual(outline[index].level + 1);
  });
};

for (const { name, path } of pages) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
    });

    test('axe: keine WCAG-2.2-AA-Verstöße (inklusive Kontrast, Überschriften und Landmarks)', async ({ page }) => {
      const { violations, incomplete } = await new AxeBuilder({ page })
        // best-practice adds heading-order, landmark-unique and page-has-heading-one.
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map(node => node.target.join(' ')).join(', ')}`)).toEqual([]);
      await resolveIncompleteContrast(page, incomplete);
    });

    test('Überschriften beginnen mit genau einem h1 und überspringen keine Ebene', async ({ page }) => {
      const outline = await headingOutline(page);
      expect(outline.filter(heading => heading.level === 1)).toHaveLength(1);
      expectNoSkippedLevels(outline);
    });

    test('kein horizontaler Überlauf', async ({ page }) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    });

    test('Texte im Inhalt sind mindestens 12 px groß', async ({ page }) => {
      const tooSmall = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main *, .site-header *, .site-footer *')]
        .filter(element => !element.closest('dialog:not([open])') && [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent!.trim()))
        .filter(element => Number.parseFloat(getComputedStyle(element).fontSize) < 12)
        .map(element => `${element.tagName} „${element.textContent!.trim().slice(0, 30)}“ ${getComputedStyle(element).fontSize}`));
      expect(tooSmall).toEqual([]);
    });
  });
}

test.describe('Startseite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
  });

  test('„Sergey Fokin“ ist das gemeinsame h1 und bleibt zweizeilig', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Sergey Fokin');
    const tops = await page.locator('h1 .home-line').evaluateAll(lines => lines.map(line => line.getBoundingClientRect().top));
    expect(tops).toHaveLength(2);
    expect(tops[1]).toBeGreaterThan(tops[0]);
    // "Home" is the slide label, the motto is a paragraph; the section keeps its name for the menu.
    await expect(page.getByRole('heading', { name: 'Home' })).toHaveCount(0);
    await expect(page.locator('#home .page-title')).toHaveText('Home');
    await expect(page.getByRole('region', { name: 'Home' })).toHaveCount(1);
    await expect(page.locator('#home h2, #home h3')).toHaveCount(0);
  });

  test('Landmark-Namen sind eindeutig', async ({ page }) => {
    // Closed project dialogs are not exposed; each open dialog is its own context.
    const names = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('section[aria-label], section[aria-labelledby], nav, main')]
      .filter(element => !element.closest('dialog'))
      .map(element => `${element.tagName} ${element.getAttribute('aria-label') ?? document.getElementById(element.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ?? ''}`));
    expect(new Set(names).size).toBe(names.length);
  });

  test('Überschriften in „Über Mich“ erreichen mindestens 4,5:1', async ({ page }) => {
    const ratios = await page.locator('.profile-map__topic h3').evaluateAll(headings => headings.map(heading => {
      const rgb = (value: string) => `#${value.match(/\d+/g)!.slice(0, 3).map(part => Number(part).toString(16).padStart(2, '0')).join('')}`;
      return { text: heading.textContent!.trim(), color: rgb(getComputedStyle(heading).color), background: rgb(getComputedStyle(heading.parentElement!).backgroundColor) };
    }));
    expect(ratios).toHaveLength(6);
    for (const { text, color, background } of ratios) {
      expect(contrastRatio(color, background), `${text}: ${color} auf ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('„Über Mich“: korrigierte Überschriften ohne Schatten, Kontrast gerendert und per axe bestätigt', async ({ page }) => {
    const headings = page.locator('.profile-map__topic h3');
    await expect(headings).toHaveCount(6);
    for (const heading of await headings.all()) {
      const { lineColor, titleColor, textShadow } = await heading.evaluate(element => ({
        lineColor: getComputedStyle(element.parentElement!).borderLeftColor,
        titleColor: getComputedStyle(element).color,
        textShadow: getComputedStyle(element).textShadow,
      }));
      // A darkened heading never keeps its decorative shadow.
      if (lineColor !== titleColor) expect(textShadow, `${await heading.textContent()}`).toBe('none');
      const proof = await renderedContrast(heading);
      expect(proof, `${await heading.textContent()}: gerenderter Kontrast bestimmbar`).not.toBeNull();
      expect(proof!.ratio, `${await heading.textContent()}`).toBeGreaterThanOrEqual(4.5);
    }
    // The decorative SVG lines make axe report "bgOverlap" (incomplete) on desktop although they lie under the
    // opaque topic boxes. Without them axe can measure every topic text and must find no violation.
    await page.addStyleTag({ content: '.profile-map__connections { display: none !important; }' });
    const { violations, incomplete, passes } = await new AxeBuilder({ page }).include('.profile-map').withRules(['color-contrast']).analyze();
    expect(violations.flatMap(result => result.nodes.map(node => `${node.target.join(' ')}: ${node.any[0]?.message}`))).toEqual([]);
    expect(incomplete.flatMap(result => result.nodes.map(node => node.target.join(' ')))).toEqual([]);
    const confirmed = passes.flatMap(result => result.nodes.map(node => node.target.join(' ')));
    for (const key of ['profile', 'education', 'hobbies', 'skills', 'achievements', 'experience']) expect(confirmed).toContain(`#about-${key}-title`);
  });

  // Keystatic allows 0–100 % shadow; 0, 50 and 100 are applied to a heading exactly as AboutProfile.astro renders them.
  // #cc2211, #337722 and #aa4477 reach 4.5:1 with shadow 50 only without rounding; axe's rounded backdrop gives 4.49.
  const boundaryColours = ['#cc2211', '#337722', '#aa4477'];
  // #b82b92 keeps shadow 50 at 4.500003:1 (worse variant), #ac3e88 loses it at 4.499990:1.
  for (const lineColor of ['#2596be', '#005733', '#1c7290', ...boundaryColours, '#b82b92', '#ac3e88']) {
    for (const intensity of [0, 50, 100]) {
      test(`Themenüberschrift ${lineColor} mit Schatten ${intensity} %: mindestens 4,5:1`, async ({ page }) => {
        const expected = readableHeading(lineColor, intensity, ['#f7f6f2', '#fffefa'], 16, 5);
        const heading = page.locator('#about-profile-title');
        await heading.evaluate((element, { color, shadow }) => {
          element.parentElement!.style.setProperty('--topic-title-color', color);
          element.style.textShadow = shadow;
        }, { color: expected.color, shadow: shadowValue(expected.shadow ? intensity : 0) });
        // Colours from Keystatic that are dark enough keep their shadow as long as it does not cost contrast.
        if (lineColor === '#005733') expect(expected).toEqual({ color: '#005733', shadow: true });
        if (lineColor === '#2596be') expect(expected.shadow).toBe(false);
        if (lineColor === '#1c7290' || boundaryColours.includes(lineColor)) expect(expected).toEqual({ color: lineColor, shadow: intensity === 0 });

        const proof = await renderedContrast(heading);
        expect(proof).not.toBeNull();
        expect(proof!.ratio).toBeGreaterThanOrEqual(4.5);

        const onPage = await new AxeBuilder({ page }).include('#about-profile-title').withRules(['color-contrast']).analyze();
        expect(onPage.violations).toEqual([]);
        await resolveIncompleteContrast(page, onPage.incomplete);
        await page.addStyleTag({ content: '.profile-map__connections { display: none !important; }' });
        const withoutLines = await new AxeBuilder({ page }).include('#about-profile-title').withRules(['color-contrast']).analyze();
        expect(withoutLines.violations).toEqual([]);
        expect(withoutLines.passes.flatMap(result => result.nodes.map(node => node.target.join(' ')))).toContain('#about-profile-title');
      });
    }
  }

  // Diagnosis only: the boundary colours are rendered *with* their shadow (which the site no longer does) to check that
  // the quantized model predicts axe exactly. The SVG lines are hidden for this check only, since they make axe "incomplete".
  // #006d81 (81 %) and #0562d7 (56 %) fail only because Chromium reports the shadow opacity rounded (0.3888 → 0.39).
  for (const [lineColor, intensity] of [...boundaryColours.map(colour => [colour, 50] as const), ['#006d81', 81], ['#0562d7', 56]] as const) {
    test(`Diagnose ${lineColor} mit erzwungenem Schatten ${intensity} %: axe rundet wie das quantisierte Modell`, async ({ page }) => {
      const heading = page.locator('#about-profile-title');
      const background = await heading.evaluate((element, { color, shadow }) => {
        element.parentElement!.style.setProperty('--topic-title-color', color);
        element.style.textShadow = shadow;
        const [r, g, b] = getComputedStyle(element.parentElement!).backgroundColor.match(/\d+/g)!.map(Number);
        return `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`;
      }, { color: lineColor, shadow: shadowValue(intensity) });
      await page.addStyleTag({ content: '.profile-map__connections { display: none !important; }' });
      const { exact, quantized } = shadowedBackground(background, intensity, 16);
      const exactRatio = contrastRatio(lineColor, exact);
      const quantizedRatio = contrastRatio(lineColor, quantized);
      // The site drops this shadow: on the desktop background the rounded contrast is below 4.5:1.
      expect(readableHeading(lineColor, intensity, ['#f7f6f2', '#fffefa'], 16, 5).shadow).toBe(false);

      const result = await new AxeBuilder({ page }).include('#about-profile-title').withRules(['color-contrast']).analyze();
      const [node] = [...result.violations, ...result.passes].flatMap(entry => entry.nodes);
      expect(result.incomplete).toEqual([]);
      const toHex = (rgb: number[]) => `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`;
      expect(node.any[0].data.bgColor).toBe(toHex(quantized));
      expect(node.any[0].data.contrastRatio).toBe(Math.floor(quantizedRatio * 100) / 100);
      // axe passes only above 4.5:1 – on the desktop background (#f7f6f2) the rounded value is 4.49.
      expect(result.violations.length > 0).toBe(quantizedRatio <= 4.5);
      if (background === '#f7f6f2') {
        expect(exactRatio).toBeGreaterThanOrEqual(4.5);
        expect(result.violations).toHaveLength(1);
      }
    });
  }

  test('Thementexte bleiben auch mit Schatten 100 % lesbar', async ({ page }) => {
    const texts = page.locator('.profile-map__text');
    await texts.evaluateAll((elements, shadow) => elements.forEach(element => { (element as HTMLElement).style.textShadow = shadow; }), shadowValue(100));
    for (const text of await page.locator('.profile-map__text p, .profile-map__text li').all()) {
      const proof = await renderedContrast(text);
      expect(proof, `${await text.textContent()}`).not.toBeNull();
      expect(proof!.ratio, `${await text.textContent()}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('„Interesse geweckt?“ bricht um statt zu schrumpfen', async ({ page }) => {
    const heading = page.locator('.contact-form-heading');
    await heading.scrollIntoViewIfNeeded();
    const metrics = await heading.evaluate(element => ({
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      labelSize: Number.parseFloat(getComputedStyle(document.querySelector('.contact-form label span')!).fontSize),
      inlineFontSize: element.style.fontSize,
      fits: element.scrollWidth <= element.clientWidth,
    }));
    expect(metrics.inlineFontSize).toBe('');
    expect(metrics.fontSize).toBeGreaterThanOrEqual(18);
    expect(metrics.fontSize).toBeGreaterThanOrEqual(metrics.labelSize);
    expect(metrics.fits).toBe(true);
  });

  test('Tastatur: Formular und Senden-Button sind per Tab erreichbar', async ({ page }) => {
    await page.locator('.contact-form input[name="from_name"]').focus();
    for (const field of ['reply_to', 'subject']) {
      await page.keyboard.press('Tab');
      await expect(page.locator(`.contact-form [name="${field}"]`)).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('.contact-form textarea')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('.contact-form button[type="submit"]')).toBeFocused();
    await expect.poll(() => page.locator('.contact-form button[type="submit"]').evaluate(button => {
      const bounds = button.getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
    })).toBe(true);
  });
});

test.describe('Seitentitel', () => {
  test('alle Seiten nutzen den Website-Namen der Startseite', async ({ page }) => {
    await page.goto('');
    const siteName = await page.title();
    expect(siteName).toBe('Tivi-Dev Portfolio');
    for (const path of ['impressum/', 'datenschutz/']) {
      await page.goto(path);
      // The page name comes from Keystatic (e.g. "Datenschutzerklärung"), the site name always follows.
      await expect(page).toHaveTitle(new RegExp(`^${await page.locator('h1').innerText()} · ${siteName}$`));
    }
    await page.goto('404.html');
    await expect(page).toHaveTitle(`Seite nicht gefunden · ${siteName}`);
  });
});

test.describe('Kontrastkorrektur für Keystatic-Farben', () => {
  test('zu helle Linienfarben werden nur so weit wie nötig abgedunkelt', () => {
    const backgrounds = ['#f7f6f2', '#fffefa'];
    for (const color of ['#2596be', '#a44c2c', '#88723d', '#ffcc00', '#ffffff']) {
      const text = readableTextColor(color, backgrounds, 5);
      for (const background of backgrounds) expect(contrastRatio(text, background), `${color} → ${text}`).toBeGreaterThanOrEqual(5);
    }
    // Dark enough colours stay exactly as chosen in Keystatic.
    expect(readableTextColor('#005733', backgrounds, 5)).toBe('#005733');
    expect(readableTextColor('#32664b', backgrounds, 5)).toBe('#32664b');
  });

  test('Schatten bleibt nur, wenn ungerundete und quantisierte Berechnung mindestens 4,5:1 ergeben', () => {
    const backgrounds = ['#f7f6f2', '#fffefa'];
    for (const color of ['#cc2211', '#337722', '#aa4477', '#1c7290', '#005733', '#b82b92', '#ac3e88']) {
      for (const intensity of [0, 50, 100]) {
        const decision = readableHeading(color, intensity, backgrounds, 16, 5);
        const ratios = backgrounds.flatMap(background => {
          const { exact, quantized } = shadowedBackground(background, intensity, 16);
          // Quantized means integer channels, as axe-core stores the flattened backdrop.
          expect(quantized.every(Number.isInteger)).toBe(true);
          return [contrastRatio(decision.color, exact), contrastRatio(decision.color, quantized)];
        });
        const label = `${color}, Schatten ${intensity} %: ${ratios.map(ratio => ratio.toFixed(6)).join(' / ')}`;
        expect(decision.shadow, label).toBe(decision.color === color && Math.min(...ratios) >= 4.5);
        if (decision.shadow) for (const ratio of ratios) expect(ratio, label).toBeGreaterThanOrEqual(4.5);
        expect(Math.min(...backgrounds.map(background => shadowedContrast(decision.color, background, intensity, 16)))).toBeCloseTo(Math.min(...ratios), 12);
      }
    }
    // The case reported by Codex: 4.500375:1 exact, but 4.493268:1 once axe rounds the backdrop to rgb(232 232 228).
    const { exact, quantized } = shadowedBackground('#f7f6f2', 50, 16);
    expect(quantized).toEqual([232, 232, 228]);
    expect(contrastRatio('#cc2211', exact)).toBeCloseTo(4.500375, 6);
    expect(contrastRatio('#cc2211', quantized)).toBeCloseTo(4.493268, 6);
    for (const color of ['#cc2211', '#337722', '#aa4477']) {
      expect(contrastRatio(color, exact), color).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, quantized), color).toBeLessThan(4.5);
      expect(readableHeading(color, 50, backgrounds, 16, 5)).toEqual({ color, shadow: false });
    }
    // Directly at the boundary: just above keeps the shadow, just below drops it.
    expect(readableHeading('#b82b92', 50, backgrounds, 16, 5)).toEqual({ color: '#b82b92', shadow: true });
    expect(Math.min(...backgrounds.map(background => shadowedContrast('#b82b92', background, 50, 16)))).toBeCloseTo(4.500003, 6);
    expect(readableHeading('#ac3e88', 50, backgrounds, 16, 5)).toEqual({ color: '#ac3e88', shadow: false });
    expect(Math.min(...backgrounds.map(background => shadowedContrast('#ac3e88', background, 50, 16)))).toBeCloseTo(4.499990, 6);
    // Shadow 0 never changes the background, so both variants agree there.
    expect(shadowedBackground('#fffefa', 0, 16)).toEqual({ exact: [255, 254, 250], quantized: [255, 254, 250] });
    // Between 0, 50 and 100 the browser's rounded opacity decides: with the declared opacity both variants stay ≥ 4.5:1.
    for (const [color, intensity] of [['#006d81', 81], ['#0562d7', 56]] as const) {
      const { exact, quantized } = shadowedBackground('#f7f6f2', intensity, 16);
      expect(contrastRatio(color, exact), color).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, quantized), color).toBeLessThan(4.5);
      expect(readableHeading(color, intensity, backgrounds, 16, 5)).toEqual({ color, shadow: false });
    }
  });

  test('Schattendeckkraft im Modell entspricht dem, was Chromium an axe meldet (Stufen 1–100)', async ({ page }) => {
    const reported = await page.evaluate(values => {
      const element = document.body.appendChild(document.createElement('p'));
      return values.map(value => {
        element.style.textShadow = value;
        return Number(getComputedStyle(element).textShadow.match(/rgba\([^)]*,\s*([\d.]+)\)/)![1]);
      });
    }, Array.from({ length: 100 }, (_, index) => shadowValue(index + 1)));
    expect(reported).toEqual(Array.from({ length: 100 }, (_, index) => computedAlpha(shadowAlpha(index + 1))));
  });
});
