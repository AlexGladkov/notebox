# Спецификация: Галерея шаблонов заметок

**ID задачи:** F-3bd75ec2
**Дата:** 2026-05-10
**Статус:** Готово к реализации

## Краткое описание

Создание библиотеки готовых шаблонов заметок (заметки для встреч, план проекта, журнал обучения) с возможностью создания заметки из шаблона одним кликом. AI-генерация примерного контента для быстрого онбординга новых пользователей.

---

## Требования

### Примечание об интервью

Интервью с пользователем не было проведено из-за недоступности бэкенда. Требования определены на основе описания задачи и анализа существующей кодовой базы.

### 1. Точки доступа к галерее шаблонов

**Основные способы доступа:**

1. **Slash-команда `/template`** — ввод в редакторе показывает список шаблонов для быстрой вставки
2. **Кнопка "Из шаблона" при создании заметки** — в контекстном меню или рядом с кнопкой создания новой заметки

**Обоснование:**
- Slash-команда интегрируется в существующий workflow редактирования
- Кнопка при создании заметки помогает новым пользователям обнаружить функцию

### 2. Список предустановленных шаблонов

| ID | Название | Иконка | Описание | Категория |
|----|----------|--------|----------|-----------|
| `meeting-notes` | Заметки со встречи | 📋 | Повестка, участники, решения, действия | Работа |
| `project-plan` | План проекта | 📊 | Цели, этапы, сроки, ресурсы | Работа |
| `learning-log` | Журнал обучения | 📚 | Тема, ключевые идеи, вопросы, следующие шаги | Обучение |
| `weekly-review` | Недельный обзор | 📅 | Достижения, проблемы, планы на следующую неделю | Личное |
| `brainstorm` | Мозговой штурм | 💡 | Проблема, идеи, оценка, следующие шаги | Работа |
| `daily-journal` | Дневник | ✏️ | События дня, мысли, благодарности | Личное |

### 3. AI-генерация контента

**Функциональность:**
- При создании заметки из шаблона предложить опцию "Заполнить примером с AI"
- AI генерирует реалистичный пример контента на основе структуры шаблона
- Пользователь может отказаться от AI-контента и получить пустой шаблон

**Реализация:**
- Новый API endpoint `/api/ai/generate-template-content`
- Request: `{ templateId: string }`
- Response: `{ content: string }`
- Fallback: если AI недоступен, использовать статический пример

### 4. One-click fork (создание заметки из шаблона)

**Процесс:**
1. Пользователь выбирает шаблон в галерее
2. Опционально: включает AI-генерацию примера
3. Нажимает "Создать"
4. Создаётся новая заметка с:
   - Названием шаблона (редактируемое)
   - Структурой/контентом шаблона
   - Иконкой шаблона

---

## Файлы для изменения/создания

### Новые файлы:

1. **`src/components/TemplateGallery/TemplateGalleryModal.vue`**
   - Модальное окно с сеткой шаблонов
   - Категории для фильтрации
   - Превью выбранного шаблона
   - Чекбокс "Заполнить примером с AI"
   - Кнопки "Создать" / "Отмена"

2. **`src/components/TemplateGallery/TemplateCard.vue`**
   - Карточка шаблона с иконкой, названием, описанием
   - Состояние hover/selected

3. **`src/components/TemplateGallery/TemplatePreview.vue`**
   - Превью структуры шаблона
   - Показывает заголовки разделов

4. **`src/data/templates.ts`**
   - Определение всех шаблонов
   - Структура контента для каждого шаблона
   - Статические примеры контента (fallback для AI)

5. **`src/composables/useTemplates.ts`**
   - Composable для работы с шаблонами
   - Создание заметки из шаблона
   - Запрос AI-контента

6. **`src/types/template.ts`**
   - TypeScript типы для шаблонов

### Изменяемые файлы:

7. **`src/components/BlockEditor.vue`**
   - Добавить slash-команду `/template`
   - Интеграция с модальным окном галереи

8. **`src/components/BlockEditor/SlashCommandMenu.vue`**
   - Добавить категорию "Шаблоны" (опционально)

