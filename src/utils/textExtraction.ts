/**
 * Извлекает чистый текст из TipTap JSON документа
 * @param jsonContent - JSON строка или объект TipTap документа
 * @returns чистый текст без форматирования
 */
export function extractTextFromTipTapJson(jsonContent: string | object): string {
  if (!jsonContent) return '';

  try {
    // Парсим, если это строка
    const doc = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

    // Если это не JSON-объект (старый формат HTML), возвращаем как есть
    if (typeof doc === 'string') return doc;

    return extractTextFromNode(doc);
  } catch (e) {
    // Если не удалось распарсить, возвращаем как есть
    return typeof jsonContent === 'string' ? jsonContent : '';
  }
}

/**
 * Рекурсивно извлекает текст из узла TipTap
 */
function extractTextFromNode(node: any): string {
  if (!node) return '';

  // Текстовый узел - возвращаем его содержимое
  if (node.type === 'text') {
    return node.text || '';
  }

  // Если у узла есть контент, рекурсивно обрабатываем дочерние узлы
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child: any) => extractTextFromNode(child)).join(' ');
  }

  return '';
}
