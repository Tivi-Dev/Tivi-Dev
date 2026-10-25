import type { APIRoute, GetStaticPaths } from 'astro';
import { getEntry } from 'astro:content';
import { renderSocialPreview, socialPreview } from '../lib/social-preview';

// Only built when the start page has a photo; BaseLayout then links it as og:image.
export const getStaticPaths = (async () => {
  const photo = (await getEntry('homepage', 'homepage'))?.data.photo;
  return photo ? [{ params: { preview: socialPreview.path.slice(1, -'.jpg'.length) }, props: { photo } }] : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await renderSocialPreview(props.photo as string)), { headers: { 'Content-Type': socialPreview.type } });
