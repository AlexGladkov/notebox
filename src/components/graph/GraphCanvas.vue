<template>
  <canvas
    ref="canvasRef"
    class="w-full h-full cursor-grab active:cursor-grabbing"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel="handleWheel"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { GraphData, GraphNode, GraphEdge } from '../../composables/useGraph';

interface Props {
  graphData: GraphData;
  isDarkMode: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'node-click': [nodeId: string];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isPanning = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });
const hoveredNodeId = ref<string | null>(null);

// Состояние трансформации (pan и zoom)
const transform = ref({
  x: 0,
  y: 0,
  scale: 1,
});

// Цвета для разных типов рёбер
const EDGE_COLORS = {
  parent: '#3b82f6', // blue-500
  link: '#10b981', // green-500
};

const EDGE_COLORS_DARK = {
  parent: '#60a5fa', // blue-400
  link: '#34d399', // green-400
};

const NODE_RADIUS = 20;
const NODE_COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']; // pink, blue, green, amber, purple

/**
 * Получает цвет ноды на основе её id
 */
function getNodeColor(nodeId: string): string {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = nodeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % NODE_COLORS.length;
  return NODE_COLORS[index];
}

/**
 * Преобразует координаты canvas в координаты мира
 */
function canvasToWorld(x: number, y: number) {
  return {
    x: (x - transform.value.x) / transform.value.scale,
    y: (y - transform.value.y) / transform.value.scale,
  };
}

/**
 * Преобразует координаты мира в координаты canvas
 */
function worldToCanvas(x: number, y: number) {
  return {
    x: x * transform.value.scale + transform.value.x,
    y: y * transform.value.scale + transform.value.y,
  };
}

/**
 * Проверяет, находится ли точка внутри ноды
 */
function isPointInNode(x: number, y: number, node: GraphNode): boolean {
  const worldPos = canvasToWorld(x, y);
  const dx = worldPos.x - node.x;
  const dy = worldPos.y - node.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= NODE_RADIUS;
}

/**
 * Находит ноду под курсором
 */
function findNodeAtPosition(x: number, y: number): GraphNode | null {
  // Проверяем ноды в обратном порядке (последние рисуются сверху)
  for (let i = props.graphData.nodes.length - 1; i >= 0; i--) {
    const node = props.graphData.nodes[i];
    if (isPointInNode(x, y, node)) {
      return node;
    }
  }
  return null;
}

/**
 * Отрисовывает граф на canvas
 */
function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();

  // Очищаем canvas
  ctx.clearRect(0, 0, rect.width, rect.height);

  // Сохраняем состояние контекста
  ctx.save();

  // Применяем трансформацию
  ctx.translate(transform.value.x, transform.value.y);
  ctx.scale(transform.value.scale, transform.value.scale);

  const edgeColors = props.isDarkMode ? EDGE_COLORS_DARK : EDGE_COLORS;

  // Создаем Map для быстрого доступа к узлам
  const nodeMap = new Map<string, GraphNode>();
  props.graphData.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });

  // Рисуем рёбра
  props.graphData.edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) return;

    const isHighlighted =
      hoveredNodeId.value === edge.source || hoveredNodeId.value === edge.target;

    ctx.beginPath();
    ctx.moveTo(sourceNode.x, sourceNode.y);
    ctx.lineTo(targetNode.x, targetNode.y);
    ctx.strokeStyle = edgeColors[edge.type];
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
    ctx.globalAlpha = isHighlighted ? 1 : 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Рисуем ноды
  props.graphData.nodes.forEach(node => {
    const isHovered = hoveredNodeId.value === node.id;
    const nodeColor = getNodeColor(node.id);

    // Тень при hover
    if (isHovered) {
      ctx.shadowColor = nodeColor;
      ctx.shadowBlur = 15;
    }

    // Круг ноды
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = nodeColor;
    ctx.fill();

    // Обводка
    ctx.strokeStyle = props.isDarkMode ? '#1f2937' : '#ffffff';
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Текст (иконка или первая буква названия)
    ctx.fillStyle = '#ffffff';
    ctx.font = node.icon ? '16px sans-serif' : 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = node.icon || node.title.charAt(0).toUpperCase();
    ctx.fillText(text, node.x, node.y);

    // Название при hover
    if (isHovered) {
      const textWidth = ctx.measureText(node.title).width;
      const padding = 8;
      const labelX = node.x;
      const labelY = node.y - NODE_RADIUS - 20;

      // Фон (используем прямоугольник для лучшей совместимости)
      ctx.fillStyle = props.isDarkMode ? '#1f2937' : '#ffffff';
      ctx.strokeStyle = props.isDarkMode ? '#374151' : '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.fillRect(
        labelX - textWidth / 2 - padding,
        labelY - 10,
        textWidth + padding * 2,
        20
      );
      ctx.strokeRect(
        labelX - textWidth / 2 - padding,
        labelY - 10,
        textWidth + padding * 2,
        20
      );

      // Текст
      ctx.fillStyle = props.isDarkMode ? '#f9fafb' : '#111827';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.title, labelX, labelY);
    }
  });

  // Восстанавливаем состояние контекста
  ctx.restore();
}

