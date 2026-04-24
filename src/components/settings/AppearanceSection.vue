<template>
  <div class="appearance-section">
    <h2 class="section-title">Внешний вид</h2>

    <div class="theme-selector">
      <label class="form-label">Тема</label>

      <!-- Toggle Switch -->
      <div class="theme-toggle-container">
        <div class="theme-toggle">
          <div class="theme-label">
            <svg class="icon sun-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>Светлая</span>
          </div>

          <button
            type="button"
            role="switch"
            :aria-checked="effectiveTheme === 'dark'"
            :aria-label="`Переключить на ${effectiveTheme === 'dark' ? 'светлую' : 'тёмную'} тему`"
            :disabled="currentTheme === 'system'"
            @click="toggleTheme"
            :class="['toggle-track', { dark: effectiveTheme === 'dark', disabled: currentTheme === 'system' }]"
          >
            <span class="toggle-thumb"></span>
          </button>

          <div class="theme-label">
            <svg class="icon moon-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            <span>Тёмная</span>
          </div>
        </div>
      </div>

      <!-- System Theme Checkbox -->
      <label class="system-theme-option">
        <input
          type="checkbox"
          :checked="currentTheme === 'system'"
          @change="toggleSystemTheme"
          class="system-checkbox"
        />
        <span class="checkbox-custom"></span>
        <div class="option-text">
          <span class="option-label">Использовать системные настройки</span>
          <span class="option-desc">Автоматически светлая днём, тёмная ночью</span>
        </div>
      </label>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useTheme, type ThemeMode } from '../../composables/useTheme';
import { authStore } from '../../stores/authStore';

const { themeMode, effectiveTheme, setTheme } = useTheme();
const currentTheme = ref<ThemeMode>(themeMode.value);
const error = ref<string | null>(null);

onMounted(() => {
  currentTheme.value = themeMode.value;
});

watch(themeMode, (newTheme) => {
  currentTheme.value = newTheme;
});

const toggleTheme = () => {
  if (currentTheme.value === 'system') return;

  const newTheme = effectiveTheme.value === 'dark' ? 'light' : 'dark';
  selectTheme(newTheme);
};

const toggleSystemTheme = (event: Event) => {
  const isChecked = (event.target as HTMLInputElement).checked;

  if (isChecked) {
    selectTheme('system');
  } else {
    // При отключении системной темы переключаемся на текущую эффективную тему
    selectTheme(effectiveTheme.value);
  }
};

const selectTheme = async (theme: ThemeMode) => {
  if (currentTheme.value === theme) return;

  error.value = null;
  currentTheme.value = theme;

  // Apply theme immediately
  setTheme(theme);

  // Save to server
  try {
    await authStore.updateProfile({
      themePreference: theme,
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось сохранить настройки темы';
  }
};
</script>

<style scoped>
.appearance-section {
  padding: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 24px 0;
}

.theme-selector {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

/* Toggle Switch Container */
.theme-toggle-container {
  margin-bottom: 16px;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f3f4f6;
  border-radius: 12px;
}

.theme-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  min-width: 90px;
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sun-icon {
  color: #f59e0b;
}

.moon-icon {
  color: #6366f1;
}

/* Toggle Track */
.toggle-track {
  position: relative;
  width: 56px;
  height: 28px;
  background: #d1d5db;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-track:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.toggle-track.dark {
  background: #3b82f6;
}

.toggle-track.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Toggle Thumb */
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 12px;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-track.dark .toggle-thumb {
  transform: translateX(28px);
}

/* System Theme Checkbox */
.system-theme-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}

.system-checkbox {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkbox-custom {
  position: relative;
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: white;
  flex-shrink: 0;
  transition: all 0.2s;
}

.system-checkbox:checked + .checkbox-custom {
  background: #3b82f6;
  border-color: #3b82f6;
}

.system-checkbox:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.system-checkbox:focus + .checkbox-custom {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.option-desc {
  font-size: 13px;
  color: #6b7280;
}

.error-banner {
  padding: 12px;
  background: #fee;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
}








</style>

<style>
/* Dark theme styles - unscoped */
.dark .section-title {
  color: #f9fafb;
}

.dark .form-label {
  color: #d1d5db;
}

.dark .theme-toggle {
  background: #374151;
}

.dark .theme-label {
  color: #d1d5db;
}

.dark .toggle-track {
  background: #4b5563;
}

.dark .toggle-track.dark {
  background: #60a5fa;
}

.dark .checkbox-custom {
  background: #374151;
  border-color: #4b5563;
}

.dark .system-checkbox:checked + .checkbox-custom {
  background: #60a5fa;
  border-color: #60a5fa;
}

.dark .option-label {
  color: #f9fafb;
}

.dark .option-desc {
  color: #9ca3af;
}

.dark .error-banner {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fecaca;
}
</style>
