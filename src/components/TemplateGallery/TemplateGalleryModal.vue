<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Выберите шаблон</h2>
          <button class="close-button" @click="close" aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat.value"
            :class="['category-tab', { active: selectedCategory === cat.value }]"
            @click="selectedCategory = cat.value"
          >
            {{ cat.label }}
          </button>
        </div>

        <div class="modal-body">
          <div class="templates-grid">
            <TemplateCard
              v-for="template in filteredTemplates"
              :key="template.id"
              :template="template"
              :is-selected="selectedTemplateId === template.id"
              @select="handleSelectTemplate"
            />
          </div>

          <div class="preview-section">
            <TemplatePreview :template="selectedTemplate" />
          </div>
        </div>

        <div class="modal-footer">
          <label class="ai-checkbox">
            <input type="checkbox" v-model="useAI" />
            <span>Заполнить примером с AI</span>
          </label>

          <div class="footer-buttons">
            <button class="btn btn-secondary" @click="close">Отмена</button>
            <button
              class="btn btn-primary"
              :disabled="!selectedTemplateId || loading"
              @click="handleCreate"
            >
              <span v-if="loading">Создаю...</span>
              <span v-else>Создать</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useTemplates } from '../../composables/useTemplates';
import { TEMPLATE_CATEGORY_LABELS, type TemplateCategory } from '../../types/template';
import TemplateCard from './TemplateCard.vue';
import TemplatePreview from './TemplatePreview.vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'create': [content: string, icon: string, title: string];
}>();

const { getTemplates, getTemplateById, generateTemplateContent, loading } = useTemplates();

const selectedCategory = ref<'all' | TemplateCategory>('all');
const selectedTemplateId = ref<string | null>(null);
const useAI = ref(false);

const categories: Array<{ label: string; value: 'all' | TemplateCategory }> = [
  { label: 'Все', value: 'all' },
  { label: TEMPLATE_CATEGORY_LABELS.work, value: 'work' as TemplateCategory },
  { label: TEMPLATE_CATEGORY_LABELS.personal, value: 'personal' as TemplateCategory },
  { label: TEMPLATE_CATEGORY_LABELS.learning, value: 'learning' as TemplateCategory },
];

const filteredTemplates = computed(() => {
  const allTemplates = getTemplates();
  if (selectedCategory.value === 'all') {
    return allTemplates;
  }
  return allTemplates.filter(t => t.category === selectedCategory.value);
});

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null;
  return getTemplateById(selectedTemplateId.value) || null;
});

const handleSelectTemplate = (templateId: string) => {
  selectedTemplateId.value = templateId;
};

const handleCreate = async () => {
  if (!selectedTemplateId.value) return;

  try {
    const content = await generateTemplateContent(selectedTemplateId.value, useAI.value);
    const template = getTemplateById(selectedTemplateId.value);

    if (template) {
      emit('create', content, template.icon, template.title);
      close();
    }
  } catch (error) {
    console.error('Failed to create note from template:', error);
  }
};

const close = () => {
  emit('update:modelValue', false);
};

const handleOverlayClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    close();
  }
};

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
};

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedTemplateId.value = null;
    selectedCategory.value = 'all';
    useAI.value = false;
    document.addEventListener('keydown', handleEscape);
  } else {
    document.removeEventListener('keydown', handleEscape);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: #ffffff;
  border-radius: 12px;
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.dark .modal-container {
  background: #1f2937;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .modal-header {
  border-color: #374151;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.dark .modal-title {
  color: #f9fafb;
}

.close-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #111827;
}

.dark .close-button {
  color: #9ca3af;
}

.dark .close-button:hover {
  background: #374151;
  color: #f9fafb;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .category-tabs {
  border-color: #374151;
}

.category-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.category-tab:hover {
  background: #f3f4f6;
  color: #111827;
}

.category-tab.active {
  background: #eff6ff;
  color: #3b82f6;
}

.dark .category-tab {
  color: #9ca3af;
}

.dark .category-tab:hover {
  background: #374151;
  color: #f9fafb;
}

.dark .category-tab.active {
  background: #1e3a5f;
  color: #60a5fa;
}

.modal-body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  align-content: start;
}

.preview-section {
  position: sticky;
  top: 0;
  height: fit-content;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.dark .modal-footer {
  border-color: #374151;
}

.ai-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.dark .ai-checkbox {
  color: #d1d5db;
}

.ai-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.dark .btn-secondary {
  background: #374151;
  color: #d1d5db;
}

.dark .btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

@media (max-width: 1024px) {
  .modal-body {
    grid-template-columns: 1fr;
  }

  .preview-section {
    position: static;
  }

  .templates-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .modal-container {
    max-height: 95vh;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }

  .category-tabs {
    overflow-x: auto;
  }
}
</style>
