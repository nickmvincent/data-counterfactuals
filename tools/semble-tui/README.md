# Semble TUI

Keyboard-driven terminal UI for full CRUD over Semble collections and URL cards.

## Launch

From the repo root:

```bash
npm run semble:tui
```

The TUI reuses the same Semble auth env vars as the existing CLI:

```bash
SEMBLE_LOGIN_IDENTIFIER=your-handle.bsky.social
SEMBLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SEMBLE_PDS_SERVICE=https://bsky.social
SEMBLE_PDS_ENV=dev
```

It loads `.env` and `.env.local` from the repo root before connecting.

## What it can do

- Create, rename, update, and delete collections
- Create URL cards and optionally attach notes
- Edit URL card metadata fields
- Edit card metadata in a built-in YAML editor and stamp a manual-edit record in the attached note
- Edit notes in `$VISUAL` or `$EDITOR`
- Delete cards with cascade cleanup for attached notes and collection links
- Link, unlink, and move cards between collections
- Filter collections or cards in place
- Toggle between cards in the selected collection and all cards on the account

## Keybindings

- `Tab`, `h`, `l`: switch panes
- `j`, `k`: move selection
- `c`: create
- `e`: edit selected collection or card
- `y`: open the in-TUI YAML editor for the selected card metadata
- `n`: edit selected card note
- `a`: add existing card to a collection, or link a selected card to another collection
- `x`: remove the selected card from the current collection
- `m`: move the selected card to another collection
- `d`: delete the selected collection or card
- `t`: toggle card scope between selected collection and all cards
- `/`: set filter for the active pane
- `Esc`: clear the active filter
- `r`: refresh
- `?`: help
- `q`: quit
