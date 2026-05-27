import { select, text, confirm, isCancel, cancel } from '@clack/prompts';
import pc from 'picocolors';

export interface InstallOptions {
  installPath: string;
  withExamples: boolean;
}

export async function gatherOptions(
  flags: {
    path?: string;
    withExamples?: boolean;
    yes?: boolean;
  }
): Promise<InstallOptions> {

  // --- Install path ---
  let installPath: string;

  if (flags.path) {
    installPath = flags.path;
  } else if (flags.yes) {
    installPath = '/docs';
  } else {
    const pathChoice = await select({
      message: 'Where should docs be installed?',
      options: [
        {
          value: '/docs',
          label: '/docs',
          hint: 'recommended — adds a docs section to your site',
        },
        {
          value: '/',
          label: '/ (site root)',
          hint: 'docs become your entire site',
        },
        {
          value: 'custom',
          label: 'Custom path',
          hint: 'e.g. /help, /support, /knowledge-base',
        },
      ],
    });

    if (isCancel(pathChoice)) {
      cancel('Installation cancelled.');
      process.exit(0);
    }

    if (pathChoice === 'custom') {
      const customPath = await text({
        message: 'Enter your custom path:',
        placeholder: '/help',
        validate(value) {
          if (!value.startsWith('/')) return 'Path must start with /';
          if (value.includes(' ')) return 'Path cannot contain spaces';
        },
      });

      if (isCancel(customPath)) {
        cancel('Installation cancelled.');
        process.exit(0);
      }

      installPath = customPath as string;
    } else {
      installPath = pathChoice as string;
    }
  }

  // --- Sample docs ---
  let withExamples: boolean;

  if (flags.withExamples !== undefined) {
    withExamples = flags.withExamples;
  } else if (flags.yes) {
    withExamples = false; // default: no sample docs
  } else {
    const examplesChoice = await select({
      message: 'Add sample docs?',
      options: [
        {
          value: false,
          label: 'No — start with empty content',
          hint: 'recommended',
        },
        {
          value: true,
          label: 'Yes — add example docs I can edit',
        },
      ],
    });

    if (isCancel(examplesChoice)) {
      cancel('Installation cancelled.');
      process.exit(0);
    }

    withExamples = examplesChoice as boolean;
  }

  // --- Confirm ---
  if (!flags.yes) {
    const routeLabel = installPath === '/'
      ? 'site root'
      : `${pc.cyan(installPath)} route`;

    const confirmed = await confirm({
      message: `Ready to scaffold SupportGenix Docs into the ${routeLabel}. Continue?`,
      initialValue: true,
    });

    if (isCancel(confirmed) || confirmed === false) {
      cancel('Installation cancelled.');
      process.exit(0);
    }
  }

  return { installPath, withExamples };
}
