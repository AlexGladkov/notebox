import { ref, type Ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { BlockMenuAction } from '../../../types/editor';

export function useBlockOperations(editor: Ref<Editor | undefined>) {
  const blockMenuVisible = ref(false);
  const blockMenuPosition = ref({ top: 0, left: 0 });
  const blockMenuActions = ref<BlockMenuAction[]>([]);
  const blockHandleVisible = ref(false);
  const blockHandlePosition = ref<{ top: number; left: number } | null>(null);
  const currentBlockPos = ref<number | null>(null);

  const handleMouseMove = (event: MouseEvent) => {
    if (!editor.value) return;

    const target = event.target as HTMLElement;
    const editorElement = target.closest('.ProseMirror');

    if (!editorElement) {
      blockHandleVisible.value = false;
      return;
    }

    const pos = editor.value.view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (!pos) {
      blockHandleVisible.value = false;
      return;
    }

    const $pos = editor.value.state.doc.resolve(pos.pos);
    const blockNode = $pos.node($pos.depth);

    if (!blockNode || blockNode.type.name === 'doc') {
      blockHandleVisible.value = false;
      return;
    }

    const blockPos = $pos.before($pos.depth);
    const coords = editor.value.view.coordsAtPos(blockPos);

    const containerRect = (editorElement as HTMLElement).getBoundingClientRect();
    const scrollTop = (editorElement as HTMLElement).scrollTop || 0;

    blockHandleVisible.value = true;
    blockHandlePosition.value = {
      top: coords.top - containerRect.top + scrollTop,
      left: coords.left - containerRect.left - 40,
    };
    currentBlockPos.value = blockPos;
  };

  const openBlockMenu = (event: MouseEvent) => {
    if (!editor.value || currentBlockPos.value === null) return;

    event.preventDefault();
    event.stopPropagation();

    const actions: BlockMenuAction[] = [
      {
        id: 'delete',
        label: 'Удалить блок',
        icon: '🗑️',
        action: () => deleteBlock(),
      },
      {
        id: 'duplicate',
        label: 'Дублировать блок',
        icon: '📋',
        action: () => duplicateBlock(),
      },
      {
        id: 'move-up',
        label: 'Переместить вверх',
        icon: '⬆️',
        action: () => moveBlockUp(),
      },
      {
        id: 'move-down',
        label: 'Переместить вниз',
        icon: '⬇️',
        action: () => moveBlockDown(),
      },
      {
        id: 'copy-text',
        label: 'Скопировать как текст',
        icon: '📄',
        action: () => copyBlockAsText(),
      },
      {
        id: 'text-color',
        label: 'Цвет текста',
        icon: '🎨',
        action: () => changeTextColor(),
      },
      {
        id: 'bg-color',
        label: 'Цвет фона',
        icon: '🖌️',
        action: () => changeBackgroundColor(),
      },
      {
        id: 'comment',
        label: 'Добавить комментарий',
        icon: '💬',
        action: () => addBlockComment(),
      },
    ];

    blockMenuActions.value = actions;
    blockMenuPosition.value = {
      top: event.clientY,
      left: event.clientX,
    };
    blockMenuVisible.value = true;
  };

  const deleteBlock = () => {
    if (!editor.value || currentBlockPos.value === null) return;

    const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
    const from = $pos.before($pos.depth);
    const to = $pos.after($pos.depth);

    editor.value.chain().focus().deleteRange({ from, to }).run();
    blockMenuVisible.value = false;
  };

  const duplicateBlock = () => {
    if (!editor.value || currentBlockPos.value === null) return;

    const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
    const blockNode = $pos.node($pos.depth);
    const to = $pos.after($pos.depth);

    editor.value.chain().focus().insertContentAt(to, blockNode.toJSON()).run();
    blockMenuVisible.value = false;
  };

  const moveBlockUp = () => {
    if (!editor.value || currentBlockPos.value === null) return;

    const { state, view } = editor.value;
    const $pos = state.doc.resolve(currentBlockPos.value);
    const blockNode = $pos.node($pos.depth);

    if ($pos.depth === 0 || $pos.index($pos.depth - 1) === 0) {
      blockMenuVisible.value = false;
      return;
    }

    const from = $pos.before($pos.depth);
    const to = $pos.after($pos.depth);

    const prevPos = state.doc.resolve(from - 1);
    const prevFrom = prevPos.before(prevPos.depth);

    const tr = state.tr;
    tr.delete(from, to);
    tr.insert(prevFrom, blockNode);
    view.dispatch(tr);

    blockMenuVisible.value = false;
  };

  const moveBlockDown = () => {
    if (!editor.value || currentBlockPos.value === null) return;

    const { state, view } = editor.value;
    const $pos = state.doc.resolve(currentBlockPos.value);
    const blockNode = $pos.node($pos.depth);
    const parent = $pos.node($pos.depth - 1);

    if ($pos.index($pos.depth - 1) >= parent.childCount - 1) {
      blockMenuVisible.value = false;
      return;
    }

    const from = $pos.before($pos.depth);
    const to = $pos.after($pos.depth);

    const nextPos = state.doc.resolve(to + 1);
    const nextTo = nextPos.after(nextPos.depth);

    const tr = state.tr;
    tr.delete(from, to);
    tr.insert(nextTo - (to - from), blockNode);
    view.dispatch(tr);

    blockMenuVisible.value = false;
  };

  const copyBlockAsText = () => {
    if (!editor.value || currentBlockPos.value === null) return;

    const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
    const blockNode = $pos.node($pos.depth);
    const text = blockNode.textContent;

    navigator.clipboard.writeText(text).then(() => {
      console.log('Block text copied to clipboard');
    });

    blockMenuVisible.value = false;
  };

  const changeTextColor = () => {
    if (!editor.value || currentBlockPos.value === null) return;

    const color = window.prompt('Введите цвет текста (например, #ff0000):');
    if (color) {
      const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
      const from = $pos.start($pos.depth);
      const to = $pos.end($pos.depth);

      editor.value.chain().focus().setTextSelection({ from, to }).setColor(color).run();
    }

    blockMenuVisible.value = false;
  };

  const changeBackgroundColor = () => {
    if (!editor.value || currentBlockPos.value === null) return;

    const color = window.prompt('Введите цвет фона (например, #ffff00):');
    if (color) {
      const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
      const from = $pos.start($pos.depth);
      const to = $pos.end($pos.depth);

      editor.value.chain().focus().setTextSelection({ from, to }).setHighlight({ color }).run();
    }

    blockMenuVisible.value = false;
  };

  const addBlockComment = () => {
    if (!editor.value) return;

    const comment = window.prompt('Введите комментарий к блоку:');
    if (comment) {
      editor.value.chain().focus().setBlockComment(comment).run();
    }

    blockMenuVisible.value = false;
  };

  const startDrag = (event: MouseEvent) => {
    event.preventDefault();
  };

  return {
    blockMenuVisible,
    blockMenuPosition,
    blockMenuActions,
    blockHandleVisible,
    blockHandlePosition,
    handleMouseMove,
    openBlockMenu,
    startDrag,
  };
}
