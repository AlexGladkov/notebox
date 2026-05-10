import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Note } from '../types';

export interface WikiLinkOptions {
  notes: Note[];
  onShowSuggestions?: (query: string, range: { from: number; to: number }) => void;
  onHideSuggestions?: () => void;
  onNavigate?: (noteId: string) => void;
}

export interface WikiLinkStorage {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
}

export const WikiLinkPluginKey = new PluginKey('wikiLink');

/**
 * TipTap расширение для wiki-ссылок в формате [[название]]
 */
export const WikiLink = Node.create<WikiLinkOptions, WikiLinkStorage>({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      notes: [],
      onShowSuggestions: () => {},
      onHideSuggestions: () => {},
      onNavigate: () => {},
    };
  },

  addStorage() {
    return {
      active: false,
      query: '',
      range: null,
    };
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-id'),
        renderHTML: attributes => {
          if (!attributes.noteId) {
            return {};
          }
          return {
            'data-note-id': attributes.noteId,
          };
        },
      },
      title: {
        default: '',
        parseHTML: element => element.textContent,
        renderHTML: attributes => {
          return {};
        },
      },
      broken: {
        default: false,
        parseHTML: element => element.classList.contains('wiki-link-broken'),
        renderHTML: attributes => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const isBroken = !HTMLAttributes.noteId || HTMLAttributes.broken;
    const classes = ['wiki-link'];
    if (isBroken) {
      classes.push('wiki-link-broken');
    }

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-wiki-link': '',
        class: classes.join(' '),
      }),
      node.attrs.title || 'Без названия',
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.storage.active) {
          // Будет обработано в компоненте suggestion
          return true;
        }
        return false;
      },
      ArrowDown: () => {
        if (this.storage.active) {
          return true;
        }
        return false;
      },
      ArrowUp: () => {
        if (this.storage.active) {
          return true;
        }
        return false;
      },
      Escape: () => {
        if (this.storage.active) {
          this.options.onHideSuggestions?.();
          return true;
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    const updateState = (state: Partial<WikiLinkStorage>): WikiLinkStorage => {
      const newState: WikiLinkStorage = {
        active: state.active ?? false,
        query: state.query ?? '',
        range: state.range ?? null,
      };

      extension.storage.active = newState.active;
      extension.storage.query = newState.query;
      extension.storage.range = newState.range;

      return newState;
    };

    return [
      new Plugin({
        key: WikiLinkPluginKey,

        state: {
          init() {
            return {
              active: false,
              query: '',
              range: null,
            };
          },

          apply(tr, prev) {
            const meta = tr.getMeta(WikiLinkPluginKey);

            if (meta) {
              return meta;
            }

            const { doc, selection } = tr;
            const { from, to } = selection;

            if (from !== to) {
              if (prev.active) {
                extension.options.onHideSuggestions?.();
              }
              return updateState({ active: false, query: '', range: null });
            }

            const $pos = doc.resolve(from);

            // Получаем текст до курсора (до 50 символов)
            const textBefore = $pos.parent.textBetween(
              Math.max(0, $pos.parentOffset - 50),
              $pos.parentOffset,
              null,
              '￼'
            );

            // Проверяем наличие открывающих [[ и отсутствие закрывающих ]]
            const match = textBefore.match(/\[\[([^\]]*?)$/);

            if (!match) {
              if (prev.active) {
                extension.options.onHideSuggestions?.();
              }
              return updateState({ active: false, query: '', range: null });
            }

            const query = match[1];
            const range = {
              from: from - match[0].length,
              to: from,
            };

            if (!prev.active || prev.query !== query) {
              extension.options.onShowSuggestions?.(query, range);
            }

            return updateState({
              active: true,
              query,
              range,
            });
          },
        },

        props: {
          decorations(state) {
            const pluginState = WikiLinkPluginKey.getState(state);

            if (!pluginState?.active || !pluginState.range) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(state.doc, [
              Decoration.inline(pluginState.range.from, pluginState.range.to, {
                class: 'wiki-link-input-active',
              }),
            ]);
          },

          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const wikiLink = target.closest('[data-wiki-link]');

            if (wikiLink) {
              const noteId = wikiLink.getAttribute('data-note-id');
              if (noteId) {
                event.preventDefault();
                event.stopPropagation();
                extension.options.onNavigate?.(noteId);
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
