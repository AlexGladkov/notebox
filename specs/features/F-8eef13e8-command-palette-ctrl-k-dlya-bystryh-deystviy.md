# Command Palette (Ctrl+K) для быстрых действий

## Summary

Реализация универсальной командной палитры в стиле VS Code/Notion для приложения Notebox. Палитра позволяет быстро выполнять действия, искать заметки и навигироваться по приложению с помощью клавиатуры.

## Требования

### Функциональные требования

1. **Модальный компонент CommandPalette.vue**
   - Полноэкранный оверлей с центрированным модальным окном
   - Поле ввода для поиска/фильтрации
   - Секции результатов: "Недавние заметки", "Команды", "Результаты поиска"
   - Поддержка темной и светлой темы (Tailwind CSS)

2. **Fuzzy-поиск**
   - Поиск по названиям заметок (title)
   - Поиск по командам (title, keywords)
   - Case-insensitive поиск
   - Сортировка результатов по релевантности

3. **Горячие клавиши**
   - `Ctrl+K` / `Cmd+K` — открыть/закрыть палитру
   - `Ctrl+N` / `Cmd+N` — создать новую заметку
   - `Ctrl+G` / `Cmd+G` — открыть граф связей
   - `Escape` — закрыть палитру
   - `ArrowUp` / `ArrowDown` — навигация по списку
   - `Enter` — выполнить выбранную команду

4. **Интеграция с существующим функционалом**
   - Переиспользование логики поиска из `useSearch.ts`
   - Добавление глобальных команд приложения (не только редактора)
   - Отображение подсказок горячих клавиш для команд

5. **Секции палитры**
   - **Недавние заметки** — последние 5 открытых/измененных заметок
   - **Команды** — глобальные действия приложения
   - **Результаты поиска** — динамические результаты при вводе запроса

### Нефункциональные требования

- Отзывчивый UI (анимации открытия/закрытия)
- Доступность (a11y): поддержка screen readers, фокус-ловушка
- Работа во всех views приложения (MainView, GraphView, BillingView)

## Архитектура решения

### Подход к интеграции

Гибридный подход: создание независимого компонента CommandPalette с собственной логикой команд, при этом переиспользуя существующие composables (`useSearch`, `useNotes`, `useTabs`).

Причины выбора:
- SlashCommandMenu привязан к контексту TipTap редактора
- Глобальные команды приложения отличаются от slash-команд редактора
- Палитра должна работать во всех views, а не только в редакторе

### Структура команд

```typescript
interface CommandPaletteItem {
  id: string;
  type: 'note' | 'command' | 'search-result';
  title: string;
  description?: string;
  icon: string;
  shortcut?: string;      // Например "⌘N" или "Ctrl+N"
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteSection {
  id: string;
  title: string;
  items: CommandPaletteItem[];
}
```

### Глобальные команды

| Команда | Shortcut | Описание |
|---------|----------|----------|
| Новая заметка | Ctrl+N | Создает новую заметку в корне |
| Граф связей | Ctrl+G | Открывает граф связей |
| Настройки | - | Открывает модальное окно настроек |
| Переключить тему | - | Циклическое переключение light/dark/system |
| Поиск | Ctrl+K | Фокус на поле поиска |

## Файлы для создания

1. **`src/components/CommandPalette.vue`**
   - Основной компонент палитры
   - Template: modal overlay, input, sections list
   - Script: логика фильтрации, навигации, выполнения команд

2. **`src/composables/useCommandPalette.ts`**
   - Состояние палитры (isOpen, query, selectedIndex)
   - Список глобальных команд
   - Методы: open, close, toggle, execute
   - Регистрация глобальных горячих клавиш

3. **`src/composables/useRecentNotes.ts`**
   - Отслеживание недавно открытых заметок
   - Сохранение в localStorage
   - Лимит 10 заметок

4. **`src/types/commandPalette.ts`**
   - TypeScript типы для команд и секций

