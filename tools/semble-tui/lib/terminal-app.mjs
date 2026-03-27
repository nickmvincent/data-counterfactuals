import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';

import {
  addCardToCollection,
  buildCardItems,
  collapseWhitespace,
  countLinksByCollection,
  createCard,
  createCollection,
  deleteCardCascade,
  deleteCollectionCascade,
  formatCardSummary,
  formatCollectionSummary,
  getHost,
  loadState,
  moveCardBetweenCollections,
  parsePromptEdit,
  removeCardFromCollection,
  saveCardYamlEdit,
  serializeCardYamlDocument,
  truncate,
  updateCard,
  updateCollection,
  upsertCardNote,
} from './semble-admin.mjs';

const ANSI = {
  clear: '\x1b[2J\x1b[H',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  inverse: '\x1b[7m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

export class SembleTuiApp {
  constructor(session) {
    this.session = session;
    this.state = {
      collections: [],
      cards: [],
      links: [],
    };
    this.cardItems = [];
    this.collectionCounts = new Map();
    this.focusPane = 'collections';
    this.cardsScope = 'collection';
    this.collectionFilter = '';
    this.cardFilter = '';
    this.collectionIndex = 0;
    this.cardIndex = 0;
    this.overlay = null;
    this.busyMessage = '';
    this.statusMessage = 'Loading Semble data...';
    this.statusLevel = 'info';
    this.running = false;
    this._resolve = null;

    this.onKeypress = this.onKeypress.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  async start() {
    readline.emitKeypressEvents(process.stdin);

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error('Semble TUI requires an interactive terminal.');
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', this.onKeypress);
    process.stdout.on('resize', this.onResize);
    process.stdout.write(ANSI.hideCursor);

    await this.refreshData({
      statusMessage: `Signed in as ${this.session.config.identifier}.`,
    });

    this.running = true;
    this.render();

    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  async stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    process.stdin.off('keypress', this.onKeypress);
    process.stdout.off('resize', this.onResize);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdout.write(`${ANSI.showCursor}${ANSI.reset}\n`);

    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  onResize() {
    this.render();
  }

  onKeypress(str, key = {}) {
    if (!this.running) {
      return;
    }

    if (key.ctrl && key.name === 'c') {
      void this.stop();
      return;
    }

    if (this.busyMessage) {
      return;
    }

    if (this.overlay?.type === 'help') {
      this.overlay = null;
      this.render();
      return;
    }

    if (this.overlay?.type === 'editor') {
      void this.handleTextEditorKeypress(str, key);
      return;
    }

    if (this.overlay?.type === 'picker') {
      void this.handlePickerKeypress(str, key);
      return;
    }

    switch (key.name) {
      case 'q':
        void this.stop();
        return;
      case 'tab':
        this.focusPane = this.focusPane === 'collections' ? 'cards' : 'collections';
        this.render();
        return;
      case 'left':
      case 'h':
        this.focusPane = 'collections';
        this.render();
        return;
      case 'right':
      case 'l':
      case 'return':
        if (this.focusPane === 'collections') {
          this.focusPane = 'cards';
          this.render();
          return;
        }
        break;
      case 'up':
      case 'k':
        this.moveSelection(-1);
        this.render();
        return;
      case 'down':
      case 'j':
        this.moveSelection(1);
        this.render();
        return;
      case 'home':
      case 'g':
        this.jumpSelection('start');
        this.render();
        return;
      case 'end':
        this.jumpSelection('end');
        this.render();
        return;
      case 'escape':
        this.clearActiveFilter();
        this.render();
        return;
      case 'slash':
        void this.safeAction(() => this.promptForFilter());
        return;
      default:
        break;
    }

    if (str === 'G') {
      this.jumpSelection('end');
      this.render();
      return;
    }

    switch (str) {
      case 'r':
        void this.runBusy('Refreshing data...', async () => {
          await this.refreshData({
            preferredCollectionUri: this.getSelectedCollection()?.uri,
            preferredCardUri: this.getSelectedCard()?.card.uri,
            statusMessage: 'Refreshed from Semble.',
          });
        });
        return;
      case 't':
        this.cardsScope = this.cardsScope === 'collection' ? 'all' : 'collection';
        this.clampSelection();
        this.render();
        return;
      case '?':
        this.overlay = { type: 'help' };
        this.render();
        return;
      case 'c':
        if (this.focusPane === 'collections') {
          void this.safeAction(() => this.handleCreateCollection());
        } else {
          void this.safeAction(() => this.handleCreateCard());
        }
        return;
      case 'e':
        if (this.focusPane === 'collections') {
          void this.safeAction(() => this.handleEditCollection());
        } else {
          void this.safeAction(() => this.handleEditCard());
        }
        return;
      case 'd':
        if (this.focusPane === 'collections') {
          void this.safeAction(() => this.handleDeleteCollection());
        } else {
          void this.safeAction(() => this.handleDeleteCard());
        }
        return;
      case 'n':
        if (this.focusPane === 'cards') {
          void this.safeAction(() => this.handleEditNote());
        }
        return;
      case 'y':
        if (this.focusPane === 'cards') {
          void this.safeAction(() => this.handleOpenYamlEditor());
        }
        return;
      case 'a':
        void this.safeAction(() => this.handleAddLink());
        return;
      case 'x':
        if (this.focusPane === 'cards') {
          void this.safeAction(() => this.handleRemoveLink());
        }
        return;
      case 'm':
        if (this.focusPane === 'cards') {
          void this.safeAction(() => this.handleMoveCard());
        }
        return;
      default:
        return;
    }
  }

  async handlePickerKeypress(str, key) {
    const picker = this.overlay;
    if (!picker || picker.type !== 'picker') {
      return;
    }

    if (key.name === 'escape') {
      this.overlay = null;
      this.setStatus('Selection cancelled.', 'info');
      this.render();
      return;
    }

    if (key.name === 'up' || key.name === 'k') {
      picker.index = Math.max(0, picker.index - 1);
      this.render();
      return;
    }

    if (key.name === 'down' || key.name === 'j') {
      picker.index = clamp(
        picker.index + 1,
        0,
        Math.max(this.getVisiblePickerItems().length - 1, 0),
      );
      this.render();
      return;
    }

    if (key.name === 'backspace') {
      picker.filter = picker.filter.slice(0, -1);
      picker.index = 0;
      this.render();
      return;
    }

    if (key.name === 'return') {
      const item = this.getVisiblePickerItems()[picker.index];
      if (!item) {
        return;
      }

      this.overlay = null;
      await this.runBusy(picker.busyLabel, async () => {
        await picker.onChoose(item);
      });
      return;
    }

    if (str && isPrintableCharacter(str)) {
      picker.filter += str;
      picker.index = 0;
      this.render();
    }
  }

  async handleTextEditorKeypress(str, key) {
    const editor = this.overlay;
    if (!editor || editor.type !== 'editor') {
      return;
    }

    if (key.name === 'escape') {
      this.overlay = null;
      this.setStatus('YAML editor cancelled.', 'info');
      this.render();
      return;
    }

    if (key.ctrl && key.name === 's') {
      await this.runBusy('Saving YAML metadata...', async () => {
        await editor.onSave(editor.lines.join('\n'));
        this.overlay = null;
      });
      return;
    }

    switch (key.name) {
      case 'up':
        moveEditorCursorUp(editor);
        this.render();
        return;
      case 'down':
        moveEditorCursorDown(editor);
        this.render();
        return;
      case 'left':
        moveEditorCursorLeft(editor);
        this.render();
        return;
      case 'right':
        moveEditorCursorRight(editor);
        this.render();
        return;
      case 'home':
        editor.cursorCol = 0;
        this.render();
        return;
      case 'end':
        editor.cursorCol = getEditorLine(editor).length;
        this.render();
        return;
      case 'pageup':
        moveEditorCursorVertical(editor, -this.getEditorMetrics(editor).bodyHeight);
        this.render();
        return;
      case 'pagedown':
        moveEditorCursorVertical(editor, this.getEditorMetrics(editor).bodyHeight);
        this.render();
        return;
      case 'backspace':
        deleteBackwardInEditor(editor);
        this.render();
        return;
      case 'delete':
        deleteForwardInEditor(editor);
        this.render();
        return;
      case 'return':
        insertTextInEditor(editor, '\n');
        this.render();
        return;
      case 'tab':
        insertTextInEditor(editor, '  ');
        this.render();
        return;
      default:
        break;
    }

    if (str && hasInsertableText(str)) {
      insertTextInEditor(editor, str);
      this.render();
    }
  }

  async runBusy(message, task) {
    if (this.busyMessage) {
      return;
    }

    this.busyMessage = message;
    this.render();

    try {
      await task();
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      this.busyMessage = '';
      this.render();
    }
  }

  async safeAction(task) {
    try {
      await task();
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : String(error), 'error');
      this.render();
    }
  }

  async refreshData({
    preferredCollectionUri = this.getSelectedCollection()?.uri,
    preferredCardUri = this.getSelectedCard()?.card.uri,
    statusMessage = '',
  } = {}) {
    this.state = await loadState(this.session);
    this.cardItems = buildCardItems(this.state);
    this.collectionCounts = countLinksByCollection(this.state.links);
    this.restoreSelection(preferredCollectionUri, preferredCardUri);
    if (statusMessage) {
      this.setStatus(statusMessage, 'info');
    }
  }

  restoreSelection(preferredCollectionUri, preferredCardUri) {
    const collections = this.getVisibleCollections({ ignoreCurrentIndex: true });
    const collectionMatchIndex = collections.findIndex((collection) => collection.uri === preferredCollectionUri);
    this.collectionIndex = collectionMatchIndex >= 0 ? collectionMatchIndex : Math.min(this.collectionIndex, Math.max(collections.length - 1, 0));

    if (this.cardsScope === 'collection' && !this.getSelectedCollection() && this.state.collections.length) {
      this.collectionIndex = 0;
    }

    const cards = this.getVisibleCards({ ignoreCurrentIndex: true });
    const cardMatchIndex = cards.findIndex((item) => item.card.uri === preferredCardUri);
    this.cardIndex = cardMatchIndex >= 0 ? cardMatchIndex : Math.min(this.cardIndex, Math.max(cards.length - 1, 0));

    this.clampSelection();
  }

  clampSelection() {
    const collections = this.getVisibleCollections({ ignoreCurrentIndex: true });
    this.collectionIndex = clamp(this.collectionIndex, 0, Math.max(collections.length - 1, 0));

    const cards = this.getVisibleCards({ ignoreCurrentIndex: true });
    this.cardIndex = clamp(this.cardIndex, 0, Math.max(cards.length - 1, 0));
  }

  moveSelection(delta) {
    if (this.focusPane === 'collections') {
      const items = this.getVisibleCollections({ ignoreCurrentIndex: true });
      this.collectionIndex = clamp(this.collectionIndex + delta, 0, Math.max(items.length - 1, 0));
      if (this.cardsScope === 'collection') {
        this.cardIndex = 0;
      }
      return;
    }

    const cards = this.getVisibleCards({ ignoreCurrentIndex: true });
    this.cardIndex = clamp(this.cardIndex + delta, 0, Math.max(cards.length - 1, 0));
  }

  jumpSelection(target) {
    if (this.focusPane === 'collections') {
      const items = this.getVisibleCollections({ ignoreCurrentIndex: true });
      this.collectionIndex = target === 'start' ? 0 : Math.max(items.length - 1, 0);
      if (this.cardsScope === 'collection') {
        this.cardIndex = 0;
      }
      return;
    }

    const cards = this.getVisibleCards({ ignoreCurrentIndex: true });
    this.cardIndex = target === 'start' ? 0 : Math.max(cards.length - 1, 0);
  }

  clearActiveFilter() {
    if (this.focusPane === 'collections') {
      this.collectionFilter = '';
      this.collectionIndex = 0;
      this.setStatus('Cleared collection filter.', 'info');
      return;
    }

    this.cardFilter = '';
    this.cardIndex = 0;
    this.setStatus('Cleared card filter.', 'info');
  }

  getVisibleCollections() {
    const query = this.collectionFilter.trim().toLowerCase();
    if (!query) {
      return this.state.collections;
    }

    return this.state.collections.filter((collection) => {
      const haystack = `${collection.value?.name || ''} ${collection.value?.description || ''} ${collection.uri}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  getVisibleCards() {
    const baseCards = this.cardsScope === 'all'
      ? this.cardItems
      : this.cardItems.filter((item) =>
        item.collections.some((collection) => collection.uri === this.getSelectedCollection()?.uri),
      );
    const query = this.cardFilter.trim().toLowerCase();

    if (!query) {
      return baseCards;
    }

    return baseCards.filter((item) => {
      const haystack = [
        item.displayTitle,
        item.url,
        item.notePreview,
        item.noteTitle,
        item.metadata?.description,
        item.collections.map((collection) => collection.name).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  getSelectedCollection() {
    return this.getVisibleCollections()[this.collectionIndex] || null;
  }

  getSelectedCard() {
    return this.getVisibleCards()[this.cardIndex] || null;
  }

  async promptForFilter() {
    const isCollections = this.focusPane === 'collections';
    const current = isCollections ? this.collectionFilter : this.cardFilter;
    const answer = await this.promptLine(
      isCollections ? 'Collection filter' : 'Card filter',
      { initialValue: current },
    );

    if (answer === null) {
      return;
    }

    if (isCollections) {
      this.collectionFilter = answer.trim();
      this.collectionIndex = 0;
      if (this.cardsScope === 'collection') {
        this.cardIndex = 0;
      }
      this.setStatus(this.collectionFilter ? `Filtered collections by "${this.collectionFilter}".` : 'Cleared collection filter.', 'info');
    } else {
      this.cardFilter = answer.trim();
      this.cardIndex = 0;
      this.setStatus(this.cardFilter ? `Filtered cards by "${this.cardFilter}".` : 'Cleared card filter.', 'info');
    }

    this.clampSelection();
    this.render();
  }

  async handleCreateCollection() {
    const name = (await this.promptLine('New collection name'))?.trim();
    if (!name) {
      this.setStatus('Collection creation cancelled.', 'info');
      this.render();
      return;
    }

    const description = await this.promptLine('Description (optional)');
    const accessType = await this.promptLine('Access type (open/closed)', { initialValue: 'open' });

    await this.runBusy('Creating collection...', async () => {
      const created = await createCollection(this.session, {
        name,
        description: description || '',
        accessType: accessType || 'open',
      });

      this.focusPane = 'collections';
      await this.refreshData({
        preferredCollectionUri: created.uri,
        statusMessage: `Created collection "${name}".`,
      });
    });
  }

  async handleEditCollection() {
    const collection = this.getSelectedCollection();
    if (!collection) {
      this.setStatus('No collection selected.', 'error');
      this.render();
      return;
    }

    const name = await this.promptLine('Collection name (blank keeps current)', {
      initialValue: collection.value?.name || '',
    });
    const description = await this.promptLine('Description (blank keeps, "-" clears)', {
      initialValue: collection.value?.description || '',
    });
    const accessType = await this.promptLine('Access type (blank keeps current)', {
      initialValue: (collection.value?.accessType || 'OPEN').toLowerCase(),
    });

    await this.runBusy('Updating collection...', async () => {
      await updateCollection(this.session, collection, {
        name: parsePromptEdit(name ?? ''),
        description: parsePromptEdit(description ?? ''),
        accessType: parsePromptEdit(accessType ?? ''),
      });

      await this.refreshData({
        preferredCollectionUri: collection.uri,
        statusMessage: `Updated collection "${collection.value?.name || collection.uri}".`,
      });
    });
  }

  async handleDeleteCollection() {
    const collection = this.getSelectedCollection();
    if (!collection) {
      this.setStatus('No collection selected.', 'error');
      this.render();
      return;
    }

    const count = this.collectionCounts.get(collection.uri) || 0;
    const confirmed = await this.confirm(
      `Delete collection "${collection.value?.name || collection.uri}" and remove ${count} collection link(s)?`,
    );
    if (!confirmed) {
      this.setStatus('Collection deletion cancelled.', 'info');
      this.render();
      return;
    }

    await this.runBusy('Deleting collection...', async () => {
      await deleteCollectionCascade(this.session, this.state, collection);
      await this.refreshData({
        statusMessage: `Deleted collection "${collection.value?.name || collection.uri}".`,
      });
    });
  }

  async handleCreateCard() {
    const selectedCollection = this.getSelectedCollection();
    const url = (await this.promptLine('Card URL'))?.trim();
    if (!url) {
      this.setStatus('Card creation cancelled.', 'info');
      this.render();
      return;
    }

    const wantsNote = await this.confirm('Open an editor for an attached note?', false);
    let noteText = '';
    if (wantsNote) {
      noteText = await this.editTextInEditor('', 'new-card-note.md');
    }

    await this.runBusy('Creating card...', async () => {
      const created = await createCard(this.session, {
        url,
        noteText,
        collectionRecord: selectedCollection,
      });

      this.focusPane = 'cards';
      await this.refreshData({
        preferredCollectionUri: selectedCollection?.uri,
        preferredCardUri: created.urlCard.uri,
        statusMessage: selectedCollection
          ? `Created card in "${selectedCollection.value?.name || selectedCollection.uri}".`
          : 'Created card.',
      });
    });
  }

  async handleEditCard() {
    const cardItem = this.getSelectedCard();
    if (!cardItem) {
      this.setStatus('No card selected.', 'error');
      this.render();
      return;
    }

    const url = await this.promptLine('URL (blank keeps current)', {
      initialValue: cardItem.url || '',
    });
    if ((url || '').trim() === '-') {
      this.setStatus('Card URL cannot be cleared.', 'error');
      this.render();
      return;
    }

    const title = await this.promptLine('Title (blank keeps, "-" clears)', {
      initialValue: cardItem.metadata?.title || '',
    });
    const description = await this.promptLine('Description (blank keeps, "-" clears)', {
      initialValue: cardItem.metadata?.description || '',
    });
    const siteName = await this.promptLine('Site name (blank keeps, "-" clears)', {
      initialValue: cardItem.metadata?.siteName || '',
    });
    const imageUrl = await this.promptLine('Image URL (blank keeps, "-" clears)', {
      initialValue: cardItem.metadata?.imageUrl || '',
    });

    await this.runBusy('Updating card...', async () => {
      await updateCard(this.session, cardItem.card, {
        url: parsePromptEdit(url ?? ''),
        title: parsePromptEdit(title ?? ''),
        description: parsePromptEdit(description ?? ''),
        siteName: parsePromptEdit(siteName ?? ''),
        imageUrl: parsePromptEdit(imageUrl ?? ''),
      });

      await this.refreshData({
        preferredCollectionUri: this.getSelectedCollection()?.uri,
        preferredCardUri: cardItem.card.uri,
        statusMessage: `Updated card "${cardItem.displayTitle}".`,
      });
    });
  }

  async handleOpenYamlEditor() {
    const cardItem = this.getSelectedCard();
    if (!cardItem) {
      this.setStatus('No card selected.', 'error');
      this.render();
      return;
    }

    this.openTextEditor({
      title: `YAML metadata editor: ${cardItem.displayTitle}`,
      text: serializeCardYamlDocument(cardItem),
      onSave: async (nextText) => {
        await saveCardYamlEdit(this.session, cardItem, nextText);
        await this.refreshData({
          preferredCollectionUri: this.getSelectedCollection()?.uri,
          preferredCardUri: cardItem.card.uri,
          statusMessage: `Saved YAML metadata for "${cardItem.displayTitle}" and recorded a manual edit stamp in the attached note.`,
        });
      },
    });
  }

  async handleEditNote() {
    const cardItem = this.getSelectedCard();
    if (!cardItem) {
      this.setStatus('No card selected.', 'error');
      this.render();
      return;
    }

    const initialText = cardItem.latestNote?.value?.content?.text || '';
    const nextText = await this.editTextInEditor(initialText, 'card-note.md');
    if (normalizeMultilineText(nextText) === normalizeMultilineText(initialText)) {
      this.setStatus('Note unchanged.', 'info');
      this.render();
      return;
    }

    await this.runBusy('Saving note...', async () => {
      const action = await upsertCardNote(this.session, cardItem, nextText);
      await this.refreshData({
        preferredCollectionUri: this.getSelectedCollection()?.uri,
        preferredCardUri: cardItem.card.uri,
        statusMessage: `Note ${action}.`,
      });
    });
  }

  async handleDeleteCard() {
    const cardItem = this.getSelectedCard();
    if (!cardItem) {
      this.setStatus('No card selected.', 'error');
      this.render();
      return;
    }

    const confirmed = await this.confirm(
      `Delete card "${cardItem.displayTitle}" everywhere, including ${cardItem.collections.length} collection link(s) and ${cardItem.notes.length} attached note(s)?`,
    );
    if (!confirmed) {
      this.setStatus('Card deletion cancelled.', 'info');
      this.render();
      return;
    }

    await this.runBusy('Deleting card...', async () => {
      await deleteCardCascade(this.session, this.state, cardItem);
      await this.refreshData({
        preferredCollectionUri: this.getSelectedCollection()?.uri,
        statusMessage: `Deleted card "${cardItem.displayTitle}".`,
      });
    });
  }

  async handleAddLink() {
    if (this.focusPane === 'collections') {
      const collection = this.getSelectedCollection();
      if (!collection) {
        this.setStatus('No collection selected.', 'error');
        this.render();
        return;
      }

      const linkedCardUris = new Set(
        this.state.links
          .filter((link) => link.value?.collection?.uri === collection.uri)
          .map((link) => link.value?.card?.uri),
      );

      const options = this.cardItems
        .filter((item) => !linkedCardUris.has(item.card.uri))
        .map((item) => ({
          label: formatCardSummary(item),
          subtitle: item.url,
          searchText: `${item.displayTitle} ${item.url} ${item.notePreview}`,
          value: item,
        }));

      this.openPicker({
        title: `Add card to "${collection.value?.name || collection.uri}"`,
        emptyMessage: 'Every known card is already in this collection.',
        busyLabel: 'Adding card to collection...',
        items: options,
        onChoose: async (choice) => {
          const added = await addCardToCollection(this.session, this.state, choice.value.card, collection);
          await this.refreshData({
            preferredCollectionUri: collection.uri,
            preferredCardUri: choice.value.card.uri,
            statusMessage: added
              ? `Added "${choice.value.displayTitle}" to "${collection.value?.name || collection.uri}".`
              : 'Card was already linked.',
          });
        },
      });
      return;
    }

    const cardItem = this.getSelectedCard();
    if (!cardItem) {
      this.setStatus('No card selected.', 'error');
      this.render();
      return;
    }

    const linkedCollectionUris = new Set(cardItem.collections.map((collection) => collection.uri));
    const options = this.state.collections
      .filter((collection) => !linkedCollectionUris.has(collection.uri))
      .map((collection) => ({
        label: formatCollectionSummary(collection, this.collectionCounts.get(collection.uri) || 0),
        subtitle: collection.value?.description || collection.uri,
        searchText: `${collection.value?.name || ''} ${collection.value?.description || ''}`,
        value: collection,
      }));

    this.openPicker({
      title: `Add "${cardItem.displayTitle}" to collection`,
      emptyMessage: 'This card is already linked to every available collection.',
      busyLabel: 'Linking card...',
      items: options,
      onChoose: async (choice) => {
        const added = await addCardToCollection(this.session, this.state, cardItem.card, choice.value);
        await this.refreshData({
          preferredCollectionUri: this.getSelectedCollection()?.uri || choice.value.uri,
          preferredCardUri: cardItem.card.uri,
          statusMessage: added
            ? `Linked "${cardItem.displayTitle}" to "${choice.value.value?.name || choice.value.uri}".`
            : 'Card was already linked.',
        });
      },
    });
  }

  async handleRemoveLink() {
    if (this.cardsScope !== 'collection') {
      this.setStatus('Switch to collection-scoped cards before removing a single collection link.', 'error');
      this.render();
      return;
    }

    const collection = this.getSelectedCollection();
    const cardItem = this.getSelectedCard();
    if (!collection || !cardItem) {
      this.setStatus('Select both a collection and a card first.', 'error');
      this.render();
      return;
    }

    const link = this.state.links.find((candidate) =>
      candidate.value?.collection?.uri === collection.uri
      && candidate.value?.card?.uri === cardItem.card.uri,
    );

    if (!link) {
      this.setStatus('Could not find the selected collection link.', 'error');
      this.render();
      return;
    }

    const confirmed = await this.confirm(
      `Remove "${cardItem.displayTitle}" from "${collection.value?.name || collection.uri}"?`,
      false,
    );
    if (!confirmed) {
      this.setStatus('Link removal cancelled.', 'info');
      this.render();
      return;
    }

    await this.runBusy('Removing card from collection...', async () => {
      await removeCardFromCollection(this.session, link);
      await this.refreshData({
        preferredCollectionUri: collection.uri,
        preferredCardUri: cardItem.card.uri,
        statusMessage: `Removed "${cardItem.displayTitle}" from "${collection.value?.name || collection.uri}".`,
      });
    });
  }

  async handleMoveCard() {
    if (this.cardsScope !== 'collection') {
      this.setStatus('Switch to collection-scoped cards before moving a card.', 'error');
      this.render();
      return;
    }

    const sourceCollection = this.getSelectedCollection();
    const cardItem = this.getSelectedCard();
    if (!sourceCollection || !cardItem) {
      this.setStatus('Select both a source collection and a card first.', 'error');
      this.render();
      return;
    }

    const options = this.state.collections
      .filter((collection) => collection.uri !== sourceCollection.uri)
      .map((collection) => ({
        label: formatCollectionSummary(collection, this.collectionCounts.get(collection.uri) || 0),
        subtitle: collection.value?.description || collection.uri,
        searchText: `${collection.value?.name || ''} ${collection.value?.description || ''}`,
        value: collection,
      }));

    this.openPicker({
      title: `Move "${cardItem.displayTitle}" out of "${sourceCollection.value?.name || sourceCollection.uri}"`,
      emptyMessage: 'No other collections are available.',
      busyLabel: 'Moving card...',
      items: options,
      onChoose: async (choice) => {
        await moveCardBetweenCollections(
          this.session,
          this.state,
          cardItem,
          sourceCollection,
          choice.value,
        );
        await this.refreshData({
          preferredCollectionUri: choice.value.uri,
          preferredCardUri: cardItem.card.uri,
          statusMessage: `Moved "${cardItem.displayTitle}" to "${choice.value.value?.name || choice.value.uri}".`,
        });
      },
    });
  }

  openPicker({ title, emptyMessage, items, onChoose, busyLabel }) {
    if (!items.length) {
      this.setStatus(emptyMessage, 'info');
      this.render();
      return;
    }

    this.overlay = {
      type: 'picker',
      title,
      items,
      filter: '',
      index: 0,
      onChoose,
      busyLabel,
    };
    this.render();
  }

  openTextEditor({ title, text, onSave }) {
    this.overlay = {
      type: 'editor',
      title,
      lines: normalizeEditorText(text).split('\n'),
      cursorRow: 0,
      cursorCol: 0,
      scrollTop: 0,
      scrollLeft: 0,
      onSave,
    };
    this.render();
  }

  getVisiblePickerItems() {
    const picker = this.overlay;
    if (!picker || picker.type !== 'picker') {
      return [];
    }

    const query = picker.filter.trim().toLowerCase();
    const items = query
      ? picker.items.filter((item) => item.searchText.toLowerCase().includes(query))
      : picker.items;

    picker.index = clamp(picker.index, 0, Math.max(items.length - 1, 0));
    return items;
  }

  async promptLine(label, { initialValue = '' } = {}) {
    this.suspendTerminalForPrompt();
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const suffix = initialValue ? ` [${initialValue}]` : '';
      const answer = await rl.question(`${label}${suffix}: `);
      return answer;
    } finally {
      rl.close();
      this.resumeTerminalAfterPrompt();
    }
  }

  async confirm(message, defaultYes = false) {
    const answer = await this.promptLine(`${message} ${defaultYes ? '[Y/n]' : '[y/N]'}`);
    const normalized = (answer || '').trim().toLowerCase();

    if (!normalized) {
      return defaultYes;
    }

    return ['y', 'yes'].includes(normalized);
  }

  async editTextInEditor(initialText, fileName) {
    this.suspendTerminalForPrompt();

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'semble-tui-'));
    const tempFile = path.join(tempDir, fileName);
    const editor = process.env.VISUAL || process.env.EDITOR || 'vi';

    try {
      await writeFile(tempFile, initialText, 'utf8');
      const result = spawnSync(`${editor} ${shellEscape(tempFile)}`, {
        stdio: 'inherit',
        shell: true,
      });

      if (result.status !== 0) {
        throw new Error(`Editor exited with status ${result.status}.`);
      }

      return await readFile(tempFile, 'utf8');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
      this.resumeTerminalAfterPrompt();
    }
  }

  getEditorMetrics(editor) {
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    const headerLines = 3;
    const bodyHeight = Math.max(4, height - headerLines - 1);
    const gutterWidth = Math.max(String(editor.lines.length).length, 2) + 3;
    const bodyWidth = Math.max(12, width - gutterWidth);

    return {
      width,
      height,
      headerLines,
      bodyHeight,
      gutterWidth,
      bodyWidth,
    };
  }

  suspendTerminalForPrompt() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdout.write(`${ANSI.showCursor}${ANSI.reset}`);
  }

  resumeTerminalAfterPrompt() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdout.write(ANSI.hideCursor);
    this.render();
  }

  setStatus(message, level = 'info') {
    this.statusMessage = message;
    this.statusLevel = level;
  }

  render() {
    if (!this.running && !this.busyMessage) {
      return;
    }

    process.stdout.write(`${ANSI.clear}${ANSI.hideCursor}`);

    if (this.overlay?.type === 'help') {
      process.stdout.write(this.renderHelp());
      return;
    }

    if (this.overlay?.type === 'editor') {
      process.stdout.write(this.renderTextEditor());
      return;
    }

    if (this.overlay?.type === 'picker') {
      process.stdout.write(this.renderPicker());
      return;
    }

    process.stdout.write(this.renderMain());
  }

  renderMain() {
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    const leftWidth = Math.max(28, Math.floor(width * 0.36));
    const rightWidth = Math.max(24, width - leftWidth - 3);
    const bodyHeight = Math.max(6, height - 6);
    const collections = this.getVisibleCollections();
    const cards = this.getVisibleCards();
    const selectedCollection = this.getSelectedCollection();
    const selectedCard = this.getSelectedCard();

    const header = [
      stylize(`Semble TUI`, ANSI.bold),
      `handle ${this.session.config.identifier}`,
      `${this.state.collections.length} collections`,
      `${this.cardItems.length} cards`,
      this.cardsScope === 'all'
        ? 'cards: all'
        : `cards: ${selectedCollection?.value?.name || 'collection'}`,
    ].join(' | ');

    const leftTitle = `${this.focusPane === 'collections' ? '>' : ' '} Collections (${collections.length})${this.collectionFilter ? ` filter="${this.collectionFilter}"` : ''}`;
    const rightTitle = `${this.focusPane === 'cards' ? '>' : ' '} ${this.cardsScope === 'all' ? 'All cards' : 'Cards'} (${cards.length})${this.cardFilter ? ` filter="${this.cardFilter}"` : ''}`;

    const leftRows = collections.length
      ? collections.map((collection) =>
        formatCollectionSummary(collection, this.collectionCounts.get(collection.uri) || 0),
      )
      : ['(no collections)'];
    const rightRows = cards.length
      ? cards.map((card) => formatCardRow(card))
      : [this.cardsScope === 'collection' && !selectedCollection ? '(select a collection)' : '(no cards)'];

    const renderedLeft = renderScrollableList(leftRows, this.collectionIndex, bodyHeight, leftWidth, this.focusPane === 'collections');
    const renderedRight = renderScrollableList(rightRows, this.cardIndex, bodyHeight, rightWidth, this.focusPane === 'cards');

    const lines = [
      padOrTrim(header, width),
      `${stylize(padOrTrim(leftTitle, leftWidth), ANSI.bold)} | ${stylize(padOrTrim(rightTitle, rightWidth), ANSI.bold)}`,
    ];

    for (let index = 0; index < bodyHeight; index += 1) {
      const leftLine = renderedLeft[index] || ''.padEnd(leftWidth, ' ');
      const rightLine = renderedRight[index] || ''.padEnd(rightWidth, ' ');
      lines.push(`${leftLine} | ${rightLine}`);
    }

    const footerHelpLines = this.buildFooterHelpLines();
    const status = this.getStatusDescriptor();
    lines.push(padOrTrim(this.buildDetailLine(selectedCollection, selectedCard), width));
    lines.push(stylize(padOrTrim(status.text, width), status.color));
    lines.push(padOrTrim(footerHelpLines[0], width));
    lines.push(padOrTrim(footerHelpLines[1], width));

    return `${lines.join('\n')}${ANSI.reset}`;
  }

  renderHelp() {
    const lines = [
      stylize('Semble TUI Help', ANSI.bold),
      '',
      `Current context: ${this.describeCurrentContext()}`,
      '',
      'Global',
      '  Tab, h/l, Left/Right: switch panes',
      '  j/k, Up/Down: move selection',
      '  g/G, Home/End: jump to start or end',
      '  /: filter the active pane',
      '  Esc: clear the active pane filter',
      '  t: toggle the cards pane between selected-collection mode and all-cards mode',
      '  r: refresh from Semble',
      '  q: quit',
      '',
      'Collections pane',
      '  c: create a collection',
      '  e: edit the selected collection',
      '  d: delete the selected collection and its collection-link records',
      '  a: add an existing card to the selected collection',
      '  Enter or Right: move focus into the cards pane',
      '',
      'Cards pane',
      '  c: create a card, using the selected collection as the default destination if there is one',
      '  e: edit simple card fields inline',
      '  y: open the built-in YAML metadata editor and stamp a manual edit record',
      '  The TUI opens your $VISUAL or $EDITOR. If neither is set, it falls back to vi.',
      '  a: link the selected card to another collection',
      '  d: delete the card everywhere, including attached notes and collection links',
      '',
      this.cardsScope === 'collection'
        ? 'Cards pane in selected-collection mode: x removes the current collection link, and m moves the card to another collection.'
        : 'Cards pane in all-cards mode: x and m are disabled until you switch back to selected-collection mode.',
      '',
      'Press any key to return.',
    ];

    return `${lines.join('\n')}${ANSI.reset}`;
  }

  renderPicker() {
    const picker = this.overlay;
    if (!picker || picker.type !== 'picker') {
      return '';
    }

    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    const bodyHeight = Math.max(8, height - 5);
    const items = this.getVisiblePickerItems();
    const rows = items.length
      ? items.map((item) => item.subtitle ? `${item.label} | ${truncate(item.subtitle, 48)}` : item.label)
      : ['(no matches)'];
    const rendered = renderScrollableList(rows, picker.index, bodyHeight, width, true);

    const lines = [
      stylize(picker.title, ANSI.bold),
      `Type to filter. Backspace deletes. Enter selects. Esc cancels.${picker.filter ? ` Current filter: "${picker.filter}"` : ''}`,
      '',
    ];

    for (let index = 0; index < bodyHeight; index += 1) {
      lines.push(rendered[index] || ''.padEnd(width, ' '));
    }

    lines.push('');
    lines.push(items.length ? `${items.length} choice(s)` : 'No choices match the current filter.');
    return `${lines.join('\n')}${ANSI.reset}`;
  }

  renderTextEditor() {
    const editor = this.overlay;
    if (!editor || editor.type !== 'editor') {
      return '';
    }

    const metrics = this.getEditorMetrics(editor);
    ensureEditorCursorVisible(editor, metrics);

    const visibleLines = editor.lines.slice(editor.scrollTop, editor.scrollTop + metrics.bodyHeight);
    const status = this.getStatusDescriptor();
    const lines = [
      stylize(editor.title, ANSI.bold),
      padOrTrimRaw(status.text, metrics.width),
      padOrTrim('Ctrl+S save | Esc cancel | Arrows move | Enter newline | Tab inserts spaces | Backspace/Delete edit', metrics.width),
    ];

    for (let index = 0; index < metrics.bodyHeight; index += 1) {
      const lineIndex = editor.scrollTop + index;
      const rawLine = visibleLines[index] ?? '';
      const visibleText = rawLine.slice(editor.scrollLeft, editor.scrollLeft + metrics.bodyWidth);
      const prefix = `${String(lineIndex + 1).padStart(metrics.gutterWidth - 3, ' ')} | `;
      lines.push(`${prefix}${padOrTrimRaw(visibleText, metrics.bodyWidth)}`);
    }

    const cursorScreenRow = Math.min(
      metrics.headerLines + (editor.cursorRow - editor.scrollTop) + 1,
      metrics.height,
    );
    const cursorScreenCol = Math.min(
      metrics.gutterWidth + (editor.cursorCol - editor.scrollLeft) + 1,
      metrics.width,
    );

    return `${lines.join('\n')}${ANSI.showCursor}\x1b[${cursorScreenRow};${cursorScreenCol}H${ANSI.reset}`;
  }

  buildDetailLine(selectedCollection, selectedCard) {
    if (this.focusPane === 'collections') {
      if (!selectedCollection) {
        return 'Selection: no collection selected.';
      }

      const count = this.collectionCounts.get(selectedCollection.uri) || 0;
      const description = collapseWhitespace(selectedCollection.value?.description || '') || selectedCollection.uri;
      return `Selection: ${formatCollectionSummary(selectedCollection, count)} | ${truncate(description, Math.max((process.stdout.columns || 80) - 40, 20))}`;
    }

    if (!selectedCard) {
      return 'Selection: no card selected.';
    }

    const collectionNames = selectedCard.collections.map((collection) => collection.name).join(', ') || 'no collections';
    const noteSummary = selectedCard.notePreview ? `note: ${truncate(selectedCard.notePreview, 64)}` : 'no note';
    return `Selection: ${selectedCard.displayTitle} | ${selectedCard.url || 'no url'} | collections: ${truncate(collectionNames, 28)} | ${noteSummary}`;
  }

  getStatusDescriptor() {
    if (this.busyMessage) {
      return {
        text: `Status: ${this.busyMessage}`,
        color: ANSI.yellow,
      };
    }

    const color = this.statusLevel === 'error'
      ? ANSI.red
      : this.statusLevel === 'info'
        ? ANSI.cyan
        : ANSI.dim;

    return {
      text: `Status: ${this.statusMessage}`,
      color,
    };
  }

  buildFooterHelpLines() {
    const global = 'Global: Tab/h/l switch panes | j/k move | / filter active pane | Esc clear filter | t toggle cards | r refresh | ? help | q quit';

    if (this.focusPane === 'collections') {
      return [
        global,
        'Collections: c create | e edit | d delete | a add existing card to selected collection | Enter/Right focus cards',
      ];
    }

    if (this.cardsScope === 'collection') {
      return [
        global,
        'Cards(selected collection): c create | e quick edit | y YAML edit | n note | a link elsewhere | x unlink here | m move | d delete card',
      ];
    }

    return [
      global,
      'Cards(all): c create | e quick edit | y YAML edit | n note | a link to collection | d delete card | x/m disabled in all-cards mode',
    ];
  }

  describeCurrentContext() {
    if (this.focusPane === 'collections') {
      return 'collections pane focused';
    }

    return this.cardsScope === 'collection'
      ? 'cards pane focused, showing cards in the selected collection'
      : 'cards pane focused, showing all cards';
  }
}

function renderScrollableList(items, selectedIndex, height, width, isActive) {
  const safeHeight = Math.max(height, 1);
  const safeIndex = clamp(selectedIndex, 0, Math.max(items.length - 1, 0));
  const offset = getWindowOffset(items.length, safeIndex, safeHeight);
  const visibleItems = items.slice(offset, offset + safeHeight);

  return Array.from({ length: safeHeight }, (_, rowIndex) => {
    const itemIndex = offset + rowIndex;
    const item = visibleItems[rowIndex];
    if (!item) {
      return ''.padEnd(width, ' ');
    }

    const prefix = itemIndex === safeIndex ? '> ' : '  ';
    const line = padOrTrim(`${prefix}${item}`, width);

    if (itemIndex === safeIndex && isActive) {
      return stylize(line, ANSI.inverse);
    }

    if (itemIndex === safeIndex) {
      return stylize(line, ANSI.bold);
    }

    return line;
  });
}

function formatCardRow(cardItem) {
  const domain = getHost(cardItem.url);
  const noteMarker = cardItem.latestNote ? ' [note]' : '';
  const collectionMarker = cardItem.collections.length ? ` (${cardItem.collections.length}c)` : '';
  const summary = `${cardItem.displayTitle}${domain ? ` | ${domain}` : ''}${collectionMarker}${noteMarker}`;
  return summary;
}

function getWindowOffset(length, selectedIndex, height) {
  if (length <= height) {
    return 0;
  }

  const half = Math.floor(height / 2);
  return clamp(selectedIndex - half, 0, Math.max(length - height, 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function padOrTrim(value, width) {
  const clean = collapseWhitespace(String(value));
  if (clean.length >= width) {
    return clean.slice(0, width);
  }

  return clean.padEnd(width, ' ');
}

function padOrTrimRaw(value, width) {
  const text = String(value || '').replace(/\r/g, '');
  if (text.length >= width) {
    return text.slice(0, width);
  }

  return text.padEnd(width, ' ');
}

function stylize(text, code) {
  return `${code}${text}${ANSI.reset}`;
}

function isPrintableCharacter(value) {
  return typeof value === 'string' && value.length === 1 && value >= ' ' && value !== '\x7f';
}

function hasInsertableText(value) {
  return typeof value === 'string' && value.length > 0 && !/[\x00-\x08\x0B-\x1F\x7F]/.test(value);
}

function normalizeMultilineText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function normalizeEditorText(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function getEditorLine(editor) {
  return editor.lines[editor.cursorRow] ?? '';
}

function setEditorLine(editor, value) {
  editor.lines[editor.cursorRow] = value;
}

function insertTextInEditor(editor, text) {
  const current = getEditorLine(editor);
  const before = current.slice(0, editor.cursorCol);
  const after = current.slice(editor.cursorCol);
  const parts = normalizeEditorText(text).split('\n');

  if (parts.length === 1) {
    setEditorLine(editor, `${before}${parts[0]}${after}`);
    editor.cursorCol += parts[0].length;
    return;
  }

  const nextLines = [
    `${before}${parts[0]}`,
    ...parts.slice(1, -1),
    `${parts[parts.length - 1]}${after}`,
  ];

  editor.lines.splice(editor.cursorRow, 1, ...nextLines);
  editor.cursorRow += parts.length - 1;
  editor.cursorCol = parts[parts.length - 1].length;
}

function deleteBackwardInEditor(editor) {
  if (editor.cursorCol > 0) {
    const current = getEditorLine(editor);
    setEditorLine(
      editor,
      `${current.slice(0, editor.cursorCol - 1)}${current.slice(editor.cursorCol)}`,
    );
    editor.cursorCol -= 1;
    return;
  }

  if (editor.cursorRow === 0) {
    return;
  }

  const previousLine = editor.lines[editor.cursorRow - 1] ?? '';
  const currentLine = getEditorLine(editor);
  editor.lines.splice(editor.cursorRow - 1, 2, `${previousLine}${currentLine}`);
  editor.cursorRow -= 1;
  editor.cursorCol = previousLine.length;
}

function deleteForwardInEditor(editor) {
  const current = getEditorLine(editor);
  if (editor.cursorCol < current.length) {
    setEditorLine(
      editor,
      `${current.slice(0, editor.cursorCol)}${current.slice(editor.cursorCol + 1)}`,
    );
    return;
  }

  if (editor.cursorRow >= editor.lines.length - 1) {
    return;
  }

  const nextLine = editor.lines[editor.cursorRow + 1] ?? '';
  editor.lines.splice(editor.cursorRow, 2, `${current}${nextLine}`);
}

function moveEditorCursorUp(editor) {
  moveEditorCursorVertical(editor, -1);
}

function moveEditorCursorDown(editor) {
  moveEditorCursorVertical(editor, 1);
}

function moveEditorCursorVertical(editor, delta) {
  editor.cursorRow = clamp(editor.cursorRow + delta, 0, Math.max(editor.lines.length - 1, 0));
  editor.cursorCol = clamp(editor.cursorCol, 0, getEditorLine(editor).length);
}

function moveEditorCursorLeft(editor) {
  if (editor.cursorCol > 0) {
    editor.cursorCol -= 1;
    return;
  }

  if (editor.cursorRow === 0) {
    return;
  }

  editor.cursorRow -= 1;
  editor.cursorCol = getEditorLine(editor).length;
}

function moveEditorCursorRight(editor) {
  const current = getEditorLine(editor);
  if (editor.cursorCol < current.length) {
    editor.cursorCol += 1;
    return;
  }

  if (editor.cursorRow >= editor.lines.length - 1) {
    return;
  }

  editor.cursorRow += 1;
  editor.cursorCol = 0;
}

function ensureEditorCursorVisible(editor, metrics) {
  editor.scrollTop = clamp(
    editor.scrollTop,
    0,
    Math.max(editor.lines.length - metrics.bodyHeight, 0),
  );
  editor.scrollLeft = Math.max(editor.scrollLeft, 0);

  if (editor.cursorRow < editor.scrollTop) {
    editor.scrollTop = editor.cursorRow;
  } else if (editor.cursorRow >= editor.scrollTop + metrics.bodyHeight) {
    editor.scrollTop = editor.cursorRow - metrics.bodyHeight + 1;
  }

  if (editor.cursorCol < editor.scrollLeft) {
    editor.scrollLeft = editor.cursorCol;
  } else if (editor.cursorCol >= editor.scrollLeft + metrics.bodyWidth) {
    editor.scrollLeft = editor.cursorCol - metrics.bodyWidth + 1;
  }
}
