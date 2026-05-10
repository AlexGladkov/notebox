<template>
  <div v-if="template" class="template-preview">
    <div class="preview-header">
      <span class="preview-icon">{{ template.icon }}</span>
      <h3 class="preview-title">{{ template.title }}</h3>
    </div>
    <div class="preview-content">
      <div v-for="(section, index) in previewSections" :key="index" class="preview-section">
        <h2 v-if="section.tag === 'h2'">{{ section.text }}</h2>
        <h3 v-else>{{ section.text }}</h3>
      </div>
    </div>
  </div>
  <div v-else class="template-preview-empty">
    <p>Выберите шаблон для предпросмотра</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Template } from '../../types/template';

const props = defineProps<{
  template: Template | null;
}>();

interface PreviewSection {
  tag: 'h2' | 'h3';
  text: string;
}

const previewSections = computed<PreviewSection[]>(() => {
  if (!props.template) return [];

  const content = props.template.content;

  // Безопасный парсинг: используем DOMParser вместо innerHTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  const headers = doc.querySelectorAll('h2, h3');
  const sections: PreviewSection[] = [];

  headers.forEach(header => {
    const tag = header.tagName.toLowerCase() as 'h2' | 'h3';
    const text = header.textContent || '';
    sections.push({ tag, text });
  });

  return sections;
});
</script>

<style scoped>
.template-preview {
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  min-height: 200px;
}

.dark .template-preview {
  background: #1f2937;
  border-color: #374151;
}

.template-preview-empty {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.dark .template-preview-empty {
  background: #1f2937;
  border-color: #4b5563;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .preview-header {
  border-color: #374151;
}

.preview-icon {
  font-size: 28px;
  line-height: 1;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.dark .preview-title {
  color: #f9fafb;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-content :deep(h2) {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.preview-content :deep(h3) {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
  padding-left: 12px;
}

.dark .preview-content :deep(h2) {
  color: #f9fafb;
}

.dark .preview-content :deep(h3) {
  color: #d1d5db;
}

.preview-section {
  padding: 4px 0;
}
</style>