/**
 * Обработка клика мыши
 */
function handleMouseDown(event: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const clickedNode = findNodeAtPosition(x, y);

  if (clickedNode) {
    emit('node-click', clickedNode.id);
  } else {
    isPanning.value = true;
    lastMousePos.value = { x: event.clientX, y: event.clientY };
  }
}

/**
 * Обработка движения мыши
 */
function handleMouseMove(event: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (isPanning.value) {
    const dx = event.clientX - lastMousePos.value.x;
    const dy = event.clientY - lastMousePos.value.y;

    transform.value.x += dx;
    transform.value.y += dy;

    lastMousePos.value = { x: event.clientX, y: event.clientY };
    render();
  } else {
    // Обновляем hover состояние
    const hoveredNode = findNodeAtPosition(x, y);
    const newHoveredId = hoveredNode ? hoveredNode.id : null;

    if (newHoveredId !== hoveredNodeId.value) {
      hoveredNodeId.value = newHoveredId;
      render();
    }
  }
}

/**
 * Обработка отпускания кнопки мыши
 */
function handleMouseUp() {
  isPanning.value = false;
}

/**
 * Обработка колеса мыши для zoom
 */
function handleWheel(event: WheelEvent) {
  event.preventDefault();

  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Позиция мыши в мировых координатах до зума
  const worldPosBefore = canvasToWorld(mouseX, mouseY);

  // Изменяем масштаб
  const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.max(0.1, Math.min(5, transform.value.scale * zoomFactor));

  transform.value.scale = newScale;

  // Позиция мыши в мировых координатах после зума
  const worldPosAfter = canvasToWorld(mouseX, mouseY);

  // Корректируем offset чтобы мышь осталась на той же точке
  transform.value.x += (worldPosAfter.x - worldPosBefore.x) * transform.value.scale;
  transform.value.y += (worldPosAfter.y - worldPosBefore.y) * transform.value.scale;

  render();
}

/**
 * Изменение масштаба программно
 */
function zoomIn() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const worldPosBefore = canvasToWorld(centerX, centerY);
  transform.value.scale = Math.min(5, transform.value.scale * 1.2);
  const worldPosAfter = canvasToWorld(centerX, centerY);

  transform.value.x += (worldPosAfter.x - worldPosBefore.x) * transform.value.scale;
  transform.value.y += (worldPosAfter.y - worldPosBefore.y) * transform.value.scale;

  render();
}

function zoomOut() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const worldPosBefore = canvasToWorld(centerX, centerY);
  transform.value.scale = Math.max(0.1, transform.value.scale * 0.8);
  const worldPosAfter = canvasToWorld(centerX, centerY);

  transform.value.x += (worldPosAfter.x - worldPosBefore.x) * transform.value.scale;
  transform.value.y += (worldPosAfter.y - worldPosBefore.y) * transform.value.scale;

  render();
}

/**
 * Сброс вида
 */
function resetView() {
  const canvas = canvasRef.value;
  if (!canvas || props.graphData.nodes.length === 0) return;

  // Находим границы графа
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  props.graphData.nodes.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  });

  const graphWidth = maxX - minX + NODE_RADIUS * 4;
  const graphHeight = maxY - minY + NODE_RADIUS * 4;
  const graphCenterX = (minX + maxX) / 2;
  const graphCenterY = (minY + maxY) / 2;

  // Вычисляем масштаб чтобы граф поместился
  const scaleX = canvas.width / graphWidth;
  const scaleY = canvas.height / graphHeight;
  const scale = Math.min(scaleX, scaleY, 1) * 0.9;

  transform.value.scale = scale;
  transform.value.x = canvas.width / 2 - graphCenterX * scale;
  transform.value.y = canvas.height / 2 - graphCenterY * scale;

  render();
}

/**
 * Изменение размера canvas
 */
function resizeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  render();
}

// Следим за изменениями данных графа
watch(() => props.graphData, () => {
  nextTick(() => {
    resetView();
  });
}, { deep: true });

// Следим за изменением темы
watch(() => props.isDarkMode, () => {
  render();
});

// Инициализация при монтировании
onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  nextTick(() => {
    resetView();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
});

// Экспортируем методы для родительского компонента
defineExpose({
  zoomIn,
  zoomOut,
  resetView,
});
</script>
