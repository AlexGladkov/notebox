import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { SlashCommand as SlashCommandType } from '../types/editor';

export interface SlashCommandOptions {
  commands: SlashCommandType[];
  onShow?: (query: string) => void;
  onHide?: () => void;
}

export interface SlashCommandStorage {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
}

export const SlashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create<SlashCommandOptions, SlashCommandStorage>({
  name: 'slashCommand',

  addOptions() {
    return {
      commands: [],
      onShow: () => {},
      onHide: () => {},
    };
  },

  addStorage() {
    return {
      active: false,
      query: '',
      range: null,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: SlashCommandPluginKey,

        state: {
          init() {
            return {
              active: false,
              query: '',
              range: null,
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
              return { active: false, query: '', range: null };
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
              return { active: false, query: '', range: null };
            }

            // Check if slash is at the start of the line or after a space
            const charBeforeSlash = textBefore.charAt(textBefore.length - match[0].length - 1);
            const isValidPosition = $pos.parentOffset - match[0].length === 0 || charBeforeSlash === ' ' || charBeforeSlash === '';

            if (!isValidPosition) {
              if (prev.active) {
                extension.options.onHide?.();
              }
              return { active: false, query: '', range: null };
            }

            const query = match[1];
            const range = {
              from: from - match[0].length,
              to: from,
            };

            if (!prev.active || prev.query !== query) {
              extension.options.onShow?.(query);
            }

            return { active: true, query, range };
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
