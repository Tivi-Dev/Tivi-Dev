# Behebung der bestätigten Barrierefreiheitsfehler

Stand: 24. Oktober 2026 · Branch: `fix/audit-accessibility` (noch kein Commit)

Grundlage: `audits/ui-ux-barrierefreiheit-audit.md`, Punkte 1–3. Andere Befunde aus dem Audit wurden bewusst nicht angefasst.

## Änderungen

### 1. Erster Tab überspringt Skip-Link und Hauptnavigation

- **Datei:** `src/pages/index.astro` (Funktion `updateActive`)
- **Ursache:** Beim Laden schrieb `history.replaceState(null, '', '#home')` den Hash. Chrome setzt dadurch den Startpunkt der Tab-Reihenfolge auf `#home`, und der erste Tab sprang zum ersten „Öffnen“-Button.
- **Änderung:** Solange die Seite unberührt am Anfang steht (kein Hash, aktive Folie ist „Home“), wird der Hash nicht gesetzt. Sobald gescrollt oder navigiert wird, aktualisiert sich der Hash wie bisher. Die Markierung `aria-current` im Menü ist unverändert.

### 2. Alt-Attribute der Projektbilder bestehen nur aus Leerzeichen

- **Datei:** `src/components/ProjectCard.astro`
- **Änderung:** `alt={imageAlt ?? ''}` → `alt={imageAlt?.trim() ?? ''}`. Leerzeichen-Werte aus Keystatic ergeben jetzt ein echtes leeres `alt=""`. Das Bild gilt damit als dekorativ, der Projekttitel steht direkt daneben. Echte Alt-Texte bleiben unverändert.
- **Nicht geändert:** Die Inhaltsdateien `src/content/cards/projekte/*.json`. Sinnvolle Alt-Texte bleiben eine inhaltliche Entscheidung.

### 3. Feste Fußleiste verdeckt Inhalte und fokussierte Elemente

- **Datei:** `src/styles/global.css`
- **Änderung A:** In der vorhandenen Media Query für kleine bzw. Touch-Viewports (`max-width: 1100px`, `max-height: 740px`, `pointer: coarse`) gilt jetzt `html { scroll-padding-bottom: var(--footer-height); }`. Fokussierte Elemente werden dadurch oberhalb der Fußleiste eingeblendet. Der Desktop-Präsentationsmodus mit Scroll-Snapping liegt außerhalb dieser Query und ist nicht betroffen.
- **Änderung B:** Neue Media Query `max-height: 500px` (z. B. Smartphone quer). Dort ist die Fußleiste nicht mehr fixiert, sondern steht am Seitenende (`position: static`, `body` ohne Ausgleichsabstand). Vorher belegten Kopf- und Fußleiste dort 37 % der Bildschirmhöhe. Aussehen und Höhe der Fußleiste bleiben gleich.

## Tests

Die Tests liefen mit Playwright 1.49 (headless Chromium 131) und axe-core 4.10 gegen den lokalen Produktionsbuild, der unter `/Tivi-Dev/` ausgeliefert wurde, also wie auf GitHub Pages. Vorher und nachher wurde jeweils dasselbe Skript genutzt.

### Produktionsbuild

`npm run build` (= `astro check && astro build`): erfolgreich, 8 Seiten. `astro check` meldet 0 Fehler, 0 Warnungen und 0 Hinweise. *Korrektur:* Der Bundler (Vite/Rolldown) gibt beim Build eine Warnung `MODULE_LEVEL_DIRECTIVE` zu `src/content/legal/impressum.mdoc` aus. Sie existiert schon im unveränderten Stand und wurde hier zunächst nicht getrennt ausgewiesen (Details im Nachtrag unten).

### Tastatur

| Viewport | Erste 3 Tabs vorher | Erste 3 Tabs nachher |
|---|---|---|
| 1440×900 | Öffnen → Öffnen → Python-Zertifikat | Zum Inhalt → Mein Portfolio → Home |
| 375×667 | Öffnen → Öffnen → Python-Zertifikat | Zum Inhalt → Mein Portfolio → Menü |
| 740×360 | Öffnen → Öffnen → Python-Zertifikat | Zum Inhalt → Mein Portfolio → Menü |

- Der Skip-Link setzt nachher bei allen drei Größen den Hash `#inhalt`. Der nächste Tab landet im Inhalt („Öffnen“).
- **Verdeckte Fokus-Elemente** beim vollständigen Tab-Durchlauf:
  - 1440×900: vorher keine, nachher keine.
  - 375×667: vorher war die Textarea unter der Fußleiste, nachher keine.
  - 740×360: vorher lagen E-Mail-Feld und Textarea unter der Fußleiste, nachher keine.
