import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PLATFORM_BINDINGS = {
  'linux-x64': [
    'lightningcss-linux-x64-gnu@1.32.0',
    '@swc/core-linux-x64-gnu@1.15.32',
    '@rolldown/binding-linux-x64-gnu@1.0.0-beta.50',
  ],
  'darwin-arm64': [
    'lightningcss-darwin-arm64@1.32.0',
    '@swc/core-darwin-arm64@1.15.32',
    '@rolldown/binding-darwin-arm64@1.0.0-beta.50',
  ],
  'darwin-x64': [
    'lightningcss-darwin-x64@1.32.0',
    '@swc/core-darwin-x64@1.15.32',
    '@rolldown/binding-darwin-x64@1.0.0-beta.50',
  ],
};

const key = `${process.platform}-${process.arch}`;
const needed = PLATFORM_BINDINGS[key];
if (!needed) {
  console.log(`[bindings] no pinned set for ${key}, skipping`);
  process.exit(0);
}

const missing = needed.filter((spec) => {
  const name = spec.replace(/@[^@]+$/, '');
  try {
    require.resolve(`${name}/package.json`);
    return false;
  } catch {
    return true;
  }
});

if (missing.length === 0) {
  console.log(`[bindings] all present for ${key}`);
  process.exit(0);
}

console.log(`[bindings] installing missing for ${key}: ${missing.join(', ')}`);
execFileSync(
  'npm',
  ['install', '--no-save', '--no-audit', '--no-fund', '--ignore-scripts', ...missing],
  { stdio: 'inherit' },
);
