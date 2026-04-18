/**
 * Force-directed layout алгоритм для позиционирования узлов графа
 */

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

interface LayoutConfig {
  width: number;
  height: number;
  repulsionStrength: number;
  attractionStrength: number;
  damping: number;
  iterations: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  width: 1200,
  height: 800,
  repulsionStrength: 3000,
  attractionStrength: 0.01,
  damping: 0.9,
  iterations: 300,
};

/**
 * Вычисляет силу отталкивания между двумя узлами
 */
function calculateRepulsion(
  node1: LayoutNode,
  node2: LayoutNode,
  strength: number
): { fx: number; fy: number } {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  const distanceSquared = dx * dx + dy * dy;

  // Избегаем деления на ноль
  if (distanceSquared < 1) {
    return { fx: 0, fy: 0 };
  }

  const force = strength / distanceSquared;
  const distance = Math.sqrt(distanceSquared);

  return {
    fx: (-dx / distance) * force,
    fy: (-dy / distance) * force,
  };
}

/**
 * Вычисляет силу притяжения для связанных узлов (пружина)
 */
function calculateAttraction(
  node1: LayoutNode,
  node2: LayoutNode,
  strength: number,
  idealLength: number = 100
): { fx: number; fy: number } {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 1) {
    return { fx: 0, fy: 0 };
  }

  const force = (distance - idealLength) * strength;

  return {
    fx: (dx / distance) * force,
    fy: (dy / distance) * force,
  };
}

/**
 * Инициализирует позиции узлов случайным образом или по кругу
 */
function initializeNodePositions(
  nodeIds: string[],
  width: number,
  height: number
): Map<string, LayoutNode> {
  const nodes = new Map<string, LayoutNode>();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  nodeIds.forEach((id, index) => {
    const angle = (index / nodeIds.length) * 2 * Math.PI;
    nodes.set(id, {
      id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    });
  });

  return nodes;
}

/**
 * Основная функция расчета layout графа
 */
export function calculateLayout(
  nodeIds: string[],
  edges: LayoutEdge[],
  config: Partial<LayoutConfig> = {}
): Map<string, { x: number; y: number }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (nodeIds.length === 0) {
    return new Map();
  }

  // Один узел - в центре
  if (nodeIds.length === 1) {
    return new Map([[nodeIds[0], { x: cfg.width / 2, y: cfg.height / 2 }]]);
  }

  const nodes = initializeNodePositions(nodeIds, cfg.width, cfg.height);

  // Создаем граф смежности для быстрого поиска соседей
  const adjacency = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set());
    }
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, new Set());
    }
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  });

  // Итеративное применение сил
  for (let iteration = 0; iteration < cfg.iterations; iteration++) {
    const nodeArray = Array.from(nodes.values());

    // Сбрасываем силы
    nodeArray.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Применяем силы отталкивания между всеми парами узлов
    // NOTE: O(n²) алгоритм - для графов >500 узлов рекомендуется использовать
    // Barnes-Hut quadtree оптимизацию для достижения O(n log n)
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const node1 = nodeArray[i];
        const node2 = nodeArray[j];
        const { fx, fy } = calculateRepulsion(node1, node2, cfg.repulsionStrength);

        node1.vx += fx;
        node1.vy += fy;
        node2.vx -= fx;
        node2.vy -= fy;
      }
    }

    // Применяем силы притяжения для связанных узлов
    edges.forEach(edge => {
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);

      if (sourceNode && targetNode) {
        const { fx, fy } = calculateAttraction(sourceNode, targetNode, cfg.attractionStrength);
        sourceNode.vx += fx;
        sourceNode.vy += fy;
        targetNode.vx -= fx;
        targetNode.vy -= fy;
      }
    });

    // Применяем центростремительную силу
    const centerX = cfg.width / 2;
    const centerY = cfg.height / 2;
    nodeArray.forEach(node => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      const centerForce = 0.01;
      node.vx += dx * centerForce;
      node.vy += dy * centerForce;
    });

    // Обновляем позиции с затуханием
    nodeArray.forEach(node => {
      node.vx *= cfg.damping;
      node.vy *= cfg.damping;
      node.x += node.vx;
      node.y += node.vy;
    });
  }

  // Возвращаем финальные позиции
  const result = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, id) => {
    result.set(id, { x: node.x, y: node.y });
  });

  return result;
}
