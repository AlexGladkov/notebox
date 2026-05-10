/**
 * Извлекает ID страниц из HTML-контента заметки
 * Поддерживает два формата:
 * 1. HTML-ссылки: <a href="/notes/{noteId}">
 * 2. Wiki-ссылки: data-note-id="{noteId}"
 */
export function extractNoteLinks(content: string | null | undefined): string[] {
  if (!content || typeof content !== 'string') return [];

  const linkSet = new Set<string>();
  let match;

  // Существующий HTML-формат: href="/notes/{noteId}"
  const htmlPattern = /href="\/notes\/([a-f0-9-]+)"/g;
  while ((match = htmlPattern.exec(content)) !== null) {
    linkSet.add(match[1]);
  }

  // Wiki-формат: data-note-id="{noteId}"
  const wikiPattern = /data-note-id="([a-f0-9-]+)"/g;
  while ((match = wikiPattern.exec(content)) !== null) {
    linkSet.add(match[1]);
  }

  return Array.from(linkSet);
}

/**
 * Извлекает контекст вокруг ссылки на заметку
 * Используется для отображения превью в backlinks
 */
export function extractLinkContext(
  content: string | null | undefined,
  targetNoteId: string,
  contextLength: number = 100
): string {
  if (!content || typeof content !== 'string') return '';

  // Ищем ссылку на целевую заметку и извлекаем текст ссылки
  const wikiPattern = new RegExp(`data-note-id="${targetNoteId}"[^>]*>([^<]+)</span>`);
  const htmlPattern = new RegExp(`href="/notes/${targetNoteId}"[^>]*>([^<]+)</a>`);

  const wikiMatch = wikiPattern.exec(content);
  const htmlMatch = htmlPattern.exec(content);
  const match = wikiMatch || htmlMatch;

  if (!match || !match[1]) return '';

  const linkText = match[1];

  // Извлекаем текст без HTML-тегов
  const textContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Находим позицию текста ссылки в очищенном контенте
  const linkTextPosition = textContent.indexOf(linkText);
  if (linkTextPosition === -1) return linkText;

  // Извлекаем контекст вокруг ссылки
  const start = Math.max(0, linkTextPosition - contextLength);
  const end = Math.min(textContent.length, linkTextPosition + linkText.length + contextLength);

  let context = textContent.slice(start, end).trim();

  // Добавляем многоточие если контекст обрезан
  if (start > 0) context = '...' + context;
  if (end < textContent.length) context = context + '...';

  return context;
}
