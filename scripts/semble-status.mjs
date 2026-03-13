import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.resolve(root, 'semble.config.json');
const defaultConfig = {
  apiBase: 'https://api.semble.so',
  profileIdentifier: undefined,
  collectionAtUris: [],
  collectionNamePrefix: undefined,
  cachePath: 'tmp/semble-cache.json',
  cachePolicy: 'network-first',
};

function parseJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { __error: error instanceof Error ? error.message : String(error) };
  }
}

const fileConfig = existsSync(configPath) ? parseJson(configPath) : null;
const mergedConfig = {
  apiBase: process.env.SEMBLE_API_BASE || fileConfig?.apiBase || defaultConfig.apiBase,
  profileIdentifier: process.env.SEMBLE_PROFILE_IDENTIFIER || fileConfig?.profileIdentifier || defaultConfig.profileIdentifier,
  collectionAtUris: process.env.SEMBLE_COLLECTION_AT_URIS
    ? process.env.SEMBLE_COLLECTION_AT_URIS.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
    : Array.isArray(fileConfig?.collectionAtUris) ? fileConfig.collectionAtUris : defaultConfig.collectionAtUris,
  collectionNamePrefix: process.env.SEMBLE_COLLECTION_NAME_PREFIX || fileConfig?.collectionNamePrefix || defaultConfig.collectionNamePrefix,
  cachePath: process.env.SEMBLE_CACHE_PATH || fileConfig?.cachePath || defaultConfig.cachePath,
  cachePolicy: process.env.SEMBLE_CACHE_POLICY || fileConfig?.cachePolicy || defaultConfig.cachePolicy,
};

const cachePath = path.isAbsolute(mergedConfig.cachePath)
  ? mergedConfig.cachePath
  : path.resolve(root, mergedConfig.cachePath);
const cacheExists = existsSync(cachePath);
const cachePayload = cacheExists ? parseJson(cachePath) : null;

console.log('Semble status');
console.log(`- Config file: ${existsSync(configPath) ? configPath : 'not found'}`);
if (fileConfig?.__error) {
  console.log(`- Config parse error: ${fileConfig.__error}`);
}
console.log(`- Profile identifier: ${mergedConfig.profileIdentifier || '(none)'}`);
console.log(`- Collection URIs: ${mergedConfig.collectionAtUris.length ? mergedConfig.collectionAtUris.join(', ') : '(none)'}`);
console.log(`- Name prefix: ${mergedConfig.collectionNamePrefix || '(none)'}`);
console.log(`- API base: ${mergedConfig.apiBase}`);
console.log(`- Cache policy: ${mergedConfig.cachePolicy}`);
console.log(`- Cache path: ${cachePath}`);
console.log(`- Cache exists: ${cacheExists ? 'yes' : 'no'}`);

if (cachePayload?.__error) {
  console.log(`- Cache parse error: ${cachePayload.__error}`);
} else if (cachePayload) {
  console.log(`- Cache generated at: ${cachePayload.generated_at || '(unknown)'}`);
  console.log(`- Cache collections: ${cachePayload.stats?.collections ?? '(unknown)'}`);
  console.log(`- Cache references: ${cachePayload.stats?.references ?? '(unknown)'}`);
  console.log(`- Cache source profile: ${cachePayload.source?.profileIdentifier || '(none)'}`);
}

if (!mergedConfig.profileIdentifier && mergedConfig.collectionAtUris.length === 0) {
  console.log('- Next step: set SEMBLE_PROFILE_IDENTIFIER or SEMBLE_COLLECTION_AT_URIS, or add them to semble.config.json.');
} else if (!cacheExists) {
  console.log('- Next step: run `npm run build:refresh` once to create a local cache snapshot.');
} else {
  console.log('- Ready: `npm run build` uses the configured source and falls back to the local cache if the live fetch fails.');
}
