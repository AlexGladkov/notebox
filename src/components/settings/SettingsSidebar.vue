<template>
  <div class="settings-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">Настройки</h3>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="section in sections"
        :key="section.id"
        @click="$emit('selectSection', section.id)"
        :class="['nav-item', { active: activeSection === section.id }]"
      >
        <component :is="section.icon" class="nav-icon" />
        <span class="nav-label">{{ section.label }}</span>
      </button>

      <div class="nav-divider"></div>

      <button
        @click="$emit('logout')"
        class="nav-item logout-item"
      >
        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span class="nav-label">Выйти</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';

export interface SettingsSection {
  id: string;
  label: string;
  icon: any;
}

defineProps<{
  activeSection: string;
}>();

defineEmits<{
  (e: 'selectSection', section: string): void;
  (e: 'logout'): void;
}>();

const UserIcon = () => h('svg', {
  class: 'nav-icon',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
  })
]);

const PaletteIcon = () => h('svg', {
  class: 'nav-icon',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'
  })
]);

const BellIcon = () => h('svg', {
  class: 'nav-icon',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
  })
]);

const sections: SettingsSection[] = [
  { id: 'profile', label: 'Профиль', icon: UserIcon },
  { id: 'appearance', label: 'Внешний вид', icon: PaletteIcon },
  { id: 'notifications', label: 'Уведомления', icon: BellIcon },
];
</script>

<style scoped>
.settings-sidebar {
  width: 240px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-item.active {
  background: #eff6ff;
  color: #3b82f6;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

.nav-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 12px 0;
}

.logout-item {
  color: #dc2626;
}

.logout-item:hover {
  background: #fee;
  color: #dc2626;
}

@media (max-width: 768px) {
  .settings-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
  }

  .nav-label {
    display: none;
  }

  .nav-divider {
    width: 1px;
    height: auto;
    margin: 0 8px;
  }
}

@media (prefers-color-scheme: dark) {
  .settings-sidebar {
    background: #111827;
    border-right-color: #374151;
  }

  .sidebar-header {
    border-bottom-color: #374151;
  }

  .sidebar-title {
    color: #f9fafb;
  }

  .nav-item {
    color: #9ca3af;
  }

  .nav-item:hover {
    background: #1f2937;
    color: #f9fafb;
  }

  .nav-item.active {
    background: #1e3a8a;
    color: #60a5fa;
  }

  .nav-divider {
    background: #374151;
  }

  .logout-item {
    color: #f87171;
  }

  .logout-item:hover {
    background: #7f1d1d;
    color: #fecaca;
  }
}
</style>
