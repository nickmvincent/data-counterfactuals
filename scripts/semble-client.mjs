#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import matter from 'gray-matter';
import { SemblePDSClient } from '@cosmik.network/semble-pds-client';

const DEFAULT_PDS_SERVICE = 'https://bsky.social';
const PAGE_LIMIT = 100;

const HELP_TEXT = `Semble management CLI

Usage:
  npm run semble:manage -- list-collections [--json]
  npm run semble:manage -- show-collection <selector> [--json]
  npm run semble:manage -- create-collection --name "Reading List" [--description "..." ] [--access open|closed]
  npm run semble:manage -- update-collection <selector> [--name "New Name"] [--description "..."] [--clear-description] [--access open|closed]
  npm run semble:manage -- rename-collection <selector> --name "New Name"
  npm run semble:manage -- add-card --to <collection> --card <selector>
  npm run semble:manage -- remove-card --from <collection> --card <selector>
  npm run semble:manage -- move-card --from <collection> --to <collection> --card <selector> [--keep-source]
  npm run semble:manage -- move-all --from <collection> --to <collection> [--keep-source]

Selectors:
  Collections: 1-based index from list output, exact AT URI, exact name, or unique name substring.
  Cards: 1-based index from show output, exact AT URI, exact URL, exact title, or unique title/URL substring.

Auth:
  Put these in your shell, .env, or .env.local:
    SEMBLE_LOGIN_IDENTIFIER=your-handle.bsky.social
    SEMBLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
    SEMBLE_PDS_SERVICE=https://bsky.social
    SEMBLE_PDS_ENV=dev   # optional, only if you need non-default NSIDs

Notes:
  This repo does not need collection names listed anywhere when semble.config.json uses a profile identifier.
  New collections default to OPEN so they are importable by the site.
  After changes, run npm run build:refresh to refresh tmp/semble-cache.json.
`;

async function main() {
  loadEnvFiles();

  const [command = 'help', ...rest] = process.argv.slice(2);
  if (['help', '--help', '-h'].includes(command)) {
    console.log(HELP_TEXT);
    return;
  }

  const config = getClientConfig();
  const client = new SemblePDSClient({
    service: config.service,
    ...(config.env ? { env: config.env } : {}),
  });
  await client.login(config.identifier, config.password);

  const repo = client.agent.session?.did;
  if (!repo) {
    throw new Error('Authenticated session did not include a DID.');
  }

  switch (command) {
    case 'list-collections':
    case 'ls':
      await handleListCollections(client, repo, config, rest);
      return;
    case 'show-collection':
    case 'show':
      await handleShowCollection(client, repo, config, rest);
      return;
    case 'create-collection':
      await handleCreateCollection(client, repo, config, rest);
      return;
    case 'update-collection':
    case 'rename-collection':
      await handleUpdateCollection(client, repo, config, rest);
      return;
    case 'add-card':
      await handleAddCard(client, repo, config, rest);
      return;
    case 'remove-card':
      await handleRemoveCard(client, repo, config, rest);
      return;
    case 'move-card':
      await handleMoveCard(client, repo, config, rest);
      return;
    case 'move-all':
      await handleMoveAll(client, repo, config, rest);
      return;
    default:
      throw new Error(`Unknown command "${command}". Run "npm run semble:manage -- help" for usage.`);
  }
}

async function handleListCollections(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: 'boolean' },
    },
    allowPositionals: true,
  });
  assertNoPositionals('list-collections', positionals);

  const state = await loadState(client, repo, config);
  const counts = countLinksByCollection(state.links);
  const payload = state.collections.map((collection, index) => ({
    index: index + 1,
    name: collection.value?.name || '(untitled)',
    accessType: collection.value?.accessType || 'UNKNOWN',
    cards: counts.get(collection.uri) || 0,
    uri: collection.uri,
    description: collection.value?.description || '',
  }));

  if (values.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (!payload.length) {
    console.log('No collections found on this account.');
    return;
  }

  for (const collection of payload) {
    console.log(`${collection.index}. ${collection.name} [${collection.accessType}] (${collection.cards} cards)`);
    console.log(`   ${collection.uri}`);
    if (collection.description) {
      console.log(`   ${truncate(collection.description, 140)}`);
    }
  }
}

