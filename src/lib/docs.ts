import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Get all documentation articles sorted by order and title.
 */
export async function getAllDocs() {
    const docs = await getCollection('docs');
    return docs.sort((a: CollectionEntry<'docs'>, b: CollectionEntry<'docs'>) => {
        if (a.data.order !== b.data.order) {
            return a.data.order - b.data.order;
        }
        return a.data.title.localeCompare(b.data.title);
    });
}

/**
 * Get documentation articles grouped by category.
 */
export async function getDocsByCategory() {
    const allDocs = await getAllDocs();
    const categories: Record<string, CollectionEntry<'docs'>[]> = {};

    allDocs.forEach((doc: CollectionEntry<'docs'>) => {
        const category = doc.data.category || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(doc);
    });

    return categories;
}

/**
 * Get the list of all unique categories.
 */
export async function getCategories() {
    const docs = await getCollection('docs');
    const categories = new Set(docs.map((doc: CollectionEntry<'docs'>) => doc.data.category).filter(Boolean));
    return Array.from(categories).sort();
}

/**
 * Get the navigation structure for the documentation.
 */
export async function getDocsNav() {
    const categories = await getDocsByCategory();
    return Object.keys(categories).sort().map(category => ({
        name: category,
        items: categories[category]
    }));
}

/**
 * Convert a collection entry id into a route slug (without file extension).
 */
export function getDocSlug(doc: Pick<CollectionEntry<'docs'>, 'id'>): string {
    return doc.id.replace(/\.(md|mdx)$/i, '');
}

/**
 * Build the docs URL for a collection entry.
 */
export function getDocUrl(doc: Pick<CollectionEntry<'docs'>, 'id'>): string {
    return `/docs/${getDocSlug(doc)}`;
}
