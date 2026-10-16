import Markdoc, { type Schema } from '@markdoc/markdoc';
import { textShadowStyle } from './shadows';

export const shadowMarkdocTag: Schema = {
  render: 'span',
  attributes: { intensity: { type: Number, default: 50 } },
  transform(node, config) {
    const { intensity } = node.transformAttributes(config);
    return new Markdoc.Tag('span', { style: textShadowStyle(intensity) }, node.transformChildren(config));
  },
};
