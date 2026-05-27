import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { getDocUrl } from "../lib/docs";

export const prerender = true;

export const GET: APIRoute = async () => {
    const docs = await getCollection("docs");

    const normalized = docs.map((doc) => ({
        url: getDocUrl(doc),
        title: doc.data.title,
        excerpt:
            doc.data.description ||
            `Learn more about ${doc.data.title} in Support Genix documentation.`,
        category: doc.data.category || "General",
    }));

    const body = {
        generatedAt: new Date().toISOString(),
        popular: normalized.slice(0, 8).map((item) => item.title),
        docs: normalized,
    };

    return new Response(JSON.stringify(body), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=600",
        },
    });
};
