import { fields, singleton } from '@keystatic/core';
import { mark } from '@keystatic/core/content-components';
import { createElement } from 'react';
import { shadowField, shadowFields } from './shadow-fields';
import { privacyShadowLabels } from './shadows';
import { shadowMark } from './shadow-mark';

export const privacyTextField = fields.markdoc.inline({
  label: 'Text',
  description: 'Text direkt bearbeiten. Die Werkzeugleiste bietet Formatierung, Links, Listen, Tabellen und weitere Textwerkzeuge.',
  options: { heading: [4, 5, 6], image: false },
  components: {
    Schlagschatten: shadowMark,
    Unterstrichen: mark({ label: 'Unterstrichen', icon: createElement('span', { style: { textDecoration: 'underline' } }, 'U'), schema: {} }),
  },
});

const spacing = (label: string, defaultValue: number) => fields.integer({
  label,
  defaultValue,
  validation: { isRequired: true, min: 0, max: 300 },
});

export const privacySingleton = singleton({
  label: 'Datenschutz',
  path: 'src/content/legal/datenschutz',
  format: { data: 'json' },
  schema: {
    title: fields.text({ label: 'Seitentitel', validation: { isRequired: true } }),
    titleShadow: shadowField('Schatten des Seitentitels (%)'),
    blocks: fields.array(fields.object({
      article: fields.text({ label: 'Artikel', description: 'Zum Beispiel: 1. Datenschutz auf einen Blick' }),
      heading: fields.text({ label: 'Überschrift', description: 'Optionale Unterüberschrift des Artikels.' }),
      text: privacyTextField,
      spaceBefore: spacing('Abstand vor der Box (px)', 0),
      spaceAfter: spacing('Abstand nach der Box (px)', 32),
      headingGap: spacing('Abstand zwischen Überschrift und Text (px)', 12),
      paragraphGap: spacing('Abstand zwischen Textabsätzen (px)', 10),
      shadows: shadowFields(privacyShadowLabels),
    }), {
      label: 'Inhaltsboxen',
      description: 'Jede Box enthält Artikel, Überschrift und Text. Die Reihenfolge lässt sich per Ziehen ändern.',
      itemLabel: (props) => props.fields.article.value.trim()
        || props.fields.heading.value.trim()
        || 'Neue Inhaltsbox',
    }),
  },
});