- Das Testskript meldet den Skip-Link als „unter Header“. Das ist ein Fehlalarm, denn der Skip-Link liegt absichtlich über dem Header (`z-index: 20`).
- Bei 740×360 ragt die fokussierte Textarea 14 px über den unteren Bildschirmrand hinaus. Nichts verdeckt sie, die Fußleiste ist dort statisch. Chrome scrollt ein Textfeld nur so weit, dass der obere Teil mit dem Cursor sichtbar ist. Das ist kein Teil dieses Fehlers.

### Alt-Texte

- Die Projektbilder hatten vorher `alt=" "` und `alt="    "`, nachher `alt=""`.
- Die axe-Regel `image-alt` meldete vorher 2 Verstöße, nachher keinen (bei allen drei Viewports).
- axe meldet weiterhin `color-contrast` x3 (Audit-Punkt 4, bewusst nicht Teil dieses Fixes).

### Responsive-Verhalten und Regressionen

| Prüfung | 1440×900 | 375×667 | 740×360 |
|---|---|---|---|
| Horizontales Scrollen | nein | nein | nein |
| Fußleiste | fixiert, 70 px | fixiert, 96 px | **statisch**, 70 px |
| Senden-Button am Seitenende sichtbar | ja | ja | ja |
| JS-Fehler | keine | keine | keine |

- **Pixelvergleich vorher/nachher** (Bildschirmseite für Bildschirmseite, gleiche Seitenhöhe):
  - 1440×900 und 375×667: 0 abweichende Pixel, das Design ist dort unverändert.
  - 740×360: Abweichungen nur durch die Fußleiste, die dort nun am Seitenende statt fixiert steht (beabsichtigt).
- **Desktop-Präsentationsmodus** (1440×900): Navigation über das Menü zu allen 5 Abschnitten funktioniert. Die Oberkante liegt jeweils bei 70 px (direkt unter dem Header) und der Hash wird gesetzt. Pfeil ↓ wechselt von Home zu `#skills`. Alles wie vorher.
- **Mobiles Menü** (375×667, 740×360): Das Menü öffnet sich (`aria-expanded=true`). Ein Klick auf „Kontakt“ springt zu `#kontakt` direkt unter den Header. Alles wie vorher.

### Nicht getestet

Getestet wurde nur Chromium. Firefox, Safari/iOS, echte Touch-Geräte und Screenreader wurden nicht geprüft. Die Live-Seite ist bis zum Merge und Deploy unverändert.

---

## Nachtrag: Fehler in der Hash-Navigation

Stand: 24. Oktober 2026 · gleicher Branch, kein Commit

### Fehlerbild (von OpenAI Codex gemeldet, hier reproduziert)

`pendingInitialAlignment` wurde bei *jedem* Hash beim Laden aktiviert, aber nur für gültige Slide-Anker wieder beendet. Bei `#inhalt` (Skip-Link) oder `#unbekannt` blieb die Sperre dauerhaft aktiv. Die Seite scrollte bei Menü, Tastatur, Mausrad oder Scrollen korrekt, die URL blieb aber auf `#inhalt` bzw. `#unbekannt` stehen. In diesen Fällen fehlte nach dem Laden außerdem die Menümarkierung `aria-current`.

Bei den Regressionstests fiel ein zweiter Fehler auf, den der Fix aus Punkt 1 eingeführt hatte: Ein ausdrücklicher Klick auf „Home“ direkt nach dem Laden setzte keinen Hash (`#home`).

### Änderungen (nur `src/pages/index.astro`, Navigationsskript)

1. **Sperre nur für gültige Slide-Anker:** `initialIndex` wird einmal ermittelt. `pendingInitialAlignment` ist nur `true`, wenn der Start-Hash ein Abschnitt ist (`#home`, `#skills`, …).
2. **Sperre endet immer:** Die Initialausrichtung setzt die Sperre nach `load` und `document.fonts.ready` zurück, auch wenn `fonts.ready` fehlschlägt. Eine bewusste Navigation (`goToSlide`) beendet sie sofort. Kommt eine Navigation vor der Initialausrichtung, scrollt die Ausrichtung nicht mehr zurück.
3. **Automatisch und bewusst getrennt:**
   - Neues Flag `hasExplicitNavigation`, gesetzt nur in `goToSlide` (Menü, Tastatur, Mausrad, `hashchange`).
   - Die automatische Initialisierung ruft `updateActive(false)` auf. Sie markiert nur den aktiven Menüpunkt und schreibt nie die URL.
   - Der Scroll-Handler ruft `updateActive()` jetzt über eine Pfeilfunktion auf, damit der rAF-Zeitstempel nicht als Parameter durchgereicht wird.
4. **Klick auf Home:** Die Ausnahme „unberührter Start“ gilt nur ohne bewusste Navigation. Ein Klick auf „Home“ setzt daher `#home`, auch direkt nach dem Laden.
5. **Tab-Reihenfolge bleibt repariert:** Solange nicht bewusst navigiert wurde, kein Slide-Hash vorhanden ist (kein Hash, `#inhalt`, unbekannter Anker) und „Home“ sichtbar ist, bleibt die URL unverändert. Das betrifft auch das minimale automatische Scrollen des Browsers zu `#inhalt` beim Laden auf Mobilgeräten, das sonst `#home` geschrieben hätte. Natürliches Scrollen zu einem anderen Abschnitt aktualisiert den Hash wie bisher.

