<template>
  <div class="appearance-section">
    <h2 class="section-title">Внешний вид</h2>

    <div class="theme-selector">
      <label class="form-label">Тема</label>
      <div class="theme-options">
        <button
          type="button"
          @click="selectTheme('light')"
          :class="['theme-card', { active: currentTheme === 'light' }]"
        >
          <div class="theme-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div class="theme-info">
            <div class="theme-name">Светлая</div>
            <div class="theme-desc">Светлая тема</div>
          </div>
          <div v-if="currentTheme === 'light'" class="check-icon">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>

        <button
          type="button"
          @click="selectTheme('dark')"
          :class="['theme-card', { active: currentTheme === 'dark' }]"
        >
          <div class="theme-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </div>
          <div class="theme-info">
            <div class="theme-name">Тёмная</div>
            <div class="theme-desc">Тёмная тема</div>
          </div>
          <div v-if="currentTheme === 'dark'" class="check-icon">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>

        <button
          type="button"
          @click="selectTheme('system')"
          :class="['theme-card', { active: currentTheme === 'system' }]"
        >
          <div class="theme-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div class="theme-info">
            <div class="theme-name">Системная</div>
            <div class="theme-desc">Следовать системным настройкам</div>
          </div>
          <div v-if="currentTheme === 'system'" class="check-icon">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>
      </div>
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

const { themeMode, setTheme } = useTheme();
const currentTheme = ref<ThemeMode>(themeMode.value);
const error = ref<string | null>(null);

onMounted(() => {
  currentTheme.value = themeMode.value;
});

watch(themeMode, (newTheme) => {
  currentTheme.value = newTheme;
});

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
  } catch (err: any) {
    error.value = err.message || 'Не удалось сохранить настройки темы';
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

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.theme-card:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.theme-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.theme-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  color: #6b7280;
}

.theme-card.active .theme-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.theme-info {
  flex: 1;
}

.theme-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.theme-desc {
  font-size: 13px;
  color: #6b7280;
}

.check-icon {
  flex-shrink: 0;
  color: #3b82f6;
}

.error-banner {
  padding: 12px;
  background: #fee;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .section-title {
    color: #f9fafb;
  }

  .form-label {
    color: #d1d5db;
  }

  .theme-card {
    background: #1f2937;
    border-color: #374151;
  }

  .theme-card:hover {
    border-color: #4b5563;
    background: #374151;
  }

  .theme-card.active {
    border-color: #60a5fa;
    background: #1e3a8a;
  }

  .theme-icon {
    background: #374151;
    color: #9ca3af;
  }

  .theme-card.active .theme-icon {
    background: #1e40af;
    color: #60a5fa;
  }

  .theme-name {
    color: #f9fafb;
  }

  .theme-desc {
    color: #9ca3af;
  }

  .check-icon {
    color: #60a5fa;
  }

  .error-banner {
    background: #7f1d1d;
    border-color: #991b1b;
    color: #fecaca;
  }
}
</style>
