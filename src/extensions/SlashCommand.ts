import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { SlashCommand as SlashCommandType } from '../types/editor';

export interface SlashCommandOptions {
  commands: SlashCommandType[];
  onShow?: (query: string) => void;
  onHide?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelectCurrent?: () => void;
}

export interface SlashCommandStorage {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
  selectedIndex: number;
}

export const SlashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create<SlashCommandOptions, SlashCommandStorage>({
  name: 'slashCommand',

  addOptions() {
    return {
      commands: [],
      onShow: () => {},
      onHide: () => {},
      onNavigateUp: () => {},
      onNavigateDown: () => {},
      onSelectCurrent: () => {},
    };
  },

  addStorage() {
    return {
      active: false,
      query: '',
      range: null,
      selectedIndex: 0,
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.storage.active) {
          this.options.onSelectCurrent?.();
          return true; // prevent default behavior
        }
        return false;
      },
      ArrowDown: () => {
        if (this.storage.active) {
          this.options.onNavigateDown?.();
          return true;
        }
        return false;
      },
      ArrowUp: () => {
        if (this.storage.active) {
          this.options.onNavigateUp?.();
          return true;
        }
        return false;
      },
      Escape: () => {
        if (this.storage.active) {
          this.options.onHide?.();
          return true;
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    // Helper function to update both plugin state and extension storage
    const updateState = (state: Partial<SlashCommandStorage>): SlashCommandStorage => {
      const newState: SlashCommandStorage = {
        active: state.active ?? false,
        query: state.query ?? '',
        range: state.range ?? null,
        selectedIndex: state.selectedIndex ?? 0,
      };

      // Sync extension storage
      extension.storage.active = newState.active;
      extension.storage.query = newState.query;
      extension.storage.range = newState.range;
      extension.storage.selectedIndex = newState.selectedIndex;

      return newState;
    };

    return [
      new Plugin({
        key: SlashCommandPluginKey,

        state: {
          init() {
            return {
              active: false,
              query: '',
              range: null,
              selectedIndex: 0,
            };
          },

          apply(tr, prev) {
            const meta = tr.getMeta(SlashCommandPluginKey);

            if (meta) {
              return meta;
            }

            const { doc, selection } = tr;
            const { from, to } = selection;

            if (from !== to) {
              return updateState({ active: false, query: '', range: null, selectedIndex: 0 });
            }

            const $pos = doc.resolve(from);
            const textBefore = $pos.parent.textBetween(
              Math.max(0, $pos.parentOffset - 20),
              $pos.parentOffset,
              null,
              '\ufffc'
            );

            const match = textBefore.match(/\/([a-zA-Zа-яА-Я0-9]*)$/);

            if (!match) {
              if (prev.active) {
                extension.options.onHide?.();
              }
              return updateState({ active: false, query: '', range: null, selectedIndex: 0 });
            }

            // Check if slash is at the start of the line or after a space
            const charBeforeSlash = textBefore.charAt(textBefore.length - match[0].length - 1);
            const isValidPosition = $pos.parentOffset - match[0].length === 0 || charBeforeSlash === ' ' || charBeforeSlash === '';

            if (!isValidPosition) {
              if (prev.active) {
                extension.options.onHide?.();
              }
              return updateState({ active: false, query: '', range: null, selectedIndex: 0 });
            }

            const query = match[1];
            const range = {
              from: from - match[0].length,
              to: from,
            };

            if (!prev.active || prev.query !== query) {
              extension.options.onShow?.(query);
            }

            return updateState({
              active: true,
              query,
              range,
              selectedIndex: prev.query !== query ? 0 : prev.selectedIndex,
            });
          },
        },

        props: {
          decorations(state) {
            const pluginState = SlashCommandPluginKey.getState(state);

            if (!pluginState?.active || !pluginState.range) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(state.doc, [
              Decoration.inline(pluginState.range.from, pluginState.range.to, {
                class: 'slash-command-active',
              }),
            ]);
          },
        },
      }),
    ];
  },
});
