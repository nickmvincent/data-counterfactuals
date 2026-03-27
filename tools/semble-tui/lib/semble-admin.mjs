import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import matter from 'gray-matter';
import { SemblePDSClient } from '@cosmik.network/semble-pds-client';

const DEFAULT_PDS_SERVICE = 'https://bsky.social';
const PAGE_LIMIT = 100;

export const KEEP = Symbol('keep');
export const CLEAR = Symbol('clear');

export function findWorkspaceRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);

  while (true) {
    if (
      existsSync(path.join(current, 'package.json'))
      && existsSync(path.join(current, '.git'))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function loadEnvFiles(rootDir = findWorkspaceRoot(), env = process.env) {
  const shellKeys = new Set(Object.keys(env));
  loadEnvFile(path.join(rootDir, '.env'), shellKeys, env);
  loadEnvFile(path.join(rootDir, '.env.local'), shellKeys, env);
}

function loadEnvFile(filePath, shellKeys, env) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(parseEnvText(text))) {
    if (!shellKeys.has(key)) {
      env[key] = value;
    }
  }
}

export function parseEnvText(text) {
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

export function normalizeService(value) {
  const trimmed = asString(value).trim();
  if (!trimmed) {
    return DEFAULT_PDS_SERVICE;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getClientConfig(env = process.env) {
  const identifier = env.SEMBLE_LOGIN_IDENTIFIER || env.SEMBLE_PROFILE_IDENTIFIER;
  const password = env.SEMBLE_APP_PASSWORD;
  const service = normalizeService(env.SEMBLE_PDS_SERVICE || DEFAULT_PDS_SERVICE);
  const sembleEnv = asString(env.SEMBLE_PDS_ENV).trim() || undefined;
  const baseNsid = sembleEnv ? `network.cosmik.${sembleEnv}` : 'network.cosmik';

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
    env: sembleEnv,
    baseNsid,
    cardNsid: `${baseNsid}.card`,
    collectionNsid: `${baseNsid}.collection`,
    collectionLinkNsid: `${baseNsid}.collectionLink`,
  };
}

export async function createSembleSession({ rootDir = findWorkspaceRoot() } = {}) {
  loadEnvFiles(rootDir);

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

  return {
    rootDir,
    repo,
    client,
    config,
  };
}

export async function loadState(session) {
  const [collections, cards, links] = await Promise.all([
    listAllRecords(session.client.agent, session.repo, session.config.collectionNsid),
    listAllRecords(session.client.agent, session.repo, session.config.cardNsid),
    listAllRecords(session.client.agent, session.repo, session.config.collectionLinkNsid),
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

export function buildCardItems(state) {
  const collectionsByUri = new Map(state.collections.map((collection) => [collection.uri, collection]));
  const notesByParent = buildNotesByParent(state.cards);
  const linksByCardUri = new Map();

  for (const link of state.links) {
    const cardUri = link.value?.card?.uri;
    if (!cardUri) {
      continue;
    }

    const existing = linksByCardUri.get(cardUri) || [];
    existing.push(link);
    linksByCardUri.set(cardUri, existing);
  }

  return state.cards
    .filter((card) => card.value?.type === 'URL')
    .map((card) => {
      const notes = notesByParent.get(card.uri) || [];
      const latestNote = notes[0] || null;
      const noteInfo = parseNoteCard(latestNote);
      const linkRecords = linksByCardUri.get(card.uri) || [];
      const collections = linkRecords
        .map((link) => {
          const collectionUri = link.value?.collection?.uri;
          if (!collectionUri) {
            return null;
          }

          const collection = collectionsByUri.get(collectionUri);
          return {
            uri: collectionUri,
            linkUri: link.uri,
            name: collection?.value?.name || collectionUri,
            accessType: collection?.value?.accessType || 'UNKNOWN',
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        card,
        latestNote,
        notes,
        url: getCardUrl(card),
        metadata: normalizeMetadata(card.value?.content?.metadata),
        displayTitle: getDisplayTitle(card, noteInfo),
        noteTitle: noteInfo.title,
        notePreview: noteInfo.preview,
        collections,
      };
    })
    .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
}

export function countLinksByCollection(links) {
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

function buildNotesByParent(cards) {
  const notesByParent = new Map();

  for (const card of cards) {
    if (card.value?.type !== 'NOTE') {
      continue;
    }

    const parentUri = card.value?.parentCard?.uri;
    if (!parentUri) {
      continue;
    }

    const existing = notesByParent.get(parentUri) || [];
    existing.push(card);
    notesByParent.set(parentUri, existing);
  }

  for (const notes of notesByParent.values()) {
    notes.sort((a, b) => getRecordTimestamp(b).localeCompare(getRecordTimestamp(a)));
  }

  return notesByParent;
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

export function parsePromptEdit(rawValue) {
  if (rawValue === '') {
    return KEEP;
  }
  if (rawValue === '-') {
    return CLEAR;
  }
  return rawValue;
}

export function resolveEditableValue(currentValue, editValue) {
  if (editValue === KEEP) {
    return currentValue;
  }
  if (editValue === CLEAR) {
    return undefined;
  }
  return editValue;
}

export function buildUpdatedUrlCardRecord(cardRecord, config, edits) {
  if (cardRecord.value?.type !== 'URL') {
    throw new Error('Only URL cards can be edited in the TUI.');
  }

  const currentContent = cardRecord.value?.content || {};
  const currentMetadata = normalizeMetadata(currentContent.metadata);
  const nextUrl = asString(resolveEditableValue(
    getCardUrl(cardRecord),
    edits.url ?? KEEP,
  )).trim();

  if (!nextUrl) {
    throw new Error('Card URL cannot be empty.');
  }

  const nextMetadata = sanitizeMetadata(
    {
      title: resolveEditableValue(currentMetadata.title, edits.title ?? KEEP),
      description: resolveEditableValue(currentMetadata.description, edits.description ?? KEEP),
      author: resolveEditableValue(currentMetadata.author, edits.author ?? KEEP),
      siteName: resolveEditableValue(currentMetadata.siteName, edits.siteName ?? KEEP),
      imageUrl: resolveEditableValue(currentMetadata.imageUrl, edits.imageUrl ?? KEEP),
      type: resolveEditableValue(currentMetadata.type, edits.type ?? KEEP),
      retrievedAt: currentMetadata.retrievedAt,
    },
    config.baseNsid,
  );

  const nextContent = {
    ...currentContent,
    $type: `${config.baseNsid}.card#urlContent`,
    url: nextUrl,
  };

  if (nextMetadata) {
    nextContent.metadata = nextMetadata;
  } else {
    delete nextContent.metadata;
  }

  return {
    ...cardRecord.value,
    $type: config.cardNsid,
    type: 'URL',
    url: nextUrl,
    content: nextContent,
    updatedAt: new Date().toISOString(),
  };
}

export async function createCollection(session, { name, description = '', accessType = 'OPEN' }) {
  const trimmedName = asString(name).trim();
  if (!trimmedName) {
    throw new Error('Collection name is required.');
  }

  const normalizedAccess = normalizeAccessType(accessType, 'OPEN');
  const now = new Date().toISOString();
  const record = {
    $type: session.config.collectionNsid,
    name: trimmedName,
    ...(description.trim() ? { description: description.trim() } : {}),
    accessType: normalizedAccess,
    collaborators: [],
    createdAt: now,
    updatedAt: now,
  };

  const response = await session.client.agent.com.atproto.repo.createRecord({
    repo: session.repo,
    collection: session.config.collectionNsid,
    record,
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
  };
}

export async function updateCollection(session, collectionRecord, updates) {
  const nextRecord = {
    ...collectionRecord.value,
    $type: session.config.collectionNsid,
    name: asString(resolveEditableValue(collectionRecord.value?.name, updates.name ?? KEEP)).trim()
      || collectionRecord.value?.name
      || '(untitled)',
    accessType: normalizeAccessType(
      resolveEditableValue(collectionRecord.value?.accessType, updates.accessType ?? KEEP),
      collectionRecord.value?.accessType || 'OPEN',
    ),
    collaborators: Array.isArray(collectionRecord.value?.collaborators)
      ? collectionRecord.value.collaborators
      : [],
    createdAt: collectionRecord.value?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const description = resolveEditableValue(collectionRecord.value?.description, updates.description ?? KEEP);
  if (asString(description).trim()) {
    nextRecord.description = asString(description).trim();
  } else {
    delete nextRecord.description;
  }

  await putRecordByUri(session.client.agent, session.repo, collectionRecord.uri, nextRecord);
}

export async function deleteCollectionCascade(session, state, collectionRecord) {
  const relatedLinks = state.links.filter((link) => link.value?.collection?.uri === collectionRecord.uri);

  for (const link of relatedLinks) {
    await session.client.removeCardFromCollection(toStrongRef(link));
  }

  await session.client.deleteCollection(toStrongRef(collectionRecord));
}

export async function createCard(session, { url, noteText = '', collectionRecord = null }) {
  const trimmedUrl = asString(url).trim();
  if (!trimmedUrl) {
    throw new Error('Card URL is required.');
  }

  const created = await session.client.createCard({
    url: trimmedUrl,
    ...(noteText.trim() ? { note: noteText.trim() } : {}),
  });

  if (collectionRecord) {
    await session.client.addCardToCollection(created.urlCard, toStrongRef(collectionRecord));
  }

  return created;
}

export async function updateCard(session, cardRecord, edits) {
  const nextRecord = buildUpdatedUrlCardRecord(cardRecord, session.config, edits);
  await putRecordByUri(session.client.agent, session.repo, cardRecord.uri, nextRecord);
}

export async function upsertCardNote(session, cardItem, nextText) {
  const normalizedText = normalizeNoteText(nextText);

  if (normalizedText) {
    if (cardItem.latestNote) {
      await session.client.updateNote(toStrongRef(cardItem.latestNote), normalizedText);
      return 'updated';
    }

    await session.client.addNoteToCard(toStrongRef(cardItem.card), normalizedText);
    return 'created';
  }

  if (cardItem.notes.length) {
    for (const note of cardItem.notes) {
      await session.client.deleteCard(toStrongRef(note));
    }
    return 'deleted';
  }

  return 'unchanged';
}

export async function deleteCardCascade(session, state, cardItem) {
  const relatedLinks = state.links.filter((link) => link.value?.card?.uri === cardItem.card.uri);
  for (const link of relatedLinks) {
    await session.client.removeCardFromCollection(toStrongRef(link));
  }

  for (const note of cardItem.notes) {
    await session.client.deleteCard(toStrongRef(note));
  }

  await session.client.deleteCard(toStrongRef(cardItem.card));
}

export async function addCardToCollection(session, state, cardRecord, collectionRecord) {
  const alreadyLinked = state.links.some((link) =>
    link.value?.card?.uri === cardRecord.uri
    && link.value?.collection?.uri === collectionRecord.uri,
  );

  if (alreadyLinked) {
    return false;
  }

  await session.client.addCardToCollection(toStrongRef(cardRecord), toStrongRef(collectionRecord));
  return true;
}

export async function removeCardFromCollection(session, linkRecord) {
  await session.client.removeCardFromCollection(toStrongRef(linkRecord));
}

export async function moveCardBetweenCollections(
  session,
  state,
  cardItem,
  sourceCollectionRecord,
  destinationCollectionRecord,
  { keepSource = false } = {},
) {
  if (sourceCollectionRecord.uri === destinationCollectionRecord.uri) {
    throw new Error('Source and destination collections must be different.');
  }

  const destinationHasCard = state.links.some((link) =>
    link.value?.collection?.uri === destinationCollectionRecord.uri
    && link.value?.card?.uri === cardItem.card.uri,
  );

  if (!destinationHasCard) {
    await session.client.addCardToCollection(
      toStrongRef(cardItem.card),
      toStrongRef(destinationCollectionRecord),
    );
  }

  if (!keepSource) {
    const sourceLink = state.links.find((link) =>
      link.value?.collection?.uri === sourceCollectionRecord.uri
      && link.value?.card?.uri === cardItem.card.uri,
    );

    if (sourceLink) {
      await session.client.removeCardFromCollection(toStrongRef(sourceLink));
    }
  }
}

export function buildCollectionCardItems(state, collectionUri) {
  const items = buildCardItems(state);
  return items.filter((item) => item.collections.some((collection) => collection.uri === collectionUri));
}

export function normalizeAccessType(value, fallback = 'OPEN') {
  const candidate = asString(value || fallback || 'OPEN').trim().toLowerCase();

  if (['open', 'public'].includes(candidate)) {
    return 'OPEN';
  }

  if (['closed', 'private'].includes(candidate)) {
    return 'CLOSED';
  }

  throw new Error(`Unknown access type "${value}". Expected "open" or "closed".`);
}

export function formatCollectionSummary(collectionRecord, count) {
  return `${collectionRecord.value?.name || '(untitled)'} [${collectionRecord.value?.accessType || 'UNKNOWN'}] (${count} cards)`;
}

export function formatCardSummary(cardItem) {
  const domain = getHost(cardItem.url);
  return `${cardItem.displayTitle}${domain ? ` [${domain}]` : ''}`;
}

export function getHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

export function getCardUrl(card) {
  return asString(card.value?.url || card.value?.content?.url).trim();
}

export function getDisplayTitle(card, noteInfo = { title: '' }) {
  const metadataTitle = asString(card.value?.content?.metadata?.title).trim();
  return noteInfo.title || metadataTitle || getCardUrl(card) || card.uri;
}

export function collapseWhitespace(value) {
  return asString(value).replace(/\s+/g, ' ').trim();
}

export function truncate(value, length) {
  const text = collapseWhitespace(value);
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length - 1)}...`;
}

export function sortCollections(collections) {
  return [...collections].sort((a, b) =>
    (a.value?.name || '').localeCompare(b.value?.name || ''),
  );
}

export function parseAtUri(uri) {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invalid AT URI: ${uri}`);
  }

  const [, repo, collection, rkey] = match;
  return { repo, collection, rkey };
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

function sanitizeMetadata(metadata, baseNsid) {
  const nextMetadata = {
    title: asOptionalTrimmedString(metadata.title),
    description: asOptionalTrimmedString(metadata.description),
    author: asOptionalTrimmedString(metadata.author),
    siteName: asOptionalTrimmedString(metadata.siteName),
    imageUrl: asOptionalTrimmedString(metadata.imageUrl),
    type: asOptionalTrimmedString(metadata.type),
    retrievedAt: asOptionalTrimmedString(metadata.retrievedAt),
  };

  for (const key of Object.keys(nextMetadata)) {
    if (!nextMetadata[key]) {
      delete nextMetadata[key];
    }
  }

  if (!Object.keys(nextMetadata).length) {
    return undefined;
  }

  return {
    $type: `${baseNsid}.card#urlMetadata`,
    ...nextMetadata,
  };
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  return {
    title: asOptionalTrimmedString(metadata.title),
    description: asOptionalTrimmedString(metadata.description),
    author: asOptionalTrimmedString(metadata.author),
    siteName: asOptionalTrimmedString(metadata.siteName),
    imageUrl: asOptionalTrimmedString(metadata.imageUrl),
    type: asOptionalTrimmedString(metadata.type),
    retrievedAt: asOptionalTrimmedString(metadata.retrievedAt),
  };
}

function normalizeNoteText(text) {
  const normalized = asString(text).replace(/\r\n/g, '\n').trim();
  return normalized;
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

function asOptionalTrimmedString(value) {
  const text = asString(value).trim();
  return text || undefined;
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
