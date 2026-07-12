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

// @himan/shared internal imports use .js extensions (ESM TypeScript convention:
// e.g. `from './config/index.js'` which resolves to ./config/index.ts).
// Metro looks for files literally and won't find the .ts file without this remap.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: './global.css',
  configPath: './tailwind.config.js',
});
