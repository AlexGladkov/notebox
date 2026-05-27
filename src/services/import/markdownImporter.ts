import { marked } from 'marked';
import JSZip from 'jszip';
import type { Note } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export interface ImportFile {
  path: string;
  name: string;
  content: string;
  isDirectory: boolean;
}

export interface ImportPreview {
  files: ImportFilePreview[];
  totalFiles: number;
  hasWikiLinks: boolean;
}

export interface ImportFilePreview {
  path: string;
  name: string;
  title: string;
  contentPreview: string;
  wikiLinks: string[];
  selected: boolean;
}

export interface ImportResult {
  createdNotes: Note[];
  errors: Array<{ file: string; error: string }>;
}

/**
 * Извлекает wiki-ссылки [[название]] из текста
 */
function extractWikiLinks(text: string): string[] {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = wikiLinkRegex.exec(text)) !== null) {
    links.push(match[1]);
  }

  return links;
}

/**
 * Конвертирует wiki-ссылки в HTML-ссылки для TipTap
 */
function convertWikiLinks(text: string, noteIdMap: Map<string, string>): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, linkText) => {
    const noteId = noteIdMap.get(linkText);
    if (noteId) {
      return `<wiki-link data-note-id="${noteId}">${linkText}</wiki-link>`;
    }
    // Если заметка еще не создана, оставляем как есть для последующей обработки
    return `<wiki-link data-note-title="${linkText}">${linkText}</wiki-link>`;
  });
}

/**
 * Конвертирует Markdown в HTML
 */
async function markdownToHtml(markdown: string): Promise<string> {
  // Настраиваем marked для поддержки GFM (GitHub Flavored Markdown)
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  return await marked.parse(markdown);
}

/**
 * Извлекает заголовок из имени файла (убирает .md и нормализует)
 */
function extractTitle(filename: string): string {
  return filename
    .replace(/\.md$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

/**
 * Создает структуру папок из пути
 */
function parsePath(path: string): { folders: string[]; filename: string } {
  const parts = path.split('/').filter(p => p.length > 0);
  const filename = parts.pop() || '';
  return { folders: parts, filename };
}

/**
 * Читает содержимое ZIP-архива
 */
export async function readZipFile(file: File): Promise<ImportFile[]> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  const files: ImportFile[] = [];

  for (const [path, zipEntry] of Object.entries(zipContent.files)) {
    // Пропускаем служебные файлы и папки
    if (path.startsWith('__MACOSX') || path.startsWith('.')) {
      continue;
    }

    if (!zipEntry.dir && path.toLowerCase().endsWith('.md')) {
      const content = await zipEntry.async('text');
      const { filename } = parsePath(path);

      files.push({
        path,
        name: filename,
        content,
        isDirectory: false,
      });
    }
  }

  return files;
}

/**
 * Читает один Markdown файл
 */
export async function readMarkdownFile(file: File): Promise<ImportFile> {
  const content = await file.text();

  return {
    path: file.name,
    name: file.name,
    content,
    isDirectory: false,
  };
}

/**
 * Создает превью для импорта
 */
export async function createImportPreview(files: ImportFile[]): Promise<ImportPreview> {
  const previews: ImportFilePreview[] = [];
  let hasWikiLinks = false;

  for (const file of files) {
    const title = extractTitle(file.name);
    const wikiLinks = extractWikiLinks(file.content);

    if (wikiLinks.length > 0) {
      hasWikiLinks = true;
    }

    // Создаем превью контента (первые 200 символов)
    const contentPreview = file.content
      .replace(/[#*_\[\]]/g, '') // Убираем Markdown символы
      .substring(0, 200)
      .trim();

    previews.push({
      path: file.path,
      name: file.name,
      title,
      contentPreview: contentPreview + (file.content.length > 200 ? '...' : ''),
      wikiLinks,
      selected: true, // По умолчанию выбраны все файлы
    });
  }

  return {
    files: previews,
    totalFiles: files.length,
    hasWikiLinks,
  };
}

/**
 * Импортирует выбранные файлы и создает заметки
 */
export async function importFiles(
  files: ImportFile[],
  selectedPaths: Set<string>,
  parentId: string | null,
  createNoteFn: (data: {
    title: string;
    content: string;
    parentId?: string | null;
    icon?: string | null;
  }) => Promise<Note>
): Promise<ImportResult> {
  const result: ImportResult = {
    createdNotes: [],
    errors: [],
  };

  // Сначала создаем структуру папок и собираем маппинг путей
  const pathToNoteId = new Map<string, string>();
  const titleToNoteId = new Map<string, string>();

  // Сортируем файлы по глубине вложенности (сначала корневые)
  const sortedFiles = files
    .filter(f => selectedPaths.has(f.path))
    .sort((a, b) => {
      const aDepth = a.path.split('/').length;
      const bDepth = b.path.split('/').length;
      return aDepth - bDepth;
    });

  // Первый проход: создаем все заметки без обработки wiki-ссылок
  for (const file of sortedFiles) {
    try {
      const { folders, filename } = parsePath(file.path);
      const title = extractTitle(filename);

      // Определяем родительскую папку
      let currentParentId = parentId;

      // Создаем папки по пути (если есть)
      for (const folder of folders) {
        const folderPath = folders.slice(0, folders.indexOf(folder) + 1).join('/');

        if (!pathToNoteId.has(folderPath)) {
          // Создаем папку
          const folderNote = await createNoteFn({
            title: folder,
            content: '',
            parentId: currentParentId,
            icon: '📁',
          });

          pathToNoteId.set(folderPath, folderNote.id);
          titleToNoteId.set(folder, folderNote.id);
          result.createdNotes.push(folderNote);
          currentParentId = folderNote.id;
        } else {
          currentParentId = pathToNoteId.get(folderPath)!;
        }
      }

      // Сначала конвертируем Markdown в HTML
      let html = await markdownToHtml(file.content);

      // Создаем заметку с базовым контентом
      const note = await createNoteFn({
        title,
        content: html,
        parentId: currentParentId,
        icon: '📄',
      });

      pathToNoteId.set(file.path, note.id);
      titleToNoteId.set(title, note.id);

      // Сохраняем оригинальный контент для второго прохода
      (note as any)._originalContent = file.content;

      result.createdNotes.push(note);
    } catch (error) {
      console.error(`Failed to import ${file.path}:`, error);
      result.errors.push({
        file: file.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Второй проход: обрабатываем wiki-ссылки в уже созданных заметках
  for (const note of result.createdNotes) {
    const originalContent = (note as any)._originalContent;
    if (!originalContent) continue; // Пропускаем папки

    const wikiLinks = extractWikiLinks(originalContent);
    if (wikiLinks.length > 0) {
      try {
        // Заменяем wiki-ссылки на HTML-ссылки с ID заметок
        let contentWithLinks = convertWikiLinks(originalContent, titleToNoteId);

        // Конвертируем обновленный Markdown в HTML
        const htmlWithLinks = await markdownToHtml(contentWithLinks);

        // Обновляем контент заметки
        note.content = htmlWithLinks;
      } catch (error) {
        console.error(`Failed to process wiki links in note ${note.title}:`, error);
      }
    }

    // Удаляем временное поле
    delete (note as any)._originalContent;
  }

  return result;
}
