import { marked } from 'marked';

export function markdownToBlocks(markdown: string): string {
  if (!markdown) {
    return JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    });
  }

  try {
    const html = marked.parse(markdown) as string;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const json = htmlToTiptapJSON(tempDiv);

    return JSON.stringify(json);
  } catch (error) {
    console.error('Error converting markdown to blocks:', error);
    return JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: markdown,
            },
          ],
        },
      ],
    });
  }
}

function htmlToTiptapJSON(element: HTMLElement): any {
  const doc: any = {
    type: 'doc',
    content: [],
  };

  const processNode = (node: Node): any => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        return {
          type: 'text',
          text,
        };
      }
      return null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    const processChildren = (element: HTMLElement = el) => {
      const children: any[] = [];
      element.childNodes.forEach((child) => {
        const processed = processNode(child);
        if (processed) {
          if (Array.isArray(processed)) {
            children.push(...processed);
          } else {
            children.push(processed);
          }
        }
      });
      return children.length > 0 ? children : undefined;
    };

    switch (tagName) {
      case 'p':
        return {
          type: 'paragraph',
          content: processChildren(),
        };

      case 'h1':
        return {
          type: 'heading',
          attrs: { level: 1 },
          content: processChildren(),
        };

      case 'h2':
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: processChildren(),
        };

      case 'h3':
        return {
          type: 'heading',
          attrs: { level: 3 },
          content: processChildren(),
        };

      case 'ul':
        const isTaskList = el.querySelector('input[type="checkbox"]') !== null;
        if (isTaskList) {
          return {
            type: 'taskList',
            content: Array.from(el.children).map((li) => {
              const checkbox = li.querySelector('input[type="checkbox"]');
              const checked = checkbox?.hasAttribute('checked') || false;
              return {
                type: 'taskItem',
                attrs: { checked },
                content: processChildren(li as HTMLElement),
              };
            }),
          };
        }
        return {
          type: 'bulletList',
          content: Array.from(el.children).map((li) => ({
            type: 'listItem',
            content: processChildren(li as HTMLElement),
          })),
        };

      case 'ol':
        return {
          type: 'orderedList',
          content: Array.from(el.children).map((li) => ({
            type: 'listItem',
            content: processChildren(li as HTMLElement),
          })),
        };

      case 'blockquote':
        return {
          type: 'blockquote',
          content: processChildren(),
        };

      case 'pre':
        const codeEl = el.querySelector('code');
        return {
          type: 'codeBlock',
          content: [
            {
              type: 'text',
              text: codeEl?.textContent || el.textContent || '',
            },
          ],
        };

      case 'hr':
        return {
          type: 'horizontalRule',
        };

      case 'strong':
      case 'b':
        const strongContent = processChildren();
        return strongContent?.map((item: any) => ({
          ...item,
          marks: [...(item.marks || []), { type: 'bold' }],
        }));

      case 'em':
      case 'i':
        const emContent = processChildren();
        return emContent?.map((item: any) => ({
          ...item,
          marks: [...(item.marks || []), { type: 'italic' }],
        }));

      case 'code':
        return {
          type: 'text',
          text: el.textContent || '',
          marks: [{ type: 'code' }],
        };

      case 'a':
        const linkContent = processChildren();
        const href = el.getAttribute('href');
        return linkContent?.map((item: any) => ({
          ...item,
          marks: [...(item.marks || []), { type: 'link', attrs: { href } }],
        }));

      default:
        return processChildren();
    }
  };

  element.childNodes.forEach((child) => {
    const processed = processNode(child);
    if (processed) {
      if (Array.isArray(processed)) {
        doc.content.push(...processed);
      } else {
        doc.content.push(processed);
      }
    }
  });

  if (doc.content.length === 0) {
    doc.content.push({ type: 'paragraph' });
  }

  return doc;
}