### Regressionstests (Playwright 1.49, Chromium 131, lokaler Produktionsbuild unter `/Tivi-Dev/`)

Getestet bei 1440×900 (Präsentationsmodus) und 375×667 (mobiles Menü, natürliches Scrollen). Jede Prüfung vergleicht drei Werte: URL-Hash, tatsächlich sichtbaren Abschnitt und Menüpunkt mit `aria-current`.

| Szenario | vorher | nachher |
|---|---|---|
| Start ohne Hash: Hash bleibt leer, erster Tab erreicht den Skip-Link | ✅ | ✅ |
| Start mit `#home` | ✅ | ✅ |
| Start mit `#inhalt`: Hash bleibt, „Home“ markiert | ❌ (keine Markierung) | ✅ |
| `#inhalt` → Skills → Kontakt | ❌ (URL bleibt `#inhalt`) | ✅ |
| Start mit `#unbekannt`, Markierung | ❌ | ✅ |
| `#unbekannt` → Skills → Kontakt | ❌ (URL bleibt `#unbekannt`) | ✅ |
| Direkter Klick auf Home nach dem Laden | ❌ (kein Hash) | ✅ |
| Start mit `#skills`, Fragment-Navigation `#kontakt`, Zurück, Vorwärts, Neuladen | ✅ | ✅ |
| Skip-Link in der Sitzung, danach Menü → Projekte | ✅ | ✅ |
| Menü durch alle 5 Abschnitte | ✅ | ✅ |
| Tastatur ↓, Bild↓, Ende, ↑, Pos1 (Desktop) | ✅ | ✅ |
| Mausrad runter/hoch (Desktop) | ✅ | ✅ |
| `#inhalt` → Mausrad (Desktop) bzw. natürliches Scrollen (Mobil) | ❌ | ✅ |

**Ergebnis:**

- Vorher: 38/54 Einzelprüfungen bestanden (16 Fehler).
- Nachher: **54/54 bestanden**, ohne JS-Fehler.

Die Tests zu den bisherigen Barrierefreiheitskorrekturen (1440×900, 375×667, 740×360) sind unverändert grün:

- Erste Tabs: Skip-Link → Seitentitel → Home bzw. Menü.
- Kein Fokus unter der Fußleiste, kein horizontales Scrollen.
- Projektbilder haben `alt=""`, axe meldet kein `image-alt` mehr.
- Fußleiste bei 740×360 statisch.

### Prüfungen

| Werkzeug | Art | Ergebnis |
|---|---|---|
| `npx astro check` | Compiler/Typprüfung | 0 Fehler, 0 Warnungen, 0 Hinweise (26 Dateien), Exit 0 |
| `npm run build` (Teil `astro check`) | Compiler/Typprüfung | 0 Fehler, 0 Warnungen, 0 Hinweise |
| `npm run build` (Teil `astro build`) | Build | erfolgreich, 8 Seiten, Exit 0, keine Astro-Build-Warnungen |
| `npm run build` (Vite/Rolldown) | Bundler | 1 Warnung `MODULE_LEVEL_DIRECTIVE` („use astro:head-inject“ in `src/content/legal/impressum.mdoc`). **Schon im unveränderten Stand vorhanden**, stammt aus der Markdoc-Integration und hängt nicht mit dieser Änderung zusammen. |
| `git diff --check` | Whitespace | keine Befunde, Exit 0 |

### Verbleibende Punkte

- Die Bundler-Warnung `MODULE_LEVEL_DIRECTIVE` besteht weiter (vorbestehend, nicht Teil dieses Auftrags).
- axe meldet weiterhin `color-contrast` x3 (Audit-Punkt 4, nicht Teil dieses Auftrags).
- Getestet wurde nur Chromium. Firefox, Safari/iOS, echte Touch-Geräte und Screenreader wurden nicht geprüft.
- Die Testskripte liegen außerhalb des Repositorys im Scratchpad der Sitzung, das Projekt hat keine Playwright-Infrastruktur. Sie sind daher nicht dauerhaft im Projekt hinterlegt.

---

## Nachtrag 2: Race Condition, schnelle Menüwechsel und Playwright-Testsuite

Stand: 24. Oktober 2026 · Branch `fix/audit-accessibility`, kein Commit, kein Push

### Gemeldete Fehler (OpenAI Codex), reproduziert