async function handleShowCollection(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: 'boolean' },
    },
    allowPositionals: true,
  });

  const selector = positionals[0];
  if (!selector) {
    throw new Error('show-collection requires a collection selector.');
  }

  const state = await loadState(client, repo, config);
  const collection = resolveCollection(state.collections, selector);
  const items = buildCollectionItems(collection, state.cards, state.links);
  const payload = {
    name: collection.value?.name || '(untitled)',
    accessType: collection.value?.accessType || 'UNKNOWN',
    uri: collection.uri,
    description: collection.value?.description || '',
    cards: items.map((item, index) => ({
      index: index + 1,
      title: item.displayTitle,
      url: item.url,
      cardUri: item.card.uri,
      linkUri: item.link.uri,
      noteTitle: item.noteTitle,
      notePreview: item.notePreview,
    })),
  };

  if (values.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`${payload.name} [${payload.accessType}]`);
  console.log(payload.uri);
  if (payload.description) {
    console.log(payload.description);
  }
  console.log(`${payload.cards.length} cards`);

  if (!payload.cards.length) {
    console.log('This collection is empty.');
    return;
  }

  for (const item of payload.cards) {
    console.log(`${item.index}. ${item.title}`);
    if (item.url) {
      console.log(`   URL: ${item.url}`);
    }
    console.log(`   Card: ${item.cardUri}`);
    console.log(`   Link: ${item.linkUri}`);
    if (item.noteTitle && item.noteTitle !== item.title) {
      console.log(`   Note title: ${item.noteTitle}`);
    }
    if (item.notePreview) {
      console.log(`   Note: ${truncate(item.notePreview, 140)}`);
    }
  }
}

async function handleCreateCollection(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      name: { type: 'string' },
      description: { type: 'string' },
      access: { type: 'string' },
    },
    allowPositionals: true,
  });
  assertNoPositionals('create-collection', positionals);

  const name = values.name?.trim();
  if (!name) {
    throw new Error('create-collection requires --name.');
  }

  const accessType = normalizeAccessType(values.access, 'OPEN');
  const now = new Date().toISOString();
  const record = {
    $type: config.collectionNsid,
    name,
    ...(values.description ? { description: values.description } : {}),
    accessType,
    collaborators: [],
    createdAt: now,
    updatedAt: now,
  };

  const response = await client.agent.com.atproto.repo.createRecord({
    repo,
    collection: config.collectionNsid,
    record,
  });

  console.log(`Created collection "${name}" [${accessType}]`);
  console.log(response.data.uri);
}

async function handleUpdateCollection(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      name: { type: 'string' },
      description: { type: 'string' },
      'clear-description': { type: 'boolean' },
      access: { type: 'string' },
    },
    allowPositionals: true,
  });

  const selector = positionals[0];
  if (!selector) {
    throw new Error('update-collection requires a collection selector.');
  }
  if (!values.name && !values.description && !values['clear-description'] && !values.access) {
    throw new Error('update-collection requires at least one of --name, --description, --clear-description, or --access.');
  }

  const state = await loadState(client, repo, config);
  const collection = resolveCollection(state.collections, selector);
  const nextRecord = {
    ...collection.value,
    $type: config.collectionNsid,
    name: values.name?.trim() || collection.value?.name || '(untitled)',
    accessType: normalizeAccessType(values.access, collection.value?.accessType || 'OPEN'),
    collaborators: Array.isArray(collection.value?.collaborators) ? collection.value.collaborators : [],
    createdAt: collection.value?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (values['clear-description']) {
    delete nextRecord.description;
  } else if (values.description !== undefined) {
    if (values.description.trim()) {
      nextRecord.description = values.description;
    } else {
      delete nextRecord.description;
    }
  } else if (!collection.value?.description) {
    delete nextRecord.description;
  }

  await putRecordByUri(client.agent, repo, collection.uri, nextRecord);

  console.log(`Updated collection "${collection.value?.name || collection.uri}"`);
  console.log(`Name: ${nextRecord.name}`);
  console.log(`Access: ${nextRecord.accessType}`);
  console.log(collection.uri);
}

async function handleAddCard(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      to: { type: 'string' },
      card: { type: 'string' },
    },
    allowPositionals: true,
  });
  assertNoPositionals('add-card', positionals);

  if (!values.to || !values.card) {
    throw new Error('add-card requires --to <collection> and --card <selector>.');
  }

  const state = await loadState(client, repo, config);
  const destination = resolveCollection(state.collections, values.to);
  const cards = buildAllUrlCardItems(state.cards);
  const cardItem = resolveCard(cards, values.card);

  const existingLink = state.links.find((link) =>
    link.value?.collection?.uri === destination.uri
    && link.value?.card?.uri === cardItem.card.uri,
  );

  if (existingLink) {
    console.log(`Card is already in "${destination.value?.name || destination.uri}".`);
    return;
  }

  const result = await client.addCardToCollection(toStrongRef(cardItem.card), toStrongRef(destination));
  console.log(`Added "${cardItem.displayTitle}" to "${destination.value?.name || destination.uri}"`);
  console.log(result.uri);
}

