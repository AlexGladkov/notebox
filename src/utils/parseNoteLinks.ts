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

  // Ищем ссылку на целевую заметку
  const wikiPattern = new RegExp(`data-note-id="${targetNoteId}"[^>]*>([^<]+)</span>`, 'g');
  const htmlPattern = new RegExp(`href="/notes/${targetNoteId}"[^>]*>([^<]+)</a>`, 'g');

  let match = wikiPattern.exec(content) || htmlPattern.exec(content);
  if (!match) return '';

  const linkPosition = match.index;

  // Извлекаем текст без HTML-тегов
  const textContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Находим позицию ссылки в текстовом контенте (примерно)
  const beforeContext = textContent.slice(Math.max(0, linkPosition - contextLength), linkPosition);
  const afterContext = textContent.slice(linkPosition, linkPosition + contextLength);

  return (beforeContext + afterContext).trim();
}
