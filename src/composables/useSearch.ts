import { ref, watch, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotesStore } from '../stores/notesStore';
import type { Note, SearchResult, SearchMatch } from '../types';

/**
 * Создает debounced версию функции
 */
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: any[]) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

/**
 * Извлекает сниппет текста с контекстом вокруг совпадения
 * @param text - исходный текст
 * @param query - поисковый запрос
 * @param contextLength - длина контекста до и после совпадения
 * @returns объект сниппета или null, если совпадений нет
 */
function extractSnippet(text: string, query: string, contextLength = 50): SearchMatch | null {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) return null;

  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + query.length + contextLength);

  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet += '...';

  const highlightStart = start > 0 ? matchIndex - start + 3 : matchIndex;

  return {
    text: snippet,
    highlightStart,
    highlightEnd: highlightStart + query.length,
    matchType: 'content',
  };
}

/**
 * Вычисляет релевантность заметки по отношению к поисковому запросу
 * Алгоритм ранжирования:
 * 1. Точное совпадение в заголовке - наивысший приоритет (score: 100)
 * 2. Частичное совпадение в заголовке - высокий приоритет (score: 50)
 * 3. Совпадение в содержимом - базовый приоритет (score: 10)
 * 4. Бонус за количество совпадений - +5 за каждое дополнительное совпадение
 * 5. Бонус за позицию - +10 если совпадение в начале текста
 */
function calculateRelevanceScore(note: Note, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTitle = note.title.toLowerCase();
  const lowerContent = (note.content || '').toLowerCase();

  let score = 0;

  // Совпадение в заголовке
  if (lowerTitle === lowerQuery) {
    score += 100; // Точное совпадение
  } else if (lowerTitle.includes(lowerQuery)) {
    score += 50;
    if (lowerTitle.startsWith(lowerQuery)) score += 10; // В начале
  }

  // Совпадение в содержимом
  if (lowerContent.includes(lowerQuery)) {
    score += 10;
    // Бонус за количество совпадений (до 5)
    // Используем split для подсчета - быстрее чем RegExp
    const matches = lowerContent.split(lowerQuery).length - 1;
    score += Math.min(matches, 5) * 5;
  }

  return score;
}

/**
 * Composable для полнотекстового поиска с ранжированием и сниппетами
 */
export function useSearch(searchQuery: Ref<string>) {
  const notesStore = useNotesStore();
  const { notes } = storeToRefs(notesStore);

  const searchResults = ref<SearchResult[]>([]);
  const isSearching = ref(false);

  /**
   * Выполняет поиск с ранжированием и генерацией сниппетов
   */
  const performSearchImpl = () => {
    const query = searchQuery.value.trim();

    if (!query) {
      searchResults.value = [];
      isSearching.value = false;
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Фильтрация и ранжирование
    for (const note of notes.value) {
      const titleMatch = note.title.toLowerCase().includes(lowerQuery);
      const contentMatch = (note.content || '').toLowerCase().includes(lowerQuery);

      if (!titleMatch && !contentMatch) continue;

      const score = calculateRelevanceScore(note, query);

      // Определяем тип совпадения
      let matchedIn: 'title' | 'content' | 'both';
      if (titleMatch && contentMatch) {
        matchedIn = 'both';
      } else if (titleMatch) {
        matchedIn = 'title';
      } else {
        matchedIn = 'content';
      }

      // Генерируем сниппет (только для совпадений в содержимом)
      let snippet: SearchMatch | null = null;
      if (contentMatch && note.content) {
        snippet = extractSnippet(note.content, query);
      }

      results.push({
        note,
        score,
        snippet,
        matchedIn,
      });
    }

    // Сортируем по релевантности (убывание score)
    results.sort((a, b) => b.score - a.score);

    // Ограничиваем топ-50 результатов для оптимизации
    searchResults.value = results.slice(0, 50);
    isSearching.value = false;
  };

  // Создаем debounced версию функции поиска (300ms)
  const performSearch = debounce(performSearchImpl, 300);

  // Отслеживаем изменения поискового запроса
  watch(searchQuery, () => {
    if (searchQuery.value.trim()) {
      isSearching.value = true;
      performSearch();
    } else {
      searchResults.value = [];
      isSearching.value = false;
    }
  });

  return {
    searchResults,
    isSearching,
  };
}
