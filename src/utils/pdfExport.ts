import html2pdf from 'html2pdf.js';
import type { Tag } from '../types';

export interface PdfExportOptions {
  title: string;
  content: string; // TipTap JSON
  tags?: Tag[];
  updatedAt: number;
}

/**
 * Транслитерация кириллицы в латиницу для имени файла
 */
export function transliterate(text: string): string {
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return text
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/[/\\:*?"<>|]/g, '') // Удаляем недопустимые символы
    .substring(0, 100) // Ограничиваем длину
    .trim();
}

/**
 * Конвертирует TipTap JSON в HTML для PDF
 */
export function convertTipTapToHtml(jsonString: string): string {
  try {
    const doc = JSON.parse(jsonString);
    return renderNode(doc);
  } catch (e) {
    console.error('Error parsing TipTap JSON:', e);
    return '<p>Ошибка при конвертации контента</p>';
  }
}

function renderNode(node: any): string {
  if (!node) return '';

  // Текстовый узел
  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');

    // Применяем метки форматирования
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `<strong>${text}</strong>`;
            break;
          case 'italic':
            text = `<em>${text}</em>`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'strike':
            text = `<s>${text}</s>`;
            break;
          case 'code':
            text = `<code class="inline-code">${text}</code>`;
            break;
          case 'highlight':
            const color = mark.attrs?.color || '#ffeb3b';
            text = `<mark style="background-color: ${color};">${text}</mark>`;
            break;
          case 'link':
            const href = mark.attrs?.href || '#';
            text = `<a href="${href}">${text}</a> (${href})`;
            break;
        }
      }
    }

    return text;
  }

  const content = node.content?.map(renderNode).join('') || '';

  // Блочные элементы
  switch (node.type) {
    case 'doc':
      return content;

    case 'paragraph':
      return `<p>${content || '<br>'}</p>`;

    case 'heading':
      const level = node.attrs?.level || 1;
      return `<h${level}>${content}</h${level}>`;

    case 'bulletList':
      return `<ul>${content}</ul>`;

    case 'orderedList':
      return `<ol>${content}</ol>`;

    case 'listItem':
      return `<li>${content}</li>`;

    case 'taskList':
      return `<ul class="task-list">${content}</ul>`;

    case 'taskItem':
      const checked = node.attrs?.checked || false;
      const checkbox = checked ? '[x]' : '[ ]';
      return `<li class="task-item">${checkbox} ${content}</li>`;

    case 'blockquote':
      return `<blockquote>${content}</blockquote>`;

    case 'codeBlock':
      const language = node.attrs?.language || '';
      return `<pre><code class="code-block">${escapeHtml(content)}</code></pre>`;

    case 'callout':
      const calloutType = node.attrs?.type || 'info';
      return `<div class="callout callout-${calloutType}">${content}</div>`;

    case 'hardBreak':
      return '<br>';

    case 'horizontalRule':
      return '<hr>';

    case 'databaseBlock':
      const dbName = node.attrs?.databaseName || 'База данных';
      return `<div class="database-placeholder">[База данных: ${escapeHtml(dbName)}]</div>`;

    default:
      return content;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Генерирует CSS-стили для PDF
 */
export function generatePdfStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #000;
        background: #fff;
      }

      .pdf-export {
        max-width: 800px;
        margin: 0 auto;
        padding: 20mm;
      }

      .pdf-title {
        font-size: 24pt;
        font-weight: 700;
        margin-bottom: 16px;
        color: #000;
      }

      .pdf-meta {
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #ddd;
      }

      .pdf-date {
        font-size: 10pt;
        color: #666;
        display: block;
        margin-bottom: 8px;
      }

      .pdf-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .pdf-tag {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 9pt;
        font-weight: 500;
      }

      .pdf-content {
        margin-top: 20px;
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 20px 0 10px 0;
        font-weight: 600;
        line-height: 1.3;
        color: #000;
      }

      h1 { font-size: 20pt; }
      h2 { font-size: 18pt; }
      h3 { font-size: 16pt; }
      h4 { font-size: 14pt; }
      h5 { font-size: 12pt; }
      h6 { font-size: 11pt; }

      p {
        margin: 8px 0;
      }

      ul, ol {
        margin: 8px 0;
        padding-left: 24px;
      }

      li {
        margin: 4px 0;
      }

      .task-list {
        list-style: none;
        padding-left: 0;
      }

      .task-item {
        margin: 4px 0;
      }

      blockquote {
        margin: 12px 0;
        padding: 8px 16px;
        border-left: 4px solid #ddd;
        background: #f9f9f9;
        color: #666;
        font-style: italic;
      }

      code.inline-code {
        font-family: 'Courier New', Courier, monospace;
        background: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10pt;
      }

      pre {
        margin: 12px 0;
        padding: 12px;
        background: #f4f4f4;
        border-radius: 4px;
        overflow-x: auto;
      }

      .code-block {
        font-family: 'Courier New', Courier, monospace;
        font-size: 10pt;
        line-height: 1.5;
      }

      .callout {
        margin: 12px 0;
        padding: 12px 16px;
        border-radius: 4px;
        border-left: 4px solid;
      }

      .callout-info {
        background: #e3f2fd;
        border-color: #2196f3;
      }

      .callout-warning {
        background: #fff3e0;
        border-color: #ff9800;
      }

      .callout-error {
        background: #ffebee;
        border-color: #f44336;
      }

      .callout-success {
        background: #e8f5e9;
        border-color: #4caf50;
      }

      mark {
        padding: 2px 4px;
        border-radius: 2px;
      }

      a {
        color: #2196f3;
        text-decoration: none;
      }

      hr {
        margin: 16px 0;
        border: none;
        border-top: 1px solid #ddd;
      }

      .database-placeholder {
        margin: 12px 0;
        padding: 16px;
        background: #f0f0f0;
        border: 1px dashed #999;
        border-radius: 4px;
        text-align: center;
        color: #666;
        font-style: italic;
      }

      strong { font-weight: 700; }
      em { font-style: italic; }
      u { text-decoration: underline; }
      s { text-decoration: line-through; }
    </style>
  `;
}

/**
 * Основная функция экспорта заметки в PDF
 */
export async function exportNoteToPdf(options: PdfExportOptions): Promise<void> {
  const { title, content, tags, updatedAt } = options;

  // Форматирование даты
  const date = new Date(updatedAt);
  const formattedDate = date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Конвертация контента
  const htmlContent = convertTipTapToHtml(content);

  // Формирование тегов
  let tagsHtml = '';
  if (tags && tags.length > 0) {
    tagsHtml = `
      <div class="pdf-tags">
        ${tags.map(tag => `
          <span class="pdf-tag" style="background-color: ${tag.color}20; color: ${tag.color};">
            ${escapeHtml(tag.name)}
          </span>
        `).join('')}
      </div>
    `;
  }

  // Формирование полного HTML
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${generatePdfStyles()}
    </head>
    <body>
      <div class="pdf-export">
        <h1 class="pdf-title">${escapeHtml(title)}</h1>
        <div class="pdf-meta">
          <span class="pdf-date">Изменено: ${formattedDate}</span>
          ${tagsHtml}
        </div>
        <div class="pdf-content">
          ${htmlContent}
        </div>
      </div>
    </body>
    </html>
  `;

  // Создание временного элемента
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = fullHtml;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  document.body.appendChild(tempDiv);

  try {
    // Генерация имени файла
    const filename = transliterate(title) || 'note';

    // Конфигурация html2pdf
    const opt = {
      margin: 20, // mm
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Генерация и скачивание PDF
    await html2pdf().set(opt).from(tempDiv).save();
  } finally {
    // Очистка временного элемента
    document.body.removeChild(tempDiv);
  }
}