1. **Race Condition bei verzögerter Initialausrichtung.** Beim Start mit `#skills` wartet die Ausrichtung auf `load` und `document.fonts.ready`. In dieser Zeit wurden natürliches Scrollen, Touch-Wischen, die native End-Taste und der Skip-Link nicht als Benutzeraktion erkannt, und die verspätete Ausrichtung sprang zurück zu Skills.
2. **Schnelle Menüwechsel.** `isNavigating` verwarf jede Zielwahl während einer laufenden Animation. Bei Skills → Kontakt innerhalb von 100 ms blieb die Seite bei Skills.

### Bei der Testentwicklung zusätzlich gefundene Ursachen

| Befund | Ursache | Status |
|---|---|---|
| Start mit gültigem Hash landete unter Last gelegentlich **einen Abschnitt zu weit** (z. B. `#ueber-mich` → `#kontakt`), auf allen Viewports | Wegen `scroll-behavior: smooth` animiert der Browser den eigenen Anker-Sprung beim Laden. Ein `scrollTo(…, 'instant')` während dieser Animation addiert Chrome zur Restanimation (gemessen: Ziel 2484 px, Ergebnis 3720 px). **Vorbestehend**, auch im ursprünglichen Code. | behoben |
| Hash wurde nach Skip-Link oder Zurück kurzzeitig bzw. dauerhaft falsch geschrieben | Zwischen der Anker- bzw. Verlaufsnavigation des Browsers und dem `hashchange`-Ereignis können bereits Scroll-Ereignisse eintreffen, die den Hash synchronisierten. Feste Wartezeiten (650 ms bzw. 150 ms) waren unter Last zu kurz. | behoben |
| Nach Abbruch der Initialausrichtung durch eine Aktion ohne Scrollwirkung fehlte `aria-current` | Die Markierung wurde nur bei Scroll-Ereignissen aktualisiert. | behoben |
| Fokussierte Textarea lag auf dem Smartphone (Mobil-Emulation) 61 px unter der fixierten Fußleiste | Mobile Browser scrollen ein Textfeld nur bis zum Cursor und ignorieren dabei `scroll-padding-bottom`. Die erste Prüfung lief ohne Mobil-Emulation und hat das nicht erfasst. | behoben |

### Änderungen

**`src/pages/index.astro`, Navigationsskript (neu strukturiert)**

- **Klarer Navigationszustand mit Token statt Einzel-Flags.** `pendingInitialAlignment`, `hasExplicitNavigation` und `isNavigating` sind ersetzt durch:
  ```ts
  type Navigation = { mode: 'idle' } | { mode: 'aligning' | 'animating' | 'following'; token: number };
  ```
  - `idle`: Der Nutzer steuert, der Scroll-Listener synchronisiert Hash und `aria-current`.
  - `aligning`: Initialausrichtung auf einen Abschnitts-Hash.
  - `animating`: animierter Wechsel zu einem gewählten Abschnitt.
  - `following`: Der Browser scrollt zu einem Nicht-Abschnitts-Anker oder Verlaufseintrag (`#inhalt`, Zurück/Vorwärts).

  Jeder automatische Schritt trägt das Token, mit dem er gestartet wurde. Timer-, Promise- und rAF-Callbacks prüfen es über `isCurrent(token)` und können ein veraltetes Ziel nicht mehr wiederherstellen.
- **Benutzeraktionen haben immer Vorrang.** `releaseToUser()` beendet jeden ausstehenden automatischen Schritt. Auslöser sind:
  - `pointerdown` (Maus, Stift, Touch inklusive Beginn einer Wischgeste),
  - jedes `keydown`, das nicht als Präsentationstaste verarbeitet wird (native Scrolltasten, Tab, Enter auf dem Skip-Link),
  - jedes nicht verarbeitete `wheel`-Ereignis.

  Nach der Freigabe wird der sichtbare Abschnitt sofort markiert.
- **Programmatisches und bewusstes Scrollen sind getrennt.** Scroll-Ereignisse während `aligning`, `animating` und `following` gelten als programmatisch und schreiben keinen Hash.
  - Ein zusätzlicher `knownHash` erkennt, wenn der Browser den Hash geändert hat, `hashchange` aber noch aussteht. Bis dahin wird nicht synchronisiert.
  - Fragmentwechsel zu einem Abschnitt starten eine Navigation zu diesem Abschnitt. Andere Fragmente und Verlaufseinträge wechseln in `following`.
- **Die letzte Zielwahl gewinnt.**
  - `goToSlide()` verwirft keine Anfrage mehr: Neues Token, und ein neues `scrollTo` ersetzt die laufende Animation.
  - Animationen und Browser-Scrolls enden mit `scrollend`. Ein Ruhezeit-Timer dient als Sicherheitsnetz (1 s mit `scrollend`, 200 ms ohne).
  - Der Nachlauf einer Mausrad- oder Trackpad-Geste wird während der Animation weiterhin ignoriert, wie bisher.
  - Gehaltene Tasten (`event.repeat`) überspringen während der Animation keine Abschnitte.
