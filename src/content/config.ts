import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
    type: 'content',
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
    docs: docs,
};
