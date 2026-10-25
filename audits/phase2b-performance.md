# Phase 2B – Bildoptimierung und Website-Performance

Stand: 24. Oktober 2026 · Issue #12 · Branch `perf/phase2b-images` (von `main` 54bd697, nach dem Merge von PR #11) · kein Commit, kein Push

## Ergebnis auf einen Blick

| Lighthouse (Median aus 3 Läufen) | Mobil vorher | Mobil nachher | Desktop vorher | Desktop nachher |
|---|---|---|---|---|
| Performance-Score | 63 | **96** | 80 | **100** |
| LCP (Largest Contentful Paint) | 22.215 ms | **2.713 ms** | 3.773 ms | **515 ms** |
| FCP (First Contentful Paint) | 1.973 ms | **975 ms** | 420 ms | **269 ms** |
| CLS (Cumulative Layout Shift) | 0,213 | **0,000** | 0,006 | **0,000** |
| TBT (Total Blocking Time) | 0 ms | 0 ms | 0 ms | 0 ms |
| Speed Index | 1.973 ms | **975 ms** | 479 ms | **269 ms** |
| Übertragene Bytes | 7.421 KiB | **432 KiB** | 7.421 KiB | **256 KiB** |

- Die Einzelläufe lagen je Messreihe eng beieinander (LCP mobil: 22.220 / 22.215 / 22.137 → 2.716 / 2.713 / 2.713 ms; alle Scores identisch).
- INP lässt sich in einer Lighthouse-Labormessung nicht erfassen (keine Interaktion). TBT steht stellvertretend dafür und lag schon vorher bei 0 ms.

**Messaufbau (wiederholbar):**
- Lighthouse 12.8.2, nur Kategorie „Performance“, Standard-Drosselung (simuliert).
  - Mobil: Standardprofil (Moto G Power, Slow 4G, 4× CPU).
  - Desktop: `--preset=desktop`.
- Browser: Chrome for Testing 156.0.8078.4 (Playwright-Chromium), headless.
- Ziel: Produktionsbuild über `astro preview` unter `http://127.0.0.1:4329/Tivi-Dev/`, also mit dem echten GitHub-Pages-Basispfad.
- Gemessen wurde lokal, nicht auf GitHub Pages. Absolute Werte im Netz weichen ab; der Vorher-/Nachher-Vergleich ist unter gleichen Bedingungen entstanden.

## Ausgangslage (Baseline)

- **LCP-Element** ist das Startseitenfoto `images/homepage/photo.png`.
  - 1,55 MB PNG, 1671×941 px mit Alpha-Kanal.
  - Mobil nur 343–400 px breit dargestellt.
- **Alle großen PNGs** wurden direkt geladen (Chrome lädt `loading="lazy"` in einem großzügigen Abstand zum sichtbaren Bereich):

  | Datei | Größe | Pixel | dargestellt |
  |---|---|---|---|
  | `images/cards/infra-vision/image.png` | 2.105 KiB | 1122×1402 | 288–343 × 235 px |
  | `images/cards/mini-mail/image.png` | 1.964 KiB | 1122×1402 | 288–343 × 235 px |
  | `images/homepage/photo.png` | 1.517 KiB | 1671×941 | 288–508 px Box (quadratisch, `cover`, Zoom 110 %) |
  | `images/ueber-mich/photo.png` | 1.517 KiB | 1671×941 | 224–260 px Kreis (`cover`) |
  | `images/cards/google-stitch/image.png` | 90 KiB | 400×400 | 24×24 px |
  | Schrift `Manrope-VariableFont_wght.ttf` | 164 KiB | – | – |

- **CLS 0,213 mobil.** Zwei Ursachen, gemessen per `PerformanceObserver` bei Slow 4G:
  1. **0,191:** Das mobile Menü war zunächst ausgeklappt (Kopfleiste 229 px hoch). Erst das Modul-Script setzte `navigation-ready` und klappte es ein, `main` sprang von 229 auf 65 px. Das Verhalten stammt aus Phase 1 (bewusst: ohne JavaScript bleibt das Menü offen).
  2. **0,022–0,032:** Die Schrift wurde spät geladen (`font-display: swap`), Text und Foto verschoben sich.

