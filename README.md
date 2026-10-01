# Website · Astro + Keystatic

## Lokal starten

Voraussetzung: Node.js 22.12+ (hier vorhanden: Node.js 24) und npm.

```sh
npm ci
npm run dev
```

- Website: http://127.0.0.1:4321
- Inhalte bearbeiten: http://127.0.0.1:4321/keystatic

Unter **Startseite** lassen sich Seitentitel, Suchmaschinenbeschreibung, Foto und der linke Seiteninhalt bearbeiten. Der Seiteninhalt besteht aus nummerierten Zeilen mit eigenem Textstil, Schriftgröße, Fett-/Kursiv-/Unterstreichung sowie individuellem Abstand nach oben und unten.
Zusätzlich gibt es Singletons für **Menübar**, **Footer**, **Skills**, **Projekte**, **Über mich**, **Kontakt**, **Impressum** und **Datenschutz**.
Für Karten in den Bereichen **Frontend** und **Backend** dürfen als Icons ausschließlich SVG-Dateien verwendet werden.
Im Singleton **Skills** kann die Reihenfolge der Karten für **Frontend** und **Backend** getrennt festgelegt werden (über Slugs in Wunschreihenfolge).
Die Karten sind in Keystatic als drei getrennte Collections organisiert: **Karten · Frontend**, **Karten · Backend** und **Karten · Projekte**.
Im Singleton **Über mich** können ein linkes Hauptfoto, der rechte Textbereich und eine Fotostrecke unterhalb gepflegt werden.
Die Startseite nutzt einen Präsentationsmodus: Beim Scrollen wird abschnittsweise „gesnapt“ (Home, Skills, Projekte, Über Mich, Kontakt). Zusätzlich funktionieren Navigation per Mausrad/Trackpad, Pfeiltasten, Bild↑/Bild↓, Pos1/Ende sowie die Menülinks mit sanften Übergängen.

## Befehle

```sh
npm run check
npm run build
npm run preview
```

`build` prüft das Projekt und erzeugt die statische Website in `dist/`.

## Aufbau

- `src/pages/`: Seiten und Routen
- `src/layouts/`: gemeinsames HTML-Grundgerüst
- `src/styles/`: globale Gestaltung
- `src/content/`: lokal gespeicherte Inhalte
- `src/content.config.ts`: Inhaltsdefinitionen für Astro
- `keystatic.config.ts`: Felder der Inhaltsverwaltung
- `public/`: öffentliche Dateien wie Favicon und Bilder

## Veröffentlichung

Keystatic läuft zunächst lokal und benötigt kein Konto oder Zugangsdaten. Im Produktionsbuild wird die Verwaltung ausgelassen; `dist/` kann auf einem statischen Hosting veröffentlicht werden. Die Vorschau des Produktionsbuilds hat deshalb keine Inhaltsverwaltung. Für spätere Online-Bearbeitung richten wir GitHub-Speicherung und einen passenden Astro-Adapter ein.

Als Nächstes legen wir Zweck, Seitenstruktur, Farben, Schriften und Inhalte fest. Die vorhandene Gestaltung ist ein neutraler Platzhalter.
