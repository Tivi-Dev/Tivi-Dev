import { expect, test, type Page } from '@playwright/test';

const sections = ['home', 'skills', 'projekte', 'ueber-mich', 'kontakt'] as const;
type Section = typeof sections[number];

/** URL hash, the section directly below the sticky header and the menu entry marked with aria-current. */
const navState = (page: Page) => page.evaluate(() => {
  const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
  const visible = [...document.querySelectorAll<HTMLElement>('.slide')].find(slide => {
    const bounds = slide.getBoundingClientRect();
    return bounds.top <= headerBottom + 2 && bounds.bottom > headerBottom + 2;
  });
  return {
    hash: location.hash,
    visible: visible?.id ?? null,
    current: document.querySelector<HTMLAnchorElement>('.site-header nav a[aria-current]')?.hash ?? null,
  };
});

/** Hash, visible section and aria-current must agree once navigation has settled. */
const expectSettledAt = (page: Page, id: Section, hash: string = `#${id}`) =>
  expect.poll(() => navState(page), { timeout: 5_000 }).toEqual({ hash, visible: id, current: `#${id}` });

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) > 1100;

/** Waits until the scroll position has not changed for several frames (no animation still running). */
const waitForScrollRest = (page: Page) => page.waitForFunction(() => new Promise<boolean>(resolve => {
  let last = window.scrollY;
  let stable = 0;
  const check = () => {
    stable = window.scrollY === last ? stable + 1 : 0;
    last = window.scrollY;
    if (stable >= 5) resolve(true);
    else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}));

/**
 * Sends real browser input events via CDP at fixed offsets without waiting for each round trip, so rapid
 * sequences (double clicks, wheel inertia, touch swipes) really reach the page within milliseconds.
 */
const sendInputBurst = async (page: Page, events: { at: number; method: 'Input.dispatchMouseEvent' | 'Input.dispatchTouchEvent'; params: Record<string, unknown> }[]) => {
  const cdp = await page.context().newCDPSession(page);
  await Promise.all(events.map(({ at, method, params }) =>
    new Promise(resolve => setTimeout(resolve, at)).then(() => cdp.send(method, params as never))));
};

/** Records when the page receives events of a type, to prove the timing of a burst. */
const recordEventTimes = (page: Page, type: string) => page.evaluate(eventType => {
  (window as unknown as { recorded: number[] }).recorded = [];
  window.addEventListener(eventType, () => (window as unknown as { recorded: number[] }).recorded.push(performance.now()), { capture: true });
}, type);
const recordedSpan = (page: Page) => page.evaluate(() => {
  const times = (window as unknown as { recorded: number[] }).recorded;
  return { count: times.length, span: times.length ? times[times.length - 1] - times[0] : 0 };
});

const centerOf = async (page: Page, selector: string) => {
  const box = (await page.locator(selector).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Clicks a main menu entry the way a visitor does (opening the mobile menu first). */
const clickMenu = async (page: Page, id: Section) => {
  if (!isDesktop(page)) await page.locator('.nav-toggle').click();
  await page.locator(`.site-header nav a[href$="#${id}"]`).click();
};

/**
 * Holds the web font back so `document.fonts.ready` – and with it the delayed initial alignment – stays
 * pending. Navigation uses `waitUntil: 'domcontentloaded'`; `networkidle` would hide the race condition.
 */
const gotoWithHeldFont = async (page: Page, hash: string) => {
  let releaseFont!: () => void;
  const fontGate = new Promise<void>(resolve => { releaseFont = resolve; });
  let fontRequested!: () => void;
  const requested = new Promise<void>(resolve => { fontRequested = resolve; });
  await page.route(/\.(ttf|woff2?)(\?.*)?$/, async route => {
    fontRequested();
    await fontGate;
    await route.continue();
  });
  await page.goto(hash, { waitUntil: 'domcontentloaded' });
  await requested;
  // A visitor acts once the page is visible: wait for the browser's own first scroll to the fragment.
  await page.waitForFunction(target => {
    const section = document.querySelector(target);
    const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
    return Boolean(section) && Math.abs(section!.getBoundingClientRect().top - headerBottom) <= 5;
  }, hash);
  // That scroll is smooth (scroll-behavior) and still creeps the last pixels; Chromium drops wheel input that
  // arrives during it, even with the page's scripts blocked. The visitor acts once it has come to rest.
  await waitForScrollRest(page);
  // Proof that the critical action below happens before the initial alignment can run.
  expect(await page.evaluate(() => document.fonts.status)).toBe('loading');
  return async () => {
    // The user's own scrolling must be over, so a late jump cannot hide inside a running animation.
    await waitForScrollRest(page);
    releaseFont();
    await page.evaluate(() => document.fonts.ready.then(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    })));
    await page.waitForLoadState('load');
    // Give a (buggy) late alignment time to jump before the final state is checked.
    await page.waitForTimeout(400);
  };
};

test.describe('Start', () => {
  test('ohne Hash: URL bleibt leer und der erste Tab erreicht den Skip-Link', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    await expectSettledAt(page, 'home', '');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('.site-title')).toBeFocused();
  });

  for (const id of sections) {
    test(`mit gültigem Abschnitts-Hash #${id}`, async ({ page }) => {
      await page.goto(`#${id}`, { waitUntil: 'networkidle' });
      await expectSettledAt(page, id);
    });
  }

  for (const hash of ['#inhalt', '#unbekannt']) {
    test(`mit ${hash}: Hash bleibt, danach Skills → Kontakt über das Menü`, async ({ page }) => {
      await page.goto(hash, { waitUntil: 'networkidle' });
      await expectSettledAt(page, 'home', hash);
      await clickMenu(page, 'skills');
      await expectSettledAt(page, 'skills');
      await clickMenu(page, 'kontakt');
      await expectSettledAt(page, 'kontakt');
    });
  }
});