## Umsetzung

### 1. Responsive Bilder (AVIF/WebP, `srcset`/`sizes`)

**Rahmenbedingung:** Keystatic speichert alle Bilder in `public/images/...` und schreibt Pfade wie `/images/homepage/photo.png` in die Inhalte. Astros eigene Bildoptimierung (`astro:assets`) verarbeitet keine Dateien aus `public/`. Ein Umzug nach `src/assets` hätte Keystatic-Konfiguration und alle Inhalte geändert. Darauf habe ich verzichtet.

**Lösung:**
- `src/lib/responsive-images.ts` legt die Regeln an einer Stelle fest:
  - Breiten 48, 96, 160, 320, 480, 640, 960, 1280, 1600 px, jeweils nur unterhalb der Originalbreite, plus die Originalbreite selbst.
  - Dateiname: `image.png` → `image.640w.avif` / `image.640w.webp`, im selben Ordner.
  - AVIF Qualität 60, WebP Qualität 82 (`sharp`).
- **Build-Schritt** (`astro.config.mjs`, Hook `astro:build:done`): schreibt die Varianten für jedes PNG/JPEG unter `dist/images`.
  - Aktuell 144 Varianten für 10 Bilder.
  - Cache in `node_modules/.cache/responsive-images`, Schlüssel ist der Inhalts-Hash. Erster Build ca. 1:46 min (AVIF-Kodierung), danach ca. 12 s.
  - Neue Bilder aus Keystatic werden beim nächsten Build automatisch erfasst.
- **`src/components/ResponsiveImage.astro`**:
  - Im Produktionsbuild: `<picture>` mit AVIF, dann WebP, dann dem Original als `<img src>`.
  - Im Dev-Modus (Keystatic): ein normales `<img>`, weil es dort keine Varianten gibt.
  - Ohne `width`/`height` werden die echten Pixelmaße gesetzt, damit der Browser den Platz vorab reserviert.
  - `picture { display: contents; }` in `global.css`: Alle bisherigen `img`-Regeln (z. B. `height: 100%`) greifen unverändert.
- **`sizes` je Einsatzort**, nach den gemessenen Darstellungsbreiten:

  | Ort | `sizes` |
  |---|---|
  | Startseitenfoto | `(max-width: 760px) calc(min(100vw - 32px, 400px) * F), calc(min(50vw, 540px) * F)` |
  | Porträt „Über Mich“ | `calc(min(260px, 70vw) * F)` |
  | Projektkarte | `(max-width: 600px) calc(100vw - 32px), 330px` |
  | Projektfenster (Großansicht) | `(max-width: 760px) calc(100vw - 64px), 640px` |
  | Projektfenster (Vorschaubilder) | `88px` |
  | Skill-Icons (nur PNG; SVGs unverändert) | `24px` |

  - `F` (`coverScale()`) gleicht `object-fit: cover` aus: Ein 16:9-Foto in einer quadratischen Box zeigt nur seine Mitte und wird dafür 1,78-mal so breit gezeichnet wie die Box (Startseite mit Zoom 110 %: F = 1,95).
  - F wird beim Build aus den Pixelmaßen und den Keystatic-Einstellungen (Seitenverhältnis, Zoom) berechnet. So bleibt die Schärfe auch erhalten, wenn diese Einstellungen in Keystatic geändert werden.
- **Priorisierung:** Das LCP-Foto behält `fetchpriority="high"` und kein `loading="lazy"`. Alle anderen Bilder bleiben `loading="lazy"`.

**Was mobil (412 px, DPR 2,625) tatsächlich geladen wird:**

| Bild | vorher | nachher |
|---|---|---|
| Startseitenfoto | 1.517 KiB PNG | 105 KiB (`photo.1600w.avif`) |
| Projektkarte InfraVision | 2.105 KiB PNG | 108 KiB (`image.960w.avif`) |
| Projektkarte MiniMail | 1.964 KiB PNG | 78 KiB (`image.960w.avif`) |
| Porträt „Über Mich“ | 1.517 KiB PNG | 49 KiB (`photo.960w.avif`) |
| Bilder und Schrift gesamt | **7.404 KiB** | **414 KiB** (Desktop: 238 KiB) |