## Файлы для модификации

1. **`src/AppWrapper.vue`**
   - Добавить `<CommandPalette />` компонент
   - Инициализировать глобальные горячие клавиши

2. **`src/stores/uiStore.ts`**
   - Добавить `commandPaletteOpen: boolean` в state
   - Добавить actions: `openCommandPalette`, `closeCommandPalette`

3. **`src/composables/useTabs.ts`**
   - Добавить трекинг недавно открытых заметок при вызове `openTab`

## Детальная реализация

### CommandPalette.vue — структура шаблона

```vue
<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="isOpen" class="command-palette-overlay" @click.self="close">
        <div class="command-palette" role="dialog" aria-modal="true">
          <!-- Search input -->
          <div class="palette-header">
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="Введите команду или название заметки..."
              @keydown="handleKeydown"
            />
          </div>
          
          <!-- Results -->
          <div class="palette-content">
            <template v-for="section in filteredSections" :key="section.id">
              <div v-if="section.items.length > 0" class="palette-section">
                <div class="section-title">{{ section.title }}</div>
                <div
                  v-for="(item, index) in section.items"
                  :key="item.id"
                  :class="['palette-item', { active: isSelected(item) }]"
                  @click="executeItem(item)"
                  @mouseenter="selectItem(item)"
                >
                  <span class="item-icon">{{ item.icon }}</span>
                  <div class="item-content">
                    <div class="item-title">{{ item.title }}</div>
                    <div v-if="item.description" class="item-description">
                      {{ item.description }}
                    </div>
                  </div>
                  <span v-if="item.shortcut" class="item-shortcut">
                    {{ item.shortcut }}
                  </span>
                </div>
              </div>
            </template>
            
            <!-- Empty state -->
            <div v-if="isEmpty" class="palette-empty">
              Ничего не найдено
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

### useCommandPalette.ts — логика

```typescript
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUIStore } from '../stores/uiStore';
import { useNotesStore } from '../stores/notesStore';
import { useNotes } from './useNotes';
import { useTabs } from './useTabs';
import { useTheme } from './useTheme';
import { useRecentNotes } from './useRecentNotes';

