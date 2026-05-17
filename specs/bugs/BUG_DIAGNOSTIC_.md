# Диагностический отчёт: Фильтрация по тегу не показывает вложенные страницы

**Дата:** 2026-05-17  
**Серьёзность:** MEDIUM  
**Статус:** ПОДТВЕРЖДЁН (анализ кода)

---

## Bug Summary

При фильтрации заметок по тегу вложенные страницы (child pages) с этим тегом не отображаются в результатах — видны только страницы верхнего уровня. Проблема в логике вычисляемого свойства `rootNotes`, которое применяет фильтрацию только к корневым заметкам, полностью исключая вложенные страницы из проверки.

---

## Root Cause

**Файл:** `src/views/MainView.vue`  
**Строки:** 329-341  
**Функция:** `rootNotes` (computed property)  
**Уверенность:** HIGH

### Проблемный код:

```typescript
const rootNotes = computed(() => {
  let filtered = notes.value.filter(n => !n.parentId);  // ← ПРОБЛЕМА: только корневые!

  // Фильтрация по тегам (OR логика)
  if (selectedTagIds.value.length > 0) {
    filtered = filtered.filter(note => {
      if (!note.tags || note.tags.length === 0) return false;
      return note.tags.some(tag => selectedTagIds.value.includes(tag.id));
    });
  }

  return filtered.sort((a, b) => a.title.localeCompare(b.title));
});
```

### Почему это баг:

1. **Строка 330**: `notes.value.filter(n => !n.parentId)` выбирает ТОЛЬКО заметки без родителя
2. Вложенные заметки (с `parentId !== null`) исключаются из проверки на тег
3. Компонент `NoteTree.vue` показывает детей только видимых родителей
4. Если родитель скрыт фильтром, все его дети тоже скрыты — даже если они имеют нужный тег

### Пример сценария:

```
Структура:
├── Проект А (parentId: null, tags: [])
│   └── Задача 1 (parentId: "А", tags: ["важное"])  ← ИМЕЕТ ТЕГ!
└── Заметка Б (parentId: null, tags: ["важное"])

Фильтр по тегу "важное":
✅ Заметка Б — отображается (корневая + имеет тег)
❌ Проект А — скрыт (корневая, но нет тега)
❌ Задача 1 — скрыта (родитель скрыт, даже несмотря на тег)

Ожидалось: Заметка Б + Проект А с видимой Задачей 1 внутри
```

---

## Consilium Findings

### Architect (Code Tracer)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
- Подтверждён поток данных: `TagFilter → toggleTagFilter → selectedTagIds → rootNotes → NoteTree`
- Проблема в смешении логики выбора корневых элементов с фильтрацией по тегам
- Функция `expandAllAncestors` в useNotes.ts работает корректно, но бесполезна если предки скрыты фильтром
- Коммит `b8bedc9` (3 мая 2026) — первая реализация тегирования содержит этот баг

**Рекомендация:** Найти все заметки с нужным тегом (включая вложенные), затем добавить всех их предков в результат фильтрации.

### Stack Expert (Framework Analysis)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
- Все фреймворки и зависимости работают корректно (Vue 3.4.0, Vite 5.0.0, Spring Boot 3.2.2)
- Конфигурация Docker Compose и переменные окружения в порядке
- База данных правильно структурирована (таблицы notes, tags, note_tags)
- Backend API корректно возвращает все данные включая вложенные заметки с тегами
- Проблема исключительно в frontend логике фильтрации

**Рекомендация:** Изменить computed property `rootNotes` для поддержки иерархии при фильтрации.

### Консенсус

| Аспект | Architect | Stack Expert | Согласие |
|--------|-----------|--------------|----------|
| Корневая причина | MainView.vue:329-341 | MainView.vue:329-341 | ✅ |
| Проблемный компонент | rootNotes computed | rootNotes computed | ✅ |
| Backend/Config проблемы | Нет | Нет | ✅ |
| Рекомендуемое решение | Включить предков | Включить предков | ✅ |

**Разногласия:** НЕТ — полный консенсус по корневой причине и подходу к исправлению.

---

## Reproduction Results

**Воспроизведён:** ДА (через анализ кода)  
**Метод:** Code analysis (Playwright недоступен)

Баг подтверждён трассировкой логики от пользовательского действия до проблемного кода. Анализ показывает, что вложенные страницы с тегом гарантированно не будут отображены при текущей реализации.

---

## Affected Files

| Файл | Действие | Описание изменений |
|------|----------|-------------------|
| `src/views/MainView.vue` | MODIFY | Изменить логику `rootNotes` (строки 329-341) |

Дополнительные файлы НЕ требуют изменений:
- `NoteTree.vue` — работает корректно, получает неполные данные
- `TagFilter.vue` — работает корректно
- `useNotes.ts` — работает корректно
- Backend/API — работает корректно

