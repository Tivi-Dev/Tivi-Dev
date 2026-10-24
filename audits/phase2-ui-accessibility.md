# Phase 2A – UI/UX, Responsive Design und Barrierefreiheit

Stand: 24. Oktober 2026 · Branch `fix/phase2-ui-accessibility` (von `main` 8086897, nach dem Merge von PR #10) · kein Commit, kein Push

## Vorbereitung

- Phase 1 ist gemergt: Commit `33a9c18` steckt in `origin/main`, Merge-Commit `8086897` („Merge pull request #10“).
- Das lokale `main` war bereits auf diesem Stand (`git merge --ff-only origin/main`: „Already up to date“).
- Danach wurde der Branch `fix/phase2-ui-accessibility` angelegt.
- Nicht angefasst wurden die beiden ungetrackten Dateien `audits/astro-keystatic-review.md` und `audits/claude-report.md`.

## Geänderte Dateien

| Datei | Änderung |
|---|---|
| `src/lib/contrast.ts` (neu) | Kontrastberechnung nach WCAG 2.x. `readableTextColor()` dunkelt eine Farbe nur so weit ab wie nötig; der Farbton bleibt dabei erhalten. |
| `src/components/AboutProfile.astro` | Die Themen-Überschriften und ihre Icons nutzen eine lesbare Textfarbe, die aus der Linienfarbe abgeleitet ist. Die Linien selbst behalten die Keystatic-Farbe. Die sechs Themen-`section`s sind keine benannten Regionen mehr. |
| `src/lib/about-schema.ts` | Die Beschreibung des Keystatic-Felds „Linienfarbe“ nennt jetzt die automatische Abdunklung. |
| `src/pages/index.astro` | Aufeinanderfolgende H1-Zeilen bilden ein gemeinsames `h1`. „Home“ und die H2/H3-Zeilen im Intro sind `p`. Das JavaScript, das die Schriftgröße von „Interesse geweckt?“ verkleinerte, ist entfernt. |
| `src/styles/global.css` | Regeln, die das bisherige Aussehen der umgebauten Startseiten-Elemente erhalten. Die Kontaktüberschrift bricht um (`text-wrap: balance`) statt `nowrap`. |
| `src/content/legal/impressum.mdoc` | `### Kontakt` → `## Kontakt` |
| `src/content/homepage.json`, `kontakt.json`, `ueber-mich.json`, `cards/projekte/mini-mail.json` | Rechtschreibung korrigiert, siehe Abschnitt D |
| `src/pages/[page].astro`, `src/pages/404.astro` | Einheitliche Seitentitel „Seite · Tivi-Dev Portfolio“ |
| `playwright.config.ts` | Drei neue Projekte: `tablet` 820×1180, `smartphone-320` 320×640 und `zoom-200` (720×450 bei DPR 2). Sie führen nur die Layout- und Barrierefreiheitstests aus. |
| `tests/layout.spec.ts` (neu) | Neue Tests für Kontrast, Überschriften, Landmarks, Überlauf, Typografie, Tastatur und Titel |
| `audits/phase2-ui-accessibility.md` (neu) | Diese Dokumentation |

## A. Farbkontraste

**Ursache:**
- Die Überschrift eines Themas in „Über Mich“ hatte genau die Farbe ihrer Linie (`--topic-line-color`).
- Für „Persönliches Profil“, „Ausbildung“ und „Hobbys“ ist in Keystatic `#2596be` eingetragen. Diese Farbe ist für 16 px große Schrift (fett, Großbuchstaben) zu hell.

**Lösung:**
- Linien- und Textfarbe sind jetzt getrennt.
- Beim Build rechnet `readableTextColor()` die Linienfarbe in kleinen Schritten dunkler, bis sie auf beiden echten Hintergründen mindestens **5:1** erreicht. Das sind `#f7f6f2` (Desktop) und `#fffefa` (Karten unter 1100 px).
- Der Puffer über 4,5:1 hat einen Grund: axe rechnet den optionalen Textschatten aus Keystatic als dunkleren Hintergrund mit ein, beim Profil ergibt das `#f0f0ec`.
- **Überholt:** Der Puffer reicht mit Textschatten nicht aus. Die Schattenlogik wurde nach dem Codex-Review geändert, siehe „Nachtrag: Kontrastkorrektur nach Codex-Review“ am Ende.
- Farben, die schon dunkel genug sind, bleiben unverändert, zum Beispiel `#005733`.
- So bleibt auch jede spätere Farbwahl in Keystatic lesbar, ohne dass jemand Kontraste prüfen muss. Die Keystatic-Inhalte selbst bleiben unverändert.

| Überschrift | Alt | Neu | Kontrast alt (Desktop / Mobil / mit Schatten) | Kontrast neu |
|---|---|---|---|---|
| Persönliches Profil | `#2596be` | `#1c7290` | 3,14 / 3,36 / **2,97** | 5,03 / 5,39 / **4,76** (nur Mobil; auf dem Desktop 4,42, von axe als `incomplete` verdeckt; siehe Nachtrag) |
| Ausbildung | `#2596be` | `#1c7290` | 3,14 / **3,36** | 5,03 / 5,39 |
| Hobbys | `#2596be` | `#1c7290` | **3,14** / 3,36 | 5,03 / 5,39 |
| Interessen, Zertifikate, Skills | `#005733` | `#005733` (unverändert) | 8,05 / 8,63 | 8,05 / 8,63 |

- Die Icons übernehmen die Textfarbe über `currentColor`.
- Die Verbindungslinien und der farbige linke Rand bleiben im ursprünglichen Blau `#2596be`. Für Linien gelten 3:1 (Nicht-Text-Kontrast), das erreicht `#2596be` mit 3,14 bzw. 3,36.
- **axe:** `color-contrast` meldete vorher Verstöße in allen sechs Viewports, jetzt in keinem.

## B. Semantische Überschriften

| Vorher | Nachher |
|---|---|
| `h2` Home → `h1` Sergey → `h1` Fokin → `h3` „Software sollte man spüren…“ → `h2` Skills … | `h1` **Sergey Fokin** → `h2` Skills → `h3` Frontend … → `h2` Projekte … → `h2` Über Mich → `h3` Themen → `h2` Kontakt → `h3` Interesse geweckt? … |
| Impressum: `h1` Impressum → `h3` Kontakt | `h1` Impressum → `h2` Kontakt |

**H1 „Sergey Fokin“:**
- Aufeinanderfolgende Keystatic-Zeilen im Stil „H1 – Groß“ werden zu einem gemeinsamen `<h1 class="home-name">` zusammengefasst.
- Jede Zeile bleibt ein eigenes `<span class="home-line">` mit `display: block`. Größe, Abstände, Schatten und Fettschrift aus Keystatic gelten also weiter pro Zeile.
- Ein Leerzeichen zwischen den Spans sorgt für den Namen „Sergey Fokin“ statt „SergeyFokin“ im Screenreader.
- `letter-spacing: -.055em` ist auf den Zeilen neu gesetzt, damit der Wert wie vorher von der jeweiligen Zeilengröße abhängt.

**„Home“:**
- „Home“ ist ein `<p class="page-title">` mit derselben Optik.
- Die Folie heißt über `aria-label="Home"` weiter „Home“, als Region und für das Menü.
- Ein `h2` vor dem `h1` hätte die Hierarchie umgedreht.

**Zitat:**
- Das Motto „Software sollte man spüren…“ und die Antwort „NEIN! … sie sollte funktionieren!“ sind ein Wortspiel, keine Überschrift für einen folgenden Abschnitt.
- `blockquote` passt nicht, weil kein fremder Text zitiert wird. `q` würde die Anführungszeichen verdoppeln, die schon im Text stehen.
- Deshalb wird eine H2- oder H3-Zeile im Startseiten-Intro als `<p>` ausgegeben. Die Größen und Fettschrift von vorher (1.5em/1.17em, 700) bleiben über CSS mit niedriger Spezifität erhalten, eine Größe aus Keystatic gewinnt weiterhin.

**Impressum:**
- `### Kontakt` wurde zu `## Kontakt`.
- „Kontakt“ ist dadurch etwas größer und sieht jetzt aus wie die H2-Überschriften der Datenschutzseite (`.prose h2`, 1.6rem).

**Doppelte Landmarks:**
- axe meldete `landmark-unique`, weil es zwei Regionen „Skills“ gab: den Abschnitt `#skills` und das Thema „Skills“ in „Über Mich“.
- Die sechs Themen in „Über Mich“ sind jetzt `section`s ohne Namen und damit keine Landmarks mehr. Erreichbar sind sie weiter über ihre `h3`.
- Den Titel „Skills“ habe ich nicht umbenannt, das ist eine inhaltliche Entscheidung (siehe offene Punkte).

## C. Responsive Typografie

- **Ursache:** `white-space: nowrap` plus ein ResizeObserver-Skript, das die Schriftgröße so lange verkleinerte, bis die Überschrift in eine Zeile passte. Bei 320 px ergab das 12,99 px, bei 375 px 15,47 px.
- **Lösung:**
  - Das Skript ist entfernt.
  - Die Überschrift darf umbrechen, `text-wrap: balance` verteilt die Zeilen gleichmäßig, und `overflow-wrap: break-word` schützt vor Überlauf bei langen Wörtern.
  - Es gilt die vorhandene Größe `clamp(1.125rem, 3vw, 2rem)`.

| Viewport | Schriftgröße alt | neu |
|---|---|---|
| 1440×900 | 32 px | 32 px (eine Zeile, unverändert) |
| 820×1180 | 24,6 px | 24,6 px (unverändert) |
| 740×360 | 22,2 px | 22,2 px |
| 200 % Zoom (720×450) | 21,6 px | 21,6 px |
| 375×667 | 15,47 px | **18 px**, zwei Zeilen |
| 320×640 | **12,99 px** | **18 px**, zwei Zeilen |

**Kleine Höhen und 200 % Zoom:**
- Geprüft bei 740×360 und bei 720×450 mit DPR 2. Das entspricht einem 1440×900-Bildschirm mit 200 % Browserzoom.
- Kein horizontaler Überlauf und keine Inhaltsschrift unter 12 px. Die Fußleiste ist bei 360 px Höhe weiter statisch (Phase 1).
- Abstände habe ich nicht geändert. Bei 360 px Höhe ist der Startbildschirm höher als der Viewport, das war schon vorher so und ist bei dieser Höhe sinnvoll.

## D. Redaktionelle Korrekturen

| Datei | Alt | Neu |
|---|---|---|
| `homepage.json` | `NEIN ! ... sie sollte Funktionieren !` | `NEIN! ... sie sollte funktionieren!` |
| `kontakt.json` | `Interesse geweckt ? Dann schreibe mir eine Mail` | `Interesse geweckt? Dann schreibe mir eine Mail` |
| `ueber-mich.json` | `aus Rheinland - Pfalz` | `aus Rheinland-Pfalz` |
| `cards/projekte/mini-mail.json` | `Eine Minimalistisch Anwendung um deine Mails verwalten zu können ` | `Eine minimalistische Anwendung, um deine Mails verwalten zu können` |

**Seitentitel:**

| Seite | Titel alt | Titel neu |
|---|---|---|
| Startseite | `Tivi-Dev Portfolio` | `Tivi-Dev Portfolio` (unverändert) |
| Impressum | `Impressum · Meine Website` | `Impressum · Tivi-Dev Portfolio` |
| Datenschutz | `Datenschutzerklärung · Meine Website` | `Datenschutzerklärung · Tivi-Dev Portfolio` |
| 404 | `Seite nicht gefunden` | `Seite nicht gefunden · Tivi-Dev Portfolio` |

- Der Website-Name kommt aus dem Keystatic-Feld „Titel“ der Startseite, eine Änderung dort wirkt also auf alle Seiten.
- Persönliche Aussagen, das „NEIN!“, die „...“ und die Großschreibung „Über Mich“ (Menübezeichnung) habe ich nicht verändert.

## Tests

**Neue Projekte in `playwright.config.ts`:**
- `tablet` 820×1180, Touch, DPR 2.
- `smartphone-320` 320×640.
- `zoom-200` 720×450 bei DPR 2. Das Layout entspricht 200 % Zoom auf 1440×900, es ist aber eine Emulation und kein echter Browser-Zoom.
- Diese drei Projekte führen nur `layout.spec.ts` und `accessibility.spec.ts` aus.
- Die Navigationssuite aus Phase 1 läuft unverändert auf Desktop, Smartphone und Querformat. Kein bestehender Test wurde geändert oder entfernt.

**Neue Tests in `tests/layout.spec.ts`, auf allen sechs Viewports:**
- Für Startseite, Impressum und Datenschutz:
  - axe mit WCAG 2.0/2.1/2.2 A/AA plus best-practice (enthält `color-contrast`, `heading-order`, `landmark-unique`, `page-has-heading-one`): keine Verstöße.
  - Genau ein `h1`, keine übersprungene Ebene.
  - Kein horizontaler Überlauf.
  - Keine Inhaltsschrift unter 12 px.
- Startseite:
  - Das `h1` heißt „Sergey Fokin“ und steht auf zwei Zeilen. Keine Überschrift „Home“, aber eine Region „Home“. Keine `h2`/`h3` im Home-Abschnitt.
  - Landmark-Namen sind eindeutig.
  - Alle sechs Themen-Überschriften erreichen mindestens 4,5:1 gegen ihren berechneten Hintergrund.
  - Die Kontaktüberschrift hat keine Inline-Schriftgröße, ist mindestens 18 px und nicht kleiner als die Feldlabels und passt in ihre Breite.
  - Tastatur: Name → E-Mail → Betreff → Nachricht → Senden, und der Button liegt danach im Viewport.
- Seitentitel: alle im Schema „Seite · Tivi-Dev Portfolio“.
- Unit-Test für `readableTextColor`: Zu helle Farben, darunter Gelb und Weiß, erreichen mindestens 5:1. `#005733` und `#32664b` bleiben unverändert.
- `tests/accessibility.spec.ts` (Phase 1, unverändert) läuft jetzt zusätzlich auf Tablet, 320 px und 200 % Zoom: Tab-Reihenfolge, Skip-Link, Fokus nicht unter Kopf- oder Fußleiste, Seitenende, Fußleiste, Alt-Texte.

### Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| `npm run build` | erfolgreich; Typprüfung 0 Fehler, 0 Warnungen, 0 Hinweise |
| Vite-Bundler | 1 Warnung `MODULE_LEVEL_DIRECTIVE` (`impressum.mdoc`), schon vor Phase 1 vorhanden |
| `npx astro check` | 0 Fehler, 0 Warnungen, 0 Hinweise |
| `npm run test:e2e`, Lauf 1 | **234 bestanden**, 0 fehlgeschlagen, 9 absichtlich übersprungen (wie in Phase 1) |
| `npm run test:e2e`, Lauf 2 | **234 bestanden**, 0 fehlgeschlagen, 9 übersprungen |
| Negativkontrolle: `layout.spec.ts` gegen den Build vor den Änderungen | **50 fehlgeschlagen**, 64 bestanden. Erkannt wurden Kontrast, Überschriften, Landmarks, Impressum, Seitentitel und die Kontaktüberschrift (nur 320 und 375 px, wo sie schrumpfte). |
| `git diff --check` und die neuen Dateien | sauber |

Vorher waren es 102 Tests aus Phase 1 (plus 9 übersprungene), jetzt 234. Die Phase-1-Suite ist darin unverändert enthalten und grün.

### Screenshot-Vergleich vorher/nachher

- **Aufnahme:** ganzseitige Screenshots von Startseite, Impressum und Datenschutz in allen sechs Viewports, mit `reducedMotion` und ohne Scroll-Snap. Danach ein pixelgenauer Vergleich.
- **Ablage:** Die Bilder liegen außerhalb des Repositorys im Scratchpad der Sitzung (`before/shots`, `after/shots`, `diffs`).

| Seite | Ergebnis |
|---|---|
| Datenschutz (alle Viewports) | 0 abweichende Pixel |
| Startseite Desktop 1440×900 | Abweichungen nur bei: „NEIN! … funktionieren!“, MiniMail-Beschreibung, „Rheinland-Pfalz“, den drei Themen-Überschriften (dunkleres Blau) und „Interesse geweckt?“ (Fragezeichen). Name, „Home“, Motto und Layout sind pixelgleich. |
| Startseite Tablet, Querformat, 200 % Zoom | Dieselben Textstellen und Farben |
| Startseite 375 und 320 px | Zusätzlich bricht die Kontaktüberschrift auf zwei Zeilen um (18 px statt 15,5 bzw. 13 px). Die Seite wird dadurch 25–28 px höher. |
| Impressum (alle) | „Kontakt“ ist größer (H2 wie auf der Datenschutzseite), alles darunter rutscht entsprechend nach unten |

### Gewollte visuelle Unterschiede

1. Die Überschriften „Persönliches Profil“, „Ausbildung“, „Hobbys“ und ihre Icons sind dunkler: `#1c7290` statt `#2596be`. Linien und Ränder bleiben unverändert.
2. „Interesse geweckt? Dann schreibe mir eine Mail“ bricht auf schmalen Displays auf zwei Zeilen um und bleibt mindestens 18 px groß.
3. „Kontakt“ im Impressum hat H2-Größe.
4. Die Textkorrekturen aus Abschnitt D.

## Noch offene Punkte

- **Inhaltlich (nicht geändert, Entscheidung beim Inhaber):**
  - Das Thema „Skills“ in „Über Mich“ beschreibt eigene Projekte. „Eigene Projekte“ oder „Erfahrung“ wäre treffender.
  - Der Header-Titel heißt „Mein Portfolio“, der Website-Name „Tivi-Dev Portfolio“.
  - Die Autorenangaben sind uneinheitlich: „TIVI-DEV“ und „Tivi-Dev & Sveren“.
  - „Über Mich“ wäre nach Rechtschreibung „Über mich“.
- **Projektdialoge:** Im geöffneten Dialog folgt `h2` (Projektname) auf `h3` (Karte). Als modaler Dialog ist das ein eigener Kontext. axe meldet es nicht, weil geschlossene Dialoge nicht geprüft werden. Nicht geändert.
- **Mobile Rechtsseiten:** Die `h1` ist unter 1100 px nur `clamp(1rem, 2.5vw, 1.75rem)` groß, also 16 px bei 375 px. Die `h2` (25,6 px) ist dadurch größer als die `h1`. Das betraf schon vorher die Datenschutzseite und gilt jetzt auch für das Impressum. Das ist eine Designentscheidung, ich habe sie nicht geändert.
- **Startseiten-Intro:** `.home-text .prose > p:first-of-type` färbt den ersten Absatz grau. Beginnt der Inhalt in Keystatic einmal mit einer H2- oder H3-Zeile, träfe die Regel jetzt diese Zeile. Beim aktuellen Inhalt tritt das nicht auf.
- **Testumfang:**
  - Nur Chromium.
  - 200 % Zoom ist per Viewport und DPR emuliert, nicht als echter Browser-Zoom.
  - Keine echten Screenreader-Tests (NVDA, VoiceOver).
- **Ausgeklammert laut Auftrag:** Bildoptimierung, SEO (Meta-Beschreibung „test“) und Deployment.
- **Weiter offen aus dem Audit:** Punkte 10–12 (`category: " "`, `main tabindex="0"`, Weiterleitungsseiten) und die Vermutungen (Tastatur-Sprung bei hohen Folien, Scroll-Snap, Verbindungslinien, Foto-Alt-Texte).

---

## Nachtrag: Kontrastkorrektur nach Codex-Review

Codex hat zwei Fehler bestätigt. Beide sind behoben.

### Fehler 1: Der Textschatten senkt den Kontrast

**Untersuchung:**
- Der Textschatten aus Keystatic ist `0 2px 4px rgb(32 43 39 / Stufe × 0,0048)`, bei Stufe 50 also Deckkraft 0,24 (`src/lib/shadows.ts`).
- axe-core 4.14 rechnet einen weichgezeichneten Schatten als Abdunklung des Hintergrunds: Schattenfarbe mit `Deckkraft × 0,185 / (Blur / Schriftgröße + 0,4)`, bei 16 px also Deckkraft × 0,2846 (`axe.js`, `blurRadiusToAlpha`).
- Damit ergeben sich diese Werte:

| Textfarbe | Schatten 0 (Desktop / Mobil) | Schatten 50 | Schatten 100 |
|---|---|---|---|
| `#2596be` (`main`, Keystatic) | 3,14 / 3,36 | 2,76 / 2,97 | 2,42 / 2,59 |
| `#1c7290` (Phase 2A, erste Fassung) | 5,03 / 5,39 | **4,42** / 4,76 | **3,88** / **4,15** |
| `#005733` (Interessen, Zertifikate, Skills) | 8,05 / 8,63 | 7,10 / 7,62 | 6,22 / 6,64 |
| `#526057` (Thementexte, 15,2 px) | 6,13 / 6,57 | 5,39 / 5,80 | 4,73 / 5,05 |

- Bei `#1c7290` fällt der Kontrast auf dem Desktop ab Schattenstufe 45 unter 4,5:1 (4,494). Das gilt grundsätzlich: Eine korrigierte Farbe liegt per Konstruktion knapp über 5:1, und ein Schatten ab etwa Stufe 45 zieht mehr ab, als dieser Puffer abdeckt.
- **Selbstkorrektur:** In der ersten Fassung habe ich für „Persönliches Profil“ mit Schatten 4,76:1 angegeben. Das galt nur für den mobilen Hintergrund. Auf dem Desktop lag der Wert bei **4,42:1**, also unter AA. axe hatte ihn dort als `incomplete` gemeldet und der Test hatte `incomplete` nicht geprüft (Fehler 2).

**Lösung (bevorzugte Variante aus dem Review):** `readableHeading()` in `src/lib/contrast.ts` entscheidet beim Build pro Themenüberschrift:
1. Die Farbe wird wie bisher nur so weit abgedunkelt, bis sie ohne Schatten 5:1 erreicht.
2. Muss eine Überschrift korrigiert werden, entfällt ihr dekorativer Textschatten (`text-shadow: none`). Das ist der Fall, wenn
   - die Farbe abgedunkelt wurde, oder
   - der Schatten den Kontrast einer sonst unveränderten Farbe unter 4,5:1 ziehen würde (Modell wie axe).
3. Unkorrigierte Überschriften behalten ihren Schatten, z. B. `#005733` mit Stufe 50 oder 100.

**Weitere Punkte:**
- Der Puffer wurde nicht erhöht. 5:1 bleibt, damit sich die schon geprüfte Farbe `#1c7290` nicht noch einmal ändert. Für AA mit 4,5:1 gibt es dadurch Reserve.
- Die Icons zeichnen mit `currentColor`. Ein `text-shadow` wirkt nicht auf SVG, sie hatten also nie einen Schatten.
- Verbindungslinien, linker Rand und alle anderen Schatten bleiben unverändert.
- Die automatische Anpassung gilt weiter für jede Farbe und jede Schattenstufe aus Keystatic.
- `src/lib/shadows.ts` exportiert jetzt die Schattenparameter (`textShadowColor`, `textShadowBlur`, `shadowAlpha`). So nutzen Darstellung und Kontrastberechnung dieselben Werte. Die erzeugten Schattenwerte sind unverändert (geprüft am gebauten HTML).

**Ergebnis mit den aktuellen Inhalten:**
- Im gebauten HTML ändert sich gegenüber der ersten Fassung genau eine Stelle: `#about-profile-title` hat jetzt `text-shadow: none` statt Stufe 50. Impressum, Datenschutz und 404 sind byte-gleich.

| Überschrift | Farbe | Schatten | Kontrast Desktop / Mobil |
|---|---|---|---|
| Persönliches Profil | `#1c7290` | Stufe 50 → **entfernt** | 4,42 → **5,03** / 4,76 → **5,39** |
| Ausbildung, Hobbys | `#1c7290` | keiner (unverändert) | 5,03 / 5,39 |
| Interessen | `#005733` | Stufe 50 (bleibt) | 7,10 / 7,62 |
| Zertifikate, Skills | `#005733` | keiner | 8,05 / 8,63 |

**Screenshots** (Spalten: `main`, Phase 2A erste Fassung, jetzt):
- `audits/screenshots/phase2a-kontrast-desktop.png` (1440×900)
- `audits/screenshots/phase2a-kontrast-smartphone.png` (375×667)

### Fehler 2: Unvollständige axe-Ergebnisse

**Untersuchung:**
- Auf dem Desktop meldet axe für zehn Texte in „Über Mich“ `incomplete` mit `bgOverlap`, darunter `#about-profile-title`.
- **Ursache sind die dekorativen SVG-Verbindungslinien** (`.profile-map__connections`, absolut positioniert, `z-index: -1`). Sie liegen unter den deckenden Themenboxen, axe kann das aber nicht entscheiden.
- Gegenprobe mit ausgeblendeten Linien: 15 bestandene Prüfungen, 0 `incomplete`, und **eine Verletzung, die vorher verdeckt war**: `#about-profile-title` mit 4,42:1.
- Unter 1100 px sind die Linien ausgeblendet, dort gibt es dieses `incomplete` nicht.
- Weitere `incomplete`-Kontraste:
  - Kopf- und Fußleiste (`bgGradient`, Glas-Hintergrund) in allen Viewports.
  - Das Zeit-Badge `.project-card__duration` („Aktiv“, `imgNode`, liegt über dem Projektbild) auf Tablet und Smartphone.

**Tests (`tests/layout.spec.ts`):**
- **`incomplete` zählt nicht als bestanden.** Jeder Kontrast, den axe nicht entscheiden kann, braucht einen eigenen rechnerischen Nachweis. Fehlt der Nachweis oder liegt er unter 4,5:1 (bzw. 3:1 bei großem Text), schlägt der Test fehl.
  - Ausnahme ist Text auf den Glasflächen von Kopf- und Fußleiste. Er wird als Annotation „Kontrast ungeklärt“ ausdrücklich als ungeklärt ausgewiesen, nicht als bestanden.
- **Rechnerischer Nachweis (`renderedContrast`)** aus dem, was der Browser tatsächlich rendert:
  - berechnete Textfarbe und berechneter `text-shadow` (geparst, gleiches Schattenmodell wie axe);
  - die Ebenen, die an der Textmitte gezeichnet werden (`document.elementsFromPoint`).
  - Halbtransparente Ebenen werden über die erste deckende Ebene gelegt.
  - Liegt darunter unbekannter Inhalt (ein Bild oder ein fremdes Element), wird der ungünstigste Fall zwischen Schwarz und Weiß gerechnet.
  - Ein fremdes Element *über* dem Hintergrund macht den Nachweis ungültig. Das belegt zugleich, dass die SVG-Linien unter den Themenboxen liegen.
- **Neue Regressionstests:**
  - „Über Mich“, in allen sechs Viewports:
    - Korrigierte Überschriften haben `text-shadow: none`.
    - Jede der sechs Überschriften ist gerendert ≥ 4,5:1.
    - axe mit ausgeblendeten Linien: 0 Verletzungen, 0 `incomplete`, und alle sechs Überschriften stehen unter `passes`.
  - Schattenstufen **0, 50 und 100** für die Farben `#2596be`, `#005733` und `#1c7290` (9 Tests je Viewport):
    - Farbe und Schatten werden mit `readableHeading()` und `shadowValue()` genau so gesetzt, wie `AboutProfile.astro` sie ausgibt, und dann im Browser gemessen.
    - Geprüft werden das Ergebnis der Entscheidung, der gerenderte Kontrast ≥ 4,5:1, axe auf der unveränderten Seite (Verletzungen = 0, `incomplete` muss rechnerisch belegt sein) und axe ohne Linien (`passes`).
    - `#1c7290` ist ein Grenzfall: unverändert, aber mit Schatten 50 unter 4,5:1. Der Schatten muss deshalb entfallen.
  - Thementexte (`#526057`) mit Schatten 100: gerendert ≥ 4,5:1.
  - Bestehende Tests bleiben unverändert, auch „Überschriften in „Über Mich“ erreichen mindestens 4,5:1“.

### Was automatisch bestätigt ist und was nur rechnerisch

| Element | Desktop (mit SVG-Linien) | Tablet, Smartphone, Querformat, 200 % |
|---|---|---|
| Themenüberschriften und -texte „Über Mich“ | axe auf der Originalseite: `incomplete` (`bgOverlap`). **Rechnerisch** aus gerenderten Werten bestätigt. **axe bestätigt** sie, sobald die rein dekorativen Linien ausgeblendet sind. | **axe bestätigt** (`passes`) |
| Schattenstufen 0/50/100 | rechnerisch und mit axe ohne Linien | **axe bestätigt** und rechnerisch |
| Zeit-Badge „Aktiv“ (über dem Projektbild) | nur bei Hover/Fokus sichtbar, axe prüft es nicht | axe `incomplete` (`imgNode`). **Nur rechnerisch:** 5,21:1 im ungünstigsten Fall (weißes Badge mit 92 % Deckkraft über Schwarz) |
| Kopf- und Fußleiste (Glas) | **ungeklärt** | **ungeklärt** |
| Alle übrigen Texte | axe `passes` | axe `passes` |

**Glas-Kopf- und -Fußleiste:**
- Halbtransparenter Verlauf (Deckkraft ca. 0,5–0,6) mit `backdrop-filter` über dem weichgezeichneten Seiteninhalt.
- Im ungünstigsten Fall, dunkler Inhalt darunter, reicht der Kontrast rechnerisch nicht. Wie er tatsächlich ist, hängt vom gerade darunterliegenden Inhalt ab.
- Das ist ein bestehender Zustand aus der Zeit vor Phase 2A und gehört nicht zu diesem Auftrag. Er bleibt als offener Punkt stehen.

### Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| `npm run build` | erfolgreich; 0 Fehler, 0 Warnungen, 0 Hinweise. 1 schon vorhandene Vite-Warnung `MODULE_LEVEL_DIRECTIVE` |
| `npx astro check` | 0 Fehler, 0 Warnungen, 0 Hinweise |
| `npm run test:e2e`, zwei Läufe | je **300 bestanden**, 0 fehlgeschlagen, 9 übersprungen (vorher 234; 66 neue Tests = 11 × 6 Viewports) |
| Negativkontrolle: Schatten trotz korrigierter Farbe (Stand der ersten Fassung) | **7 fehlgeschlagen**: der neue „Über Mich“-Test in allen 6 Viewports und auf dem Desktop der axe-Test über `incomplete` → rechnerisch 4,42 < 4,5. Der alte Test hatte diesen Stand bestanden. |
| `git diff --check` und die neuen Dateien | sauber |

### Geänderte Dateien in diesem Nachtrag

| Datei | Änderung |
|---|---|
| `src/lib/contrast.ts` | `shadowedBackground()` (Schattenmodell ohne Rundung) und `readableHeading()`. `contrastRatio()` akzeptiert auch RGB-Kanäle. |
| `src/lib/shadows.ts` | `textShadowColor`, `textShadowBlur` und `shadowAlpha()` exportiert, `shadowValue()` nutzt sie. Die Ausgabe ist unverändert. |
| `src/components/AboutProfile.astro` | nutzt `readableHeading()`; der Schatten nur, wenn er keine Korrektur erfordert |
| `tests/layout.spec.ts` | `incomplete`-Auswertung, `renderedContrast()` und die neuen Regressionstests |
| `audits/phase2-ui-accessibility.md`, `audits/screenshots/phase2a-kontrast-*.png` | Dokumentation und Element-Screenshots |

### Offene Punkte aus diesem Nachtrag

- **Glas-Kopf- und -Fußleiste:** Der Kontrast ist ungeklärt (siehe oben). Er ließe sich nur mit einer höheren Deckkraft der Glasflächen garantieren, das wäre eine Designänderung.
- **Schattenmodell:** Grundlage ist die Näherung von axe-core für weichgezeichnete Schatten. Ein Pixelvergleich der Glyphenkanten wurde nicht gemacht.
- **Schattenstufen 0/50/100:** Sie werden im Test auf die gebaute Seite angewendet, so wie `AboutProfile.astro` sie ausgibt. Ein eigener Build pro Stufe wurde nicht erstellt.
- Getestet wurde nur Chromium.

---

## Nachtrag 2: Grenzwertfehler durch Quantisierung (Codex-Review)

Codex hat nachgewiesen: Bei einigen Keystatic-Farben bleibt der Textschatten aktiv, obwohl axe-core unter 4,5:1 misst. Ursache ist die Rundung, die axe beim Verrechnen des Schattens anwendet.

### Untersuchung (axe-core 4.14.0, `node_modules/axe-core/axe.js`)

- Bei 16 px und 4 px Blur liegt der Schatten über `shadowOutlineEmMax` (0,1 em). axe legt ihn deshalb als Hintergrundschicht an (`_getBackgroundColor` → `_getTextShadowColors`).
- Die Deckkraft ist `Alpha × 0,185 / (Blur / Schriftgröße + 0,4)` (`blurRadiusToAlpha`). Die Schriftgröße liest axe per `parseInt`, bei 1rem = 16 also exakt.
- `_flattenColors` rundet jeden Kanal mit `Math.round` auf eine ganze Zahl. Das ist die RGB-Quantisierung.
- Bestanden ist ein Text nur bei `contrast > 4.5`, also strikt größer (`isValid = contrast2 > expected`).
- **Zusätzlich gefunden:** axe liest das Schatten-Alpha aus `getComputedStyle`. Chromium speichert es als Byte (n/255) und gibt es mit zwei Nachkommastellen aus, wenn das wieder dasselbe Byte ergibt, sonst mit drei.
  - Bei 0, 50 und 100 bleibt der Wert gleich (0,24 / 0,48).
  - Bei 91 der Stufen 1–100 weicht er ab, z. B. 81: 0,3888 → 0,39 und 56: 0,2688 → 0,27.
  - Bei 26 Kombinationen aus Stufe und Hintergrund ändert das den gerundeten Hintergrund um eine Einheit.

### Korrektur (`src/lib/contrast.ts`)

- `shadowedBackground()` liefert zwei Varianten:
  - `exact`: deklarierte Deckkraft, Kanäle ungerundet (unverändert).
  - `quantized`: neu wie axe in Chromium, also gemeldete Deckkraft (`computedAlpha()`) und gerundete Kanäle.
- `shadowedContrast()` nimmt den ungünstigeren der beiden Werte.
- `readableHeading()` behält den Schatten nur, wenn die Farbe nicht abgedunkelt wurde **und** beide Varianten auf beiden Hintergründen mindestens 4,5:1 ergeben.
- Es gibt keinen zusätzlichen Puffer, keine pauschale Entfernung von Schatten und keine Änderung an der Keystatic-Konfiguration oder den Linienfarben. Die Abdunklung auf 5:1 ohne Schatten ist unverändert.

### Kontrastwerte vorher / nachher (Schatten 50, Desktop-Hintergrund `#f7f6f2`, 16 px)

| Farbe | ungerundet | axe (gerundet) | Schatten vorher | Schatten nachher |
|---|---|---|---|---|
| `#cc2211` | 4,500375 | **4,493268** | bleibt (Fehler) | **entfällt** |
| `#337722` | 4,502492 | **4,495381** | bleibt (Fehler) | **entfällt** |
| `#aa4477` | 4,502670 | **4,495559** | bleibt (Fehler) | **entfällt** |
| `#1c7290` | 4,436649 | 4,429642 | entfällt | entfällt |
| `#005733` | 7,101019 | 7,089804 | bleibt | bleibt |

Auf dem mobilen Hintergrund `#fffefa` liegen alle Werte bei Stufe 50 über 4,5 (z. B. `#cc2211`: 4,815 / 4,831). Bei Stufe 100 liegen alle Farben außer `#005733` unter 4,5 (Schatten entfällt). Bei Stufe 0 gibt es keinen Schatten; beide Varianten sind gleich (z. B. `#cc2211`: 5,104 / 5,469).

**Grenzfälle rund um 4,5:1:**

| Farbe, Stufe | ungerundet | gerundet | Entscheidung |
|---|---|---|---|
| `#b82b92`, 50 | 4,507122 | 4,500003 | knapp darüber → Schatten bleibt |
| `#ac3e88`, 50 | 4,507109 | 4,499990 | knapp darunter → Schatten entfällt |
| `#006d81`, 81 | 4,504345 | 4,518059 (deklariertes Alpha) → **4,484456** (Chromium-Alpha 0,39) | vorher bleibt, jetzt entfällt |
| `#0562d7`, 56 | 4,513594 | 4,502189 (deklariertes Alpha) → **4,493303** (Chromium-Alpha 0,27) | vorher bleibt, jetzt entfällt |

- Den umgekehrten Fall (ungerundet unter 4,5, gerundet darüber) gibt es bei diesen Hintergründen nicht. Eine Vollsuche über alle 16,7 Mio. Farben bei Stufe 50 ergab keinen Treffer: Auf `#f7f6f2` rundet axe immer dunkler, und dieser Hintergrund ist stets der ungünstigere. Die `min()`-Regel deckt den Fall trotzdem ab.
- **Auswirkung auf die aktuellen Inhalte:** keine. Im gebauten HTML behält weiterhin nur „Skills & Interessen“ (`#005733`, Stufe 50) den Schatten.

### Regressionstests (`tests/layout.spec.ts`)

- **Berechnung, ohne Browser:** `#cc2211`, `#337722`, `#aa4477`, `#1c7290`, `#005733` (dazu `#b82b92`, `#ac3e88`) × Stufen 0/50/100 × beide Hintergründe. Je Kombination werden ungerundeter und quantisierter Wert berechnet. Der Schatten muss genau dann bleiben, wenn beide ≥ 4,5:1 sind. Fest geprüft werden außerdem die Codex-Werte 4,500375 / 4,493268 mit `rgb(232 232 228)`, beide Grenzfälle und die beiden Alpha-Fälle (81 und 56).
- **Gerendert und axe pro Viewport:** dieselben Farben mit 0/50/100, gesetzt wie `AboutProfile.astro` sie ausgibt. Geprüft werden der gerenderte Kontrast ≥ 4,5, axe ohne Verletzung und axe ohne SVG-Linien unter `passes`.
- **axe-Diagnose mit erzwungenem Schatten:** `#cc2211`, `#337722`, `#aa4477` (Stufe 50) sowie `#006d81` (81) und `#0562d7` (56).
  - Die SVG-Linien werden nur in diesem Test ausgeblendet (`addStyleTag`), das Produktionslayout bleibt unverändert.
  - axe muss genau den quantisierten Hintergrund melden (`bgColor`) und den abgeschnittenen Kontrast.
  - Auf dem Desktop muss axe genau eine Verletzung melden, obwohl der ungerundete Wert ≥ 4,5 ist.
- **Neu:** „Schattendeckkraft im Modell entspricht dem, was Chromium an axe meldet (Stufen 1–100)“. Vergleicht `computedAlpha()` mit dem Wert aus `getComputedStyle` für alle 100 Stufen.

### Sporadischer Fokusfehler „Python-Zertifikat“

**Untersuchung:**
- Die alten Artefakte in `test-results/` (24 Wiederholungen von 13:52) enthielten 14 Fehlschläge. Alle waren Infrastruktur-Timeouts (`beforeEach`/`page.goto`, „browser has been closed“), keiner betraf die Assertion.
- Eigene Wiederholungen:

| Lauf | Ergebnis |
|---|---|
| 20× je Viewport (6), 4 Worker | 120/120 bestanden |
| 30× Desktop + 30× Zoom-200, **12 Worker** (vorher) | **7/60 fehlgeschlagen**: 5× „Python-Zertifikat“ `underFooter`, 1× „Öffnen ↗“ `underFooter`, 1× „Öffnen ↗“ `underHeader` (Zoom-200) |
| Diagnose-Kopie mit 15 s Beobachtung, 72 Läufe, 24 Worker | 111 verzögerte Fokus-Scrolls, **0 dauerhaft verdeckt**. Spätester Scrollbeginn nach 5,9 s, danach liegt jedes Element korrekt (z. B. Python-Zertifikat unten bei 720 px, Fußleiste ab 830 px) |
| CPU-Drosselung ×4/×10/×20 und Tab-Abstände 0–1000 ms | nicht reproduzierbar, Scroll läuft im Compositor |

- Trace und Screenshot des Fehlerlaufs: Fokus auf „Python-Zertifikat“, Seite steht noch auf „Projekte“ (`scrollY` 1520). Chromium startet den Smooth-Scroll zum Fokus unter Last nur verspätet.

**Ergebnis:** Timing-Effekt, keine Footer-Überdeckung. Navigation und Footer bleiben unverändert.

**Testanpassung (`tests/accessibility.spec.ts`):**
- Das Zeitfenster von `expect.poll` steigt von 3 s auf 10 s. Die Assertion (`underHeader: false, underFooter: false`) ist unverändert.
- Danach: 60/60 bestanden mit 12 Workern.
- **Negativkontrolle:** Kopie des Tests mit künstlich 320 px hoher Fußleiste schlägt weiterhin fehl (`underFooter: true` nach 10 s). Eine echte Überdeckung wird also weiter erkannt.

### Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| `npm run build` | erfolgreich; 0 Fehler, 0 Warnungen, 0 Hinweise. 1 bestehende Vite-Warnung `MODULE_LEVEL_DIRECTIVE` |
| `npx astro check` | 0 Fehler, 0 Warnungen, 0 Hinweise |
| `npm run test:e2e`, zwei Läufe | je **432 bestanden**, 0 fehlgeschlagen, 0 flaky, 9 übersprungen |
| `git diff --check` | sauber (neue Dateien ohne Leerzeichen am Zeilenende) |

**Testumgebung:** In dieser WSL-Umgebung fehlen `libnspr4`/`libnss3`/`libasound2`, Chromium startete deshalb nicht. Die Pakete wurden nur heruntergeladen, in ein temporäres Verzeichnis entpackt und per `LD_LIBRARY_PATH` eingebunden. Am System und am Projekt wurde nichts geändert. Dauerhafte Lösung: `sudo npx playwright install-deps chromium`.

### Geänderte Dateien in diesem Nachtrag

| Datei | Änderung |
|---|---|
| `src/lib/contrast.ts` | `computedAlpha()` (Alpha wie Chromium es an axe meldet); `quantized` nutzt es |
| `tests/layout.spec.ts` | Alpha-Grenzfälle, Diagnose für 81/56 und Alpha-Abgleich 1–100 |
| `tests/accessibility.spec.ts` | Zeitfenster des Fokus-Polls 3 s → 10 s, Begründung im Kommentar |
| `audits/phase2-ui-accessibility.md` | dieser Nachtrag |

### Offene Punkte

- Die Quantisierung des Alphas ist für Chromium modelliert. Firefox und WebKit melden Alpha womöglich anders; getestet wurde nur Chromium.
- axe besteht nur bei > 4,5 (strikt). Das Modell prüft ≥ 4,5. Ein Wert von exakt 4,5 ist mit diesen Farben praktisch nicht erreichbar, wurde aber nicht gesondert abgesichert.
- Die Glasflächen von Kopf- und Fußleiste bleiben eine separate Aufgabe (unverändert).