async function handleRemoveCard(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      from: { type: 'string' },
      card: { type: 'string' },
    },
    allowPositionals: true,
  });
  assertNoPositionals('remove-card', positionals);

  if (!values.from || !values.card) {
    throw new Error('remove-card requires --from <collection> and --card <selector>.');
  }

  const state = await loadState(client, repo, config);
  const source = resolveCollection(state.collections, values.from);
  const items = buildCollectionItems(source, state.cards, state.links);
  const item = resolveCard(items, values.card);

  await client.removeCardFromCollection(toStrongRef(item.link));
  console.log(`Removed "${item.displayTitle}" from "${source.value?.name || source.uri}"`);
  console.log(item.link.uri);
}

async function handleMoveCard(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      card: { type: 'string' },
      'keep-source': { type: 'boolean' },
    },
    allowPositionals: true,
  });
  assertNoPositionals('move-card', positionals);

  if (!values.from || !values.to || !values.card) {
    throw new Error('move-card requires --from <collection>, --to <collection>, and --card <selector>.');
  }

  const state = await loadState(client, repo, config);
  const source = resolveCollection(state.collections, values.from);
  const destination = resolveCollection(state.collections, values.to);
  assertDifferentCollections(source, destination);

  const sourceItems = buildCollectionItems(source, state.cards, state.links);
  const item = resolveCard(sourceItems, values.card);
  const destinationHasCard = state.links.some((link) =>
    link.value?.collection?.uri === destination.uri
    && link.value?.card?.uri === item.card.uri,
  );

  if (!destinationHasCard) {
    await client.addCardToCollection(toStrongRef(item.card), toStrongRef(destination));
  }

  if (!values['keep-source']) {
    await client.removeCardFromCollection(toStrongRef(item.link));
  }

  console.log(`Moved "${item.displayTitle}" from "${source.value?.name || source.uri}" to "${destination.value?.name || destination.uri}"`);
  if (values['keep-source']) {
    console.log('Source link was preserved.');
  }
}

async function handleMoveAll(client, repo, config, args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      'keep-source': { type: 'boolean' },
    },
    allowPositionals: true,
  });
  assertNoPositionals('move-all', positionals);

  if (!values.from || !values.to) {
    throw new Error('move-all requires --from <collection> and --to <collection>.');
  }

  const state = await loadState(client, repo, config);
  const source = resolveCollection(state.collections, values.from);
  const destination = resolveCollection(state.collections, values.to);
  assertDifferentCollections(source, destination);

  const sourceItems = buildCollectionItems(source, state.cards, state.links);
  if (!sourceItems.length) {
    console.log(`"${source.value?.name || source.uri}" is already empty.`);
    return;
  }

  const destinationCardUris = new Set(
    state.links
      .filter((link) => link.value?.collection?.uri === destination.uri)
      .map((link) => link.value?.card?.uri)
      .filter(Boolean),
  );

  let added = 0;
  let removed = 0;
  let skipped = 0;

  for (const item of sourceItems) {
    if (destinationCardUris.has(item.card.uri)) {
      skipped += 1;
    } else {
      await client.addCardToCollection(toStrongRef(item.card), toStrongRef(destination));
      destinationCardUris.add(item.card.uri);
      added += 1;
    }

    if (!values['keep-source']) {
      await client.removeCardFromCollection(toStrongRef(item.link));
      removed += 1;
    }
  }

  console.log(`Processed ${sourceItems.length} cards from "${source.value?.name || source.uri}" to "${destination.value?.name || destination.uri}"`);
  console.log(`Added: ${added}`);
  console.log(`Skipped already present: ${skipped}`);
  if (values['keep-source']) {
    console.log('Source links were preserved.');
  } else {
    console.log(`Removed from source: ${removed}`);
  }
}

async function loadState(client, repo, config) {
  const [collections, cards, links] = await Promise.all([
    listAllRecords(client.agent, repo, config.collectionNsid),
    listAllRecords(client.agent, repo, config.cardNsid),
    listAllRecords(client.agent, repo, config.collectionLinkNsid),
  ]);

  return {
    collections: sortCollections(collections),
    cards,
    links,
  };
}