9. **`src/components/Sidebar.vue`** или **`src/components/UnifiedSidebar.vue`**
   - Добавить кнопку/пункт "Создать из шаблона"

10. **`src/api/ai.ts`**
    - Добавить метод `generateTemplateContent(templateId: string)`

---

## Детальный план реализации

### Этап 1: Типы и данные шаблонов

1. Создать `src/types/template.ts`:
```typescript
export interface Template {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  content: string; // TipTap JSON или HTML
  staticExample?: string; // Fallback для AI
}

export type TemplateCategory = 'work' | 'personal' | 'learning';

export interface TemplateWithExample extends Template {
  generatedContent?: string;
}
```

2. Создать `src/data/templates.ts` с определениями шаблонов:
```typescript
export const templates: Template[] = [
  {
    id: 'meeting-notes',
    title: 'Заметки со встречи',
    description: 'Повестка, участники, решения, действия',
    icon: '📋',
    category: 'work',
    content: `
      <h2>📅 Встреча: [Тема]</h2>
      <p><strong>Дата:</strong> [Дата]</p>
      <p><strong>Участники:</strong></p>
      <ul><li></li></ul>
      <h3>Повестка</h3>
      <ul class="task-list"><li data-checked="false"></li></ul>
      <h3>Ключевые решения</h3>
      <ul><li></li></ul>
      <h3>Действия</h3>
      <ul class="task-list"><li data-checked="false"></li></ul>
    `,
  },
  // ... остальные шаблоны
];
```

### Этап 2: Composable useTemplates

```typescript
// src/composables/useTemplates.ts
import { ref } from 'vue';
import { templates } from '../data/templates';
import { aiApi } from '../api/ai';
import { useNotes } from './useNotes';

export function useTemplates() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getTemplates = () => templates;

  const getTemplatesByCategory = (category: TemplateCategory) => 
    templates.filter(t => t.category === category);

  const createNoteFromTemplate = async (
    templateId: string, 
    options: { useAI?: boolean; parentId?: string | null } = {}
  ) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    let content = template.content;

    if (options.useAI) {
      try {
        loading.value = true;
        const aiContent = await aiApi.generateTemplateContent(templateId);
        content = aiContent || template.staticExample || template.content;
      } catch (e) {
        content = template.staticExample || template.content;
      } finally {
        loading.value = false;
      }
    }

    // Создать заметку через useNotes
    // ...
  };

  return { loading, error, getTemplates, getTemplatesByCategory, createNoteFromTemplate };
}
```

### Этап 3: UI компоненты

#### TemplateGalleryModal.vue

- Модальное окно с backdrop
- Grid layout для карточек (3 колонки на desktop, 2 на tablet, 1 на mobile)
- Фильтр по категориям (tabs или chips)
- Секция превью справа (на desktop) или снизу (на mobile)
- Footer с чекбоксом AI и кнопками

#### TemplateCard.vue

- Размер: ~200x120px
- Иконка (emoji), название, краткое описание
- Hover effect: приподнятие + тень
- Selected state: синяя рамка

### Этап 4: Интеграция

1. Добавить slash-команду в `BlockEditor.vue`:
```typescript
{
  id: 'template',
  title: 'Шаблон',
  description: 'Создать заметку из шаблона',
  icon: '📑',
  category: 'Вставки',
  keywords: ['template', 'шаблон', 'образец'],
  command: (editor) => {
    // Удалить slash-команду
    // Показать модальное окно галереи
    showTemplateGallery.value = true;
  },
}
```

2. Добавить кнопку в sidebar (опционально):
- Рядом с "Новая заметка" добавить dropdown или отдельную кнопку "Из шаблона"

### Этап 5: AI интеграция

Добавить в `src/api/ai.ts`:
```typescript
async generateTemplateContent(templateId: string): Promise<string> {
  try {
    const response = await apiClient.post<AIResponse>('/api/ai/generate-template', {
      templateId,
    });
    return response.result;
  } catch (error) {
    console.error('AI template generation error:', error);
    return ''; // Fallback к статическому контенту
  }
}
```

---

