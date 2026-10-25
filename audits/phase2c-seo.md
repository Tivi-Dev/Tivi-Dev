# Phase 2C – SEO, Metadaten und Link-Vorschauen

Issue #13 · Branch `seo/phase2c-metadata` (Basis: `main` mit Phase 2B, `a903a45`)

## Ergebnis auf einen Blick

| Prüfpunkt | Vorher (`main`) | Nachher |
|---|---|---|
| Meta-Description Startseite | `test` | Text aus den Inhalten der Seite (135 Zeichen), in Keystatic pflegbar, 50–160 Zeichen erzwungen |
| Beschreibung Impressum / Datenschutz | „… auf dieser Website.“ | eigener Text je Seite, alle Titel und Beschreibungen eindeutig |
| Canonical | fehlt | `https://tivi-dev.github.io/Tivi-Dev/…` je Seite; 404 ohne Canonical, mit `noindex` |
| Open Graph / X-Card | fehlen | `og:*` vollständig, `twitter:card = summary_large_image` |
| Vorschaubild | keins | `/social-preview.jpg`, 1200 × 630 JPEG (78 KB), aus dem Startseitenfoto erzeugt |
| Sitemap | keine | `/Tivi-Dev/sitemap.xml` mit den 3 indexierbaren Seiten |
| robots.txt | keine | bewusst keine (Begründung unten) |
| Strukturierte Daten | keine | `ProfilePage` mit `Person` (Name aus der H1, Foto) nur auf der Startseite |
| Alt-Text Startseitenfoto | leer | „Porträt von Sergey Fokin als Schwarz-Weiß-Zeichnung“ (Über-mich-Foto vorher: „Tivi“) |

## Umsetzung

### Metadaten (`src/layouts/BaseLayout.astro`)

- Neue Props:
  - `noindex` setzt `<meta name="robots" content="noindex">` und lässt Canonical und `og:url` weg.
  - `structuredData` gibt JSON-LD aus. `<` wird als `<` maskiert, damit Keystatic-Text das Script nicht beenden kann.
- **Canonical** und `og:url` entstehen aus `Astro.url.pathname`, der den Basispfad bereits enthält, und `site` aus `astro.config.mjs`. Ergebnis zum Beispiel: `https://tivi-dev.github.io/Tivi-Dev/impressum/`.
- **Open Graph:**
  - Tags: `og:type=website`, `og:locale=de_DE`, `og:site_name` (Startseitentitel), `og:title`, `og:description`, `og:url` sowie `og:image` mit Typ, Maßen und Alt-Text.
  - X liest Titel, Beschreibung und Bild aus diesen Tags; zusätzlich ist nur `twitter:card` gesetzt.
- `src/lib/site-url.ts`: neue Funktion `absoluteUrl()` für öffentliche Adressen.

### Texte

- **Startseite** (`src/content/homepage.json`): „Portfolio von Sergey Fokin, Anwendungsentwickler in Umschulung mit Fokus auf Frontend und Webentwicklung: Skills, Projekte und Kontakt.“ Der Text nennt nur, was die Seite selbst zeigt.
- **Keystatic** (`keystatic.config.ts`): Das Feld „Beschreibung für Suchmaschinen“ erklärt jetzt seinen Zweck. Es verlangt 50–160 Zeichen, sodass ein Platzhalter wie `test` nicht mehr gespeichert werden kann.
- **Impressum / Datenschutz** (`src/pages/[page].astro`): Je eine eigene Beschreibung. Sie verwendet den Seitentitel aus Keystatic und den Seitennamen.
- **Titel** waren schon eindeutig: „Tivi-Dev Portfolio“, „Impressum · …“, „Datenschutzerklärung · …“. Sie bleiben unverändert.

### Vorschaubild (`src/lib/social-preview.ts`, `src/pages/[preview].jpg.ts`)

- **Format:** 1200 × 630 (1,91 : 1). In diesem Format zeigen Facebook, LinkedIn, WhatsApp und X die große Vorschau.
- **Erzeugung:** Das Startseitenfoto ist freigestellt (transparenter Hintergrund). Es wird deshalb vollständig, ohne Beschnitt, auf den Seitenhintergrund `#f7f6f2` gesetzt, wie auf der Seite selbst.
- **Austausch:** Ersetzt man das Foto in Keystatic, folgt das Vorschaubild beim nächsten Build automatisch.
- **Ohne Startseitenfoto** entsteht kein Bild. Dann fehlt auch `og:image`, und die Karte fällt auf `summary` zurück.

### Sitemap und robots.txt

