import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    BildMitSchatten: {
      render: component('./src/components/ShadowImage.astro'),
      selfClosing: true,
      attributes: {
        image: { type: String, required: true },
        alt: { type: String, default: '' },
        intensity: { type: Number, default: 50 },
      },
    },
    Schlagschatten: {
      render: component('./src/components/ShadowText.astro'),
      attributes: { intensity: { type: Number, default: 50 } },
    },
    Abstand: {
      render: component('./src/components/Abstand.astro'),
      selfClosing: true,
      attributes: {
        height: { type: Number, default: 24 },
      },
    },
  },
});