## Дизайн и стили

### Модальное окно галереи

```
+--------------------------------------------------+
|  Выберите шаблон                            [X]  |
+--------------------------------------------------+
| [Все] [Работа] [Личное] [Обучение]               |
+--------------------------------------------------+
| +--------+  +--------+  +--------+               |
| |  📋    |  |  📊    |  |  📚    |               |
| |Встреча |  |Проект  |  |Журнал  |               |
| |        |  |        |  |обучения|               |
| +--------+  +--------+  +--------+               |
|                                                  |
| +--------+  +--------+  +--------+               |
| |  📅    |  |  💡    |  |  ✏️    |               |
| |Неделя  |  |Идеи    |  |Дневник |               |
| +--------+  +--------+  +--------+               |
+--------------------------------------------------+
| [ ] Заполнить примером с AI                      |
|                                                  |
|                    [Отмена] [Создать]            |
+--------------------------------------------------+
```

### Цветовая схема

- Фон модалки: белый / dark: #1f2937
- Карточки: #f9fafb / dark: #374151
- Selected: border #3b82f6
- Hover: shadow-lg, translateY(-2px)

### Адаптивность

- Desktop (>1024px): 3 колонки, превью справа
- Tablet (768-1024px): 2 колонки, превью снизу
- Mobile (<768px): 1 колонка, превью снизу

---

## Acceptance Criteria

### Галерея шаблонов:
- [ ] Модальное окно открывается по slash-команде `/template`
- [ ] Отображаются все 6 предустановленных шаблонов
- [ ] Шаблоны можно фильтровать по категориям
- [ ] Карточка шаблона показывает иконку, название и описание
- [ ] При выборе шаблона показывается его превью
- [ ] Модальное окно закрывается по Escape или кнопке X

### Создание заметки:
- [ ] При нажатии "Создать" создаётся новая заметка
- [ ] Заметка содержит структуру выбранного шаблона
- [ ] Заметка получает иконку шаблона
- [ ] Название заметки = название шаблона (редактируемое)
- [ ] После создания пользователь переходит к новой заметке

### AI-генерация:
- [ ] Чекбокс "Заполнить примером с AI" работает
- [ ] При включённом AI отправляется запрос к API
- [ ] При ошибке AI используется статический пример
- [ ] Показывается loading state во время генерации

### UI/UX:
- [ ] Модальное окно стилизовано под дизайн приложения
- [ ] Поддержка тёмной темы
- [ ] Адаптивный дизайн (mobile/tablet/desktop)
- [ ] Анимации hover/selected состояний

---

## Edge Cases и риски

1. **AI API недоступен**: Используется статический пример контента. UI показывает уведомление "AI временно недоступен".

2. **Долгая генерация AI**: Показывать skeleton/spinner. Timeout 10 секунд, после — fallback.

3. **Большое количество шаблонов в будущем**: Предусмотреть поиск по шаблонам (searchbar в модалке).

4. **Конфликт с существующими slash-командами**: `/template` не конфликтует с текущими командами.

5. **Несохранённая текущая заметка**: При создании из шаблона в новой вкладке — не требует сохранения текущей.

6. **Локализация**: Все тексты на русском языке. В будущем возможна поддержка i18n.

---

## Out of Scope

- Пользовательские шаблоны (создание своих шаблонов)
- Синхронизация шаблонов между устройствами
- Импорт шаблонов из внешних источников
- Версионирование шаблонов
- Шаблоны с базами данных (Database blocks)
- Шаринг шаблонов между пользователями
- История использования шаблонов / популярные шаблоны

---

## Технические примечания

- TipTap редактор поддерживает вставку HTML-контента через `setContent()`
- Slash-команды уже сгруппированы по категориям (см. SlashCommandMenu.vue)
- AI API уже имеет endpoints для `summarize` и `expand`
- Модальные окна в проекте используют Tailwind для стилизации
- Тёмная тема реализована через CSS-классы `.dark`

---

## Зависимости

- Никаких новых npm-зависимостей не требуется
- Все необходимые компоненты (TipTap, Tailwind, Vue) уже в проекте
