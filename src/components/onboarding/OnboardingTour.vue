<template>
  <div></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useOnboarding } from '../../composables/useOnboarding';
import { useNotes } from '../../composables/useNotes';
import { templates } from '../../data/templates';
import { useRouter } from 'vue-router';
import type { DriveStep, Config } from 'driver.js';

const { isOnboardingActive, completeOnboarding } = useOnboarding();
const { createNote, updateNote } = useNotes();
const router = useRouter();

let driver: any = null;
let isInitializing = false;

// Получаем шаблоны quickstart
const quickstartTemplates = templates.filter(t => t.category === 'quickstart');

// Функция для создания заметки из шаблона
const createNoteFromTemplate = async (templateId: string) => {
  try {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      console.error('Template not found:', templateId);
      return;
    }

    // Создаем заметку с названием и контентом из шаблона
    const note = await createNote(template.title);

    // Заменяем {{DATE}} на текущую дату
    const today = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const content = template.content.replace(/\{\{DATE\}\}/g, today);

    // Обновляем заметку с контентом и иконкой
    await updateNote(note.id, {
      content,
      icon: template.icon
    });

    // Закрываем тур
    if (driver) {
      driver.destroy();
    }

    // Переходим к созданной заметке
    router.push(`/?note=${note.id}`);
  } catch (error) {
    console.error('Failed to create note from template:', error);
  }
};

// Генерируем HTML для кнопок шаблонов
const templatesButtonsHTML = quickstartTemplates.map(template => `
  <button
    class="onboarding-template-btn"
    data-template-id="${template.id}"
  >
    <span class="template-icon">${template.icon}</span>
    <div class="template-content">
      <div class="template-title">${template.title}</div>
      <div class="template-description">${template.description}</div>
    </div>
  </button>
`).join('');

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
      description: `
        <p style="margin-bottom: 16px;">Теперь вы готовы работать с NoteBox! Выберите шаблон для быстрого старта:</p>
        ${templatesButtonsHTML}
      `,
    },
  },
];

const initDriver = async () => {
  if (driver) return;

  try {
    const { driver: createDriver } = await import('driver.js');
    await import('driver.js/dist/driver.css');

    const config: Config = {
      showProgress: true,
      steps: tourSteps,
      nextBtnText: 'Далее',
      prevBtnText: 'Назад',
      doneBtnText: 'Завершить',
      progressText: '{{current}} из {{total}}',
      onPopoverRender: (popover: any) => {
        // Используем nextTick для добавления обработчиков после рендеринга DOM
        nextTick(() => {
          const templateButtons = document.querySelectorAll('.onboarding-template-btn');
          templateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const templateId = (button as HTMLElement).getAttribute('data-template-id');
              if (templateId) {
                createNoteFromTemplate(templateId);
              }
            });
          });
        });
      },
      onDestroyed: () => {
        completeOnboarding();
      },
    };

    driver = createDriver(config);
  } catch (error) {
    console.error('Failed to initialize driver:', error);
  }
};

const startTour = async () => {
  if (isInitializing) return;

  // Сбрасываем существующий driver перед повторным запуском
  if (driver) {
    driver.destroy();
    driver = null;
  }

  isInitializing = true;

  // Ждем следующий тик для рендеринга DOM
  await nextTick();

  await initDriver();
  if (driver) {
    driver.drive();
  }

  isInitializing = false;
};

watch(isOnboardingActive, async (active) => {
  if (active) {
    await startTour();
  }
});

onMounted(async () => {
  if (isOnboardingActive.value) {
    // Задержка для полного рендеринга интерфейса, включая ProseMirror редактор и все sidebar элементы
    setTimeout(startTour, 300);
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

/* Стили для кнопок шаблонов */
.onboarding-template-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  margin-top: 8px;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.onboarding-template-btn:hover {
  background: #e5e7eb;
  border-color: #3b82f6;
}

.onboarding-template-btn .template-icon {
  font-size: 24px;
}

.onboarding-template-btn .template-content {
  text-align: left;
  flex: 1;
}

.onboarding-template-btn .template-title {
  font-weight: 600;
}

.onboarding-template-btn .template-description {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

/* Темная тема для кнопок шаблонов */
.dark .onboarding-template-btn {
  background: #374151;
  color: #d1d5db;
}

.dark .onboarding-template-btn:hover {
  background: #4b5563;
  border-color: #3b82f6;
}

.dark .onboarding-template-btn .template-description {
  color: #9ca3af;
}
</style>
