import { ref, type Ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { Note } from '../../../types';
import { notesApi } from '../../../api/notes';

interface WikiLinksEmits {
  noteCreated: (noteId: string) => void;
  navigateToNote: (noteId: string) => void;
}

export function useWikiLinks(editor: Ref<Editor | undefined>, emit: WikiLinksEmits) {
  const wikiLinkMenuVisible = ref(false);
  const wikiLinkQuery = ref('');
  const wikiLinkRange = ref<{ from: number; to: number } | null>(null);

  const handleWikiLinkSelect = (note: Note) => {
    if (!editor.value || !wikiLinkRange.value) return;

    const { from, to } = wikiLinkRange.value;

    editor.value
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent({
        type: 'wikiLink',
        attrs: {
          noteId: note.id,
          title: note.title || 'Без названия',
          broken: false,
        },
      })
      .insertContent(' ')
      .run();

    wikiLinkMenuVisible.value = false;
    wikiLinkQuery.value = '';
    wikiLinkRange.value = null;
  };

  const handleWikiLinkCreate = async (title: string) => {
    if (!editor.value || !wikiLinkRange.value) return;

    try {
      const newNote = await notesApi.create({
        title,
        content: '',
        parentId: null,
      });

      const { from, to } = wikiLinkRange.value;

      editor.value
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: 'wikiLink',
          attrs: {
            noteId: newNote.id,
            title: newNote.title,
            broken: false,
          },
        })
        .insertContent(' ')
        .run();

      wikiLinkMenuVisible.value = false;
      wikiLinkQuery.value = '';
      wikiLinkRange.value = null;

      emit.noteCreated(newNote.id);
    } catch (error) {
      console.error('Failed to create note from wiki-link:', error);
    }
  };

  return {
    wikiLinkMenuVisible,
    wikiLinkQuery,
    wikiLinkRange,
    handleWikiLinkSelect,
    handleWikiLinkCreate,
  };
}
