# `create-supportgenix-docs` — v1 Implementation Plan

> CLI that scaffolds SupportGenix Docs into an existing Astro 6+ project.
> Primary command: `npx supportgenix-docs init`
> Design principle: **The CLI owns scaffolding. The user owns config.**

---

## Phase 1 — Repository Setup

### 1.1 Create the branch

```bash
git checkout -b feat/cli
```

### 1.2 Convert root to an npm workspace

Add `workspaces` to the root `package.json`. The root remains the demo site — no files move.

```json
{
  "workspaces": ["packages/*"]
}
```

### 1.3 Scaffold the CLI package directory

```
packages/
  create-supportgenix-docs/
    src/
      cli.ts          ← entry point
      detect.ts       ← environment detection
      deps.ts         ← dependency checker
      scaffold.ts     ← file copying engine
      patches.ts      ← config snippet generator
      install-doc.ts  ← generates supportgenix-docs-install.md
      prompts.ts      ← all clack prompt flows
      utils.ts        ← shared helpers
    templates/
      docs-route/     ← route files for /docs install
      root-route/     ← route files for / install
      content-empty/  ← empty docs content structure
      content-sample/ ← sample docs (--with-examples)
    package.json
    tsconfig.json
    README.md
```

### 1.4 CLI `package.json`

```json
{
  "name": "create-supportgenix-docs",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "supportgenix-docs": "./dist/cli.js",
    "create-supportgenix-docs": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@clack/prompts": "^0.9.0",
    "semver": "^7.6.0",
    "fs-extra": "^11.2.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0",
    "@types/semver": "^7.5.0",
    "@types/fs-extra": "^11.0.0"
  }
}
```

**Why these dependencies:**
- `@clack/prompts` — the prompt library Astro CLI uses; styled, accessible, minimal
- `semver` — reliable version parsing for Astro version check
- `fs-extra` — file copying with safety (no accidental overwrites)
- `picocolors` — terminal colors, zero dependencies

---

## Phase 2 — Environment Detection (`detect.ts`)

Run first. If any check fails, exit with a clear message. Do not proceed.

### Checks in order

| Check | Method | Fail message |
|-------|--------|-------------|
| `package.json` exists | `fs.existsSync` | "No package.json found. Run this inside an existing project." |
| `astro.config.*` exists | glob `astro.config.{mjs,ts,js,cjs}` | "This does not look like an Astro project. No astro.config file found." |
| `astro` is in dependencies | parse `package.json` | "Astro is not installed in this project." |
| Astro version `>= 6.0.0` | `semver.gte` | "Detected Astro X.x. SupportGenix Docs requires Astro 6+." |

### Return shape

```ts
interface DetectResult {
  astroVersion: string;
  astroConfigFile: string;   // e.g. "astro.config.mjs"
  hasContentConfig: boolean; // src/content.config.ts exists?
  existingDeps: string[];    // all keys from dependencies + devDependencies
}
```

### Exact error messages

```
This folder does not look like an Astro project.
Run this inside an existing Astro site, or create one first:

  npm create astro@latest
  cd your-site
  npx supportgenix-docs init
```

```
Detected Astro 4.x. SupportGenix Docs requires Astro 6+.
Upgrade Astro first:

  npm install astro@latest
```

---

## Phase 3 — Dependency Check (`deps.ts`)

After detection passes, check for required packages.

### Required runtime dependencies

```
@astrojs/mdx
@astrojs/alpinejs
alpinejs
@tailwindcss/vite
tailwindcss
```

### Required dev dependency

```
pagefind
```

### Behavior

1. Compare required list against `existingDeps` from detection.
2. Collect what is missing, split into `deps[]` and `devDeps[]`.
3. If nothing missing — continue silently.
4. If missing — show the list and prompt:

```
The following packages are required but not installed:

  dependencies:   @astrojs/mdx, @astrojs/alpinejs, alpinejs
  devDependencies: pagefind

Install them now? (yes/no)
```

5. If yes — run `npm install` and `npm install -D` with the respective lists.
6. If no — add them to the `supportgenix-docs-install.md` as a manual step.

**Never install without confirmation.**

---

## Phase 4 — Install Prompts (`prompts.ts`)

After detection and dependency check, collect install preferences via `@clack/prompts`.

### Prompt flow

```
┌  SupportGenix Docs — Install
│
◇  Where should docs be installed?
│  ● /docs  (recommended)
│  ○ / (site root)
│  ○ Custom path
│
◇  Custom path:  (only shown if custom selected)
│  /help
│
◇  Add sample docs?
│  ● No — start with empty content
│  ○ Yes — add example docs I can edit
│
◇  Ready to scaffold. Continue?
│  ● Yes
│  ○ No, cancel
└
```

### Output

```ts
interface InstallOptions {
  installPath: '/docs' | '/' | string;   // chosen route prefix
  withExamples: boolean;
  confirmed: boolean;
}
```

---

## Phase 5 — Scaffold Engine (`scaffold.ts`)

Copies template files into the user's project. This is the only phase that writes files.

### What gets copied