- `src/pages/sitemap.xml.ts` listet `/`, `/impressum/` und `/datenschutz/` mit ihrer öffentlichen Adresse.
- Nicht in der Sitemap stehen die 404-Seite und die Weiterleitungsseiten `/skills/`, `/projekte/`, `/ueber-mich/` und `/kontakt/`. Astro erzeugt diese bereits mit `noindex` und Weiterleitung auf den jeweiligen Abschnitt der Startseite.
- **Keine robots.txt, und zwar absichtlich:**
  - Crawler lesen `robots.txt` nur an der Wurzel der Domain, also `https://tivi-dev.github.io/robots.txt`.
  - Diese Adresse gehört auf GitHub Pages zum Repository `Tivi-Dev/tivi-dev.github.io`. Das existiert nicht (API: 404, Adresse: 404).
  - Eine Datei unter `/Tivi-Dev/robots.txt` würde deshalb ignoriert. Ohne robots.txt gilt für Crawler „alles erlaubt“, es gibt also keine falschen Sperren.
  - Die Sitemap muss daher in der Google Search Console eingereicht werden (siehe offene Punkte).

### Strukturierte Daten (`src/pages/index.astro`)

- `ProfilePage` mit `mainEntity: Person`. Der Name wird aus den H1-Zeilen der Startseite zusammengesetzt („Sergey Fokin“); dazu kommen `image` (das Startseitenfoto) und `url`.
- **Bewusst nicht enthalten:** `jobTitle`, `sameAs` und Kontaktdaten. Sie stehen nicht eindeutig strukturiert in den Inhalten und könnten veralten.
- Gibt es keine H1-Zeile, entfällt das JSON-LD ganz.
- Nutzen: Google ordnet die Seite einer Person zu. `ProfilePage` ist ein von Google unterstützter Typ.

### Alt-Texte

| Bild | Alt-Text | Begründung |
|---|---|---|
| Startseitenfoto | „Porträt von Sergey Fokin als Schwarz-Weiß-Zeichnung“ | Inhaltsbild (vorher leer) |
| Über-mich-Foto | gleich | Inhaltsbild (vorher „Tivi“) |
| Skill-Symbole, Projektkarten-Hintergründe, nummerierte Screenshot-Miniaturen | leer | dekorativ: Name bzw. `aria-label` steht direkt daneben |
| Screenshots im Projektfenster | „Projekt – Vorschau n“ | unverändert |

Beide Fotos zeigen dieselbe Zeichnung. Die Texte sind in Keystatic änderbar (Startseite: „Bildbeschreibung“, Über mich: „Bildbeschreibung Profilfoto“).

### Interne Links und Basispfad

- Alle internen Links aller Seiten, einschließlich der 404-Seite, beginnen mit `/Tivi-Dev/` und liefern 200.
- Jeder Anker (`#skills`, `#inhalt` usw.) existiert auf der Zielseite. Daran musste nichts geändert werden.

## Tests (`tests/seo.spec.ts`, ursprünglich 10 Tests, nur Projekt `desktop`, da unabhängig vom Viewport)

1. Titel, Beschreibung (kein Platzhalter, 50–160 Zeichen), Canonical, `og:*` und `twitter:card` je Seite; Titel und Beschreibungen eindeutig.
2. Vorschaubild: 200, `image/jpeg`, 1200 × 630, unter 300 KB, Alt-Text gleich dem des Fotos.
3. Sitemap: enthält genau die indexierbaren Seiten; jede Adresse lädt, hat sich selbst als Canonical und kein `noindex`.
4. 404-Seite liefert Status 404, `noindex` und keinen Canonical. Weiterleitungsseiten haben `noindex` und führen zum Abschnitt.
5. Interne Links und Anker auf Startseite, Impressum, Datenschutz und 404-Seite (4 Tests).
6. JSON-LD nur auf der Startseite, Name gleich der sichtbaren H1, Bild erreichbar.
7. Alt-Texte: Jedes Bild hat das Attribut, beide Fotos sind beschrieben, ein leerer Alt-Text steht nur neben sichtbarem Namen.

**Gegenprobe gegen den `main`-Build:** 6 der 10 Tests schlagen fehl, genau die für die neuen Funktionen. Die 4 Link-Tests bestehen auch dort, weil die Links schon vorher korrekt waren.

## Prüfungen (vor dem Codex-Review)

- `astro check`: 0 Fehler, 0 Warnungen, 0 Hinweise. Der Produktionsbuild läuft durch.
- Vollständige E2E-Suite: 475 bestanden, 0 fehlgeschlagen, 29 übersprungen. Von den übersprungenen sind 9 schon vorher planmäßig, 20 sind SEO-Tests auf den anderen Viewports.
- `git diff --check`: sauber.

