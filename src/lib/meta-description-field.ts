import { fields } from '@keystatic/core';
import { metaDescriptionLength, metaDescriptionMessage, metaDescriptionPattern } from './meta-description';

const { min, max } = metaDescriptionLength;

export const metaDescriptionField = fields.text({
  label: 'Beschreibung für Suchmaschinen',
  description: `Erscheint in Suchergebnissen und Link-Vorschauen (z. B. WhatsApp, LinkedIn). ${min} bis ${max} Zeichen.`,
  multiline: true,
  validation: {
    isRequired: true,
    pattern: { regex: metaDescriptionPattern, message: metaDescriptionMessage },
  },
});
