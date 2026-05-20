import { ref } from 'vue';
import { useStorage } from './useStorage';
import { useNotes } from './useNotes';
import type { RelatedNote, Note } from '../types';
import { aiApi } from '../api/ai';

const INBOX_TITLE = '📥 Inbox';
// Контент в формате TipTap JSON
const INBOX_CONTENT = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Временное хранилище для быстро захваченных заметок.',
        },
      ],
    },
  ],
});

export function useQuickCapture() {
  const { notes } = useStorage();
  const { createNote, updateNote, getNoteById } = useNotes();

  const isProcessing = ref(false);
  const lastError = ref<string | null>(null);

  async function getOrCreateInbox(): Promise<Note> {
    // ВСЕГДА ищем в IndexedDB (источник истины), не в notes.value
    // т.к. notes.value может быть не синхронизирован или устаревшим
    const { offlineStore } = await import('../services/offline/offlineStore');
    const allNotes = await offlineStore.loadFromCache();

    // Ищем все Inbox заметки
    const inboxNotes = allNotes.filter(n => n.title === INBOX_TITLE && !n.parentId);

    if (inboxNotes.length > 0) {
      // Если найдено несколько - берем самую свежую (по updatedAt)
      inboxNotes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const inbox = inboxNotes[0];

      // Добавляем в notes.value если его там нет
      if (!notes.value.find(n => n.id === inbox.id)) {
        notes.value.push(inbox);
      }

      return inbox;
    }

    // Inbox не существует - создаем новый
    try {
      const inbox = await createNote(INBOX_TITLE, null);
      await updateNote(inbox.id, {
        content: INBOX_CONTENT,
        icon: '📥',
      });
      return inbox;
    } catch (error) {
      console.error('Failed to create Inbox:', error);
      throw new Error('Не удалось создать Inbox');
    }
  }

  async function addTextToNote(text: string, noteId: string): Promise<void> {
    const note = getNoteById(noteId);
    if (!note) {
      throw new Error('Заметка не найдена');
    }

    const timestamp = new Date().toLocaleString('ru-RU');

    // Парсим существующий контент (JSON формат TipTap)
    let currentDoc;
    try {
      currentDoc = note.content && note.content.trim()
        ? JSON.parse(note.content)
        : { type: 'doc', content: [] };
    } catch (error) {
      // Миграция: старый формат (plain text) -> JSON
      console.warn('Migrating note from plain text to JSON format');
      const oldContent = note.content?.trim() || '';
      currentDoc = {
        type: 'doc',
        content: oldContent
          ? [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: oldContent }],
              },
            ]
          : [],
      };
    }

    // Добавляем горизонтальную линию (separator)
    currentDoc.content.push({ type: 'horizontalRule' });

    // Добавляем timestamp (жирным)
    currentDoc.content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: timestamp,
          marks: [{ type: 'bold' }],
        },
      ],
    });

    // Добавляем захваченный текст
    currentDoc.content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: text.trim(),
        },
      ],
    });

    // Сохраняем обновлённый контент
    await updateNote(noteId, {
      content: JSON.stringify(currentDoc),
    });
  }

  async function captureText(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('Текст не может быть пустым');
    }

    isProcessing.value = true;
    lastError.value = null;

    try {
      const inbox = await getOrCreateInbox();
      await addTextToNote(text, inbox.id);
      return inbox.id;
    } catch (error) {
      console.error('Failed to capture text:', error);
      lastError.value = error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw error;
    } finally {
      isProcessing.value = false;
    }
  }

  async function captureVoice(transcript: string): Promise<string> {
    return captureText(transcript);
  }

  async function capturePhoto(_imageBase64: string, recognizedText: string): Promise<string> {
    if (!recognizedText || recognizedText.trim().length === 0) {
      throw new Error('Не удалось распознать текст на изображении');
    }

    return captureText(recognizedText);
  }

  async function findRelatedNotes(text: string): Promise<RelatedNote[]> {
    try {
      const noteIds = notes.value.map(n => n.id);
      return await aiApi.findRelatedNotes(text, noteIds);
    } catch (error) {
      console.error('Failed to find related notes:', error);
      return [];
    }
  }

  async function moveToNote(capturedText: string, targetNoteId: string): Promise<void> {
    try {
      await addTextToNote(capturedText, targetNoteId);
    } catch (error) {
      console.error('Failed to move to note:', error);
      throw error;
    }
  }

  return {
    isProcessing,
    lastError,
    captureText,
    captureVoice,
    capturePhoto,
    findRelatedNotes,
    moveToNote,
    getOrCreateInbox,
    addTextToNote,
  };
}