test.describe('Frühe Benutzeraktion während verzögerter Initialausrichtung (#skills)', () => {
  test('natürliches Scrollen mit dem Mausrad gewinnt', async ({ page }) => {
    const finishLoading = await gotoWithHeldFont(page, '#skills');
    await page.mouse.move(200, 300);
    if (isDesktop(page)) {
      // In presentation mode one wheel gesture moves exactly one slide.
      await page.mouse.wheel(0, 200);
      await expectSettledAt(page, 'projekte');
      await finishLoading();
      await expectSettledAt(page, 'projekte');
    } else {
      await page.mouse.wheel(0, 2_500);
      await expect.poll(() => navState(page).then(state => state.visible)).not.toBe('skills');
      const scrolled = await navState(page);
      await finishLoading();
      expect(scrolled.visible).not.toBeNull();
      await expectSettledAt(page, scrolled.visible as Section);
    }
  });

  test('Touch-Wischgeste gewinnt', async ({ page, browserName }) => {
    test.skip(isDesktop(page) || browserName !== 'chromium', 'Touch-Geste nur auf Smartphone-Projekten (Chromium/CDP)');
    const finishLoading = await gotoWithHeldFont(page, '#skills');
    const startY = await page.evaluate(() => window.scrollY);
    // A real touch swipe upwards (finger moves 250 px), dispatched as touch events.
    await sendInputBurst(page, [
      { at: 0, method: 'Input.dispatchTouchEvent', params: { type: 'touchStart', touchPoints: [{ x: 180, y: 300 }] } },
      ...Array.from({ length: 10 }, (_, i) => ({
        at: 16 * (i + 1), method: 'Input.dispatchTouchEvent' as const,
        params: { type: 'touchMove', touchPoints: [{ x: 180, y: 300 - (i + 1) * 25 }] },
      })),
      { at: 200, method: 'Input.dispatchTouchEvent', params: { type: 'touchEnd', touchPoints: [] } },
    ]);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(startY + 150);
    await page.waitForTimeout(800);
    await finishLoading();
    // The late initial alignment must not jump back to the top of Skills (font swap may shift the layout a bit).
    const skillsAligned = await page.evaluate(() => Math.abs(
      document.getElementById('skills')!.getBoundingClientRect().top - document.querySelector<HTMLElement>('.site-header')!.offsetHeight,
    ) <= 2);
    expect(skillsAligned).toBe(false);
    const { visible } = await navState(page);
    expect(visible).not.toBeNull();
    await expectSettledAt(page, visible as Section);
  });

  test('native End-Taste (bzw. End im Präsentationsmodus) gewinnt', async ({ page }) => {
    const finishLoading = await gotoWithHeldFont(page, '#skills');
    await page.keyboard.press('End');
    await expectSettledAt(page, 'kontakt');
    await finishLoading();
    await expectSettledAt(page, 'kontakt');
  });

  test('Skip-Link gewinnt', async ({ page }) => {
    const finishLoading = await gotoWithHeldFont(page, '#skills');
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#inhalt$/);
    await expectSettledAt(page, 'home', '#inhalt');
    await finishLoading();
    await expectSettledAt(page, 'home', '#inhalt');
  });

  test('Menüklick gewinnt', async ({ page }) => {
    const finishLoading = await gotoWithHeldFont(page, '#skills');
    await clickMenu(page, 'kontakt');
    await expectSettledAt(page, 'kontakt');
    await finishLoading();
    await expectSettledAt(page, 'kontakt');
  });

  test('Fragmentwechsel gewinnt', async ({ page }) => {
    const finishLoading = await gotoWithHeldFont(page, '#skills');
    await page.evaluate(() => { location.hash = '#projekte'; });
    await expectSettledAt(page, 'projekte');
    await finishLoading();
    await expectSettledAt(page, 'projekte');
  });
});