export function useCommandPalette() {
  const router = useRouter();
  const uiStore = useUIStore();
  const notesStore = useNotesStore();
  const { createNote } = useNotes();
  const { openTab } = useTabs();
  const { cycleTheme } = useTheme();
  const { recentNotes } = useRecentNotes();
  
  const query = ref('');
  const selectedIndex = ref(0);
  
  // Глобальные команды
  const commands = computed(() => [
    {
      id: 'new-note',
      type: 'command' as const,
      title: 'Новая заметка',
      description: 'Создать новую заметку в корне',
      icon: '📝',
      shortcut: isMac ? '⌘N' : 'Ctrl+N',
      keywords: ['create', 'add', 'note', 'page'],
      action: async () => {
        const note = await createNote('Новая страница', null);
        openTab(note.id);
        close();
      },
    },
    {
      id: 'open-graph',
      type: 'command' as const,
      title: 'Граф связей',
      description: 'Открыть визуализацию связей заметок',
      icon: '🗺️',
      shortcut: isMac ? '⌘G' : 'Ctrl+G',
      keywords: ['graph', 'links', 'map', 'visualization'],
      action: () => {
        router.push('/graph');
        close();
      },
    },
    {
      id: 'toggle-theme',
      type: 'command' as const,
      title: 'Переключить тему',
      description: 'Циклически переключить светлую/темную/системную тему',
      icon: '🎨',
      keywords: ['theme', 'dark', 'light', 'mode'],
      action: () => {
        cycleTheme();
      },
    },
    {
      id: 'open-settings',
      type: 'command' as const,
      title: 'Настройки',
      description: 'Открыть настройки профиля',
      icon: '⚙️',
      keywords: ['settings', 'preferences', 'profile'],
      action: () => {
        uiStore.openModal('settings');
        close();
      },
    },
  ]);
  
  // Регистрация глобальных горячих клавиш
  function handleGlobalKeydown(e: KeyboardEvent) {
    const isMod = e.metaKey || e.ctrlKey;
    
    if (isMod && e.key === 'k') {
      e.preventDefault();
      toggle();
    } else if (isMod && e.key === 'n') {
      e.preventDefault();
      commands.value.find(c => c.id === 'new-note')?.action();
    } else if (isMod && e.key === 'g') {
      e.preventDefault();
      commands.value.find(c => c.id === 'open-graph')?.action();
    }
  }
  
  onMounted(() => {
    window.addEventListener('keydown', handleGlobalKeydown);
  });
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeydown);
  });
  
  // ...остальная логика
}
```

### Fuzzy-поиск

Простая реализация fuzzy-поиска на основе includes с весами:

```typescript
function fuzzyMatch(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Точное совпадение в начале — максимальный вес
  if (lowerText.startsWith(lowerQuery)) return 100;
  
  // Содержит запрос
  if (lowerText.includes(lowerQuery)) return 50;
  
  // Совпадение по отдельным словам
  const queryWords = lowerQuery.split(/\s+/);
  const matchedWords = queryWords.filter(w => lowerText.includes(w));
  if (matchedWords.length === queryWords.length) return 30;
  if (matchedWords.length > 0) return 10;
  
  return 0;
}
```

## Критерии приемки

1. [ ] `Ctrl+K` / `Cmd+K` открывает палитру из любого места приложения
2. [ ] Поиск работает по названиям заметок и командам
3. [ ] Навигация стрелками `ArrowUp` / `ArrowDown` и `Enter` для выбора
4. [ ] `Escape` закрывает палитру
5. [ ] Показываются подсказки горячих клавиш для команд
6. [ ] Секция "Недавние заметки" показывает последние открытые заметки
7. [ ] Работает в светлой и темной теме
8. [ ] Палитра доступна во всех views (MainView, GraphView, BillingView)
9. [ ] `Ctrl+N` создает новую заметку
10. [ ] `Ctrl+G` открывает граф связей

## Edge cases и риски

### Edge cases

1. **Нет недавних заметок** — скрыть секцию "Недавние заметки"
2. **Пустой поисковый запрос** — показать недавние заметки и все команды
3. **Нет результатов поиска** — показать сообщение "Ничего не найдено"
4. **Открытие палитры во время модального окна** — палитра должна открываться поверх других модальных окон (z-index)
5. **Длинные названия заметок** — обрезать с ellipsis

### Риски

1. **Конфликт горячих клавиш с браузером/OS**
   - Mitigation: использовать `e.preventDefault()` только когда палитра открыта или для известных комбинаций
   
2. **Производительность поиска при большом количестве заметок**
   - Mitigation: debounce поискового запроса (150ms), лимит результатов (20)
   
3. **Фокус теряется при закрытии палитры**
   - Mitigation: сохранять activeElement перед открытием, восстанавливать при закрытии

## Out of scope

1. Интеграция со slash-командами редактора (слишком связано с контекстом TipTap)
2. Кастомизация горячих клавиш пользователем
3. Поиск по содержимому заметок (только по названиям)
4. Fuzzy-match с подсветкой совпадений (может быть добавлено позже)
5. Категоризация команд по группам
6. История выполненных команд

## Deployment considerations

- Компонент монтируется в `AppWrapper.vue` через `<Teleport to="body">`
- Глобальные горячие клавиши регистрируются при монтировании AppWrapper
- Недавние заметки сохраняются в localStorage с ключом `notebox-recent-notes`

## Оценка трудозатрат

- Создание компонента CommandPalette.vue: 3-4 часа
- Composable useCommandPalette.ts: 2-3 часа
- Composable useRecentNotes.ts: 1 час
- Интеграция и тестирование: 2 часа
- **Итого: 8-10 часов**
