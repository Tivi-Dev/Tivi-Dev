import { shadowAlpha, textShadowBlur, textShadowColor } from './shadows';

/** A #rrggbb colour or its red, green and blue channels (0–255, fractions allowed). */
type Colour = string | number[];

const channels = (colour: Colour) => typeof colour === 'string'
  ? [1, 3, 5].map(index => Number.parseInt(colour.slice(index, index + 2), 16))
  : colour;

const luminance = (colour: Colour) => {
  const [r, g, b] = channels(colour).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
};

/** WCAG 2.x contrast ratio of two colours. */
export const contrastRatio = (first: Colour, second: Colour) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + .05) / (darker + .05);
};

const darken = (hex: string, amount: number) =>
  `#${channels(hex).map(value => Math.round(value * (1 - amount)).toString(16).padStart(2, '0')).join('')}`;

/**
 * Keeps an editor-chosen colour and darkens it only as far as needed to reach `minRatio` on every background.
 * The hue stays the same, so headings keep the look of their line colour.
 */
export const readableTextColor = (color: string, backgrounds: string[], minRatio: number) => {
  for (let step = 0; step <= 100; step++) {
    const candidate = darken(color, step / 100);
    if (backgrounds.every(background => contrastRatio(candidate, background) >= minRatio)) return candidate;
  }
  return '#000000';
};

/**
 * Shadow opacity as axe-core reads it from getComputedStyle in Chromium: stored as a byte (n / 255) and serialised with
 * two decimals if they map back to the same byte, otherwise three (e.g. 0.0144 → 0.016, 0.3888 → 0.39; 0.24 stays).
 */
export const computedAlpha = (alpha: number) => {
  const byte = Math.round(alpha * 255);
  const short = Number((byte / 255).toFixed(2));
  return Math.round(short * 255) === byte ? short : Number((byte / 255).toFixed(3));
};

/**
 * Backdrop behind text with the site's text shadow, modelled like axe-core 4.x does for a blurred shadow:
 * the shadow colour is blended over the background with alpha × 0.185 / (blur / font size + 0.4).
 * `exact` keeps the declared opacity and the fractional channels. `quantized` follows axe-core 4.14 in Chromium:
 * the opacity as the browser reports it, and each channel rounded to an integer when axe flattens the shadow onto
 * the background (flattenColors). Near 4.5:1 the two can fall on different sides.
 */
export const shadowedBackground = (background: string, intensity: number | null | undefined, fontSize: number) => {
  const blend = (opacity: number) => {
    const alpha = opacity * .185 / (textShadowBlur / fontSize + .4);
    const shadow = channels(textShadowColor);
    return channels(background).map((value, index) => shadow[index] * alpha + value * (1 - alpha));
  };
  return { exact: blend(shadowAlpha(intensity)), quantized: blend(computedAlpha(shadowAlpha(intensity))).map(Math.round) };
};

/** The less favourable of the exact and the quantized contrast of `color` on a shadowed background. */
export const shadowedContrast = (color: string, background: string, intensity: number | null | undefined, fontSize: number) => {
  const { exact, quantized } = shadowedBackground(background, intensity, fontSize);
  return Math.min(contrastRatio(color, exact), contrastRatio(color, quantized));
};

/**
 * Colour and shadow of an automatically contrast-checked heading. The colour is darkened only as far as needed
 * (`minRatio` without shadow). Whenever the heading needs a correction (a darkened colour, or a shadow that would pull
 * either contrast variant below 4.5:1), the decorative text shadow is dropped instead of darkening the colour any further.
 */
export const readableHeading = (color: string, shadowIntensity: number | null | undefined, backgrounds: string[], fontSize: number, minRatio: number) => {
  const textColor = readableTextColor(color, backgrounds, minRatio);
  const keepsShadow = textColor === color.toLowerCase()
    && backgrounds.every(background => shadowedContrast(textColor, background, shadowIntensity, fontSize) >= 4.5);
  return { color: textColor, shadow: keepsShadow };
};
