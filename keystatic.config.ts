import { config, fields, collection, singleton } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';
import './src/styles/keystatic-editor.css';
import { skillGroups } from './src/lib/skill-groups';
import { aboutTopicsField } from './src/lib/about-schema';
import { privacySingleton } from './src/lib/privacy-schema';

const createCardSchema = (isSkillArea: boolean) => ({
  title: fields.slug({ name: { label: isSkillArea ? 'Kartenkennung (beim Anlegen)' : 'Kartentitel', ...(isSkillArea ? { description: 'Die Kennung wird für Zuordnungen verwendet. Zum Umbenennen den Kartentitel darunter ändern.' } : {}) } }),
  ...(isSkillArea ? {
    displayTitle: fields.text({ label: 'Kartentitel (Anzeige)', description: 'Ändert den sichtbaren Namen ohne die Kartenkennung zu ändern. Leer: bisheriger Kartenname.' }),
  } : {}),
  description: fields.text({ label: 'Beschreibung', multiline: true }),
  image: fields.image({
    label: 'Kartenbild / Icon (optional)',
    description: isSkillArea
      ? 'Für Skill-Icons sind SVG- und PNG-Dateien erlaubt.'
      : 'Optionales Kartenbild für Projekte.',
    directory: 'public/images/cards',
    publicPath: '/images/cards/',
  }),
  imageAlt: fields.text({ label: 'Bildbeschreibung' }),
  ...(!isSkillArea ? {
    category: fields.text({ label: 'Kategorie / Untertitel', description: 'Wird auf Projektkarten angezeigt.' }),
    author: fields.text({ label: 'Projekt: Autor' }),
    duration: fields.text({ label: 'Projekt: Zeitangabe', description: 'Optional, zum Beispiel 3 Wochen.' }),
    details: fields.text({ label: 'Ausführliche Projektbeschreibung', multiline: true, description: 'Text im Projektfenster. Leer: die bisherige Beschreibung verwenden.' }),
    screenshots: fields.array(fields.object({
      image: fields.image({ label: 'Screenshot', directory: 'public/images/projects', publicPath: '/images/projects/', validation: { isRequired: true } }),
      alt: fields.text({ label: 'Bildbeschreibung' }),
      caption: fields.text({ label: 'Beschriftung (optional)' }),
    }), { label: 'Screenshots', itemLabel: props => props.fields.caption.value || props.fields.alt.value || 'Screenshot' }),
  } : {}),
  projectUrl: fields.url({ label: isSkillArea ? 'Kartenlink (optional)' : 'Link zum Projekt (optional)', description: isSkillArea ? 'Ziel beim Anklicken einer Skill-Karte.' : 'Wird im Projektfenster angezeigt.' }),
});

