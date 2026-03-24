import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import DatabaseBlock from '../components/BlockEditor/DatabaseBlock.vue';

export interface DatabaseOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    database: {
      setDatabase: (attributes: { databaseId: string }) => ReturnType;
    };
  }
}

export const Database = Node.create<DatabaseOptions>({
  name: 'database',

  group: 'block',

  atom: true, // not directly editable

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      databaseId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-database-id'),
        renderHTML: (attributes) => {
          if (!attributes.databaseId) {
            return {};
          }
          return {
            'data-database-id': attributes.databaseId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-database]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-database': '',
      }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(DatabaseBlock);
  },

  addCommands() {
    return {
      setDatabase:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
