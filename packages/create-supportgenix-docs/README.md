# create-supportgenix-docs

Add a full documentation / knowledge base to any **Astro 6+** project in one command.

```bash
npm create supportgenix-docs@latest
```

## What it does

The CLI scaffolds a complete docs system into your existing Astro project:

- **Pages** — docs index, individual article pages, and category listing pages
- **Layouts** — `DocsLayout` (three-column with sidebar + TOC) and `Layout` (base wrapper)
- **Components** — search, sidebar, table of contents, header, footer, and more
- **Styles** — Tailwind CSS 4 design tokens and global CSS
- **Content** — an empty `src/content/docs/` folder ready for your `.mdx` files
- **Search** — dual-mode search (Pagefind post-build + JSON fallback in dev)

After scaffolding, the CLI prints exact code snippets for the manual config steps it can't do automatically (`astro.config.mjs`, `content.config.ts`), and writes a `supportgenix-docs-install.md` file to your project root with full next-step instructions.

## Requirements

- Node 22.12+
- An existing Astro **6+** project

## Usage

```bash
# Interactive (recommended for first install)
npm create supportgenix-docs@latest

# Non-interactive — install at /docs, skip existing files
npm create supportgenix-docs@latest -- --path /docs --yes

# Install at site root
npm create supportgenix-docs@latest -- --path /

# Include sample articles to explore the system
npm create supportgenix-docs@latest -- --with-examples

# Preview what would be written without touching any files
npm create supportgenix-docs@latest -- --dry-run --yes
```

## CLI flags

| Flag | Description |
|---|---|
| `--path <path>` | Install path (`/docs`, `/help`, `/`, etc.) |
| `--yes` | Skip prompts, skip existing files without overwriting |
| `--force` | Skip prompts, overwrite existing files |
| `--with-examples` | Scaffold sample docs content |
| `--dry-run` | Preview actions only — writes nothing |

## Dependencies installed automatically

The CLI checks for missing packages and offers to install them:

**dependencies** — `@astrojs/mdx`, `@astrojs/alpinejs`, `alpinejs`, `@tailwindcss/vite`, `tailwindcss`, `@fontsource/inter`

**devDependencies** — `pagefind`

## Manual config steps

The CLI cannot safely auto-merge your `astro.config.mjs`. After scaffolding, follow the snippets printed to your terminal (also saved in `supportgenix-docs-install.md`).

## Links

- [Demo](https://astro.supportgenix.com)
- [GitHub](https://github.com/supportgenix/supportgenix-docs)
- [npm](https://www.npmjs.com/package/create-supportgenix-docs)