test.describe('Menü', () => {
  test('direkter Klick auf Home nach dem Laden setzt #home', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    await clickMenu(page, 'home');
    await expectSettledAt(page, 'home');
  });

  test('alle Abschnitte nacheinander', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    for (const id of [...sections.slice(1), 'home'] as Section[]) {
      await clickMenu(page, id);
      await expectSettledAt(page, id);
    }
  });

  test('zwei Zielwahlen im Abstand von 60 ms: die letzte gewinnt', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    const elapsed = await page.evaluate(() => new Promise<number>(resolve => {
      const link = (id: string) => document.querySelector<HTMLAnchorElement>(`.site-header nav a[href$="#${id}"]`)!;
      let first = 0;
      setTimeout(() => {
        const second = performance.now();
        link('kontakt').click();
        resolve(second - first);
      }, 60);
      first = performance.now();
      link('skills').click();
    }));
    expect(elapsed).toBeLessThan(100);
    await expectSettledAt(page, 'kontakt');
  });

  test('zwei echte Mausklicks innerhalb von 100 ms (Desktop)', async ({ page }) => {
    test.skip(!isDesktop(page), 'Menü ist auf dem Desktop dauerhaft sichtbar');
    await page.goto('', { waitUntil: 'networkidle' });
    const skills = await centerOf(page, '.site-header nav a[href$="#skills"]');
    const kontakt = await centerOf(page, '.site-header nav a[href$="#kontakt"]');
    await recordEventTimes(page, 'click');
    const press = (at: number, point: { x: number; y: number }) => [
      { at, method: 'Input.dispatchMouseEvent' as const, params: { type: 'mousePressed', ...point, button: 'left', clickCount: 1 } },
      { at, method: 'Input.dispatchMouseEvent' as const, params: { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 } },
    ];
    await sendInputBurst(page, [...press(0, skills), ...press(50, kontakt)]);
    const clicks = await recordedSpan(page);
    expect(clicks.count).toBe(2);
    expect(clicks.span).toBeLessThan(100);
    await expectSettledAt(page, 'kontakt');
  });
});

