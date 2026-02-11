import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(content: string): string {
  if (!content) return '';

  try {
    const html = marked.parse(content) as string;
    return sanitizeHtml(html);
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return content;
  }
}

function sanitizeHtml(html: string): string {
  const allowedTags = [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'del', 'sup', 'sub'
  ];

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;

      if (!allowedTags.includes(element.tagName.toLowerCase())) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      Array.from(element.attributes).forEach(attr => {
        if (attr.name === 'href' && element.tagName === 'A') {
          const href = attr.value;
          if (!href.startsWith('http://') &&
              !href.startsWith('https://') &&
              !href.startsWith('/') &&
              !href.startsWith('#')) {
            element.removeAttribute('href');
          }
        } else if (attr.name === 'src' && element.tagName === 'IMG') {
          const src = attr.value;
          if (!src.startsWith('http://') &&
              !src.startsWith('https://') &&
              !src.startsWith('/')) {
            element.removeAttribute('src');
          }
        } else if (attr.name !== 'href' && attr.name !== 'src' && attr.name !== 'alt') {
          element.removeAttribute(attr.name);
        }
      });
    }

    Array.from(node.childNodes).forEach(child => sanitizeNode(child));
  };

  sanitizeNode(doc.body);

  return doc.body.innerHTML;
}
