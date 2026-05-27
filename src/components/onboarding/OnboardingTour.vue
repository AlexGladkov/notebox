<template>
  <div></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useOnboarding } from '../../composables/useOnboarding';
import type { DriveStep, Config } from 'driver.js';

const { isOnboardingActive, completeOnboarding } = useOnboarding();

let driver: any = null;

const tourSteps: DriveStep[] = [
  {
    popover: {
      title: '👋 Добро пожаловать в NoteBox!',
      description: 'Это ваше персональное пространство для заметок, идей и знаний. Давайте познакомимся с основными возможностями.',
    },
  },
  {
    element: '.ProseMirror',
    popover: {
      title: '✍️ Редактор заметок',
      description: 'Здесь вы пишете свои заметки. Используйте форматирование текста, добавляйте списки, заголовки и многое другое.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.ProseMirror',
    popover: {
      title: '⚡ Slash-команды',
      description: 'Нажмите "/" в редакторе для быстрого доступа к специальным блокам: заголовкам, спискам, таблицам и базам данных.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.ProseMirror',
    popover: {
      title: '🔗 Wiki-ссылки',
      description: 'Используйте [[название заметки]] для создания связей между заметками. Это помогает строить сеть знаний.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-onboarding="graph-button"]',
    popover: {
      title: '🕸️ Граф связей',
      description: 'Визуализируйте связи между вашими заметками в интерактивном графе. Находите неожиданные связи и паттерны.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '.fab-main',
    popover: {
      title: '⚡ Быстрый захват',
      description: 'Используйте эту кнопку для мгновенного создания заметки. Поддерживает голосовой ввод и автоматическое сохранение.',
      side: 'left',
      align: 'end',
    },
  },
  {
    popover: {
      title: '🎉 Готово! Создайте первую заметку',
      description: 'Теперь вы готовы работать с NoteBox! Выберите шаблон для быстрого старта или создайте заметку с нуля.',
    },
  },
];

const initDriver = async () => {
  if (driver) return;

  const { driver: createDriver } = await import('driver.js');
  await import('driver.js/dist/driver.css');

  const config: Config = {
    showProgress: true,
    steps: tourSteps,
    nextBtnText: 'Далее',
    prevBtnText: 'Назад',
    doneBtnText: 'Завершить',
    progressText: '{{current}} из {{total}}',
    onDestroyed: () => {
      completeOnboarding();
    },
    onDestroyStarted: () => {
      if (driver && !driver.isLastStep()) {
        if (confirm('Вы уверены, что хотите пропустить тур? Вы всегда можете запустить его снова из настроек.')) {
          driver.destroy();
          completeOnboarding();
        }
      } else {
        driver?.destroy();
        completeOnboarding();
      }
    },
  };

  driver = createDriver(config);
};

const startTour = async () => {
  await initDriver();
  if (driver) {
    driver.drive();
  }
};

watch(isOnboardingActive, async (active) => {
  if (active) {
    // Небольшая задержка для рендеринга DOM
    setTimeout(() => {
      startTour();
    }, 500);
  }
});

onMounted(async () => {
  if (isOnboardingActive.value) {
    await startTour();
  }
});

onUnmounted(() => {
  if (driver) {
    driver.destroy();
    driver = null;
  }
});
</script>

<style>
/* Стили для Driver.js с поддержкой тёмной темы */
.driver-popover {
  background: white;
  color: #1f2937;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.driver-popover-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.driver-popover-description {
  font-size: 14px;
  line-height: 1.5;
  color: #4b5563;
}

.driver-popover-navigation-btns {
  gap: 8px;
}

.driver-popover-next-btn,
.driver-popover-prev-btn,
.driver-popover-close-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.driver-popover-next-btn {
  background: #3b82f6;
  color: white;
}

.driver-popover-next-btn:hover {
  background: #2563eb;
}

.driver-popover-prev-btn {
  background: #f3f4f6;
  color: #374151;
}

.driver-popover-prev-btn:hover {
  background: #e5e7eb;
}

.driver-popover-close-btn {
  background: transparent;
  color: #6b7280;
}

.driver-popover-close-btn:hover {
  color: #111827;
}

.driver-popover-progress-text {
  font-size: 12px;
  color: #6b7280;
}

/* Тёмная тема */
.dark .driver-popover {
  background: #1f2937;
  color: #f9fafb;
}

.dark .driver-popover-title {
  color: #f9fafb;
}

.dark .driver-popover-description {
  color: #d1d5db;
}

.dark .driver-popover-prev-btn {
  background: #374151;
  color: #d1d5db;
}

.dark .driver-popover-prev-btn:hover {
  background: #4b5563;
}

.dark .driver-popover-close-btn {
  color: #9ca3af;
}

.dark .driver-popover-close-btn:hover {
  color: #f9fafb;
}

.dark .driver-popover-progress-text {
  color: #9ca3af;
}
</style>
