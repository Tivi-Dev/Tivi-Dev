import { z } from 'astro/zod';

/**
 * Length of a meta description that search engines show in full, in Unicode code points after trim():
 * an emoji counts once, and leading and trailing spaces do not count.
 */
export const metaDescriptionLength = { min: 50, max: 160 } as const;

// The one rule for Keystatic and the content schema. Keystatic checks the raw input, so the pattern counts from the
// first to the last visible character itself: one non-space, min − 2 to max − 2 characters, one non-space.
// The flag u makes every part match whole code points; \s strips exactly what trim() strips.
export const metaDescriptionPattern = new RegExp(`^\\s*\\S[\\s\\S]{${metaDescriptionLength.min - 2},${metaDescriptionLength.max - 2}}\\S\\s*$`, 'u');

export const metaDescriptionMessage = `Die Beschreibung braucht ${metaDescriptionLength.min} bis ${metaDescriptionLength.max} Zeichen (ohne Leerzeichen am Anfang und Ende).`;

// Same pattern in the build, also for hand-edited JSON: a placeholder fails the build, and the page gets the trimmed text.
export const metaDescriptionSchema = z.string().regex(metaDescriptionPattern, metaDescriptionMessage).trim();
