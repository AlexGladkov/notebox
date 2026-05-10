import { computed, type Ref } from 'vue';
import type { Note } from '../types';
import { extractNoteLinks, extractLinkContext } from '../utils/parseNoteLinks';

export interface Backlink {
  note: Note;
  context: string;
}

export interface UseBacklinksReturn {
  backlinks: Ref<Backlink[]>;
}

/**
 * Composable для вычисления обратных ссылок (backlinks) для заметки
 *
 * Находит все заметки, которые ссылаются на текущую заметку через:
 * - HTML-ссылки формата <a href="/notes/{noteId}">
 * - Wiki-ссылки формата [[название]]
 *
 * @param currentNoteId - ID текущей заметки
 * @param allNotes - Все заметки в системе
 * @returns Список обратных ссылок с контекстом
 */
export function useBacklinks(
  currentNoteId: Ref<string | null | undefined>,
  allNotes: Ref<Note[]>
): UseBacklinksReturn {
  const backlinks = computed<Backlink[]>(() => {
    if (!currentNoteId.value) return [];

    const targetId = currentNoteId.value;

    return allNotes.value
      .filter(note => {
        // Не включаем саму заметку
        if (note.id === targetId) return false;

        // Проверяем, есть ли ссылка на целевую заметку
        const links = extractNoteLinks(note.content);
        return links.includes(targetId);
      })
      .map(note => ({
        note,
        context: extractLinkContext(note.content, targetId, 150),
      }))
      .sort((a, b) => {
        // Сортируем по дате обновления (новые сверху)
        return b.note.updatedAt - a.note.updatedAt;
      });
  });

  return { backlinks };
}