### 2. Layout-Stabilität

- **Mobiles Menü** (`src/layouts/BaseLayout.astro`, `src/styles/global.css`):
  - Ein Inline-Script im `<head>` setzt `class="js"` auf `<html>`, also vor dem ersten Rendern.
  - Die CSS-Regeln zum Einklappen hängen jetzt an `.js .site-header …` statt an `.navigation-ready`. Die Klasse `navigation-ready` entfällt.
  - Ohne JavaScript bleibt das Menü offen wie bisher (Test „Ohne JavaScript bleibt das mobile Menü offen und erreichbar“).
  - Die übrige Menülogik (Öffnen, Schließen, Escape, Klick außerhalb, Header-Höhe) ist unverändert.
  - Begründung für den Eingriff in Phase-1-Code: Die Ursache ist nachgewiesen (0,191 von 0,213 CLS).
- **Schrift:** siehe Punkt 3. Der Preload beseitigt den späten Wechsel.

### 3. Schrift

- `Manrope-VariableFont_wght.ttf` (164 KiB) wurde verlustfrei nach **WOFF2 (53 KiB, −67 %)** umgewandelt (fontTools 4.60.1 mit Brotli).
  - Geprüft: 740 Glyphen, Gewichtsachse 200–800 und Zeichentabelle identisch zur TTF.
  - Kein Subsetting, damit kein Zeichen fehlen kann.
- Die TTF ist entfernt, `@font-face` nutzt die WOFF2.
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` in `BaseLayout.astro`. Die URL kommt per `?url`-Import und ist dieselbe gehashte Datei wie in `@font-face` (Test: genau eine Font-Anfrage).

## Bildqualität

**Kompression** (PSNR jeder Variante gegen das gleich skalierte Original, schlechtester Wert über alle Breiten ab 160 px):

| Bild | AVIF | WebP |
|---|---|---|
| Startseitenfoto / Porträt | 35,6 dB | 40,2 dB |
| Projektkarten | 30,8–32,8 dB (bei 160w) | 29,5–31,3 dB (bei 160w) |
| Icons | 41,6–42,1 dB | 37,5–41,0 dB |

**Im Browser** (Screenshot mit ausgelieferter Variante gegen denselben Screenshot mit dem Original-PNG unter derselben URL):

| Ausschnitt | Mobil (DPR 2,625) | Desktop (DPR 1) |
|---|---|---|
| Startseitenfoto | 39,5 dB | 34,4 dB |
| Projektkarte | 39,3 dB | 32,3 dB |
| Porträt „Über Mich“ | 35,2 dB | 27,8 dB |

- Das Porträt auf dem Desktop habe ich genauer untersucht:
  - Ein **verlustfrei** (PNG) auf dieselbe Breite verkleinertes Bild weicht genauso ab (28,3 dB), WebP 28,1 dB, AVIF 27,8 dB.
  - Der Unterschied entsteht also durch die Verkleinerung auf 480 px. Die Kompression kostet nur 0,2–0,5 dB.
  - Im vergrößerten Ausschnitt sind verlustfreie Verkleinerung und AVIF praktisch gleich. Das Original wirkt nicht schärfer, sondern körniger, weil der Browser 1671 px in einem Schritt auf ca. 420 px herunterrechnet.
- Ergebnis: **kein sichtbarer Qualitätsverlust durch die Kompression.** Die Vergleichsbilder liegen nur lokal vor und sind nicht Teil des Repos.

## Tests

**Neu: `tests/images.spec.ts`** (läuft auf Desktop, Smartphone und Smartphone quer):
- **Basispfad:** Auf Startseite, Impressum und Datenschutz lädt jedes Bild (auch die Lazy-Bilder in geschlossenen Projektfenstern) unter `/Tivi-Dev/`, ohne HTTP-Fehler.
- **`<picture>`-Aufbau:** AVIF vor WebP, Original als `<img src>`, `sizes` gesetzt, jeder `srcset`-Eintrag unter `/Tivi-Dev/images/…`.
- **LCP-Foto:** `fetchpriority="high"`, nicht lazy. Der Browser wählt AVIF, und zwar mindestens so breit, wie das Foto gezeichnet wird.
- **Varianten:** Jede im HTML verwendete Variante hat genau die angegebene Breite und das Seitenverhältnis des Originals.
- **Schrift:** WOFF2-Preload unter dem Basispfad, genau eine Font-Anfrage, Schrift aktiv.
- **Ohne JavaScript** bleibt das mobile Menü offen und der Menü-Button verborgen.
- **CLS:** Startseite bei Slow 4G, Summe aller Layout-Shifts < 0,05.
  - Negativkontrolle: Mit dem alten Menü-CSS misst der Test 0,255 und schlägt fehl.
  - Ein zunächst geschriebener Test „Menü ohne Modul-Scripts eingeklappt“ bestand auch mit dem alten Code (Astro bettet das kleine Script direkt ins HTML ein, Blockieren greift nicht). Er wurde wieder entfernt.

**Angepasst:** keine bestehenden Tests. `tests/navigation.spec.ts` hält Schriften schon per `/\.(ttf|woff2?)/` zurück.

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run build` | erfolgreich; 0 Fehler, 0 Warnungen, 0 Hinweise. Die bekannte Vite-Warnung `MODULE_LEVEL_DIRECTIVE` erscheint weiterhin |
| `npx astro check` | 0 Fehler, 0 Warnungen, 0 Hinweise |
| `npm run test:e2e`, zwei Läufe | je **456 bestanden**, 0 fehlgeschlagen, 0 flaky, 9 übersprungen (vorher 432; 24 neu = 8 Tests × 3 Viewports) |
| `git diff --check` | sauber |
| Dev-Modus (`astro dev`) | reine `<img>`-Tags mit Original-PNG, `/keystatic` antwortet 200 |

