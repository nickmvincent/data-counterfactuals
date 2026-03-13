import { z, defineCollection } from "astro:content";

const note = z.object({
  label: z.string().optional(),
  title: z.string().optional(),
  body: z.array(z.string()).default([]),
});

const linkItem = z.object({
  title: z.string(),
  href: z.string(),
  body: z.string().optional(),
});

const titledBodyItem = z.object({
  title: z.string(),
  body: z.string(),
});

const figure = z.object({
  label: z.string().optional(),
  caption: z.string().optional(),
});

const pages = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    eyebrow: z.string().optional(),
    lede: z.string().optional(),
    intro: z.array(z.string()).optional(),
    notes: z.record(note).optional(),
    method_families: z.array(titledBodyItem).optional(),
    reading_paths: z.array(linkItem).optional(),
    quick_tips: z.array(z.string()).optional(),
    companion_links: z.array(linkItem).optional(),
    figures: z.record(figure).optional(),
  }),
});

const memos = defineCollection({
  type: "content",
  schema: z.object({
    order: z.number().int().positive().optional(),
    title: z.string(),
    summary: z.string().optional(),
    date: z.coerce.date().optional(),
    visibility: z.string().optional(),
    type: z.string().optional(),
  }),
});

export const collections = { pages, memos };