async function listAllRecords(agent, repo, collection) {
  const records = [];
  let cursor;

  while (true) {
    const response = await agent.com.atproto.repo.listRecords({
      repo,
      collection,
      limit: PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });

    for (const record of response.data.records || []) {
      records.push({
        uri: record.uri,
        cid: record.cid || '',
        value: record.value || {},
      });
    }

    cursor = response.data.cursor;
    if (!cursor) {
      break;
    }
  }

  return records;
}

async function putRecordByUri(agent, repo, uri, record) {
  const { collection, rkey } = parseAtUri(uri);
  await agent.com.atproto.repo.putRecord({
    repo,
    collection,
    rkey,
    record,
  });
}

function buildCollectionItems(collection, cards, links) {
  const urlCards = cards.filter((card) => card.value?.type === 'URL');
  const cardsByUri = new Map(urlCards.map((card) => [card.uri, card]));
  const notesByParent = buildNotesByParent(cards);

  return links
    .filter((link) => link.value?.collection?.uri === collection.uri)
    .map((link) => {
      const card = cardsByUri.get(link.value?.card?.uri);
      if (!card) {
        return null;
      }

      const note = notesByParent.get(card.uri);
      const noteInfo = parseNoteCard(note);
      const displayTitle = getDisplayTitle(card, noteInfo);
      const url = getCardUrl(card);

      return {
        card,
        link,
        note,
        displayTitle,
        url,
        noteTitle: noteInfo.title,
        notePreview: noteInfo.preview,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
}

function buildAllUrlCardItems(cards) {
  const notesByParent = buildNotesByParent(cards);

  return cards
    .filter((card) => card.value?.type === 'URL')
    .map((card) => {
      const note = notesByParent.get(card.uri);
      const noteInfo = parseNoteCard(note);
      return {
        card,
        link: null,
        note,
        displayTitle: getDisplayTitle(card, noteInfo),
        url: getCardUrl(card),
        noteTitle: noteInfo.title,
        notePreview: noteInfo.preview,
      };
    })
    .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
}

function buildNotesByParent(cards) {
  const notes = new Map();

  for (const card of cards) {
    if (card.value?.type !== 'NOTE') {
      continue;
    }

    const parentUri = card.value?.parentCard?.uri;
    if (!parentUri) {
      continue;
    }

    const previous = notes.get(parentUri);
    if (!previous || getRecordTimestamp(card) > getRecordTimestamp(previous)) {
      notes.set(parentUri, card);
    }
  }

  return notes;
}

function resolveCollection(collections, selector) {
  return resolveBySelector(collections, selector, {
    label: 'collection',
    describe: (collection) => `${collection.value?.name || '(untitled)'} (${collection.uri})`,
    tokens: (collection) => [
      collection.uri,
      collection.value?.name,
    ],
  });
}

function resolveCard(items, selector) {
  return resolveBySelector(items, selector, {
    label: 'card',
    describe: (item) => `${item.displayTitle} (${item.url || item.card.uri})`,
    tokens: (item) => [
      item.card?.uri,
      item.link?.uri,
      item.url,
      item.displayTitle,
      item.noteTitle,
    ],
  });
}

function resolveBySelector(items, selector, options) {
  const trimmed = selector?.trim();
  if (!trimmed) {
    throw new Error(`Missing ${options.label} selector.`);
  }

  if (/^\d+$/.test(trimmed)) {
    const index = Number(trimmed);
    if (index >= 1 && index <= items.length) {
      return items[index - 1];
    }
  }

  const lower = trimmed.toLowerCase();
  const exactMatches = items.filter((item) =>
    options.tokens(item).some((token) => normalizeToken(token) === lower),
  );

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  if (exactMatches.length > 1) {
    throw new Error(formatAmbiguousError(options.label, trimmed, exactMatches, options.describe));
  }

  const fuzzyMatches = items.filter((item) =>
    options.tokens(item).some((token) => normalizeToken(token).includes(lower)),
  );

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  if (fuzzyMatches.length > 1) {
    throw new Error(formatAmbiguousError(options.label, trimmed, fuzzyMatches, options.describe));
  }

  throw new Error(formatNotFoundError(options.label, trimmed, items, options.describe));
}

function parseNoteCard(noteCard) {
  const text = asString(noteCard?.value?.content?.text).trim();
  if (!text) {
    return {
      title: '',
      preview: '',
    };
  }

  try {
    const parsed = matter(text);
    const title = asString(parsed.data?.title).trim();
    const previewSource = parsed.content?.trim() || text;
    return {
      title,
      preview: collapseWhitespace(previewSource),
    };
  } catch {
    return {
      title: '',
      preview: collapseWhitespace(text),
    };
  }
}

function getDisplayTitle(card, noteInfo) {
  const metadataTitle = asString(card.value?.content?.metadata?.title).trim();
  return noteInfo.title || metadataTitle || getCardUrl(card) || card.uri;
}

function getCardUrl(card) {
  return asString(card.value?.url || card.value?.content?.url).trim();
}

function countLinksByCollection(links) {
  const counts = new Map();

  for (const link of links) {
    const collectionUri = link.value?.collection?.uri;
    if (!collectionUri) {
      continue;
    }
    counts.set(collectionUri, (counts.get(collectionUri) || 0) + 1);
  }

  return counts;
}

function sortCollections(collections) {
  return [...collections].sort((a, b) =>
    (a.value?.name || '').localeCompare(b.value?.name || ''),
  );
}

function assertDifferentCollections(source, destination) {
  if (source.uri === destination.uri) {
    throw new Error('Source and destination collections must be different.');
  }
}

function normalizeAccessType(value, fallback) {
  const candidate = (value || fallback || 'OPEN').trim().toLowerCase();

  if (['open', 'public'].includes(candidate)) {
    return 'OPEN';
  }
  if (['closed', 'private'].includes(candidate)) {
    return 'CLOSED';
  }

  throw new Error(`Unknown access type "${value}". Expected "open" or "closed".`);
}

function getRecordTimestamp(record) {
  return asString(record?.value?.updatedAt || record?.value?.createdAt || '');
}

function toStrongRef(record) {
  return {
    uri: record.uri,
    cid: record.cid,
  };
}

function parseAtUri(uri) {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invalid AT URI: ${uri}`);
  }
  const [, repo, collection, rkey] = match;
  return { repo, collection, rkey };
}

function formatAmbiguousError(label, selector, matches, describe) {
  const preview = matches
    .slice(0, 5)
    .map((item) => `- ${describe(item)}`)
    .join('\n');

  return `Ambiguous ${label} selector "${selector}". Matches:\n${preview}`;
}

function formatNotFoundError(label, selector, items, describe) {
  const preview = items
    .slice(0, 5)
    .map((item) => `- ${describe(item)}`)
    .join('\n');

  if (!preview) {
    return `No ${label}s were available to match "${selector}".`;
  }

  return `Could not find a ${label} matching "${selector}". Example choices:\n${preview}`;
}

function normalizeToken(value) {
  return asString(value).trim().toLowerCase();
}

function assertNoPositionals(command, positionals) {
  if (positionals.length > 0) {
    throw new Error(`${command} does not accept positional arguments.`);
  }
}

function getClientConfig() {
  const identifier = process.env.SEMBLE_LOGIN_IDENTIFIER || process.env.SEMBLE_PROFILE_IDENTIFIER;
  const password = process.env.SEMBLE_APP_PASSWORD;
  const service = normalizeService(process.env.SEMBLE_PDS_SERVICE || DEFAULT_PDS_SERVICE);
  const env = asString(process.env.SEMBLE_PDS_ENV).trim() || undefined;
  const baseNsid = env ? `network.cosmik.${env}` : 'network.cosmik';

  if (!identifier) {
    throw new Error('Missing SEMBLE_LOGIN_IDENTIFIER. You can also reuse SEMBLE_PROFILE_IDENTIFIER if it matches your login handle.');
  }
  if (!password) {
    throw new Error('Missing SEMBLE_APP_PASSWORD. Set it in your shell, .env, or .env.local.');
  }

  return {
    identifier,
    password,
    service,
    env,
    cardNsid: `${baseNsid}.card`,
    collectionNsid: `${baseNsid}.collection`,
    collectionLinkNsid: `${baseNsid}.collectionLink`,
  };
}

function normalizeService(value) {
  const trimmed = asString(value).trim();
  if (!trimmed) {
    return DEFAULT_PDS_SERVICE;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function loadEnvFiles() {
  const shellKeys = new Set(Object.keys(process.env));
  loadEnvFile(path.resolve(process.cwd(), '.env'), shellKeys);
  loadEnvFile(path.resolve(process.cwd(), '.env.local'), shellKeys);
}

function loadEnvFile(filePath, shellKeys) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(parseEnvText(text))) {
    if (!shellKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

function parseEnvText(text) {
  const entries = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    entries[key] = stripQuotes(rawValue.trim());
  }

  return entries;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function collapseWhitespace(value) {
  return asString(value).replace(/\s+/g, ' ').trim();
}

function truncate(value, length) {
  const text = collapseWhitespace(value);
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 1)}...`;
}

function asString(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
