<template>
  <div
    class="template-card"
    :class="{ selected: isSelected }"
    @click="$emit('select', template.id)"
  >
    <div class="template-icon">{{ template.icon }}</div>
    <div class="template-info">
      <div class="template-title">{{ template.title }}</div>
      <div class="template-description">{{ template.description }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Template } from '../../types/template';

defineProps<{
  template: Template;
  isSelected: boolean;
}>();

defineEmits<{
  select: [id: string];
}>();
</script>

<style scoped>
.template-card {
  padding: 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 120px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dark .template-card {
  background: #374151;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.template-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.dark .template-card.selected {
  background: #1e3a5f;
  border-color: #3b82f6;
}

.template-icon {
  font-size: 32px;
  line-height: 1;
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-title {
  font-weight: 600;
  font-size: 14px;
  color: #111827;
}

.dark .template-title {
  color: #f9fafb;
}

.template-description {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.dark .template-description {
  color: #9ca3af;
}
</style>
