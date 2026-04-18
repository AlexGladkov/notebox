import { computed, ref, type Ref, type ComputedRef } from 'vue';
import type { Note } from '../types';
import { extractNoteLinks } from '../utils/parseNoteLinks';
import { calculateLayout } from '../utils/graphLayout';

export interface GraphNode {
  id: string;
  title: string;
  icon?: string | null;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'parent' | 'link';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface UseGraphReturn {
  graphData: ComputedRef<GraphData>;
  isCalculating: Ref<boolean>;
  recalculateLayout: () => void;
}

/**
 * Composable для построения и управления графом заметок
 */
export function useGraph(
  notes: Ref<Note[]>,
  layoutWidth: Ref<number> = ref(1200),
  layoutHeight: Ref<number> = ref(800)
): UseGraphReturn {
  const isCalculating = ref(false);
  const nodePositions = ref(new Map<string, { x: number; y: number }>());

  /**
   * Строит граф из заметок
   */
  const graphData = computed<GraphData>(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const noteMap = new Map<string, Note>();

    // Создаем карту заметок для быстрого доступа
    notes.value.forEach(note => {
      noteMap.set(note.id, note);
    });

    // Создаем узлы и собираем рёбра
    notes.value.forEach(note => {
      // Получаем позицию из кэша или используем временные координаты
      const position = nodePositions.value.get(note.id) || { x: 0, y: 0 };

      nodes.push({
        id: note.id,
        title: note.title || 'Без названия',
        icon: note.icon,
        x: position.x,
        y: position.y,
      });

      // Добавляем иерархические связи (parentId)
      if (note.parentId && noteMap.has(note.parentId)) {
        edges.push({
          source: note.parentId,
          target: note.id,
          type: 'parent',
        });
      }

      // Извлекаем и добавляем связи из контента
      const linkedNoteIds = extractNoteLinks(note.content);
      linkedNoteIds.forEach(linkedId => {
        // Проверяем, что связанная заметка существует
        if (noteMap.has(linkedId) && linkedId !== note.id) {
          // Проверяем, не добавлена ли уже эта связь
          const edgeExists = edges.some(
            e =>
              (e.source === note.id && e.target === linkedId) ||
              (e.source === linkedId && e.target === note.id)
          );

          if (!edgeExists) {
            edges.push({
              source: note.id,
              target: linkedId,
              type: 'link',
            });
          }
        }
      });
    });

    return { nodes, edges };
  });

  /**
   * Пересчитывает layout графа
   */
  const recalculateLayout = () => {
    if (notes.value.length === 0) {
      nodePositions.value = new Map();
      return;
    }

    isCalculating.value = true;

    // Используем setTimeout для асинхронного выполнения
    setTimeout(() => {
      try {
        const nodeIds = notes.value.map(n => n.id);
        const edges = graphData.value.edges.map(e => ({
          source: e.source,
          target: e.target,
        }));

        const positions = calculateLayout(nodeIds, edges, {
          width: layoutWidth.value,
          height: layoutHeight.value,
        });

        nodePositions.value = positions;
      } finally {
        isCalculating.value = false;
      }
    }, 0);
  };

  return {
    graphData,
    isCalculating,
    recalculateLayout,
  };
}