Dev-Modus: `/`, `/keystatic`, `/social-preview.jpg`, `/sitemap.xml` und `/impressum/` liefern 200.

## Korrekturen nach Codex-Review

### 1. Bildpfad des Vorschaubilds abgesichert (`src/lib/social-preview.ts`)

- **Ursache:** `renderSocialPreview()` setzte den Fotopfad aus Keystatic ungeprüft mit `path.join(cwd, 'public', photo)` zusammen. Ein Wert wie `/images/homepage/../../../package.json` oder ein Symlink hätte sharp eine Datei außerhalb von `public/` lesen lassen. Das Ergebnis wäre als `social-preview.jpg` veröffentlicht worden.
- **Korrektur:** Neue Funktion `socialPreviewSource()`. Sie lässt nur Dateien in `public/images/homepage/` zu, dem Verzeichnis, in das Keystatic das Startseitenfoto speichert:
  - Der Wert muss mit `/images/homepage/` beginnen und darf kein Nullbyte enthalten.
  - Der aufgelöste Pfad muss innerhalb des Verzeichnisses liegen (`path.relative`, kein `..`, nicht das Verzeichnis selbst).
  - Der echte Speicherort (`realpathSync`) muss ebenfalls darin liegen. Das blockiert Symlinks nach außen.
- Ein unzulässiger Pfad bricht den Build mit einer klaren Meldung ab, statt still eine fremde Datei zu verarbeiten.

### 2. Keystatic-Validierung auf den bereinigten Text (`src/lib/meta-description.ts`, `src/lib/meta-description-field.ts`)

- **Ursache:** Keystatic prüft `length` auf die rohe Eingabe. 50 Leerzeichen oder `test` mit 46 Leerzeichen galten als gültig; 160 Zeichen plus ein Zeilenumbruch am Ende galten als zu lang.
- **Korrektur:**
  - Statt `length` prüft ein Muster den Text vom ersten bis zum letzten sichtbaren Zeichen auf 50–160 Zeichen; das entspricht der Länge nach `trim()`. Keystatic bietet keine eigene Prüffunktion, ein Muster aber schon. Die Fehlermeldung ist deutsch.
  - Grenzwerte und Muster stehen in `meta-description.ts` und gelten für beide Stellen.
  - Das Keystatic-Feld liegt jetzt in `meta-description-field.ts`, damit der Test genau das Feld prüft, das Keystatic verwendet. `keystatic.config.ts` importiert es.
  - **Zweite Sicherung im Build:** `src/content.config.ts` prüft `description` mit `z.string().trim().min(50).max(160)` (nach dem zweiten Review durch das gemeinsame Muster ersetzt, siehe unten). Ein von Hand bearbeitetes JSON mit Platzhalter lässt den Build scheitern, und ausgegeben wird der bereinigte Text.

### 3. Doppelte Tags erkennen (`tests/seo.spec.ts`)

- **Ursache:** Der Test las jedes Tag mit `querySelector` bzw. sammelte `og:*` in ein Objekt. Eine zweite Kopie mit anderem Wert blieb unbemerkt.
- **Korrektur:** `repeatedTags()` zählt Canonical, `description`, `robots`, `og:*` und `twitter:*`. Jede indexierbare Seite und die 404-Seite dürfen keines davon doppelt haben.

### Neue Tests (3, zusammen jetzt 13)

| Test | Prüft |
|---|---|
| Doppelte Tags werden erkannt | Die Prüfung findet eingefügte Kopien von Canonical, Description, `og:title` und `og:image`. |
| Keystatic-Beschreibung | Prüft das echte Feld mit: leer, nur Leerzeichen, nur Zeilenumbrüche, 49, 50, 160 und 161 Zeichen; jeweils auch mit Leerzeichen am Rand. |
| Vorschaubild-Pfade | Erlaubt ist ein Foto im Unterordner; das erzeugte JPEG hat 1200 × 630. Abgelehnt werden 11 Fälle: `..` (auch verschachtelt), das Verzeichnis selbst, ein anderes Verzeichnis, absolute Pfade, `../`, ein Symlink nach außen und ein Nullbyte. Das gilt für die Prüfung und für `renderSocialPreview()`. |

### Gegenproben (jede Korrektur vorübergehend entfernt, danach wiederhergestellt)

