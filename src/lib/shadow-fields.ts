import { fields } from '@keystatic/core';

export const shadowField = (label = 'Schlagschatten (%)', defaultValue = 0, isRequired = false) => fields.integer({
  label,
  description: `${isRequired ? '0' : 'Leer oder 0'} = aus, 50 = mittlerer Schatten, 100 = kräftiger Schatten.`,
  defaultValue,
  validation: { isRequired, min: 0, max: 100 },
});

export const shadowFields = (labels: Record<string, string>) => fields.object(
  Object.fromEntries(Object.entries(labels).map(([key, label]) => [key, shadowField(label)])),
  { label: 'Schlagschatten (%)', description: 'Die Schatten dieser Texte und Bilder einzeln einstellen.' },
);
