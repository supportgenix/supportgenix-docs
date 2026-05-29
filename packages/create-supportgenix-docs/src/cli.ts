#!/usr/bin/env node
// The CLI owns scaffolding. The user owns config.

import { intro, outro, log } from '@clack/prompts';
import pc from 'picocolors';
import path from 'path';
import { detect } from './detect.js';
import { checkDeps, promptAndInstallDeps } from './deps.js';
import { gatherOptions } from './prompts.js';
import { scaffold } from './scaffold.js';
import { applyPatches } from './patches.js';
import { writeInstallDoc } from './install-doc.js';

// --- Parse CLI flags ---
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  withExamples: args.includes('--with-examples') ? true : undefined as boolean | undefined,
  yes: args.includes('--yes'),
  path: (() => {
    const i = args.indexOf('--path');
    return i !== -1 && args[i + 1] ? args[i + 1] : undefined;
  })(),
};

const cwd = process.cwd();

async function main() {
  intro(
    pc.bgGreen(pc.black(' SupportGenix Docs ')) +
    pc.dim(' — add a knowledge base to your Astro site')
  );

  if (flags.dryRun) {
    log.warn(`${pc.bold('Dry run mode')} — no files will be written.`);
  }

  // Phase 1: Detect environment
  log.step('Checking project…');
  const detectResult = detect(cwd);
  log.info(
    `Found Astro ${pc.green(detectResult.astroVersion)} · ${detectResult.astroConfigFile}`
  );

  // Phase 2: Check dependencies
  const depsResult = checkDeps(detectResult.existingDeps);
  const { installed: depsInstalled, skipped: skippedDeps } =
    await promptAndInstallDeps(depsResult, cwd, flags.dryRun);

  // Phase 3: Gather install options via prompts
  const options = await gatherOptions({
    path: flags.path,
    withExamples: flags.withExamples,
    yes: flags.yes,
  });

  // Phase 4: Scaffold files
  log.step('Scaffolding files…');
  const scaffoldResult = await scaffold({
    cwd,
    installPath: options.installPath,
    withExamples: options.withExamples,
    dryRun: flags.dryRun,
    force: flags.force,
    yes: flags.yes,
  });

  const fileCount = scaffoldResult.written.length;
  log.info(
    `${fileCount} file${fileCount !== 1 ? 's' : ''} ${flags.dryRun ? 'would be ' : ''}written` +
    (scaffoldResult.skipped.length > 0
      ? `, ${scaffoldResult.skipped.length} skipped`
      : '')
  );

  // Phase 5: Config patches (print snippets, create content.config if missing)
  log.step('Checking config…');
  const patchResult = applyPatches(
    cwd,
    detectResult.astroConfigContents,
    detectResult.hasContentConfig,
    flags.dryRun
  );

  // Phase 6: Write install instructions file
  writeInstallDoc({
    cwd,
    detect: detectResult,
    deps: depsResult,
    depsInstalled,
    skippedDeps,
    installPath: options.installPath,
    withExamples: options.withExamples,
    scaffold: scaffoldResult,
    patches: patchResult,
    dryRun: flags.dryRun,
  });

  // Done
  const docsUrl =
    options.installPath === '/'
      ? 'http://localhost:4321'
      : `http://localhost:4321${options.installPath}`;

  outro(
    pc.green('Done!') +
    `\n\n` +
    `  Complete any manual steps in ${pc.bold('supportgenix-docs-install.md')}, then:\n\n` +
    `  ${pc.cyan('npm run dev')}\n\n` +
    `  Your docs will be at ${pc.cyan(docsUrl)}\n`
  );
}

main().catch(err => {
  console.error(pc.red('\nUnexpected error:'), err);
  process.exit(1);
});
