import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, resolve } from 'node:path';
import { glob } from 'astro/loaders';

const homepage = defineCollection({
  loader: glob({ pattern: 'homepage.json', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    photo: z.string().nullish(),
    photoAlt: z.string().optional(),
    content: z.array(z.object({
      text: z.string(),
      style: z.enum(['heading1', 'heading2', 'heading3', 'paragraph']).default('paragraph'),
      fontSize: z.number().int().min(8).max(200).nullable().optional(),
      bold: z.boolean().default(false),
      italic: z.boolean().default(false),
      underline: z.boolean().default(false),
      spaceBefore: z.number().int().min(0).max(300).default(0),
      spaceAfter: z.number().int().min(0).max(300).default(16),
    })).default([]),
  }),
});

const skills = defineCollection({
  loader: glob({ pattern: 'skills.json', base: './src/content' }),
  schema: z.object({
    frontendOrder: z.array(z.string()).default([]),
    backendOrder: z.array(z.string()).default([]),
  }),
});

const ueberMich = defineCollection({
  loader: glob({ pattern: 'ueber-mich.json', base: './src/content' }),
  schema: z.object({
    photo: z.string().nullish(),
    photoAlt: z.string().optional(),
    content: z.array(z.object({
      text: z.string(),
      style: z.enum(['heading1', 'heading2', 'heading3', 'paragraph']).default('paragraph'),
      fontSize: z.number().int().min(8).max(200).nullable().optional(),
      bold: z.boolean().default(false),
      italic: z.boolean().default(false),
      underline: z.boolean().default(false),
      spaceBefore: z.number().int().min(0).max(300).default(0),
      spaceAfter: z.number().int().min(0).max(300).default(16),
    })).default([]),
    gallery: z.array(z.object({
      image: z.string().nullish(),
      imageAlt: z.string().optional(),
      caption: z.string().optional(),
    })).default([]),
  }),
});

const cardSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  image: z.string().nullish(),
  imageAlt: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  duration: z.string().optional(),
  projectUrl: z.string().nullish(),
});

function validateSkillCardIcon(data: unknown, filePath: string) {
  if (typeof data !== 'object' || data === null) return;
  const { image } = data as { image?: unknown };
  if (
    typeof image === 'string'
    && !new URL(image, 'https://website.invalid').pathname.toLowerCase().endsWith('.svg')
  ) {
    throw new Error(
      `${filePath}: Frontend- und Backend-Karten dürfen nur SVG-Icons verwenden.`,
    );
  }
}

const createCardCollection = (
  directoryName: 'frontend' | 'backend' | 'projekte',
  validateImage: (data: unknown, filePath: string) => void = () => {},
) => defineCollection({
  loader: {
    name: `keystatic-${directoryName}-cards`,
    async load({ store, parseData, config, watcher, logger }) {
      const directory = new URL(`./src/content/cards/${directoryName}/`, config.root);
      const directoryPath = fileURLToPath(directory);
      async function syncCard(filePath: string) {
        const id = basename(filePath, '.json');
        const data = JSON.parse(await readFile(filePath, 'utf8'));
        validateImage(data, filePath);
        store.set({ id, data: await parseData({ id, data, filePath }) });
      }
      store.clear();
      for (const filename of await readdir(directoryPath)) {
        if (!filename.endsWith('.json')) continue;
        await syncCard(resolve(directoryPath, filename));
      }
      if (watcher) {
        let updates = Promise.resolve();
        watcher.add(directoryPath);
        watcher.on('all', (event, filePath) => {
          if (dirname(resolve(filePath)) !== resolve(directoryPath) || !filePath.endsWith('.json')) return;
          if (!['add', 'change', 'unlink'].includes(event)) return;
          updates = updates.then(async () => {
            if (event === 'unlink') store.delete(basename(filePath, '.json'));
            else await syncCard(filePath);
          }).catch((error) => logger.error(`Karte konnte nicht aktualisiert werden: ${error.message}`));
        });
      }
    },
  },
  schema: cardSchema,
});

const frontendCards = createCardCollection('frontend', validateSkillCardIcon);
const backendCards = createCardCollection('backend', validateSkillCardIcon);
const projectCards = createCardCollection('projekte');

export const collections = { homepage, skills, ueberMich, frontendCards, backendCards, projectCards };