## Geänderte Dateien

| Datei | Änderung |
|---|---|
| `src/lib/responsive-images.ts` | **neu:** Breiten, Dateinamen, Pixelmaße, `coverScale()`, Build-Schritt mit Cache |
| `src/components/ResponsiveImage.astro` | **neu:** `<picture>` im Build, `<img>` im Dev-Modus |
| `astro.config.mjs` | Integration `responsive-images` (`astro:build:done`) |
| `src/pages/index.astro` | Startseitenfoto über `ResponsiveImage`, `sizes` mit Beschnittfaktor |
| `src/components/AboutProfile.astro`, `ProjectCard.astro`, `ProjectDetails.astro`, `SkillCard.astro` | `ResponsiveImage` statt `<img>` |
| `src/layouts/BaseLayout.astro` | Inline-Klasse `js`, Font-Preload, `navigation-ready` entfernt |
| `src/styles/global.css` | `picture { display: contents }`, Menü-Regeln an `.js`, `@font-face` mit WOFF2 |
| `src/assets/fonts/Manrope-VariableFont_wght.woff2` / `.ttf` | WOFF2 neu, TTF entfernt |
| `package.json`, `package-lock.json` | `sharp` 0.35.5 als direkte devDependency (war schon über Astro installiert) |
| `tests/images.spec.ts` | **neu** (siehe oben) |
| `tests/navigation.spec.ts` | Wartebedingung im Mausrad-Szenario (siehe Nachtrag) |
| `audits/phase2b-performance.md` | dieser Bericht |

## Einschränkungen und offene Punkte