- **Initialausrichtung abbrechbar und robust.** Sie wartet wie bisher auf `load` und `document.fonts.ready`. Dann korrigiert sie Bild für Bild, bis die Position 3 Frames lang hält oder das Seitenende erreicht ist (maximal 120 Frames). Jede Benutzeraktion bricht sie über das Token ab.
- **Unverändert erhalten:**
  - Eine unberührte Startseite ohne Abschnitts-Hash schreibt kein `#home` (Tab-Reihenfolge).
  - Ein bewusster Klick auf Home schreibt `#home`.
  - Wheel-Schwellen, Tastenbelegung, Präsentations-Media-Query, `aria-current="location"` und Reduced-Motion-Verhalten bleiben gleich.

**`src/layouts/BaseLayout.astro`**

- Ein neuer `focusin`-Handler für `input`, `textarea` und `select` ruft `scrollIntoView({ block: 'nearest' })` auf. Das berücksichtigt `scroll-padding-bottom`, sodass die fixierte Fußleiste ein fokussiertes Formularfeld auch auf Mobilgeräten nicht mehr verdeckt. Dieser Teil liegt außerhalb der Navigation, war aber nötig, damit Korrektur 3 aus dem ersten Durchgang auf echten Mobilgeräten wirkt.

**Testinfrastruktur (neu)**

- **`playwright.config.ts`:**
  - Drei Projekte: `desktop` (1440×900, Desktop Chrome), `smartphone` (375×667, Pixel-7-Emulation mit Touch) und `smartphone-landscape` (740×360).
  - `webServer`: `astro preview --ignore-lock` auf Port 4329. Ohne `--ignore-lock` startet Astro 7 den Preview-Server in dieser Umgebung im Hintergrund.
- **`tests/navigation.spec.ts`:**
  - Erster Tab ohne Hash, alle fünf Abschnitts-Hashes, `#inhalt` und `#unbekannt` mit Skills → Kontakt.
  - Frühe Benutzeraktionen bei zurückgehaltener Schrift: Mausrad, Touch-Wischen, End, Skip-Link, Menü, Fragmentwechsel.
  - Klick auf Home, alle Abschnitte über das Menü, zwei Zielwahlen innerhalb von 100 ms (synthetisch und als echte Mausklicks).
  - Zurück, Vorwärts und Neuladen, Skip-Link → Menü → Zurück.
  - Präsentationsmodus mit Tastatur und Mausrad inklusive Nachlauf.
- **`tests/accessibility.spec.ts`:**
  - Tab-Reihenfolge und Skip-Link.
  - Kein fokussiertes Element unter Kopf- oder fixierter Fußleiste.
  - Letzter Inhalt oberhalb der Fußleiste erreichbar.
  - Fußleiste bei Höhe ≤ 500 px statisch.
  - Projektbilder ohne Alt-Attribute aus Leerzeichen (eigene Prüfung plus axe-Regel `image-alt`).
- **`package.json`:**
  - Neue Skripte `test:e2e` (`astro build && playwright test`) und `test:e2e:install` (`playwright install chromium`).
  - Neue devDependencies, exakt gepinnt, weil die Browser-Version an die Playwright-Version gebunden ist: `@playwright/test@1.64.1` und `@axe-core/playwright@4.14.0`. `package-lock.json` ist aktualisiert.
- **`.gitignore`:** `test-results/` und `playwright-report/`.

**So wird sichergestellt, dass die Race-Tests den Fehler wirklich treffen:**

- Die Schriftdatei wird per `page.route` zurückgehalten, und die Navigation nutzt `waitUntil: 'domcontentloaded'` statt `networkidle`.
- Vor jeder kritischen Aktion prüft der Test `document.fonts.status === 'loading'`, die Initialausrichtung steht also nachweislich noch aus.
- Die Aktion erfolgt erst, wenn der Browser die Seite sichtbar zum Anker gescrollt hat. Eine Taste vor dem ersten Rendern kann kein Nutzer drücken, und der Browser überschreibt sie mit seinem eigenen Anker-Sprung.
- Erst wenn die Seite zur Ruhe gekommen ist, wird die Schrift freigegeben. Danach wird geprüft, dass kein Rücksprung erfolgt.
- Schnelle Eingabefolgen (Doppelklick, Mausrad-Nachlauf, Touch-Wischen) werden über CDP ohne Round-Trip-Wartezeit gesendet. Die tatsächlichen Abstände misst die Seite selbst (`performance.now()`).

### Testergebnisse

