import { spawn } from 'node:child_process';

const [mode = 'build', cachePolicy, ...extraArgs] = process.argv.slice(2);
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const astroArgsByMode = {
  build: ['exec', 'astro', 'build'],
  dev: ['exec', 'astro', 'dev'],
  check: ['exec', 'astro', 'check'],
  preview: ['exec', 'astro', 'preview'],
};

const astroArgs = astroArgsByMode[mode];
if (!astroArgs) {
  console.error(`Unknown mode "${mode}". Expected one of: ${Object.keys(astroArgsByMode).join(', ')}`);
  process.exit(1);
}

const env = {
  ...process.env,
};

if (cachePolicy) {
  env.SEMBLE_CACHE_POLICY = cachePolicy;
}

const child = spawn(npmCmd, [...astroArgs, ...extraArgs], {
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