| Entfernt | Ergebnis |
|---|---|
| Muster, wieder `length: { min, max }` | Keystatic-Test schlägt fehl („nur Leerzeichen“) |
| beide Pfadprüfungen | Pfad-Test schlägt fehl (`/images/homepage/../../../secret.png`) |
| nur die Symlink-Prüfung | Pfad-Test schlägt fehl (`/images/homepage/link.png`) |
| zusätzliches `description` und `og:description` im Layout | Metadaten- und 404-Test melden beide Schlüssel |
| `"description": "test"` in `homepage.json` | Build bricht ab: `description: Too small: expected string to have >=50 characters` |

### Prüfungen nach den Korrekturen

- `astro check`: 0 Fehler, 0 Warnungen, 0 Hinweise. Der Produktionsbuild läuft durch.
- Vollständige E2E-Suite: 478 bestanden, 0 fehlgeschlagen, 35 übersprungen. Übersprungen sind die 9 planmäßigen Tests und die 13 SEO-Tests auf den beiden Smartphone-Projekten (26).

## Korrekturen nach dem zweiten Codex-Review

### 1. Eine Zählregel für Keystatic und Build (blockierend)

- **Ursache:** Das Keystatic-Muster hatte kein `u`-Flag und zählte daher UTF-16-Einheiten. Zod zählt Unicode-Codepoints.
  - Beispiel `'A'.repeat(48) + '😀'`: Keystatic sah 50 Einheiten und akzeptierte den Text, Zod sah 49 Zeichen und ließ den Build scheitern.
  - Ein im Editor gespeicherter Text konnte so das Deployment blockieren.
- **Korrektur:** Die Regel steht nur noch in `src/lib/meta-description.ts`:
  - `metaDescriptionPattern` mit `u`-Flag. Jedes Teilmuster (`\S`, `[\s\S]`) erfasst damit einen ganzen Codepoint, ein Emoji zählt einmal.
  - `\s` entfernt genau die Zeichen, die auch `trim()` entfernt, darunter geschütztes Leerzeichen, U+3000 und BOM. Gezählt wird also die Länge nach `trim()`.
  - `metaDescriptionSchema = z.string().regex(metaDescriptionPattern, …).trim()` nutzt dasselbe Muster. `src/content.config.ts` verwendet nur noch dieses Schema; es gibt keine eigene `min`/`max`-Logik mehr.
  - `metaDescriptionMessage` liefert dieselbe deutsche Fehlermeldung für Keystatic und Build.
  - `src/lib/meta-description-field.ts` (Keystatic) übernimmt Muster und Meldung.
- **Test:** „Beschreibung: Keystatic und Build zählen gleich …“ ersetzt den bisherigen Keystatic-Test.
  - Er prüft das echte Keystatic-Feld und das echte Content-Schema gegen eine unabhängige Referenz: Codepoints von `value.trim()` im Bereich 50–160.
  - **Fälle:**
    - der gemeldete Fall (48 × A + 😀 abgelehnt, 49 × A + 😀 akzeptiert);
    - nur Leerraum (leer, Leerzeichen, Zeilenumbrüche, geschützte und ideografische Leerzeichen);
    - je 49/50/160/161 Zeichen aus `a`, `ä`, `中`, `😀`, `𝔄` und `👩‍💻` (ZWJ-Folge aus 3 Codepoints), jeweils ohne und mit 5 Arten von Leerraum am Rand;
    - Emoji an beiden Rändern.
  - Akzeptierter Text kommt im Build ohne Randleerraum an.

### 2. Doppelte Tags unabhängig von der Schreibweise (niedrig)

- **Ursache:** `repeatedTags()` verglich `name`/`property` mit Groß- und Kleinschreibung. `description` und `DESCRIPTION` galten deshalb als zwei verschiedene Tags; Crawler werten beide als Beschreibung.
- **Korrektur:**
  - Schlüssel werden mit `trim().toLowerCase()` verglichen.
  - Canonical wird mit `link[rel~="canonical" i]` gezählt.
- **Test:** „Doppelte … Tags werden erkannt, auch in anderer Schreibweise“ ersetzt den bisherigen Duplikat-Test.
  - Es fügt nacheinander je ein Paar ein und prüft es einzeln, damit ein gefundenes Duplikat kein anderes verdeckt:
    - `canonical` + `canonical` sowie `canonical` + `CANONICAL`;
    - `description` + `DESCRIPTION`, `og:title` + `OG:TITLE`, `og:image` + `og:image`, `twitter:card` + `TWITTER:CARD`, `robots` + `ROBOTS`.
  - Danach muss die Seite wieder sauber sein.

### Gegenproben

