import type { SearchMatch } from '../types';

/**
 * Подсвечивает найденное совпадение в сниппете
 * @param snippet - объект сниппета с позициями подсветки
 * @param query - поисковый запрос (не используется, оставлен для совместимости)
 * @returns HTML-строка с подсвеченным совпадением
 */
export function highlightSnippet(snippet: SearchMatch, query?: string): string {
  const text = snippet.text;
  const { highlightStart, highlightEnd } = snippet;

  const before = escapeHtml(text.slice(0, highlightStart));
  const match = escapeHtml(text.slice(highlightStart, highlightEnd));
  const after = escapeHtml(text.slice(highlightEnd));

  return `${before}<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">${match}</mark>${after}`;
}

/**
 * Экранирует HTML-символы для безопасного отображения
 * @param text - исходный текст
 * @returns экранированный текст
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
