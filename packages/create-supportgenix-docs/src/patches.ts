import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import { log } from '@clack/prompts';
import pc from 'picocolors';

export interface PatchResult {
  astroConfigSnippet: string;
  contentConfigSnippet: string;
  cssSnippet: string;
  contentConfigCreated: boolean;
}

const DIVIDER = '─'.repeat(60);

/** Snippets the user must add to astro.config.mjs */
function buildAstroConfigSnippet(existingDeps: string[]): string {
  const imports: string[] = [];
  const integrations: string[] = [];
  const vitePlugins: string[] = [];

  if (!existingDeps.includes('@astrojs/mdx')) {
    imports.push(`import mdx from '@astrojs/mdx';`);
    integrations.push('mdx()');
  }
  if (!existingDeps.includes('@astrojs/alpinejs')) {
    imports.push(`import alpinejs from '@astrojs/alpinejs';`);
    integrations.push('alpinejs()');
  }
  if (!existingDeps.includes('@tailwindcss/vite')) {
    imports.push(`import tailwindcss from '@tailwindcss/vite';`);
    vitePlugins.push('tailwindcss()');
  }

  if (imports.length === 0) return '';

  const lines: string[] = [
    `// Add to your ${pc.bold('astro.config.mjs')}:`,
    '',
    ...imports,
    '',
    `export default defineConfig({`,
  ];

  if (integrations.length > 0) {
    lines.push(`  integrations: [`);
    integrations.forEach(i => lines.push(`    ${i},`));
    lines.push(`  ],`);
  }

  if (vitePlugins.length > 0) {
    lines.push(`  vite: {`);
    lines.push(`    plugins: [`);
    vitePlugins.forEach(p => lines.push(`      ${p},`));
    lines.push(`    ],`);
    lines.push(`  },`);
  }

  lines.push(`});`);
  return lines.join('\n');
}

/** The docs collection definition for content.config.ts */
function buildContentConfigSnippet(): string {
  return `import { defineCollection, z } from 'astro:content';
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

export const collections = { docs };`;
}

/** CSS import snippet for Poppins font */
function buildCssSnippet(): string {
  return `/* Add to your global CSS file (e.g. src/assets/styles/global.css) */
@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/500.css';
@import '@fontsource/poppins/600.css';
@import '@fontsource/poppins/700.css';`;
}

const CONTENT_CONFIG_TEMPLATE = `import { defineCollection, z } from 'astro:content';
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
`;

export function applyPatches(
  cwd: string,
  existingDeps: string[],
  hasContentConfig: boolean,
  dryRun: boolean
): PatchResult {
  const astroConfigSnippet = buildAstroConfigSnippet(existingDeps);
  const contentConfigSnippet = buildContentConfigSnippet();
  const cssSnippet = buildCssSnippet();
  let contentConfigCreated = false;

  // --- astro.config.mjs: always print, never auto-merge ---
  if (astroConfigSnippet) {
    log.warn(
      `Add these to your ${pc.bold('astro.config.mjs')}:\n\n` +
      pc.dim(DIVIDER) + '\n' +
      astroConfigSnippet + '\n' +
      pc.dim(DIVIDER)
    );
  } else {
    log.info(`${pc.green('✓')} astro.config.mjs already has all required integrations.`);
  }

  // --- content.config.ts: create if missing, print if exists ---
  if (!hasContentConfig) {
    const configPath = path.join(cwd, 'src', 'content.config.ts');
    if (!dryRun) {
      fse.ensureDirSync(path.dirname(configPath));
      fs.writeFileSync(configPath, CONTENT_CONFIG_TEMPLATE, 'utf-8');
    }
    contentConfigCreated = true;
    log.step(
      `${pc.green('✓')} ${dryRun ? pc.dim('[dry-run] would create') : 'created'}  src/content.config.ts`
    );
  } else {
    log.warn(
      `${pc.bold('src/content.config.ts')} already exists.\n` +
      `Add this collection definition to your existing file:\n\n` +
      pc.dim(DIVIDER) + '\n' +
      contentConfigSnippet + '\n' +
      pc.dim(DIVIDER) + '\n' +
      `This snippet is also saved in ${pc.bold('supportgenix-docs-install.md')}.`
    );
  }

  // --- Global CSS: always print ---
  log.info(
    `Add Poppins font imports to your global CSS file:\n\n` +
    pc.dim(DIVIDER) + '\n' +
    cssSnippet + '\n' +
    pc.dim(DIVIDER)
  );

  return {
    astroConfigSnippet,
    contentConfigSnippet,
    cssSnippet,
    contentConfigCreated,
  };
}
