import fs from 'fs';
import path from 'path';
import { readFileSync } from 'fs';
import semver from 'semver';
import pc from 'picocolors';

export interface DetectResult {
  astroVersion: string;
  astroConfigFile: string;
  /** Raw contents of the detected astro.config.* file ('' if unreadable). */
  astroConfigContents: string;
  hasContentConfig: boolean;
  existingDeps: string[];
  packageJson: Record<string, unknown>;
}

const ASTRO_CONFIG_NAMES = [
  'astro.config.mjs',
  'astro.config.ts',
  'astro.config.js',
  'astro.config.cjs',
];

function bail(message: string): never {
  console.error('\n' + pc.red('✖') + '  ' + message + '\n');
  process.exit(1);
}

export function detect(cwd: string): DetectResult {
  // 1. Require package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    bail(
      `No ${pc.bold('package.json')} found.\n` +
      `   Run this command inside an existing project directory.`
    );
  }

  let packageJson: Record<string, unknown>;
  try {
    packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    bail(`Could not parse ${pc.bold('package.json')}. Make sure it is valid JSON.`);
  }

  // 2. Require astro.config.*
  const astroConfigFile = ASTRO_CONFIG_NAMES.find(name =>
    fs.existsSync(path.join(cwd, name))
  );

  if (!astroConfigFile) {
    bail(
      `This does not look like an Astro project — no ${pc.bold('astro.config')} file found.\n\n` +
      `   Run this command inside an existing Astro site, or create one first:\n\n` +
      `     ${pc.cyan('npm create astro@latest')}\n` +
      `     ${pc.cyan('cd your-site')}\n` +
      `     ${pc.cyan('npm create supportgenix-docs@latest')}`
    );
  }

  // 3. Check astro is in dependencies
  const allDeps = {
    ...(packageJson.dependencies as Record<string, string> ?? {}),
    ...(packageJson.devDependencies as Record<string, string> ?? {}),
  };

  if (!allDeps['astro']) {
    bail(
      `${pc.bold('astro')} is not installed in this project.\n\n` +
      `   Install it first:\n\n` +
      `     ${pc.cyan('npm install astro@latest')}`
    );
  }

  // 4. Require Astro >= 6
  // Read the actual installed version from node_modules, not the semver range
  let astroVersion = '0.0.0';
  const astroInstalledPkgPath = path.join(cwd, 'node_modules', 'astro', 'package.json');

  if (fs.existsSync(astroInstalledPkgPath)) {
    try {
      const astroPkg = JSON.parse(readFileSync(astroInstalledPkgPath, 'utf-8')) as Record<string, unknown>;
      astroVersion = (astroPkg.version as string) ?? '0.0.0';
    } catch {
      // fall through — use the range from package.json as a rough check
      astroVersion = (allDeps['astro'] as string).replace(/[\^~>=<]/, '');
    }
  } else {
    // node_modules not present — parse from the declared range
    astroVersion = (allDeps['astro'] as string).replace(/[\^~>=<\s]/g, '');
  }

  const coerced = semver.coerce(astroVersion);
  if (!coerced || semver.lt(coerced, '6.0.0')) {
    bail(
      `Detected Astro ${pc.bold(astroVersion)}. SupportGenix Docs requires ${pc.bold('Astro 6+')}.\n\n` +
      `   Upgrade Astro first:\n\n` +
      `     ${pc.cyan('npm install astro@latest')}`
    );
  }

  // 4b. Read the astro config contents so callers can check what is actually
  //     wired in (plugins/integrations), not just what is in package.json.
  let astroConfigContents = '';
  try {
    astroConfigContents = readFileSync(path.join(cwd, astroConfigFile), 'utf-8');
  } catch {
    astroConfigContents = '';
  }

  // 5. Check for existing content.config
  const contentConfigExists =
    fs.existsSync(path.join(cwd, 'src', 'content.config.ts')) ||
    fs.existsSync(path.join(cwd, 'src', 'content.config.js')) ||
    fs.existsSync(path.join(cwd, 'content.config.ts'));

  return {
    astroVersion: coerced.version,
    astroConfigFile,
    astroConfigContents,
    hasContentConfig: contentConfigExists,
    existingDeps: Object.keys(allDeps),
    packageJson,
  };
}
