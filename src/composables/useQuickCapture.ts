import { ref } from 'vue';
import { useStorage } from './useStorage';
import { useNotes } from './useNotes';
import type { CapturedItem, CaptureType, RelatedNote } from '../types';
import { aiApi } from '../api/ai';

const INBOX_TITLE = '📥 Inbox';
const INBOX_CONTENT = 'Временное хранилище для быстро захваченных заметок.';

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

  async function captureText(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('Текст не может быть пустым');
    }

    isProcessing.value = true;
    lastError.value = null;

    try {
      const inbox = await getOrCreateInbox();
      const timestamp = new Date().toLocaleString('ru-RU');
      const newContent = `${inbox.content}\n\n---\n\n**${timestamp}**\n\n${text.trim()}`;

      await updateNote(inbox.id, {
        content: newContent,
      });

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
    const targetNote = getNoteById(targetNoteId);
    if (!targetNote) {
      throw new Error('Целевая заметка не найдена');
    }

    try {
      const timestamp = new Date().toLocaleString('ru-RU');
      const newContent = `${targetNote.content}\n\n---\n\n**${timestamp}**\n\n${capturedText.trim()}`;

      await updateNote(targetNoteId, {
        content: newContent,
      });
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
  };
}
