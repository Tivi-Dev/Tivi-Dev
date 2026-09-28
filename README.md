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