| Vorübergehend geändert | Ergebnis |
|---|---|
| Muster ohne `u`-Flag | Test schlägt fehl |
| Zod zählt UTF-16 (`trim().refine(v => v.length …)`) | Test schlägt fehl (Build-Seite weicht ab) |
| `repeatedTags()` ohne `toLowerCase()` | Test schlägt fehl bei `description` + `DESCRIPTION` |
| Zod wie vorher (`trim().min(50).max(160)`) | Test besteht: Das ist dieselbe Codepoint-Zählung, also kein Fehler. Die Abweichung lag nur am Keystatic-Muster. Die alte Form wurde dennoch entfernt, damit nur eine Regel existiert. |
| Canonical-Selektor ohne `i` | Test besteht: HTML vergleicht `rel` in Selektoren ohnehin ohne Groß-/Kleinschreibung. `i` steht nur zur Klarheit da. |

Alle Änderungen wurden danach zurückgesetzt und per `cmp` gegen die Sicherung geprüft.

### Prüfungen nach dem zweiten Review

- `astro check`: 0 Fehler, 0 Warnungen, 0 Hinweise. Der Produktionsbuild läuft durch.
- SEO-Tests (desktop): 13 bestanden.
- Vollständige E2E-Suite: 478 bestanden, 0 fehlgeschlagen, 35 übersprungen (wie zuvor: 9 planmäßig, 26 SEO-Tests auf den Smartphone-Projekten).
- `git diff --check HEAD`: sauber, auch mit den neuen, noch nicht versionierten Dateien.

## Letzte Testkorrektur (P3 aus dem dritten Codex-Review)

- **Ursache:** Der Metadaten-Test prüfte die Länge der ausgelieferten Beschreibung mit `.length`, also in UTF-16-Einheiten. Keystatic und das Content-Schema zählen Unicode-Codepoints nach `trim()`. Eine gültige Beschreibung mit 160 Zeichen und einem Emoji wäre im Test als zu lang gescheitert.
- **Korrektur (`tests/seo.spec.ts`):** Die Hilfsfunktion `descriptionLength()` zählt `Array.from(description.trim()).length`. Beide Grenzprüfungen (50 und 160) verwenden sie.
- **Neuer Fall im Validierungstest:** `'A'.repeat(159) + '😀'` hat 161 UTF-16-Einheiten und 160 Zeichen. Keystatic und Build akzeptieren ihn, die Hilfsfunktion zählt 160.
- **Prüfungen:**
  - SEO-Tests (desktop): 13 bestanden.
  - `git diff --check HEAD`: sauber.
  - Die vollständige E2E-Suite lief zuletzt nach dem zweiten Review: 478 bestanden, 0 fehlgeschlagen, 35 übersprungen. Seitdem wurde nur diese Testhilfe geändert.

## Freigabe

Codex hat Phase 2C nach dem dritten Review abschließend mit **PASS** bewertet. Commit und Push des Branches `seo/phase2c-metadata` sind freigegeben. Der Pull Request folgt separat.

## Offene Punkte

- **Nach dem Deployment prüfen**, denn lokal ist nur der Build getestet:
  - `https://tivi-dev.github.io/Tivi-Dev/sitemap.xml` und `…/social-preview.jpg` liefern 200 (heute 404, weil sie noch nicht deployt sind).
  - Die Link-Vorschau mit einem Debugger testen, z. B. Facebook Sharing Debugger, LinkedIn Post Inspector oder indem man den Link in WhatsApp schickt.
- **Sitemap einreichen:** Google Search Console, Property `https://tivi-dev.github.io/Tivi-Dev/`, Menü „Sitemaps“, dort `sitemap.xml`. Ohne robots.txt an der Domainwurzel findet Google sie sonst nur über Links.
- **Vorschaubild-Cache:** Facebook, LinkedIn und WhatsApp speichern Vorschauen. Nach einem Fotowechsel erscheint das neue Bild erst nach erneutem Abruf im jeweiligen Debugger.
- **Dev-Modus:** Dort zeigt der Canonical auf `https://tivi-dev.github.io/`, weil der Basispfad im Dev-Modus `/` ist. Das betrifft nur die lokale Vorschau, nicht den Build.
- **Startseitentitel:** „Tivi-Dev Portfolio“ enthält den Namen „Sergey Fokin“ nicht. Für die Suche nach dem Namen könnte er z. B. „Sergey Fokin – Portfolio“ lauten. Das ist eine inhaltliche Entscheidung und wurde nicht geändert; der Titel ist in Keystatic pflegbar.
- **Lokaler Remote:** `origin` zeigt noch auf `Tivi-Dev/Website`. GitHub leitet auf `Tivi-Dev/Tivi-Dev` weiter.
