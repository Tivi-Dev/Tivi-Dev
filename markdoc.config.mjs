import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    Abstand: {
      render: component('./src/components/Abstand.astro'),
      selfClosing: true,
      attributes: {
        height: { type: Number, default: 24 },
      },
    },
  },
});
