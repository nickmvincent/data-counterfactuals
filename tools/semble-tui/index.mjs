#!/usr/bin/env node

import process from 'node:process';

import { createSembleSession } from './lib/semble-admin.mjs';
import { SembleTuiApp } from './lib/terminal-app.mjs';

const HELP_TEXT = `Semble TUI

Usage:
  npm run semble:tui
  node tools/semble-tui/index.mjs

Auth:
  SEMBLE_LOGIN_IDENTIFIER=your-handle.bsky.social
  SEMBLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
  SEMBLE_PDS_SERVICE=https://bsky.social
  SEMBLE_PDS_ENV=dev   # optional

Key actions:
  Tab        Switch between collections and cards
  c          Create collection or card
  e          Edit selected collection or card metadata
  n          Edit selected card note in $EDITOR
  a          Add or link cards and collections
  x          Remove a card from the current collection
  m          Move a card between collections
  d          Delete selected collection or card
  t          Toggle the cards pane between the selected collection and all cards
  /          Filter the active pane
  r          Refresh from Semble
  q          Quit
`;

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(HELP_TEXT);
    return;
  }

  const session = await createSembleSession();
  const app = new SembleTuiApp(session);
  await app.start();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
