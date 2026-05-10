import { ref } from 'vue';
import { useStorage } from './useStorage';
import { useNotes } from './useNotes';
import type { CapturedItem, CaptureType, RelatedNote } from '../types';
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
  const { createNote, updateNote, getNoteById } = useNotes(notes);

  const isProcessing = ref(false);
  const lastError = ref<string | null>(null);

  async function getOrCreateInbox() {
    let inbox = notes.value.find(n => n.title === INBOX_TITLE && !n.parentId);

    if (!inbox) {
      try {
        inbox = await createNote(INBOX_TITLE, null);
        await updateNote(inbox.id, {
          content: INBOX_CONTENT,
          icon: '📥',
        });
      } catch (error) {
        console.error('Failed to create Inbox:', error);
        throw new Error('Не удалось создать Inbox');
      }
    }

    return inbox;
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

  async function capturePhoto(imageBase64: string, recognizedText: string): Promise<string> {
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

  async function captureWithAI(text: string, type: CaptureType = 'text'): Promise<{ inboxId: string; suggestions: RelatedNote[] }> {
    isProcessing.value = true;
    lastError.value = null;

    try {
      const inboxId = await captureText(text);
      const suggestions = await findRelatedNotes(text);

      return {
        inboxId,
        suggestions,
      };
    } catch (error) {
      console.error('Failed to capture with AI:', error);
      lastError.value = error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw error;
    } finally {
      isProcessing.value = false;
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
    captureWithAI,
    getOrCreateInbox,
    addTextToNote,
  };
}