| Prüfung | Art | Ergebnis |
|---|---|---|
| `npx astro check` | Compiler/Typprüfung | 0 Fehler, 0 Warnungen, 0 Hinweise (29 Dateien inklusive Tests und Config), Exit 0 |
| `npm run build` → `astro check` | Compiler/Typprüfung | 0 Fehler, 0 Warnungen, 0 Hinweise |
| `npm run build` → `astro build` | Build | erfolgreich, 8 Seiten, Exit 0, keine Astro-Build-Warnungen |
| `npm run build` → Vite/Rolldown | Bundler | 1 Warnung `MODULE_LEVEL_DIRECTIVE` in `src/content/legal/impressum.mdoc` (vorbestehend, unverändert) |
| `npm run test:e2e` | Playwright | **77 bestanden, 0 fehlgeschlagen, 7 übersprungen**, Exit 0 |
| `npx playwright test --repeat-each 5` | Stabilität unter Parallel-Last | **385 bestanden, 0 fehlgeschlagen, 35 übersprungen**, Exit 0 |
| `git diff --check` | Whitespace (versionierte Dateien) | keine Befunde, Exit 0 |
| `git diff --no-index --check` für die drei neuen Dateien | Whitespace (neue Dateien) | keine Befunde |
| Pixelvergleich gegen den ursprünglichen Stand (`HEAD`) | Design | 1440×900 und 375×667: 0 abweichende Pixel. 740×360: nur die Fußleiste aus Korrektur 3 (unverändert gegenüber Nachtrag 1). |

Die 7 übersprungenen Tests sind beabsichtigt:

- Präsentationsmodus (Tastatur, Mausrad) und echte Doppelklicks im dauerhaft sichtbaren Desktop-Menü gibt es nur auf dem Desktop: 3 Tests × 2 Smartphone-Projekte.
- Die Touch-Wischgeste gibt es nur auf Smartphones: 1 Test auf dem Desktop.

**Gegenprobe:** Die neue Suite lief zusätzlich gegen einen Build mit dem Navigationsskript vor diesem Nachtrag (Kopie im Scratchpad, gleicher Port). Ergebnis: **19 fehlgeschlagen, 58 bestanden.** Fehlgeschlagen sind unter anderem:

- natürliches Scrollen, Touch-Wischen, End und Skip-Link vor dem Ladeabschluss,
- beide Schnellklick-Tests (in allen Projekten),
- Zurück nach Skip-Link und Menü,
- ein Start mit gültigem Hash.

Die Tests decken die gemeldeten Fehler also tatsächlich auf.

### Lokale Ausführung

```bash
npm ci
npm run test:e2e:install   # lädt Chromium für Playwright
npm run test:e2e           # baut die Seite und führt die Suite aus
```

Auf dieser WSL-Maschine fehlen die Chromium-Systembibliotheken `libnss3`, `libnspr4` und `libasound2`, und `sudo` stand nicht zur Verfügung. Für die Testläufe wurden die Bibliotheken ohne Installation in den Scratchpad entpackt und über `LD_LIBRARY_PATH` eingebunden. Auf einem regulären System bzw. in CI genügt `npx playwright install --with-deps chromium`. Die Suite ist bisher nicht in den GitHub-Actions-Workflow eingebunden.

### Verbleibende Risiken

- **Nur Chromium getestet.** Firefox und Safari/iOS fehlen. Safari unterstützt `scrollend` erst in neueren Versionen; dort gilt der 200-ms-Ruhezeit-Fallback, ungetestet. Echte Touch-Geräte und Screenreader wurden nicht geprüft.
- **Ziehen der Scrollbar** erzeugt kein `pointerdown` auf der Seite und wird daher nicht als Benutzeraktion erkannt. Innerhalb der kurzen Phase bis zur Initialausrichtung könnte die Ausrichtung eine Scrollbar-Bewegung überschreiben.
- **Aktionen vor dem ersten Rendern** (z. B. eine Taste, bevor die Seite sichtbar ist) kann das Skript nicht berücksichtigen. Der Browser überschreibt sie mit seinem eigenen Anker-Sprung.
- **Virtuelle Tastatur auf echten Smartphones:** Der `focusin`-Fix scrollt vor dem Öffnen der Tastatur. Ob das Feld danach vollständig sichtbar bleibt, hängt vom Browser ab und ist nur emuliert geprüft.
- **Zeitkritische Tests:** Die Schnellklick- und Mausrad-Tests verlangen, dass Ereignisse innerhalb von 100 bzw. 400 ms eintreffen. Fünf Wiederholungen unter Parallel-Last liefen fehlerfrei, auf sehr langsamen CI-Runnern sind Ausreißer möglich.
- **Vorbestehend und nicht Teil dieses Auftrags:** die Bundler-Warnung `MODULE_LEVEL_DIRECTIVE` und `color-contrast` x3 (Audit-Punkt 4).

---

## Nachtrag 3: Gegenwahl, bevor sich die Scrollposition verändert

Stand: 24. Oktober 2026 · Branch `fix/audit-accessibility`, kein Commit, kein Push

### Fehler (OpenAI Codex), reproduziert

Ablauf: Start bei Home → Skills wählen → nach 0–10 ms wieder Home wählen. Die Seite scrollte trotzdem zu Skills, URL-Hash und `aria-current` zeigten danach Skills.

