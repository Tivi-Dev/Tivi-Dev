import { skillGroups } from './skill-groups';

const sections = [
  ['home', 'Home'], ['skills', 'Skills'], ['projekte', 'Projekte'],
  ['ueber-mich', 'Über Mich'], ['kontakt', 'Kontakt'],
] as const;

export const fixedTextShadowTargets = [
  ...sections.map(([id, label]) => ({ value: `menu-${id}`, label: `Hauptmenü · ${label}` })),
  { value: 'menu-toggle', label: 'Mobiler Menü-Button' },
  { value: 'footer-impressum', label: 'Footer-Menü · Impressum' },
  { value: 'footer-datenschutz', label: 'Footer-Menü · Datenschutz' },
  ...sections.map(([id, label]) => ({ value: `heading-${id}`, label: `Bereichsüberschrift · ${label}` })),
  ...skillGroups.map(group => ({ value: `heading-skills-${group.id}`, label: `Skills-Überschrift · ${group.title}` })),
  ...[
    ['name', 'Name'], ['email', 'E-Mail-Adresse'], ['subject', 'Betreff'], ['message', 'Nachricht'],
  ].flatMap(([id, label]) => [
    { value: `contact-label-${id}`, label: `Kontakt · Beschriftung ${label}` },
    { value: `contact-input-${id}`, label: `Kontakt · Eingabetext ${label}` },
  ]),
  { value: 'contact-submit', label: 'Kontakt · Senden-Button' },
  { value: 'contact-status', label: 'Kontakt · Statusmeldung' },
  { value: 'skip-link', label: 'Link „Zum Inhalt“' },
  { value: 'not-found-code', label: 'Fehlerseite · 404' },
  { value: 'not-found-heading', label: 'Fehlerseite · Überschrift' },
  { value: 'not-found-link', label: 'Fehlerseite · Zur Startseite' },
];

export const cardShadowLabels = {
  title: 'Kartentitel', image: 'Kartenbild / Icon', description: 'Kartenbeschreibung',
  category: 'Kategorie', author: 'Autor auf der Karte', duration: 'Zeitangabe auf der Karte',
  openButton: 'Öffnen-Button', dialogTitle: 'Titel im Projektfenster', details: 'Beschreibung im Projektfenster',
  galleryHeading: 'Überschrift „Screenshots / Projektvorschau“', detailsHeading: 'Überschrift „Beschreibung“',
  authorLabel: 'Beschriftung „Autor“', dialogAuthor: 'Autor im Projektfenster',
  durationLabel: 'Beschriftung „Zeitangabe“', dialogDuration: 'Zeitangabe im Projektfenster',
  projectLink: 'Link „Zum Projekt“', emptyGallery: 'Hinweis bei fehlenden Screenshots',
  screenshotNumber: 'Nummern der Screenshot-Vorschaubilder',
};

export const privacyShadowLabels = { article: 'Artikelüberschrift', heading: 'Unterüberschrift', text: 'Text der Box' };

/** Colour (rgb(32 43 39)) and blur of the text shadow; the contrast check in contrast.ts models the same shadow. */
export const textShadowColor = '#202b27';
export const textShadowBlur = 4;

/** Opacity of a shadow for a Keystatic intensity (0–100); 0 means no shadow. */
export const shadowAlpha = (intensity: number | null | undefined) => {
  const value = typeof intensity === 'number' && Number.isFinite(intensity) ? Math.max(0, Math.min(100, intensity)) : 0;
  return Number((value * .0048).toFixed(4));
};

export function shadowValue(intensity: number | null | undefined, image = false) {
  const alpha = shadowAlpha(intensity);
  if (alpha === 0) return 'none';
  return `${image ? '0 4px 8px' : `0 2px ${textShadowBlur}px`} rgb(32 43 39 / ${alpha})`;
}

export const textShadowStyle = (intensity?: number | null) => `text-shadow: ${shadowValue(intensity)}`;
export const imageShadowStyle = (intensity?: number | null) => {
  const value = shadowValue(intensity, true);
  return `filter: ${value === 'none' ? 'none' : `drop-shadow(${value})`}`;
};

export function fixedTextShadowRules(entries: { target: string; intensity: number }[]) {
  const allowed = new Set(fixedTextShadowTargets.map(target => target.value));
  return entries.filter(entry => allowed.has(entry.target)).map(entry =>
    `:root [data-shadow-text="${entry.target}"] { ${textShadowStyle(entry.intensity)}; }`,
  ).join('\n');
}
