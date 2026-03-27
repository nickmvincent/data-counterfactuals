import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLEAR,
  KEEP,
  buildManualMetadataAuditNote,
  buildCardItems,
  parseCardYamlDocument,
  serializeCardYamlDocument,
  buildUpdatedUrlCardRecord,
  normalizeService,
  parseEnvText,
  parsePromptEdit,
  resolveEditableValue,
} from '../lib/semble-admin.mjs';

test('buildCardItems surfaces note-derived titles and collection links', () => {
  const state = {
    collections: [
      {
        uri: 'at://did:plc:test/network.cosmik.collection/reading',
        cid: 'bafy-collection',
        value: {
          name: 'Reading List',
          accessType: 'OPEN',
          description: 'Papers to revisit',
        },
      },
    ],
    cards: [
      {
        uri: 'at://did:plc:test/network.cosmik.card/paper-1',
        cid: 'bafy-card',
        value: {
          type: 'URL',
          url: 'https://example.com/paper',
          content: {
            metadata: {
              title: 'Metadata Title',
              description: 'Metadata description',
              siteName: 'Example',
            },
          },
          createdAt: '2026-03-27T00:00:00.000Z',
        },
      },
      {
        uri: 'at://did:plc:test/network.cosmik.card/note-1',
        cid: 'bafy-note',
        value: {
          type: 'NOTE',
          parentCard: {
            uri: 'at://did:plc:test/network.cosmik.card/paper-1',
            cid: 'bafy-card',
          },
          content: {
            text: `---
title: Frontmatter Title
---
This is the note body.`,
          },
          createdAt: '2026-03-27T01:00:00.000Z',
        },
      },
    ],
    links: [
      {
        uri: 'at://did:plc:test/network.cosmik.collectionLink/link-1',
        cid: 'bafy-link',
        value: {
          card: {
            uri: 'at://did:plc:test/network.cosmik.card/paper-1',
            cid: 'bafy-card',
          },
          collection: {
            uri: 'at://did:plc:test/network.cosmik.collection/reading',
            cid: 'bafy-collection',
          },
        },
      },
    ],
  };

  const [item] = buildCardItems(state);
  assert.equal(item.displayTitle, 'Frontmatter Title');
  assert.equal(item.notePreview, 'This is the note body.');
  assert.equal(item.collections[0].name, 'Reading List');
});

test('buildUpdatedUrlCardRecord preserves existing fields and clears metadata on request', () => {
  const record = {
    uri: 'at://did:plc:test/network.cosmik.card/paper-1',
    cid: 'bafy-card',
    value: {
      $type: 'network.cosmik.card',
      type: 'URL',
      url: 'https://example.com/original',
      content: {
        $type: 'network.cosmik.card#urlContent',
        url: 'https://example.com/original',
        metadata: {
          $type: 'network.cosmik.card#urlMetadata',
          title: 'Original Title',
          description: 'Original description',
          siteName: 'Example',
        },
      },
      createdAt: '2026-03-27T00:00:00.000Z',
    },
  };

  const updated = buildUpdatedUrlCardRecord(
    record,
    {
      baseNsid: 'network.cosmik',
      cardNsid: 'network.cosmik.card',
    },
    {
      url: KEEP,
      title: 'Revised Title',
      description: CLEAR,
      siteName: KEEP,
    },
  );

  assert.equal(updated.url, 'https://example.com/original');
  assert.equal(updated.content.metadata.title, 'Revised Title');
  assert.equal(updated.content.metadata.description, undefined);
  assert.equal(updated.content.metadata.siteName, 'Example');
  assert.ok(updated.updatedAt);
});

test('prompt edit helpers preserve, clear, and normalize service values', () => {
  assert.equal(parsePromptEdit(''), KEEP);
  assert.equal(parsePromptEdit('-'), CLEAR);
  assert.equal(parsePromptEdit('next'), 'next');
  assert.equal(resolveEditableValue('current', KEEP), 'current');
  assert.equal(resolveEditableValue('current', CLEAR), undefined);
  assert.equal(normalizeService('bsky.social'), 'https://bsky.social');

  const env = parseEnvText(`
# comment
SEMBLE_LOGIN_IDENTIFIER="alice.bsky.social"
SEMBLE_PDS_SERVICE=bsky.social
`);

  assert.deepEqual(env, {
    SEMBLE_LOGIN_IDENTIFIER: 'alice.bsky.social',
    SEMBLE_PDS_SERVICE: 'bsky.social',
  });
});

test('card YAML editor round-trips supported metadata fields', () => {
  const cardItem = {
    url: 'https://example.com/paper',
    metadata: {
      title: 'Example Paper',
      description: 'A test paper',
      siteName: 'Example',
      imageUrl: 'https://example.com/image.png',
      author: 'Alice',
      type: 'article',
      retrievedAt: '2026-03-27T00:00:00.000Z',
    },
  };

  const yamlText = serializeCardYamlDocument(cardItem);
  const parsed = parseCardYamlDocument(yamlText);

  assert.deepEqual(parsed, {
    url: 'https://example.com/paper',
    metadata: {
      title: 'Example Paper',
      description: 'A test paper',
      author: 'Alice',
      siteName: 'Example',
      imageUrl: 'https://example.com/image.png',
      type: 'article',
      retrievedAt: '2026-03-27T00:00:00.000Z',
    },
  });
});

test('manual metadata audit stamp preserves note body and records source', () => {
  const nextNote = buildManualMetadataAuditNote(
    `---
title: Existing Title
---
Original body.`,
    {
      source: 'semble_tui_yaml',
      editedAt: '2026-03-27T12:34:56.000Z',
    },
  );

  assert.match(nextNote, /title: Existing Title/);
  assert.match(nextNote, /manual_metadata_edit:/);
  assert.match(nextNote, /source: semble_tui_yaml/);
  assert.match(nextNote, /edited_at: '2026-03-27T12:34:56.000Z'/);
  assert.match(nextNote, /Original body\./);
});
