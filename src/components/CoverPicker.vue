<template>
  <div v-if="isOpen" class="cover-picker-overlay" @click="$emit('close')">
    <div class="cover-picker" @click.stop>
      <div class="picker-header">
        <h3>Выберите обложку</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="picker-tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'gradients' }]"
          @click="activeTab = 'gradients'"
        >
          Градиенты
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'upload' }]"
          @click="activeTab = 'upload'"
        >
          Загрузить изображение
        </button>
      </div>

      <div class="picker-content">
        <div v-if="activeTab === 'gradients'" class="gradients-grid">
          <button
            v-for="(gradient, index) in gradients"
            :key="index"
            class="gradient-option"
            :style="{ background: gradient }"
            @click="selectGradient(gradient)"
          />
        </div>

        <div v-else class="upload-section">
          <div class="upload-area" @click="triggerFileInput">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="handleFileSelect"
              style="display: none"
            />
            <div class="upload-icon">📁</div>
            <p>Нажмите для выбора файла</p>
            <p class="upload-hint">Максимальный размер: 5 МБ</p>
          </div>

          <div v-if="uploading" class="upload-progress">
            <div class="spinner"></div>
            <p>Загрузка...</p>
          </div>

          <div v-if="uploadError" class="upload-error">
            {{ uploadError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [type: string, value: string]
  close: []
}>()

const activeTab = ref<'gradients' | 'upload'>('gradients')
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #c1dfc4 0%, #deecdd 100%)',
]

const selectGradient = (gradient: string) => {
  emit('select', 'gradient', gradient)
  emit('close')
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'Размер файла превышает 5 МБ'
    return
  }

  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Пожалуйста, выберите изображение'
    return
  }

  uploadError.value = ''
  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)

    // Загрузка файла
    const uploadResponse = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error('Ошибка загрузки файла')
    }

    const uploadData = await uploadResponse.json()
    const fileKey = uploadData.data?.key

    if (!fileKey) {
      throw new Error('Ключ файла не получен')
    }

    // Получение URL файла
    const urlResponse = await fetch(`/api/files/${fileKey}`)

    if (!urlResponse.ok) {
      throw new Error('Ошибка получения URL файла')
    }

    const urlData = await urlResponse.json()
    const imageUrl = urlData.data?.url

    if (!imageUrl) {
      throw new Error('URL изображения не получен')
    }

    emit('select', 'image', imageUrl)
    emit('close')
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'Ошибка загрузки файла'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.cover-picker-overlay {
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
}

.cover-picker {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.picker-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 24px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: var(--bg-hover);
}

.picker-tabs {
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.picker-content {
  padding: 20px;
  overflow-y: auto;
}

.gradients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.gradient-option {
  height: 80px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gradient-option:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: var(--primary-color);
  background: var(--bg-hover);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-area p {
  margin: 4px 0;
  color: var(--text-primary);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary) !important;
}

.upload-progress {
  text-align: center;
  padding: 24px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.upload-error {
  padding: 12px;
  background: var(--danger-color);
  color: white;
  border-radius: 6px;
  text-align: center;
}
</style>