Reproduktion vor der Korrektur über Menüklicks im Seitenkontext, Endposition nach 1,8 s:

- Desktop: 6 von 9 Läufen bei Skills (760 px).
- Smartphone: 8 von 9 Läufen bei Skills (881 px).

### Genaue Ursache

`goToSlide()` hat bei einem Zielabstand von höchstens 1 px die Navigation sofort beendet und keinen Scrollbefehl abgesetzt. Die zuvor durch den Skills-Klick gestartete native Smooth-Scroll-Animation (`window.scrollTo({ behavior: 'smooth' })`) lief dadurch im Browser weiter. Das Navigationstoken entwertet nur JavaScript-Callbacks, es stoppt keine Browser-Animation. Nach deren Ende synchronisierte der Scroll-Listener Hash und `aria-current` korrekt auf den tatsächlich sichtbaren Abschnitt, also auf Skills.

Zusätzlich hätte der `scrollend`-Handler jede laufende `animating`-Navigation abgeschlossen, auch wenn das Ereignis von einer ersetzten oder abgebrochenen älteren Animation stammte.

### Lässt sich die native Scroll-Animation zuverlässig abbrechen?

Experiment in Chromium 156 auf Desktop und Smartphone: Start der Animation zu Skills, nach 0, 5 und 10 ms ein Abbruchversuch, je 3 Wiederholungen.

- **Abbruch:** Jeder neue `scrollTo`-Aufruf hat die laufende Animation in **allen 54 Läufen** gestoppt, egal ob `instant` oder `smooth`, auf die aktuelle oder auf die Zielposition.
- **Aber nicht pixelgenau:** Zum Zeitpunkt des Abbruchs hatte der Compositor die Seite oft schon **2–10 px** weiterbewegt, während `scrollY` im Hauptthread noch 0 meldete. Ein einzelner Aufruf reicht daher nicht. Die Position muss danach erneut gemessen und korrigiert werden.
- **Ausnahme:** Eine Ausnahme ist aus Nachtrag 2 bekannt. Die vom Browser selbst gestartete Anker-Animation beim Laden wird durch ein einzelnes `instant`-`scrollTo` nicht sauber abgebrochen, ihre Restdistanz kommt hinzu. Sie wird ebenfalls durch das bildweise Halten der Position abgefangen.

**Fazit:** In Chromium ist das Abbrechen zuverlässig möglich, wenn danach die Position bildweise kontrolliert wird. In Firefox und Safari ist das nicht geprüft.

### Korrektur (`src/pages/index.astro`)

- **`holdPosition(index, token)`:** Der Helfer setzt beim ersten Frame **immer** ein `scrollTo({ behavior: 'instant' })` auf das Ziel ab und bricht damit eine laufende Browser-Animation ab. Danach korrigiert er Bild für Bild, bis die Position 3 Frames hält oder das Seitenende erreicht ist (maximal 120 Frames). Er läuft nur, solange sein Token aktuell ist. Die bisherige Schleife der Initialausrichtung nutzt jetzt denselben Helfer, das Verhalten dort ist unverändert.
- **`goToSlide()`:** Liegt das Ziel bereits an der aktuellen Position (≤ 1 px), ruft es `holdPosition()` auf, statt sofort abzuschließen. Bei größerem Abstand ersetzt wie bisher ein neues Smooth-`scrollTo` die laufende Animation.
- **Zustand `animating` mit Ziel:** `{ mode: 'animating'; token; target }`. Der `scrollend`-Handler schließt eine Animation nur ab, wenn ihr eigenes Ziel erreicht ist (`isAtSlide(target)`). Ein verspätetes `scrollend` einer älteren Animation kann einen neueren Vorgang also nicht mehr beenden. Timer waren bereits über `clearTimeout` und `isCurrent(token)` abgesichert.
- **Unverändert erhalten:** das Token-System, „letzte Zielwahl gewinnt“, Wheel-Nachlauf, Tastatur, Fragment- und Verlaufsnavigation sowie die Regel, dass eine unberührte Startseite kein `#home` schreibt.

### Zusätzlich gefundener und behobener Fehler (`src/layouts/BaseLayout.astro`)

Beim dreifachen Gesamtlauf schlug der Test „kein fokussiertes Element liegt unter der Kopf- oder einer fixierten Fußleiste“ auf dem Desktop zweimal fehl.

- **Nachgestellter Ablauf:** Schnelles Tabben vom Link „Python-Zertifikat“ in das erste Kontaktfeld, während der Fokus-Scroll noch animiert. Danach rief der in Nachtrag 2 ergänzte `focusin`-Handler `scrollIntoView` auf, und das Desktop-Scroll-Snapping (`mandatory`) zog die Seite zurück zu „Über Mich“ (y = 2280). Das Feld lag außerhalb des Bildschirms (4 von 16 Läufen).
- **Ursache:** Der Handler aus Nachtrag 2 lief auch auf dem Desktop, wo er nicht gebraucht wird (`scroll-padding-bottom` gilt dort nicht) und mit dem Snapping konkurriert.
- **Korrektur:** Der Handler wirkt nur noch in derselben Media Query wie `scroll-padding-bottom` in `global.css`: `(max-width: 1100px), (max-height: 740px), (pointer: coarse)`.
- **Ergebnis:** 0 von 192 Läufen fehlerhaft.