---

## Fix Plan

### Шаг 1: Изменить логику rootNotes в MainView.vue

Заменить текущую реализацию на алгоритм, который:
1. Находит ВСЕ заметки с выбранным тегом (включая вложенные)
2. Для каждой найденной заметки собирает цепочку всех родителей
3. Возвращает корневые заметки, которые:
   - Либо сами имеют нужный тег
   - Либо являются предками заметок с нужным тегом
4. Автоматически разворачивает родителей для показа вложенных результатов

### Предложенная реализация:

```typescript
const rootNotes = computed(() => {
  if (selectedTagIds.value.length === 0) {
    // Без фильтра — стандартное поведение
    return notes.value
      .filter(n => !n.parentId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  // 1. Найти все заметки с выбранными тегами (включая вложенные)
  const notesWithSelectedTags = notes.value.filter(note =>
    note.tags?.some(tag => selectedTagIds.value.includes(tag.id))
  );

  // 2. Собрать ID всех предков для найденных заметок
  const ancestorIds = new Set<string>();
  notesWithSelectedTags.forEach(note => {
    let currentId = note.parentId;
    while (currentId) {
      ancestorIds.add(currentId);
      const parent = notes.value.find(n => n.id === currentId);
      currentId = parent?.parentId;
    }
  });

  // 3. Автоматически развернуть предков для показа результатов
  ancestorIds.forEach(id => expandedNotes.value.add(id));

  // 4. Вернуть корневые: имеющие тег ИЛИ являющиеся предками
  const matchedNoteIds = new Set(notesWithSelectedTags.map(n => n.id));
  return notes.value
    .filter(n => !n.parentId && (matchedNoteIds.has(n.id) || ancestorIds.has(n.id)))
    .sort((a, b) => a.title.localeCompare(b.title));
});
```

### Шаг 2: Тестирование

1. Проверить фильтрацию корневых заметок с тегом (регрессия)
2. Проверить фильтрацию вложенных заметок с тегом (основной кейс)
3. Проверить глубокую вложенность (3+ уровня)
4. Проверить множественные теги (OR логика)
5. Проверить очистку фильтра

---

## Testing Strategy

### Ручное тестирование:

1. **Создать тестовые данные:**
   - Корневая "Проект А" без тегов
   - Вложенная "Задача 1" в "Проект А" с тегом "важное"
   - Корневая "Заметка Б" с тегом "важное"

2. **Тест 1:** Фильтр по "важное" → должны отобразиться "Заметка Б" и "Проект А" с видимой "Задачей 1"

3. **Тест 2:** Создать глубокую иерархию (3+ уровня), проверить что все предки видны

4. **Тест 3:** Снять фильтр → стандартное поведение восстановлено

### Автоматизированные тесты:

```typescript
describe('rootNotes with tag filter', () => {
  it('should show nested notes with matching tag', () => {
    // Setup: parent without tag, child with tag
    // Assert: both parent and child visible after filter
  });

  it('should auto-expand ancestors of matching nested notes', () => {
    // Setup: deep hierarchy with tag on leaf
    // Assert: all ancestors expanded
  });

  it('should work with multiple selected tags (OR logic)', () => {
    // Setup: notes with different tags
    // Assert: notes with ANY selected tag visible
  });
});
```

---

## Risk Assessment

### Что может сломаться:

1. **Производительность при большом количестве заметок**
   - Риск: Средний
   - Митигация: Цикл while для поиска предков O(глубина), не O(N)

2. **Неожиданное раскрытие родителей**
   - Риск: Низкий
   - Митигация: Раскрытие только при активном фильтре

3. **Регрессия в фильтрации корневых заметок**
   - Риск: Низкий
   - Митигация: Сохранить логику для корневых заметок с тегом

### Рекомендации:

- Тестировать на репозитории с 100+ заметками
- Проверить поведение при циклических ссылках (если возможны)
- Добавить E2E тест для этого сценария

---

## Приложение: Поток данных

```
Пользователь кликает тег в TagFilter
    ↓
TagFilter.vue: emit('toggleTag', tagId)
    ↓
MainView.vue: toggleTagFilter(tagId) → selectedTagIds обновляется
    ↓
MainView.vue: rootNotes computed ПЕРЕЭВЫЧИСЛЯЕТСЯ
    ↓ [ПРОБЛЕМА ЗДЕСЬ]
Текущая логика: filter(n => !n.parentId) → только корневые
    ↓
NoteTree.vue: получает неполный массив
    ↓
Результат: вложенные заметки с тегом НЕ отображаются
```

---

**Автор отчёта:** Consilium Diagnostic System  
**Субагенты:** Architect, Stack Expert  
**Ветка:** `bugfix/filtratsiya-po-tegu-ne-pokazyvaet-vlozhennye-stran-2b048082`
