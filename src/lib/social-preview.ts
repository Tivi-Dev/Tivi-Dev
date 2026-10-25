import { realpathSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Preview image for link previews (Open Graph / X): the start page photo from Keystatic, shown whole on the page
 * background in the 1.91 : 1 format that Facebook, LinkedIn, WhatsApp and X display large.
 */
export const socialPreview = { path: '/social-preview.jpg', width: 1200, height: 630, type: 'image/jpeg' } as const;

// Keystatic stores the start page photo in public/images/homepage and saves it as /images/homepage/<file>.
const photoPublicPath = '/images/homepage/';
const photoDir = path.join(process.cwd(), 'public', 'images', 'homepage');

/**
 * The file of a start page photo, only inside its Keystatic directory. The value comes from editable content,
 * so `..`, absolute paths and symlinks that lead out of the directory are rejected before sharp reads anything.
 */
export const socialPreviewSource = (photo: string, dir = photoDir) => {
  const reject = () => new Error(`Startseitenfoto außerhalb von ${photoPublicPath}: ${JSON.stringify(photo)}`);
  if (!photo.startsWith(photoPublicPath) || photo.includes('\0')) throw reject();
  const inside = (root: string, file: string) => {
    const relative = path.relative(root, file);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  };
  const file = path.resolve(dir, photo.slice(photoPublicPath.length));
  if (!inside(dir, file)) throw reject();
  // The resolved path stays inside; a symlink could still point elsewhere, so the real location is checked too.
  if (!inside(realpathSync(dir), realpathSync(file))) throw reject();
  return file;
};

export const renderSocialPreview = async (photo: string, dir?: string) =>
  sharp(socialPreviewSource(photo, dir))
    .resize({ width: socialPreview.width, height: socialPreview.height, fit: 'contain', background: '#f7f6f2' })
    .flatten({ background: '#f7f6f2' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