### Neue Regressionstests (`tests/navigation.spec.ts`, Gruppe „Gegenwahl, bevor sich die Scrollposition verändert“)

Gemeinsame Prüfung `expectStaysAt`:

- Warten, bis die Scrollposition 5 Frames stillsteht.
- Dann muss der Zielabschnitt sichtbar sein, und Hash und `aria-current` müssen stimmen.
- Danach **1 s Beobachtung mit Messung in jedem Frame**: Die Position darf um höchstens 1 px abweichen, und der Zustand muss danach unverändert sein.

| Test | Projekte |
|---|---|
| Home → Skills → nach 0 / 5 / 10 ms Home: Home bleibt. Bei 0 ms wird zusätzlich geprüft, dass sich die Seite beim zweiten Klick noch nicht bewegt hatte (kritischer Pfad). | alle 3 |
| Umgekehrt: Start bei `#skills`, Home → nach 0 / 5 / 10 ms Skills: Skills bleibt | alle 3 |
| Mehrfachwechsel Skills → Kontakt → Projekte → Home (je 10 ms): Home bleibt | alle 3 |
| Mehrfachwechsel Kontakt → Home → Skills → Home → Projekte (0–25 ms): Projekte bleibt | alle 3 |
| Echte Mausklicks (CDP) auf Skills und sofort Home. Die Seite protokolliert die Scrollposition bei beiden Klicks; beide müssen bei 0 liegen, also vor jeder sichtbaren Bewegung. | Desktop |

Die programmatischen Tests klicken die echten Menülinks im Seitenkontext und durchlaufen damit denselben Click-Handler. Echte Taps auf dem Smartphone sind innerhalb von 10 ms nicht möglich, weil sich das mobile Menü nach dem ersten Klick schließt. Dort decken die programmatischen Tests den Fall ab.

### Testergebnisse

| Prüfung | Ergebnis |
|---|---|
| **Gegenprobe:** neue Tests gegen den Build vor dieser Korrektur, 3 Wiederholungen | **50 fehlgeschlagen**, 25 bestanden, 6 übersprungen. Alle 0/5/10-ms-Varianten beider Richtungen und die echten Mausklicks schlugen fehl. Die beiden Mehrfachwechsel-Tests bestanden auch dort, weil sich die Seite vor dem letzten Klick bereits bewegt hatte. |
| `npm run build` | Exit 0. `astro check`: 0 Fehler, 0 Warnungen, 0 Hinweise. Build: 8 Seiten. **Bundler:** 1 Warnung `MODULE_LEVEL_DIRECTIVE` (vorbestehend). |
| `npx astro check` | 0 Fehler, 0 Warnungen, 0 Hinweise, Exit 0 |
| `npm run test:e2e` | **102 bestanden, 0 fehlgeschlagen, 9 übersprungen**, Exit 0 |
| Gesamte Suite `--repeat-each 3` | **306 bestanden, 0 fehlgeschlagen, 27 übersprungen**, Exit 0 |
| Kritische Gruppe „Gegenwahl“ `--repeat-each 20` | **500 bestanden, 0 fehlgeschlagen, 40 übersprungen**, Exit 0 |
| `git diff --check` und Prüfung der drei neuen Dateien | keine Befunde |
| Pixelvergleich gegen `HEAD` | 1440×900 und 375×667: 0 abweichende Pixel. 740×360: nur die Fußleiste aus Korrektur 3 (unverändert). |

Übersprungen werden nur Tests, die es auf einem Gerätetyp nicht gibt: Präsentationsmodus und echte Desktop-Mausklicks auf Smartphones, Touch-Wischgeste auf dem Desktop. Das sind 3 Tests auf jedem der beiden Smartphone-Projekte und einer auf dem Desktop, zusammen 9.

### Verbleibende Risiken

- Das Abbrechen der nativen Animation ist nur in **Chromium** nachgewiesen. Ob Firefox und Safari eine laufende Smooth-Scroll-Animation bei `scrollTo` auf die aktuelle Position ebenso abbrechen, ist ungeprüft. Die bildweise Korrektur fängt Restbewegungen bis zu 120 Frames (~2 s) ab; eine danach noch laufende Animation würde nicht mehr korrigiert.
- Echte Touch-Doppeltaps im mobilen Menü innerhalb von 10 ms sind nicht testbar (das Menü schließt sich), siehe oben.
- Alle übrigen Risiken aus Nachtrag 2 gelten weiter.