const legalDocumentField = fields.markdoc({
  label: 'Inhalt',
  description: 'Neue Zeile im selben Absatz: Shift+Enter. Leerzeilen und größere Abstände: über „+“ den Block „Leerzeile / Abstand“ einfügen.',
  components: {
    Abstand: block({
      label: 'Leerzeile / Abstand',
      schema: {
        height: fields.integer({
          label: 'Höhe in px',
          defaultValue: 24,
          validation: { isRequired: true, min: 0, max: 400 },
        }),
      },
    }),
  },
});

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: {
      name: 'Tivi-Dev Portfolio',
    },
  },
  singletons: {
    settings: singleton({
      label: 'Header',
      path: 'src/content/settings',
      format: { data: 'json' },
      schema: {
        websiteTitle: fields.text({
          label: 'Website-Titel im Header',
          validation: { isRequired: true },
        }),
      },
    }),
    homepage: singleton({
      label: 'Startseite',
      path: 'src/content/homepage',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Seitentitel', validation: { isRequired: true } }),
        description: fields.text({ label: 'Beschreibung für Suchmaschinen', multiline: true, validation: { isRequired: true } }),
        photo: fields.image({
          label: 'Foto rechts',
          directory: 'public/images/homepage',
          publicPath: '/images/homepage/',
        }),
        photoAlt: fields.text({ label: 'Bildbeschreibung', description: 'Beschreibe kurz, was auf dem Foto zu sehen ist.' }),
        photoSettings: fields.object({
          size: fields.integer({
            label: 'Fotogröße (%)',
            description: '100 % nutzt die verfügbare Breite. Kleinere Werte verkleinern das Foto.',
            defaultValue: 100,
            validation: { isRequired: true, min: 20, max: 100 },
          }),
          aspect: fields.select({
            label: 'Bildformat',
            options: [
              { label: 'Hochformat (4:5)', value: 'portrait' },
              { label: 'Quadratisch (1:1)', value: 'square' },
              { label: 'Querformat (4:3)', value: 'landscape' },
            ],
            defaultValue: 'portrait',
          }),
          shape: fields.select({
            label: 'Rahmenform',
            description: 'Ein runder Rahmen verwendet immer einen quadratischen Bildbereich.',
            options: [
              { label: 'Rechteck mit runden Ecken (wie bisher)', value: 'rounded' },
              { label: 'Rechteck mit geraden Ecken', value: 'rectangle' },
              { label: 'Rund / Kreis', value: 'circle' },
            ],
            defaultValue: 'rounded',
          }),
          zoom: fields.integer({
            label: 'Ausschnitt: Vergrößerung (%)',
            description: '100 % füllt den Rahmen. Höhere Werte zoomen näher ins Bild.',
            defaultValue: 100,
            validation: { isRequired: true, min: 100, max: 250 },
          }),
          positionX: fields.integer({
            label: 'Ausschnitt: horizontal (%)',
            description: '0 = links, 50 = mittig, 100 = rechts.',
            defaultValue: 50,
            validation: { isRequired: true, min: 0, max: 100 },
          }),
          positionY: fields.integer({
            label: 'Ausschnitt: vertikal (%)',
            description: '0 = oben, 50 = mittig, 100 = unten.',
            defaultValue: 50,
            validation: { isRequired: true, min: 0, max: 100 },
          }),
        }, { label: 'Foto: Größe, Rahmen & Ausschnitt' }),
        content: fields.array(fields.object({
          text: fields.text({
            label: 'Text der Zeile',
            multiline: true,
            validation: { isRequired: true },
          }),
          style: fields.select({
            label: 'Stil',
            options: [
              { label: 'H1 – Groß', value: 'heading1' },
              { label: 'H2 – Mittel', value: 'heading2' },
              { label: 'H3 – Klein', value: 'heading3' },
              { label: 'Text', value: 'paragraph' },
            ],
            defaultValue: 'paragraph',
          }),
          fontSize: fields.integer({
            label: 'Größe in px',
            validation: { min: 8, max: 200 },
          }),
          bold: fields.checkbox({
            label: 'B',
            defaultValue: false,
          }),
          italic: fields.checkbox({
            label: 'I',
            defaultValue: false,
          }),
          underline: fields.checkbox({
            label: 'U',
            defaultValue: false,
          }),
          spaceBefore: fields.integer({
            label: 'Abstand oben',
            defaultValue: 0,
            validation: { isRequired: true, min: 0, max: 300 },
          }),
          spaceAfter: fields.integer({
            label: 'Abstand Unten',
            defaultValue: 16,
            validation: { isRequired: true, min: 0, max: 300 },
          }),
        }, { layout: [12, 3, 2, 1, 1, 1, 2, 2] }), {
          label: 'Seiteninhalt links',
          description: 'Die Einträge zeigen ihren Textinhalt und können per Ziehen neu angeordnet werden.',
          itemLabel: (props) => props.fields.text.value.replace(/\s+/g, ' ').trim() || 'Neue Textzeile',
        }),
      },
    }),
    footer: singleton({
      label: 'Footer',
      path: 'src/content/footer',
      format: { data: 'json' },
      schema: {
        label: fields.text({
          label: 'Footer-Label',
          validation: { isRequired: true },
        }),
        links: fields.array(fields.object({
          label: fields.text({
            label: 'Linktext',
            validation: { isRequired: true },
          }),
          href: fields.text({
            label: 'Ziel (URL oder Anker)',
            validation: { isRequired: true },
            description: 'Beispiele: /impressum/, /datenschutz/',
          }),
        }), {
          label: 'Footer-Links',
          itemLabel: (props) => props.fields.label.value || 'Neuer Link',
        }),
      },
    }),
    skills: singleton({
      label: 'Skills',
      path: 'src/content/skills',
      format: { data: 'json' },
      schema: Object.fromEntries(skillGroups.map(group => [group.id, fields.array(
        fields.relationship({ label: 'Skill-Karte', collection: 'skillCards', validation: { isRequired: true } }),
        {
          label: group.title,
          description: 'Karten auswählen und per Ziehen sortieren. Die Karten selbst bearbeitest du unter „Skill-Karten“.',
          itemLabel: (props) => props.value || 'Karte auswählen',
        },
      )])),
    }),
    projekte: singleton({
      label: 'Projekte',
      path: 'src/content/projekte',
      format: { data: 'json' },
      schema: {},
    }),
    ueberMich: singleton({
      label: 'Über mich',
      path: 'src/content/ueber-mich',
      format: { data: 'json' },
      schema: {
        photo: fields.image({
          label: 'Foto in der Mitte',
          directory: 'public/images/ueber-mich',
          publicPath: '/images/ueber-mich/',
        }),
        photoAlt: fields.text({ label: 'Bildbeschreibung Profilfoto' }),
        topics: aboutTopicsField,
      },
    }),
    kontakt: singleton({
      label: 'Kontakt',
      path: 'src/content/kontakt',
      format: { data: 'json' },
      schema: {
        heading: fields.text({
          label: 'Überschrift über dem Formular',
          defaultValue: 'Schreib mir eine Nachricht',
          multiline: false,
          validation: { isRequired: true },
        }),
        email: fields.text({ label: 'E-Mail' }),
        phone: fields.text({ label: 'Telefon' }),
      },
    }),
    impressum: singleton({
      label: 'Impressum',
      path: 'src/content/legal/impressum',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titel', validation: { isRequired: true } }),
        content: legalDocumentField,
      },
    }),
    datenschutz: privacySingleton,
  },
  collections: {
    skillCards: collection({
      label: 'Skill-Karten',
      slugField: 'title',
      path: 'src/content/cards/skills/*',
      format: { data: 'json' },
      schema: createCardSchema(true),
    }),
    projectCards: collection({
      label: 'Karten · Projekte',
      slugField: 'title',
      path: 'src/content/cards/projekte/*',
      format: { data: 'json' },
      schema: createCardSchema(false),
    }),
  },
});