- **Originale bleiben im Build.** Die PNGs sind der Fallback für Browser ohne `<picture>`/AVIF/WebP und werden von modernen Browsern nicht geladen. `dist` wächst durch die Varianten von 8,4 auf 14 MB. Das betrifft den Speicher auf GitHub Pages, nicht die Ladezeit.
- **Die Quelldateien in Keystatic sind unverändert groß** (z. B. 2,1 MB). Kleinere Uploads würden nur Repo-Größe und Build-Zeit verbessern, nicht die ausgelieferten Bytes.
- **`sizes` beruht auf gemessenen CSS-Breiten.** Wird das Layout später geändert (z. B. Breite der Projektkarten), muss `sizes` mitgezogen werden. Zu kleine Werte führen zu unscharfen, zu große zu unnötig großen Bildern.
- **Projektkarte beim Hover/Fokus:** Das Bild wächst auf die volle Kartenhöhe (Deckkraft 18 %). Dort ist die gewählte Variante etwas knapp bemessen, wegen der geringen Deckkraft ohne praktische Auswirkung.
- **Menü:** Lädt die Seite mit JavaScript, schlägt aber das gebündelte Menü-Script fehl, ist das Menü eingeklappt und der Button ohne Funktion. Vorher wäre es offen geblieben. Das ist der übliche Kompromiss dieses Musters.
- **Messungen nur lokal und in Chromium.** Eine Messung auf GitHub Pages (`https://tivi-dev.github.io/Tivi-Dev/`) nach dem Deployment steht aus. Firefox und Safari sind Teil von Phase 4 (#15).
- **Testumgebung:** Chromium braucht in dieser WSL-Umgebung `libnspr4`/`libnss3`/`libasound2`. Diese wurden nur temporär per `LD_LIBRARY_PATH` eingebunden. Dauerhaft: `sudo npx playwright install-deps chromium`.
- Nicht Teil dieses Issues und unverändert: SEO und Meta-Beschreibung (#13), Kontaktformular (#14), Glasflächen von Kopf- und Fußleiste.

## Nachtrag: Korrekturen nach Codex-Review (FAIL)

### 1. Scrolltest `tests/navigation.spec.ts` – „natürliches Scrollen mit dem Mausrad gewinnt“ (Smartphone)

- **Reproduziert:** isoliert 7 von 10 Läufen rot – **auch auf `main`** (6 von 10). Der Fehler stammt also nicht aus Phase 2B.
- **Ursache: Testfehler, kein Produktfehler.** Der Test wartete nur, bis `#skills` höchstens 5 px unter der Kopfzeile steht. Das browsereigene, weiche Scrollen zum Anker (`scroll-behavior: smooth`) läuft dann aber noch einige Frames weiter. Chromium verwirft ein Mausrad-Ereignis, das während dieser Animation eintrifft (Ereignis kommt an, `defaultPrevented: false`, aber keine Bewegung).
- **Beleg:** Mausrad mitten in der Animation 8 von 8 verschluckt, nach ihrem Ende 8 von 8 ok. In der Endphase wird das Ereignis auch mit **blockiertem Seiten-JavaScript** verschluckt (4 von 8), unser Code ist also nicht beteiligt.
- **Korrektur:** `gotoWithHeldFont` wartet zusätzlich mit dem vorhandenen, zustandsbasierten `waitForScrollRest`, bis das Anker-Scrollen steht. Es gibt keine feste Wartezeit. Dass die Aktion vor der verzögerten Initialausrichtung liegt, prüft weiterhin `document.fonts.status === 'loading'`.
- **Ergebnis:** Alle Tests „Frühe Benutzeraktion“ 10× auf 3 Viewports: 170 bestanden, 0 fehlgeschlagen (10 Touch-Fälle auf dem Desktop planmäßig übersprungen). Der Mausrad-Test 20× parallel: 60 von 60 bestanden.

### 2. Bildmetadaten-Cache

- **Problem:** `publicImageSize()` hat die Maße pro Pfad für die gesamte Laufzeit gespeichert. Keystatic ersetzt ein Bild unter demselben Pfad, und `astro dev` behält das Modul geladen. Die Folge wären veraltete `width`/`height` (verzerrtes Bild, Layout-Shift) und ein falscher Beschnittfaktor in `sizes`.
- **Korrektur:** Der Cache gilt nur, solange Änderungszeit und Bytegröße der Datei gleich sind (`statSync` pro Aufruf). Bei einem Austausch werden die Maße neu gelesen. Für eine gelöschte Datei liefert die Funktion `null`.
- **Test:** „Bildmaße folgen einem unter gleichem Pfad ersetzten Bild“ (400×200 → 300×300 → gelöscht, Wiederverwendung bei unveränderter Datei).

### 3. Varianten-Cache

- **Problem:** Der Schlüssel enthielt nur den Bildinhalt. Bei geänderter AVIF/WebP-Qualität wären veraltete Varianten aus `node_modules/.cache/responsive-images` ausgeliefert worden.
- **Korrektur:** `variantCacheKey()` bildet den Schlüssel aus Inhalt (vollständiger SHA-256), Breite, Format, Encoder-Einstellungen, `sharp.versions` (sharp/libvips) und `cacheVersion`. Der erste Build danach codiert einmal alles neu (etwa 1:40 min). Alte Cache-Dateien bleiben liegen, werden aber nicht mehr verwendet.
- **Tests:** Schlüssel ändert sich bei Qualität, Inhalt, Breite und Format. Zusätzlich erzeugt der Build-Schritt Varianten für `.jpg`/`.JPEG` (Format und Maße geprüft).

### 4. Testqualität `tests/images.spec.ts`

- **JPEG:** Die Varianten-Prüfung nahm immer `.png` als Original an. Jetzt sucht sie das Original mit seiner tatsächlichen Endung (png/jpg/jpeg, groß/klein). Die Fallback-Prüfung beachtet Groß-/Kleinschreibung nicht mehr.
- **Beschnittfaktor:** Die LCP-Prüfung verglich die gewählte Breite nur mit der Boxbreite. Jetzt verwendet sie die bei `object-fit: cover` tatsächlich gezeichnete Breite, `max(Boxbreite, Boxhöhe × Seitenverhältnis)`, mit Zoom, gedeckelt auf die Originalbreite aus dem `width`-Attribut statt der fest eingetragenen 1671. **Gegenprobe:** Ohne Faktor in `sizes` schlägt der Test auf allen 3 Viewports fehl (z. B. 960 statt ≥ 1341).
- **CLS-Test:**
  - Die feste Wartezeit von 500 ms ist ersetzt durch: Schrift geladen, Bilder im ersten Viewport decodiert, zwei Frames.
  - Neu ist die Prüfung, dass die Bilder unter der Drosselung wirklich erst nach dem ersten Paint ankommen. Nur dann misst der Test die späte Phase.
  - **Gegenprobe gegen den `main`-Build:** 0,255 auf dem Smartphone, der Test schlägt fehl.
  - Ein Filter auf `hadRecentInput` wurde verworfen. Chromium markiert in der Emulation den Menü-Shift mit `hadRecentInput: true`, obwohl der Test keine Eingabe sendet. Mit diesem Filter hätte der Test die Regression übersehen (gemessen: 0,022 statt 0,255).

### 5. GitHub-Pages-Basispfad

Das Repository heißt inzwischen **`Tivi-Dev/Tivi-Dev`**. Die GitHub-API leitet von `Tivi-Dev/Website` weiter, der lokale `origin` zeigt noch auf den alten Namen. Die Live-Seite antwortet unter `https://tivi-dev.github.io/Tivi-Dev/` mit 200 („Tivi-Dev Portfolio“), unter `/Website/` mit 404. `base: "/Tivi-Dev"` passt also zum Deployment (`deploy.yml`, `withastro/action`) und bleibt unverändert.

### Weitere offene Punkte aus dem Nachtrag

- **Restlicher Layout-Shift durch den Schriftwechsel:** Unter Drosselung (1,6 Mbit/s, 150 ms) entsteht beim Tausch der Fallback-Schrift gegen Manrope (`font-display: swap`) ein Shift von 0,022 (Text und Foto). Der Wert ist auf `main` gleich hoch, tritt jetzt aber früher auf (etwa 1,0 s statt 2,6 s). Lighthouse misst ohne echte Drosselung 0. Eine Korrektur, etwa eine angepasste Fallback-Schrift mit `size-adjust`, wäre eine Designfrage und gehört nicht zu diesem Nachtrag.
- **Mausrad während des Anker-Scrollens:** Ein echter Besucher, der in den ersten etwa 400 ms nach dem Laden mit `#anker` am Mausrad dreht, kann in Chromium diese eine Eingabe verlieren. Das ist Browserverhalten bei `scroll-behavior: smooth` und tritt auch ohne Seiten-JavaScript auf. Es betrifft nur Geräte mit Mausrad unterhalb der Desktop-Breite.
