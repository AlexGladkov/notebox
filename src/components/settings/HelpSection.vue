<template>
  <div class="settings-section">
    <div class="section-header">
      <h2 class="section-title">Справка</h2>
      <p class="section-description">
        Получите помощь и узнайте больше о возможностях NoteBox
      </p>
    </div>

    <div class="section-content">
      <!-- Onboarding Tour -->
      <div class="setting-group">
        <h3 class="group-title">Обучение</h3>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Интерактивный тур</div>
            <div class="setting-description">
              Познакомьтесь с основными возможностями NoteBox через пошаговый тур
            </div>
          </div>
          <button
            @click="handleRestartTour"
            class="btn-primary"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Пройти тур заново
          </button>
        </div>
      </div>

      <!-- Documentation (future) -->
      <div class="setting-group">
        <h3 class="group-title">Документация</h3>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Руководство пользователя</div>
            <div class="setting-description">
              Подробная документация по всем функциям приложения
            </div>
          </div>
          <div class="badge-coming-soon">Скоро</div>
        </div>
      </div>

      <!-- About -->
      <div class="setting-group">
        <h3 class="group-title">О приложении</h3>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">NoteBox</div>
            <div class="setting-description">
              Персональное пространство для заметок и знаний
            </div>
          </div>
          <div class="version-badge">v0.1.0</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOnboarding } from '../../composables/useOnboarding';

const { resetOnboarding } = useOnboarding();

const handleRestartTour = () => {
  resetOnboarding();
};
</script>

<style scoped>
.settings-section {
  padding: 32px;
  max-width: 800px;
}

.section-header {
  margin-bottom: 32px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.section-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  gap: 16px;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.setting-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.badge-coming-soon {
  padding: 6px 12px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.version-badge {
  padding: 6px 12px;
  background: #e5e7eb;
  color: #6b7280;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 640px) {
  .settings-section {
    padding: 20px;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>

<style>
/* Dark theme styles */
.dark .section-title {
  color: #f9fafb;
}

.dark .section-description {
  color: #9ca3af;
}

.dark .group-title {
  color: #d1d5db;
}

.dark .setting-item {
  background: #111827;
  border-color: #374151;
}

.dark .setting-label {
  color: #f9fafb;
}

.dark .setting-description {
  color: #9ca3af;
}

.dark .version-badge {
  background: #374151;
  color: #9ca3af;
}
</style>