| Source template | Destination |
|----------------|-------------|
| `templates/docs-route/` or `templates/root-route/` | `src/pages/` (route files) |
| `templates/layouts/` | `src/layouts/` |
| `templates/components/` | `src/components/` |
| `templates/lib/` | `src/lib/` |
| `templates/styles/` | `src/assets/styles/` |
| `templates/content-empty/` | `src/content/docs/` |
| `templates/content-sample/` | `src/content/docs/` (only if `--with-examples`) |

### Safety rules

- **Never silently overwrite.** If a destination file already exists, prompt:
  ```
  src/layouts/DocsLayout.astro already exists.
  Overwrite? (yes / no / yes to all / no to all)
  ```
- Support `--force` flag to skip overwrite prompts (overwrites all).
- Support `--dry-run` flag — print what would be copied, copy nothing.
- Log every file written: `✓ created  src/layouts/DocsLayout.astro`

### Template variable substitution

Before writing, replace placeholders in template files:

| Placeholder | Replaced with |
|------------|---------------|
| `{{BASE_PATH}}` | chosen install path (`/docs`, `/`, `/help`) |
| `{{CONTENT_DIR}}` | `src/content/docs` |

---

## Phase 6 — Config Patch Generator (`patches.ts`)

Does **not** write to `astro.config.mjs` or `content.config.ts`. Generates the exact code snippets the user must add manually.

### `astro.config.mjs` snippet

Always generated. Detects what integrations are already present and only shows what's missing.

```ts
// Add to your astro.config.mjs integrations array:
import mdx from '@astrojs/mdx';
import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [
    mdx(),
    alpinejs(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### `content.config.ts` handling

Two cases:

**File does not exist** — CLI creates it from template. Log: `✓ created  src/content.config.ts`

**File exists** — CLI prints:

```
src/content.config.ts already exists.
Add this collection definition to your existing file:

────────────────────────────────────────────
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    order: z.number().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { docs };
────────────────────────────────────────────

This has been saved to supportgenix-docs-install.md for reference.
```

### Global CSS snippet

```
Add this import to your global CSS file:

@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/500.css';
@import '@fontsource/poppins/600.css';
@import '@fontsource/poppins/700.css';
```

---

## Phase 7 — Install Instructions File (`install-doc.ts`)

Always generated, regardless of whether everything was installed cleanly.

### Output: `supportgenix-docs-install.md`

Written to the project root. Contains:

1. **Detected project state** — Astro version, config file found, content config status
2. **Install summary** — what was scaffolded, where
3. **Dependencies installed** (or to install manually if user declined)
4. **Manual config steps** — exact snippets for `astro.config.mjs`, `content.config.ts`, global CSS
5. **Next steps** — commands to run

```markdown
# SupportGenix Docs — Install Instructions
Generated: 2026-01-15

## Project detected
- Astro version: 6.1.3
- Config file: astro.config.mjs
- content.config.ts: already existed (see manual step below)

## Files scaffolded
- src/pages/docs/[...slug].astro
- src/pages/docs/index.astro
- src/layouts/DocsLayout.astro
- src/components/Search.astro
- ... (full list)

## Dependencies installed
- @astrojs/mdx
- @astrojs/alpinejs
- alpinejs
- @tailwindcss/vite
- tailwindcss
- pagefind (dev)

## Manual steps required

### 1. Update astro.config.mjs
...exact snippet...

### 2. Add to src/content.config.ts
...exact snippet...

### 3. Add to your global CSS
...exact snippet...

## Next steps

npm run dev           # start dev server
npm run build         # production build (required for Pagefind search)
```

---

## Phase 8 — CLI Flags

| Flag | Behavior |
|------|----------|
| `--with-examples` | Copy sample docs into `src/content/docs/` |
| `--dry-run` | Print all actions, write nothing |
| `--force` | Skip overwrite prompts, overwrite all |
| `--path /help` | Skip the install path prompt, use given path |
| `--yes` | Accept all prompts with defaults (for CI use) |

---

## Implementation Order

Build and test in this order — each step is independently testable:

1. **Package scaffolding** — create the `packages/create-supportgenix-docs/` structure, get `npx supportgenix-docs init` to run and print hello
2. **Detection** — `detect.ts`, test against a real Astro 6 project and a non-Astro folder
3. **Prompts** — `prompts.ts`, get the full prompt flow rendering correctly
4. **Dependency check** — `deps.ts`, test missing and present dependency cases
5. **Templates** — build out `templates/` from the current demo site source files
6. **Scaffold engine** — `scaffold.ts`, test dry-run first, then real copy with overwrite prompts
7. **Config patches** — `patches.ts`, test both content.config exists and does not exist cases
8. **Install doc** — `install-doc.ts`, verify the generated file covers all cases
9. **Flags** — wire up `--dry-run`, `--force`, `--with-examples`, `--path`, `--yes`
10. **End-to-end test** — run against a fresh `npm create astro@latest` project, verify clean install

---

## What is NOT in v1

- `npm create supportgenix-docs@latest` (fresh project scaffolder) — deferred to v2
- Astro integration package (`@supportgenix/astro-docs`) — deferred to v2
- AST-based `astro.config.mjs` auto-merging — deferred to v2
- Uninstall / remove command — deferred
- Update / upgrade command — deferred
