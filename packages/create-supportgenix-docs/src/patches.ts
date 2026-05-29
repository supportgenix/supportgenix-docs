import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import { log } from '@clack/prompts';
import pc from 'picocolors';

export interface PatchResult {
  astroConfigSnippet: string;
  contentConfigSnippet: string;
  contentConfigCreated: boolean;
}

const DIVIDER = '─'.repeat(60);

/**
 * Whether an integration is actually wired into the astro config.
 * We check the config contents — not just package.json — because a dependency
 * can be installed without being added to the config, which silently breaks
 * styles (missing @tailwindcss/vite plugin) or MDX/Alpine.
 */
function isWiredInConfig(configContents: string, pkg: string, call: string): boolean {
  if (!configContents) return false;
  // Either the import specifier or the plugin/integration call is enough to
  // consider it wired (covers renamed local imports too).
  const importRe = new RegExp(
    `['"\`]${pkg.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}['"\`]`
  );
  const callRe = new RegExp(`\\b${call}\\s*\\(`);
  return importRe.test(configContents) || callRe.test(configContents);
}

/** Snippets the user must add to astro.config.mjs */
function buildAstroConfigSnippet(configContents: string): string {
  const imports: string[] = [];
  const integrations: string[] = [];
  const vitePlugins: string[] = [];

  if (!isWiredInConfig(configContents, '@astrojs/mdx', 'mdx')) {
    imports.push(`import mdx from '@astrojs/mdx';`);
    integrations.push('mdx()');
  }
  if (!isWiredInConfig(configContents, '@astrojs/alpinejs', 'alpinejs')) {
    imports.push(`import alpinejs from '@astrojs/alpinejs';`);
    integrations.push('alpinejs()');
  }
  if (!isWiredInConfig(configContents, '@tailwindcss/vite', 'tailwindcss')) {
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
  astroConfigContents: string,
  hasContentConfig: boolean,
  dryRun: boolean
): PatchResult {
  const astroConfigSnippet = buildAstroConfigSnippet(astroConfigContents);
  const contentConfigSnippet = buildContentConfigSnippet();
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

  return {
    astroConfigSnippet,
    contentConfigSnippet,
    contentConfigCreated,
  };
}
