# UI/UX-, Responsive- und Barrierefreiheits-Audit

Stand: 24. Oktober 2026

Geprüft wurden der Quellcode und die veröffentlichte Website https://tivi-dev.github.io/Tivi-Dev/ in einem headless Chromium bei 1440, 1280, 820, 375, 320 und 740×360 (Smartphone quer). Dazu kamen ein automatischer Barrierefreiheitstest mit axe-core 4.10 (WCAG 2.2 AA) und Tastaturtests.

**Insgesamt:** Es gibt kein horizontales Scrollen bei 320–1440 px. Skip-Link, Fokus-Rahmen, Labels im Formular, Escape im mobilen Menü und Rückkehr des Fokus nach dem Projektfenster funktionieren. Die Probleme sitzen vor allem in Tastaturführung, Kontrast, Alt-Texten und der festen Fußleiste.

## Bestätigte Fehler (live nachgewiesen)

| # | Schwere | Datei | Problem | Lösung |
|---|---|---|---|---|
| 1 | **Hoch** | `src/pages/index.astro:181` | **Der erste Tab nach dem Laden springt direkt zu „Öffnen“ in den Projekten.** Skip-Link und Hauptmenü werden übersprungen (Desktop und Mobil). Ursache: `history.replaceState(..., '#home')` setzt in Chrome den Startpunkt für die Tab-Reihenfolge auf `#home`. Gegenprobe: Ohne `replaceState` landet der erste Tab korrekt auf „Zum Inhalt“. | Den Hash nur nach einer Navigation durch den Nutzer ändern, nicht beim ersten `updateActive()`. Alternativ den Hash gar nicht automatisch umschreiben. |
| 2 | **Hoch** | `src/content/cards/projekte/infra-vision.json:5`, `mini-mail.json:5`, `src/components/ProjectCard.astro:15` | Der Alt-Text besteht nur aus Leerzeichen (`alt=" "`, `alt="    "`). axe stuft das als „critical“ ein, weil manche Screenreader solche Bilder nicht ignorieren. | Im Code `imageAlt?.trim() ?? ''` verwenden. Im Inhalt einen echten Alt-Text eintragen oder das Feld leer lassen. |
| 3 | **Mittel–Hoch** | `src/styles/global.css:58`, `:170` | **Die feste Fußleiste verdeckt Inhalt und Fokus.** Quer auf dem Handy (740×360) belegen Kopf- und Fußleiste zusammen 135 px, also 37 % der Höhe. Beim Tabben liegen Textarea und E-Mail-Feld teilweise unter der Fußleiste (WCAG 2.4.11). Auf Mobilgeräten ist die Fußleiste 96 px hoch, nur für zwei Rechtslinks. | Die Fußleiste nicht fixieren (`position: static`), zumindest unter 1100 px Breite bzw. 740 px Höhe. Sonst `scroll-padding-bottom: var(--footer-height)` auf `html` setzen. |
| 4 | **Mittel** | `src/content/ueber-mich.json:9,18,25` | **Kontrast zu niedrig:** Die Überschriften „Persönliches Profil“, „Ausbildung“ und „Hobbys“ in `#2596be` erreichen nur 2,76–3,36:1, nötig sind 4,5:1. | Eine dunklere Farbe wählen, z. B. `#1a6f8f`. Oder die Linienfarbe von der Textfarbe trennen. |
| 5 | **Mittel** | `src/pages/index.astro:42,56`, `src/content/homepage.json` | **Die Überschriften-Struktur stimmt nicht.** Erst kommt ein `h2` „Home“, danach zwei `h1` („Sergey“, „Fokin“). Das Zitat ist ein `h3` ohne passenden Bezug, axe meldet `heading-order`. | Den Namen als ein `h1` setzen (Zeilenumbruch per CSS), „Home“ visuell ausblenden oder als `p` setzen und das Zitat als `p` oder `blockquote`. |
| 6 | **Mittel** | `src/styles/global.css:78`, `src/pages/index.astro:261ff.` | Die Überschrift „Interesse geweckt? …“ ist per `nowrap` plus JavaScript auf eine Zeile gezwungen. Bei 320 px schrumpft sie auf **13 px** und ist damit kleiner als die Feldlabels. | `white-space: normal` erlauben und das Skript zum Anpassen der Schriftgröße entfernen. Eine Mindestgröße von etwa 1.125 rem hält das Umbrechen sauber. |
| 7 | **Niedrig–Mittel** | `src/content/ueber-mich.json` (Bereich `experience`, Titel „Skills“) | Es gibt zwei Regionen mit dem Namen „Skills“ (Abschnitt `#skills` und den Bereich in „Über Mich“), axe meldet `landmark-unique`. Inhaltlich passen außerdem Titel und Text dieses Bereichs nicht zusammen, er beschreibt Projekte. | Umbenennen, z. B. in „Erfahrung“ oder „Eigene Projekte“. |
| 8 | **Niedrig–Mittel** | `src/content/legal/impressum.mdoc:12` | Nach dem `h1` folgt direkt `### Kontakt`, die Ebene `h2` fehlt (`heading-order`). | Das Markdown von `###` auf `##` ändern. |
| 9 | **Niedrig** | `src/content/homepage.json:3` | Die Meta-Beschreibung der Startseite lautet „test“. Das wirkt in Suchergebnissen und Link-Vorschauen unprofessionell. | Einen echten Satz schreiben, etwa 150 Zeichen. |
| 10 | **Niedrig** | `src/components/ProjectCard.astro:20`, `infra-vision.json:6`, `mini-mail.json:6` | `category: " "` ist „truthy“. Der Ersatztext „Projekt“ greift deshalb nicht und es erscheint eine leere Zeile. | `category?.trim() \|\| 'Projekt'` verwenden. |
| 11 | **Niedrig** | `src/layouts/BaseLayout.astro` (`<main tabindex=0>`) | `main` ist ein zusätzlicher Tab-Stopp ohne erkennbaren Nutzen (bestätigt in der Tab-Reihenfolge). | Statt `tabindex="0"` `tabindex="-1"` setzen. Der Skip-Link funktioniert damit weiterhin. |
| 12 | **Niedrig** | `src/pages/[page].astro:22` | Die Weiterleitungsseiten `/skills/` usw. haben kein `lang`, kein `main` und nutzen `meta refresh` (axe: critical). Auf GitHub Pages lässt sich das kaum vermeiden. | Die Seiten ganz entfernen, wenn sie nirgends verlinkt sind. Sonst eine eigene Weiterleitungsseite mit `lang="de"` und einem sichtbaren Link anlegen. |
| 13 | **Niedrig** | Inhalte | Uneinheitliche Namen und Tippfehler: „Mein Portfolio“, „Tivi-Dev Portfolio“ und „· Meine Website“ (`[page].astro:30`) werden nebeneinander verwendet. Dazu „Eine Minimalistisch Anwendung“, „Interesse geweckt ?“ und „NEIN ! … Funktionieren !“. | Einen Namen festlegen und die Texte korrigieren. |

