const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch all packages and resolve from root node_modules.
// @expo/metro-config auto-detects this via resolve-workspace-root,
// but explicit config is a safety net.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Enable package.json exports field — required for @himan/shared subpath
// imports like @himan/shared/auth, @himan/shared/notes, etc.
config.resolver.unstable_enablePackageExports = true;

const projectSrc = path.resolve(projectRoot, 'src');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Resolve the `@/*` alias explicitly to `src/*`. Do NOT rely on Expo's
  // tsconfig-paths resolver: it is silently inactive during EAS eager bundle
  // (`expo export:embed --eager`), which breaks every `@/...` import there
  // even though it works in local `expo start`/`export`. Mapping to an
  // absolute file path here makes resolution environment-independent.
  if (moduleName.startsWith('@/')) {
    const target = path.join(projectSrc, moduleName.slice(2));
    return context.resolveRequest(context, target, platform);
  }

  // @himan/shared internal imports use .js extensions (ESM TypeScript
  // convention: `from './config/index.js'` resolves to ./config/index.ts).
  // Metro looks for files literally and won't find the .ts without this remap.
  if (
    moduleName.endsWith('.js') &&
    context.originModulePath.includes(`${path.sep}packages${path.sep}shared${path.sep}`)
  ) {
    const tsPath = moduleName.replace(/\.js$/, '.ts');
    try {
      return context.resolveRequest(context, tsPath, platform);
    } catch {
      // fall through to default resolution
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: './global.css',
  configPath: './tailwind.config.js',
});
