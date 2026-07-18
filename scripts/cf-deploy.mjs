import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const root = process.cwd();
const wranglerConfigPath = path.resolve(root, 'wrangler.toml');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readQuotedTomlValue(source, key) {
  const pattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=\\s*"([^"]+)"\\s*$`, 'm');
  return source.match(pattern)?.[1] ?? null;
}

async function loadPagesConfig() {
  let source = '';

  try {
    source = await fs.readFile(wranglerConfigPath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {
        projectName: process.env.CLOUDFLARE_PAGES_PROJECT || 'datacounterfactuals',
        outputDir: process.env.CLOUDFLARE_PAGES_OUTPUT_DIR || 'dist',
      };
    }

    throw error;
  }

  return {
    projectName:
      process.env.CLOUDFLARE_PAGES_PROJECT
      || readQuotedTomlValue(source, 'name')
      || 'datacounterfactuals',
    outputDir:
      process.env.CLOUDFLARE_PAGES_OUTPUT_DIR
      || readQuotedTomlValue(source, 'pages_build_output_dir')
      || 'dist',
  };
}

function runCommand(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCmd, args, {
      cwd: root,
      env: {
        ...process.env,
        ...extraEnv,
      },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Command exited via signal ${signal}: npm ${args.join(' ')}`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code ?? 'unknown'}: npm ${args.join(' ')}`));
    });
  });
}

function runCommandCapture(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCmd, args, {
      cwd: root,
      env: {
        ...process.env,
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Command exited via signal ${signal}: npm ${args.join(' ')}`));
        return;
      }

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || `Command failed with exit code ${code ?? 'unknown'}: npm ${args.join(' ')}`));
    });
  });
}

async function verifyCloudflareIdentity(wranglerEnv) {
  const expectedEmail = process.env.CLOUDFLARE_EXPECTED_EMAIL?.trim() || 'nickmvincent@gmail.com';
  const { stdout } = await runCommandCapture(
    ['exec', '--', 'wrangler', 'whoami', '--json'],
    wranglerEnv,
  );
  let identity;

  try {
    identity = JSON.parse(stdout);
  } catch {
    throw new Error('Wrangler returned an unreadable response to `whoami --json`.');
  }

  const activeEmail = typeof identity?.email === 'string' ? identity.email.trim() : '';
  if (!identity?.loggedIn || activeEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error(
      `Refusing to deploy: this directory is authenticated as ${activeEmail || 'an unknown account'}, expected ${expectedEmail}.`,
    );
  }

  return { activeEmail };
}

async function main() {
  const { projectName, outputDir } = await loadPagesConfig();
  const deployArgs = process.argv.slice(2);
  const outputPath = path.resolve(root, outputDir);
  const authProfile = 'personal';
  const wranglerEnv = process.env.WRANGLER_LOG_PATH
    ? {}
    : { WRANGLER_LOG_PATH: path.resolve(root, '.wrangler', 'logs') };

  if (deployArgs.some((arg) => arg === '--profile' || arg.startsWith('--profile='))) {
    throw new Error('The deploy script pins Wrangler profile "personal"; do not pass --profile.');
  }

  console.log(`[cf:deploy] Verifying the directory-bound Cloudflare identity for profile "${authProfile}"...`);
  const { activeEmail } = await verifyCloudflareIdentity(wranglerEnv);
  console.log(`[cf:deploy] Verified Cloudflare identity ${activeEmail}.`);

  console.log('[cf:deploy] Refreshing Semble-backed content and building the Astro site...');
  await runCommand(['run', 'build:refresh']);

  try {
    await fs.access(outputPath);
  } catch {
    throw new Error(`Expected build output at ${outputDir}, but it was not found after npm run build:refresh.`);
  }

  console.log(`[cf:deploy] Deploying ${outputDir} to Cloudflare Pages project "${projectName}"...`);
  await runCommand([
    'exec',
    '--',
    'wrangler',
    'pages',
    'deploy',
    outputDir,
    '--project-name',
    projectName,
    '--profile',
    authProfile,
    ...deployArgs,
  ], wranglerEnv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