## Vermutungen bzw. nur im Code gefunden (nicht vollständig nachgewiesen)

- **Mittel – `src/pages/index.astro:202–220`:** Die Tasten Pfeil, Bild ↓ und Leertaste springen im Präsentationsmodus immer eine ganze Folie weiter. Anders als beim Mausrad wird dabei nicht geprüft, ob die aktuelle Folie höher als der Bildschirm ist. „Über Mich“ ist 812 px hoch bei nur 760 px verfügbarer Höhe. Bei Bildschirmhöhen zwischen 741 und etwa 830 px wäre der untere Teil per Tastatur dann nicht erreichbar. Lösung: dieselbe Prüfung wie in `onWheel` einbauen.
- **Mittel – `src/styles/global.css:5`:** `scroll-snap-type: y mandatory` zusammen mit dem eigenen Abfangen des Mausrads kann sich bei Touchpads, Bildschirmzoom oder Bildschirmlupen sperrig anfühlen. Empfehlung: `proximity` oder Verzicht auf das Kapern des Mausrads.
- **Niedrig – `src/components/ProjectCard.astro:100–104`:** Auf dem Desktop ist die Zeitangabe („Aktiv“) nur bei Hover oder Fokus sichtbar. Beim Hover wird das Bild auf 18 % abgeblendet und der Text liegt dann über einem unruhigen Bild. Lesbar ist es, aber der Effekt versteckt Informationen.
- **Niedrig – `src/components/AboutProfile.astro:30–37, 60`:** Die Verbindungslinien enden links bei etwa x=440 px und rechts bei 1000 px (SVG-Koordinaten) und erreichen die Infoboxen damit nicht. Auf dem Desktop wirkt das unverbunden. Ursache sind feste SVG-Koordinaten gegenüber flexiblen Spaltenbreiten im Grid.
- **Niedrig – Alt-Texte der Fotos:** Das Startseitenfoto hat ein leeres Alt-Attribut (`photoAlt` fehlt in `homepage.json`). Beim Foto in „Über Mich“ steht nur „Tivi“. Sinnvoller wäre z. B. „Porträt von Sergey Fokin (Zeichnung)“.
- **Niedrig – Kontaktformular:** Pflichtfelder sind nicht sichtbar gekennzeichnet. Außerdem fehlt ein Hinweis direkt am Formular, dass die Daten über EmailJS übertragen werden. Das ist ein Hinweis auf eine UX- bzw. Datenschutzfrage, keine rechtliche Bewertung.
- **Hinweis:** Die Tests liefen nur in Chromium. Safari (iOS) und Firefox sowie echte Screenreader (NVDA, VoiceOver) wurden nicht getestet.

## Empfohlene Reihenfolge

Zuerst 1–3 (Tastatur und Screenreader), dann 4–6, der Rest ist Feinschliff.
