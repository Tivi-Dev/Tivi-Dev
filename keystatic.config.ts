import { config, fields, collection, singleton } from '@keystatic/core';
import './src/styles/keystatic-editor.css';

export default config({
  storage: { kind: 'local' },
  singletons: {
    settings: singleton({
      label: 'Website-Einstellungen',
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
          description: 'Item 1 ist Zeile 1, Item 2 ist Zeile 2 und so weiter. Die Reihenfolge kann per Ziehen geändert werden.',
        }),
      },
    }),
    menuebar: singleton({
      label: 'Menübar',
      path: 'src/content/menuebar',
      format: { data: 'json' },
      schema: {
        links: fields.array(fields.object({
          label: fields.text({
            label: 'Linktext',
            validation: { isRequired: true },
          }),
          href: fields.text({
            label: 'Ziel (URL oder Anker)',
            validation: { isRequired: true },
            description: 'Beispiele: /#home, /impressum/',
          }),
        }), {
          label: 'Menülinks',
          itemLabel: (props) => props.fields.label.value || 'Neuer Link',
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
      schema: {
        title: fields.text({ label: 'Titel', validation: { isRequired: true } }),
        intro: fields.text({ label: 'Einleitung', multiline: true }),
      },
    }),
    projekte: singleton({
      label: 'Projekte',
      path: 'src/content/projekte',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Titel', validation: { isRequired: true } }),
        intro: fields.text({ label: 'Einleitung', multiline: true }),
      },
    }),
    ueberMich: singleton({
      label: 'Über mich',
      path: 'src/content/ueber-mich',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Titel', validation: { isRequired: true } }),
        intro: fields.text({ label: 'Einleitung', multiline: true }),
        content: fields.text({ label: 'Inhalt', multiline: true }),
      },
    }),
    kontakt: singleton({
      label: 'Kontakt',
      path: 'src/content/kontakt',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Titel', validation: { isRequired: true } }),
        intro: fields.text({ label: 'Einleitung', multiline: true }),
        email: fields.text({ label: 'E-Mail' }),
        phone: fields.text({ label: 'Telefon' }),
      },
    }),
    impressum: singleton({
      label: 'Impressum',
      path: 'src/content/impressum',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Titel', validation: { isRequired: true } }),
        content: fields.text({ label: 'Inhalt', multiline: true, validation: { isRequired: true } }),
      },
    }),
    datenschutz: singleton({
      label: 'Datenschutz',
      path: 'src/content/datenschutz',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Titel', validation: { isRequired: true } }),
        content: fields.text({ label: 'Inhalt', multiline: true, validation: { isRequired: true } }),
      },
    }),
  },
  collections: {
    cards: collection({
      label: 'Karten',
      slugField: 'title',
      path: 'src/content/cards/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Kartentitel' } }),
        section: fields.select({
          label: 'Bereich',
          options: [
            { label: 'Frontend', value: 'frontend' },
            { label: 'Backend', value: 'backend' },
            { label: 'Projekte', value: 'projekte' },
            { label: 'Über Mich', value: 'ueber-mich' },
            { label: 'Kontakt', value: 'kontakt' },
          ],
          defaultValue: 'frontend',
        }),
        description: fields.text({ label: 'Beschreibung', multiline: true }),
        image: fields.image({
          label: 'Kartenbild / Icon (optional)',
          description: 'Für Karten in den Bereichen Frontend und Backend sind ausschließlich SVG-Dateien erlaubt.',
          directory: 'public/images/cards',
          publicPath: '/images/cards/',
        }),
        imageAlt: fields.text({ label: 'Bildbeschreibung' }),
        category: fields.text({ label: 'Kategorie / Untertitel', description: 'Wird auf Skills- und Projektkarten angezeigt.' }),
        author: fields.text({ label: 'Projekt: Autor' }),
        duration: fields.text({ label: 'Projekt: Zeitangabe', description: 'Optional, zum Beispiel 3 Wochen.' }),
        projectUrl: fields.url({ label: 'Kartenlink (optional)', description: 'Ziel beim Anklicken einer Skills- oder Projektkarte.' }),
      },
    }),
  },
});
