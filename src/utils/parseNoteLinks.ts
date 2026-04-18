/**
 * Извлекает ID страниц из HTML-контента заметки
 * Ищет ссылки формата <a href="/notes/{noteId}">
 */
export function extractNoteLinks(content: string): string[] {
  if (!content) return [];

  const linkPattern = /href="\/notes\/([a-f0-9-]+)"/g;
  const links: string[] = [];
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const noteId = match[1];
    if (!links.includes(noteId)) {
      links.push(noteId);
    }
  }

  return links;
}
