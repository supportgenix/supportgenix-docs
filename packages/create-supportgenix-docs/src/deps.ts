import { execSync } from 'child_process';
import { confirm, log } from '@clack/prompts';
import pc from 'picocolors';

export interface DepsResult {
  missing: string[];
  missingDev: string[];
  allInstalled: boolean;
}

// Required runtime dependencies
const REQUIRED_DEPS = [
  '@astrojs/mdx',
  '@astrojs/alpinejs',
  'alpinejs',
  '@tailwindcss/vite',
  'tailwindcss',
];

// Required dev dependencies
const REQUIRED_DEV_DEPS = [
  'pagefind',
];

export function checkDeps(existingDeps: string[]): DepsResult {
  const missing = REQUIRED_DEPS.filter(dep => !existingDeps.includes(dep));
  const missingDev = REQUIRED_DEV_DEPS.filter(dep => !existingDeps.includes(dep));

  return {
    missing,
    missingDev,
    allInstalled: missing.length === 0 && missingDev.length === 0,
  };
}

export async function promptAndInstallDeps(
  result: DepsResult,
  cwd: string,
  dryRun: boolean
): Promise<{ installed: boolean; skipped: string[] }> {
  if (result.allInstalled) {
    return { installed: false, skipped: [] };
  }

  const lines: string[] = [];
  if (result.missing.length > 0) {
    lines.push(
      `  ${pc.dim('dependencies:')}   ${result.missing.map(d => pc.cyan(d)).join(', ')}`
    );
  }
  if (result.missingDev.length > 0) {
    lines.push(
      `  ${pc.dim('devDependencies:')} ${result.missingDev.map(d => pc.cyan(d)).join(', ')}`
    );
  }

  log.warn(
    `The following packages are required but not installed:\n\n${lines.join('\n')}\n`
  );

  const shouldInstall = await confirm({
    message: 'Install them now?',
    initialValue: true,
  });

  if (shouldInstall !== true) {
    log.info(
      'Skipping install. These will be listed in ' +
      pc.bold('supportgenix-docs-install.md') +
      ' for you to install manually.'
    );
    return {
      installed: false,
      skipped: [...result.missing, ...result.missingDev],
    };
  }

  if (dryRun) {
    log.info(`${pc.dim('[dry-run]')} Would run:`);
    if (result.missing.length > 0) {
      log.info(`  npm install ${result.missing.join(' ')}`);
    }
    if (result.missingDev.length > 0) {
      log.info(`  npm install -D ${result.missingDev.join(' ')}`);
    }
    return { installed: true, skipped: [] };
  }

  if (result.missing.length > 0) {
    log.step(`Installing dependencies…`);
    execSync(`npm install ${result.missing.join(' ')}`, {
      cwd,
      stdio: 'inherit',
    });
  }

  if (result.missingDev.length > 0) {
    log.step(`Installing dev dependencies…`);
    execSync(`npm install -D ${result.missingDev.join(' ')}`, {
      cwd,
      stdio: 'inherit',
    });
  }

  return { installed: true, skipped: [] };
}
