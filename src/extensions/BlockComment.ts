import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface BlockCommentOptions {
  HTMLAttributes: Record<string, any>;
}

export interface BlockCommentStorage {
  comments: Map<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockComment: {
      setBlockComment: (comment: string) => ReturnType;
      removeBlockComment: () => ReturnType;
    };
  }
}

export const BlockComment = Extension.create<BlockCommentOptions, BlockCommentStorage>({
  name: 'blockComment',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addStorage() {
    return {
      comments: new Map(),
    };
  },

  addCommands() {
    return {
      setBlockComment:
        (comment: string) =>
        ({ tr, state, dispatch }) => {
          if (dispatch) {
            const { from } = state.selection;
            const $pos = tr.doc.resolve(from);
            const blockPos = $pos.before($pos.depth);

            this.storage.comments.set(blockPos.toString(), comment);
          }
          return true;
        },
      removeBlockComment:
        () =>
        ({ tr, state, dispatch }) => {
          if (dispatch) {
            const { from } = state.selection;
            const $pos = tr.doc.resolve(from);
            const blockPos = $pos.before($pos.depth);

            this.storage.comments.delete(blockPos.toString());
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockComment'),
        props: {
          decorations: () => {
            return null;
          },
        },
      }),
    ];
  },
});
