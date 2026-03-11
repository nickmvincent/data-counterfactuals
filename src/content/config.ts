import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const memos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/data-counterfactuals/memos' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    visibility: z.string().optional(),
  }),
});

// Paper collections are loaded from shared-references via content-loader.ts
// No Astro content collection needed here

export const collections = { memos };
