import { aboutIconNames, type AboutIconName } from './lib/about-icons';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, resolve } from 'node:path';
import { glob } from 'astro/loaders';

const design = defineCollection({
  loader: glob({ pattern: 'design.json', base: './src/content' }),
  schema: z.object({
    glassIntensity: z.number().int().min(0).max(100).default(50),
    shadowIntensity: z.number().int().min(0).max(100).default(50),
  }),
});

const homepage = defineCollection({
  loader: glob({ pattern: 'homepage.json', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    photo: z.string().nullish(),
    photoAlt: z.string().optional(),
    photoSettings: z.object({
      size: z.number().int().min(20).max(100).default(100),
      aspect: z.enum(['portrait', 'square', 'landscape']).default('portrait'),
      shape: z.enum(['rounded', 'rectangle', 'circle']).default('rounded'),
      zoom: z.number().int().min(100).max(250).default(100),
      positionX: z.number().int().min(0).max(100).default(50),
      positionY: z.number().int().min(0).max(100).default(50),
    }).default({ size: 100, aspect: 'portrait', shape: 'rounded', zoom: 100, positionX: 50, positionY: 50 }),
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
    frontend: z.array(z.string()).default([]),
    cms: z.array(z.string()).default([]),
    design: z.array(z.string()).default([]),
    backend: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
  }),
});

const kontakt = defineCollection({
  loader: glob({ pattern: 'kontakt.json', base: './src/content' }),
  schema: z.object({
    heading: z.string().trim().min(1).default('Schreib mir eine Nachricht'),
    email: z.string().default(''),
    phone: z.string().default(''),
  }),
});

const aboutTopicSchema = (defaultColor: string, defaultIcon: AboutIconName) => z.object({
  title: z.string(),
  text: z.string().default(''),
  icon: z.enum(aboutIconNames).default(defaultIcon),
  lineColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Bitte einen Hex-Farbcode mit sechs Zeichen verwenden.').default(defaultColor),
});

const ueberMich = defineCollection({
  loader: glob({ pattern: 'ueber-mich.json', base: './src/content' }),
  schema: z.object({
    photo: z.string().nullish(),
    photoAlt: z.string().optional(),
    topics: z.object({
      profile: aboutTopicSchema('#a44c2c', 'person'),
      experience: aboutTopicSchema('#32664b', 'briefcase'),
      achievements: aboutTopicSchema('#88723d', 'trophy'),
      education: aboutTopicSchema('#32664b', 'education'),
      skills: aboutTopicSchema('#32664b', 'code'),
      hobbies: aboutTopicSchema('#a44c2c', 'gamepad'),
    }),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/legal' }),
  schema: z.object({ title: z.string() }),
});

const privacy = defineCollection({
  loader: glob({ pattern: 'datenschutz.json', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    blocks: z.array(z.object({
      article: z.string().default(''),
      heading: z.string().default(''),
      text: z.string().default(''),
      spaceBefore: z.number().int().min(0).max(300).default(0),
      spaceAfter: z.number().int().min(0).max(300).default(32),
      headingGap: z.number().int().min(0).max(300).default(12),
      paragraphGap: z.number().int().min(0).max(300).default(10),
    })).default([]),
  }),
});

const cardSchema = z.object({
  title: z.string(),
  displayTitle: z.string().optional(),
  description: z.string().default(''),
  image: z.string().nullish(),
  imageAlt: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  duration: z.string().optional(),
  details: z.string().optional(),
  screenshots: z.array(z.object({ image: z.string(), alt: z.string().optional(), caption: z.string().optional() })).default([]),
  projectUrl: z.string().nullish(),
});

function validateSkillCardIcon(data: unknown, filePath: string) {
  if (typeof data !== 'object' || data === null) return;
  const { image } = data as { image?: unknown };
  if (
    typeof image === 'string'
    && image.trim() !== ''
    && !/\.(svg|png)$/i.test(new URL(image, 'https://website.invalid').pathname)
  ) {
    throw new Error(
      `${filePath}: Skill-Karten dürfen nur SVG- oder PNG-Icons verwenden.`,
    );
  }
}

const createCardCollection = (
  directoryName: 'skills' | 'projekte',
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

const skillCards = createCardCollection('skills', validateSkillCardIcon);
const projectCards = createCardCollection('projekte');

export const collections = { design, homepage, skills, kontakt, ueberMich, legal, privacy, skillCards, projectCards };
