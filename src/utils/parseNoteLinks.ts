/**
 * Извлекает ID страниц из HTML-контента заметки
 * Ищет ссылки формата <a href="/notes/{noteId}">
 */
export function extractNoteLinks(content: string | null | undefined): string[] {
  if (!content || typeof content !== 'string') return [];

  const linkPattern = /href="\/notes\/([a-f0-9-]+)"/g;
  const linkSet = new Set<string>();
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const noteId = match[1];
    linkSet.add(noteId);
  }

  return Array.from(linkSet);
}
