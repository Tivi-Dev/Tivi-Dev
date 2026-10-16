import { mark } from '@keystatic/core/content-components';
import { createElement } from 'react';
import { shadowField } from './shadow-fields';
import { shadowValue } from './shadows';

export const shadowMark = mark({
  label: 'Schlagschatten',
  icon: createElement('span', { style: { textShadow: '0 2px 3px #555' } }, 'S'),
  schema: { intensity: shadowField('Intensität (%)', 50, true) },
  style: ({ value }) => ({ textShadow: shadowValue(value.intensity) }),
});
