import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    order: z.number().default(0),
    publishedDate: z.coerce.date().optional(),
    lastUpdated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    featuredImage: z.string().optional(),
    author: z.string().optional(),
    tableOfContents: z.boolean().default(true),
  }),
});

export const collections = {
  docs,
};