test.describe('Gegenwahl, bevor sich die Scrollposition verändert', () => {
  /**
   * Selects menu targets in quick succession inside the page (synthetic clicks through the real click handler).
   * Returns, for every click after the first, how far the page had scrolled since the first click.
   */
  const selectInQuickSuccession = (page: Page, steps: { id: Section; at: number }[]) => page.evaluate(sequence => {
    const link = (id: string) => document.querySelector<HTMLAnchorElement>(`.site-header nav a[href$="#${id}"]`)!;
    const startY = window.scrollY;
    const moved: number[] = [];
    return new Promise<number[]>(resolve => {
      sequence.forEach(({ id, at }, index) => {
        const click = () => {
          if (index > 0) moved.push(Math.abs(window.scrollY - startY));
          link(id).click();
          if (index === sequence.length - 1) resolve(moved);
        };
        if (at === 0) click();
        else setTimeout(click, at);
      });
    });
  }, steps);

  /** After all animations: target visible, hash and aria-current correct, and no late jump during observation. */
  const expectStaysAt = async (page: Page, id: Section) => {
    await waitForScrollRest(page);
    await expectSettledAt(page, id);
    const drift = await page.evaluate(() => new Promise<number>(resolve => {
      const startY = window.scrollY;
      let maxDrift = 0;
      const end = performance.now() + 1_000;
      const sample = () => {
        maxDrift = Math.max(maxDrift, Math.abs(window.scrollY - startY));
        if (performance.now() < end) requestAnimationFrame(sample);
        else resolve(maxDrift);
      };
      requestAnimationFrame(sample);
    }));
    expect(drift).toBeLessThanOrEqual(1);
    expect(await navState(page)).toEqual({ hash: `#${id}`, visible: id, current: `#${id}` });
  };

  for (const gap of [0, 5, 10]) {
    test(`Home → Skills → nach ${gap} ms Home: Home bleibt`, async ({ page }) => {
      await page.goto('', { waitUntil: 'networkidle' });
      const moved = await selectInQuickSuccession(page, [{ id: 'skills', at: 0 }, { id: 'home', at: gap }]);
      // Without a gap the second click certainly happens before any visible scroll (the critical path).
      if (gap === 0) expect(moved[0]).toBe(0);
      await expectStaysAt(page, 'home');
    });

    test(`Skills → Home → nach ${gap} ms Skills: Skills bleibt`, async ({ page }) => {
      await page.goto('#skills', { waitUntil: 'networkidle' });
      await expectSettledAt(page, 'skills');
      await waitForScrollRest(page);
      const moved = await selectInQuickSuccession(page, [{ id: 'home', at: 0 }, { id: 'skills', at: gap }]);
      if (gap === 0) expect(moved[0]).toBe(0);
      await expectStaysAt(page, 'skills');
    });
  }

  test('schnelle Mehrfachwechsel enden beim Ausgangsabschnitt Home', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    await selectInQuickSuccession(page, [
      { id: 'skills', at: 0 }, { id: 'kontakt', at: 10 }, { id: 'projekte', at: 20 }, { id: 'home', at: 30 },
    ]);
    await expectStaysAt(page, 'home');
  });

  test('schnelle Mehrfachwechsel enden beim zuletzt gewählten Abschnitt', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    await selectInQuickSuccession(page, [
      { id: 'kontakt', at: 0 }, { id: 'home', at: 5 }, { id: 'skills', at: 10 }, { id: 'home', at: 15 }, { id: 'projekte', at: 25 },
    ]);
    await expectStaysAt(page, 'projekte');
  });

  test('echte Mausklicks: Skills, sofort danach Home (Desktop)', async ({ page }) => {
    test.skip(!isDesktop(page), 'Auf dem Smartphone schließt sich das Menü nach dem ersten Klick; dort decken die Tests oben den Fall ab');
    await page.goto('', { waitUntil: 'networkidle' });
    const skills = await centerOf(page, '.site-header nav a[href$="#skills"]');
    const home = await centerOf(page, '.site-header nav a[href$="#home"]');
    // Records the scroll position at every menu click (capture phase, before the navigation handler runs).
    await page.evaluate(() => {
      (window as unknown as { clickPositions: number[] }).clickPositions = [];
      document.querySelector('.site-header nav')!.addEventListener('click', () => {
        (window as unknown as { clickPositions: number[] }).clickPositions.push(window.scrollY);
      }, { capture: true });
    });
    const press = (at: number, point: { x: number; y: number }) => [
      { at, method: 'Input.dispatchMouseEvent' as const, params: { type: 'mousePressed', ...point, button: 'left', clickCount: 1 } },
      { at, method: 'Input.dispatchMouseEvent' as const, params: { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 } },
    ];
    await sendInputBurst(page, [...press(0, skills), ...press(0, home)]);
    const positions = await page.evaluate(() => (window as unknown as { clickPositions: number[] }).clickPositions);
    expect(positions).toHaveLength(2);
    // Both real clicks arrived before the page had visibly scrolled.
    expect(positions).toEqual([0, 0]);
    await expectStaysAt(page, 'home');
  });
});

