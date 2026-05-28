import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import { confirm, isCancel, log } from '@clack/prompts';
import pc from 'picocolors';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

export interface ScaffoldResult {
  written: string[];
  skipped: string[];
}

interface ScaffoldOptions {
  cwd: string;
  installPath: string;
  withExamples: boolean;
  dryRun: boolean;
  force: boolean;
  yes: boolean;
}

/** Replace template placeholders in file content */
function applyTemplateVars(content: string, installPath: string): string {
  // BASE_PATH: empty string for root install, /docs or /help for subpath installs
  const basePath = installPath === '/' ? '' : installPath;
  // DOCS_HOME: always a usable href — '/' for root, '/docs' etc for subpath
  const docsHome = installPath === '/' ? '/' : installPath;

  return content
    .replace(/\{\{BASE_PATH\}\}/g, basePath)
    .replace(/\{\{DOCS_HOME\}\}/g, docsHome)
    .replace(/\{\{CONTENT_DIR\}\}/g, 'src/content/docs');
}

/** Copy a single file, respecting dry-run, force, and overwrite prompts */
async function copyFile(
  src: string,
  dest: string,
  installPath: string,
  options: ScaffoldOptions,
  overwriteAll: { value: boolean | null }
): Promise<'written' | 'skipped'> {
  const relDest = path.relative(options.cwd, dest);
  const exists = fs.existsSync(dest);

  if (exists && !options.force) {
    // dry-run and --yes both skip existing files without prompting
    if (overwriteAll.value === true) {
      // fall through to write
    } else if (overwriteAll.value === false) {
      log.warn(`  ${pc.dim('skipped')}  ${relDest} (already exists)`);
      return 'skipped';
    } else {
      // Interactive: ask per-file (only reached when neither --yes nor --force nor --dry-run)
      const choice = await confirm({
        message: `${pc.yellow(relDest)} already exists. Overwrite?`,
        initialValue: false,
      });

      if (isCancel(choice) || choice === false) {
        log.warn(`  ${pc.dim('skipped')}  ${relDest}`);
        return 'skipped';
      }
    }
  }

  if (options.dryRun) {
    const action = exists ? pc.yellow('overwrite') : pc.green('create');
    log.info(`  ${pc.dim('[dry-run]')} would ${action}  ${relDest}`);
    return 'written';
  }

  const rawContent = fs.readFileSync(src, 'utf-8');
  const content = applyTemplateVars(rawContent, installPath);

  fse.ensureDirSync(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf-8');

  const action = exists ? pc.yellow('updated') : pc.green('created');
  log.step(`  ${pc.green('✓')} ${action}  ${relDest}`);
  return 'written';
}

/** Recursively copy a template directory into the destination */
async function copyDir(
  templateDir: string,
  destDir: string,
  installPath: string,
  options: ScaffoldOptions,
  overwriteAll: { value: boolean | null },
  result: ScaffoldResult
): Promise<void> {
  if (!fs.existsSync(templateDir)) return;

  const entries = fs.readdirSync(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, installPath, options, overwriteAll, result);
    } else {
      const outcome = await copyFile(srcPath, destPath, installPath, options, overwriteAll);
      if (outcome === 'written') {
        result.written.push(path.relative(options.cwd, destPath));
      } else {
        result.skipped.push(path.relative(options.cwd, destPath));
      }
    }
  }
}

export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { cwd, installPath, withExamples, dryRun, force, yes } = options;
  const result: ScaffoldResult = { written: [], skipped: [] };
  // force → overwrite all | yes or dry-run → skip existing silently | otherwise → prompt per file
  const overwriteAll: { value: boolean | null } = {
    value: force ? true : (yes || dryRun) ? false : null,
  };

  const isRoot = installPath === '/';
  const routeTemplate = isRoot ? 'root-route' : 'docs-route';

  // --- Route files → src/pages/<installPath>/  ---
  const pagesSubDir = isRoot ? '' : installPath.replace(/^\//, '');
  const pagesDestDir = path.join(cwd, 'src', 'pages', pagesSubDir);
  await copyDir(
    path.join(TEMPLATES_DIR, routeTemplate),
    pagesDestDir,
    installPath,
    options,
    overwriteAll,
    result
  );

  // --- SupportGenix-owned files ---
  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'layouts'),
    path.join(cwd, 'src', 'supportgenix-docs', 'layouts'),
    installPath,
    options,
    overwriteAll,
    result
  );

  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'components'),
    path.join(cwd, 'src', 'supportgenix-docs', 'components'),
    installPath,
    options,
    overwriteAll,
    result
  );

  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'lib'),
    path.join(cwd, 'src', 'supportgenix-docs', 'lib'),
    installPath,
    options,
    overwriteAll,
    result
  );

  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'styles'),
    path.join(cwd, 'src', 'supportgenix-docs', 'styles'),
    installPath,
    options,
    overwriteAll,
    result
  );

  // --- Shared pages (search-index.json.ts) → always src/pages/ ---
  // For root installs this is already in the root-route template.
  // For subpath installs we copy it separately so it lives at src/pages/ not src/pages/docs/.
  if (!isRoot) {
    await copyDir(
      path.join(TEMPLATES_DIR, 'shared-pages'),
      path.join(cwd, 'src', 'pages'),
      installPath,
      options,
      overwriteAll,
      result
    );
  }

  // --- Content: empty placeholder or sample docs ---
  // Templates contain a docs/ subfolder, so dest is src/content (not src/content/docs)
  const contentTemplate = withExamples ? 'content-sample' : 'content-empty';
  await copyDir(
    path.join(TEMPLATES_DIR, contentTemplate),
    path.join(cwd, 'src', 'content'),
    installPath,
    options,
    overwriteAll,
    result
  );

  if (dryRun) {
    log.info(`\n${pc.dim('[dry-run]')} No files were written.`);
  }

  return result;
}
