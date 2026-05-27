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
}

/** Replace template placeholders in file content */
function applyTemplateVars(content: string, installPath: string): string {
  return content
    .replace(/\{\{BASE_PATH\}\}/g, installPath)
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
    // Already decided for all files
    if (overwriteAll.value === true) {
      // fall through to write
    } else if (overwriteAll.value === false) {
      log.warn(`  ${pc.dim('skipped')}  ${relDest} (already exists)`);
      return 'skipped';
    } else {
      // Ask per-file
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
  const { cwd, installPath, withExamples, dryRun, force } = options;
  const result: ScaffoldResult = { written: [], skipped: [] };
  const overwriteAll: { value: boolean | null } = { value: force ? true : null };

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

  // --- Layouts ---
  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'layouts'),
    path.join(cwd, 'src', 'layouts'),
    installPath,
    options,
    overwriteAll,
    result
  );

  // --- Components ---
  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'components'),
    path.join(cwd, 'src', 'components'),
    installPath,
    options,
    overwriteAll,
    result
  );

  // --- Lib ---
  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'lib'),
    path.join(cwd, 'src', 'lib'),
    installPath,
    options,
    overwriteAll,
    result
  );

  // --- Styles ---
  await copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'styles'),
    path.join(cwd, 'src', 'assets', 'styles'),
    installPath,
    options,
    overwriteAll,
    result
  );

  // --- Content: empty placeholder or sample docs ---
  const contentTemplate = withExamples ? 'content-sample' : 'content-empty';
  await copyDir(
    path.join(TEMPLATES_DIR, contentTemplate),
    path.join(cwd, 'src', 'content', 'docs'),
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