test.describe('Verlauf', () => {
  test('Zurück, Vorwärts und Neuladen', async ({ page }) => {
    await page.goto('#skills', { waitUntil: 'networkidle' });
    await expectSettledAt(page, 'skills');
    await page.goto('#kontakt');
    await expectSettledAt(page, 'kontakt');
    await page.goBack();
    await expectSettledAt(page, 'skills');
    await page.goForward();
    await expectSettledAt(page, 'kontakt');
    await page.reload({ waitUntil: 'networkidle' });
    await expectSettledAt(page, 'kontakt');
  });

  test('Skip-Link, Menü und anschließend Zurück', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expectSettledAt(page, 'home', '#inhalt');
    await clickMenu(page, 'projekte');
    await expectSettledAt(page, 'projekte');
    await page.goBack();
    // Back to the entry without hash: the browser restores its scroll position and the URL stays unchanged.
    await expectSettledAt(page, 'home', '');
  });
});

test.describe('Präsentationsmodus (Desktop)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDesktop(page), 'Präsentationsmodus nur ab 1101 px Breite mit feiner Zeigersteuerung');
    await page.goto('', { waitUntil: 'networkidle' });
  });

  test('Tastatur: ↓, Bild↓, Ende, ↑, Pos1', async ({ page }) => {
    for (const [key, id] of [['ArrowDown', 'skills'], ['PageDown', 'projekte'], ['End', 'kontakt'], ['ArrowUp', 'ueber-mich'], ['Home', 'home']] as const) {
      await page.keyboard.press(key);
      await expectSettledAt(page, id);
    }
  });

  test('Mausrad: ein Abschnitt pro Geste, Nachlauf wird ignoriert', async ({ page }) => {
    await page.mouse.move(700, 450);
    await recordEventTimes(page, 'wheel');
    // One gesture plus wheel/trackpad inertia while the slide change is still animating.
    await sendInputBurst(page, [0, 40, 80, 120].map(at => ({
      at, method: 'Input.dispatchMouseEvent' as const,
      params: { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: 200 },
    })));
    const wheel = await recordedSpan(page);
    // Chromium may coalesce queued wheel events; at least one inertia event must arrive during the animation.
    expect(wheel.count).toBeGreaterThanOrEqual(2);
    // All events of the burst arrive while the smooth slide change (several hundred ms) is still running.
    expect(wheel.span).toBeLessThan(400);
    await expectSettledAt(page, 'skills');
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, 200);
    await expectSettledAt(page, 'projekte');
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, -200);
    await expectSettledAt(page, 'skills');
  });
});
