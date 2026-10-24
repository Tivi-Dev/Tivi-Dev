import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('', { waitUntil: 'networkidle' });
});

test('Tab-Reihenfolge beginnt mit Skip-Link, Seitentitel und Navigation', async ({ page }) => {
  const desktop = (page.viewportSize()?.width ?? 0) > 1100;
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.site-title')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(desktop ? page.locator('.site-header nav a[href$="#home"]') : page.locator('.nav-toggle')).toBeFocused();
});

test('Skip-Link springt zum Hauptinhalt', async ({ page }) => {
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#inhalt$/);
  await page.keyboard.press('Tab');
  await expect(page.locator('main .project-card__open').first()).toBeFocused();
});

test('kein fokussiertes Element liegt unter der Kopf- oder einer fixierten Fußleiste', async ({ page }) => {
  const focusables = await page.locator('main a[href], main button, main input, main textarea').count();
  expect(focusables).toBeGreaterThan(0);
  // Start in the header; the desktop menu adds up to five more tab stops before the main content.
  await page.locator('.site-title').focus();
  for (let i = 0; i < focusables + 10; i++) {
    await page.keyboard.press('Tab');
    const inMain = await page.evaluate(() => Boolean(document.activeElement?.closest('main')) && document.activeElement?.tagName !== 'MAIN');
    if (!inMain) continue;
    // Focus scrolling is smooth (scroll-behavior), so wait until the element has come to rest. Under heavy parallel
    // load Chromium starts that scroll up to ~6 s late (measured), so the window is 10 s; a real overlap never resolves.
    await expect.poll(() => page.evaluate(() => {
      const bounds = document.activeElement!.getBoundingClientRect();
      const header = document.querySelector('.site-header')!.getBoundingClientRect();
      const footerElement = document.querySelector<HTMLElement>('.site-footer')!;
      const footerFixed = getComputedStyle(footerElement).position === 'fixed';
      const footerTop = footerElement.getBoundingClientRect().top;
      return {
        element: `${document.activeElement!.tagName} ${document.activeElement!.textContent?.trim().slice(0, 20) ?? ''}`,
        underHeader: bounds.top < header.bottom - 1,
        underFooter: footerFixed && bounds.bottom > footerTop + 1,
      };
    }), { timeout: 10_000 }).toMatchObject({ underHeader: false, underFooter: false });
  }
});

test('Seitenende: letzter Inhalt ist oberhalb der Fußleiste erreichbar', async ({ page }) => {
  const result = await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    const footer = document.querySelector<HTMLElement>('.site-footer')!;
    const limit = getComputedStyle(footer).position === 'fixed' ? footer.getBoundingClientRect().top : window.innerHeight;
    return {
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      sendButtonVisible: document.querySelector('.contact-form button')!.getBoundingClientRect().bottom <= limit,
    };
  });
  expect(result).toEqual({ overflowX: false, sendButtonVisible: true });
});

test('Fußleiste ist bei sehr niedrigen Viewports nicht fixiert', async ({ page }) => {
  const position = await page.locator('.site-footer').evaluate(footer => getComputedStyle(footer).position);
  expect(position).toBe((page.viewportSize()?.height ?? 0) <= 500 ? 'static' : 'fixed');
});

test('Projektbilder haben kein Alt-Attribut aus Leerzeichen', async ({ page }) => {
  const alts = await page.locator('.project-card__image img').evaluateAll(images => images.map(image => image.getAttribute('alt')));
  expect(alts.length).toBeGreaterThan(0);
  for (const alt of alts) {
    expect(alt).not.toBeNull();
    expect(alt).toBe(alt!.trim());
  }
  const { violations } = await new AxeBuilder({ page }).withRules(['image-alt']).analyze();
  expect(violations).toEqual([]);
});
