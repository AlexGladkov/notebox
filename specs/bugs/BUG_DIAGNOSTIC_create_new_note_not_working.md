# Диагностический отчёт: Кнопка создания заметки не работает

## Краткое описание бага

При нажатии на кнопку плюс в левой панели навигации заметка не создаётся — ничего не происходит.

## Корневая причина

**Файл:** `src/views/MainView.vue`
**Строки:** 262-271

Функции `handleCreateRootPage` и `handleCreateSubpage` не используют `async/await` при вызове асинхронной функции `createNote`, а также передают неправильный тип аргумента в функцию `openTab`.

### Проблемный код (строки 262-271):

```javascript
function handleCreateRootPage() {
  const newNote = createNote('', null);  // БАГ: createNote — async функция, но await отсутствует
  openTab(newNote);                       // БАГ: передаётся Promise вместо note.id (string)
}

function handleCreateSubpage(parentId: string) {
  const newNote = createNote('', parentId);  // БАГ: аналогичная проблема
  openTab(newNote);                          // БАГ: передаётся Promise
  expandAllAncestors(newNote.id);            // БАГ: newNote — Promise, у него нет свойства id
}
```

### Ожидаемый код (см. App.vue строки 122-143):

```javascript
const handleCreateRootPage = async () => {
  try {
    const note = await createNote('Новая страница', null);
    openTab(note.id, false);
  } catch (error) {
    console.error('Не удалось создать страницу:', error);
  }
};

const handleCreateSubpage = async (parentId: string) => {
  const parentNote = getNoteById(parentId);
  if (!parentNote) return;

  try {
    const note = await createNote('Новая страница', parentId);
    expandAllAncestors(note.id);
    openTab(note.id, false);
  } catch (error) {
    console.error('Не удалось создать подстраницу:', error);
    alert(error instanceof Error ? error.message : 'Не удалось создать подстраницу');
  }
};
```

## Анализ

### Поток данных при создании заметки:

1. **UI уровень:** Пользователь нажимает кнопку `+` в левой панели (`MainView.vue:47`)
2. **Обработчик:** Вызывается `handleCreateRootPage()` (`MainView.vue:262`)
3. **Composable:** Вызывается `createNote()` из `useNotes.ts:31` — это **async** функция
4. **API вызов:** `notesApi.create()` отправляет POST запрос на сервер (`api/notes.ts:41`)
5. **Результат:** Функция возвращает `Promise<Note>`, а не `Note`

### Почему баг возник:

- Файл `MainView.vue` был создан в коммите `f056d16` (Feb 17, 2026) при добавлении OAuth
- В `App.vue` асинхронные обработчики были исправлены ранее в коммите `cc78a94` (Feb 12, 2026)
- При создании `MainView.vue` код был переписан заново без учёта этих исправлений
- TypeScript не выдал ошибку, так как `Promise` имеет свойство `id` (undefined), и `openTab` принимает `string`, но проверка выполняется в runtime

### Дополнительная проблема в handleUpdateNote (строка 273):

```javascript
function handleUpdateNote(updatedNote: any) {
  updateNote(updatedNote);  // БАГ: updateNote ожидает (id, updates), а не объект
  updateTabTitle(updatedNote.id, updatedNote.title);
}
```

Сигнатура `updateNote` в `useNotes.ts:46`:
```typescript
const updateNote = async (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {...}
```

## Затронутые файлы

| Файл | Описание изменений |
|------|-------------------|
| `src/views/MainView.vue` | Исправить `handleCreateRootPage`, `handleCreateSubpage`, `handleUpdateNote` |

## План исправления

### Шаг 1: Исправить handleCreateRootPage (строки 262-265)

**Было:**
```javascript
function handleCreateRootPage() {
  const newNote = createNote('', null);
  openTab(newNote);
}
```

**Станет:**
```javascript
async function handleCreateRootPage() {
  try {
    const newNote = await createNote('Новая страница', null);
    openTab(newNote.id);
  } catch (error) {
    console.error('Не удалось создать страницу:', error);
  }
}
```

### Шаг 2: Исправить handleCreateSubpage (строки 267-271)

**Было:**
```javascript
function handleCreateSubpage(parentId: string) {
  const newNote = createNote('', parentId);
  openTab(newNote);
  expandAllAncestors(newNote.id);
}
```

**Станет:**
```javascript
async function handleCreateSubpage(parentId: string) {
  try {
    const newNote = await createNote('Новая страница', parentId);
    expandAllAncestors(newNote.id);
    openTab(newNote.id);
  } catch (error) {
    console.error('Не удалось создать подстраницу:', error);
  }
}
```

### Шаг 3: Исправить handleUpdateNote (строки 273-276)

**Было:**
```javascript
function handleUpdateNote(updatedNote: any) {
  updateNote(updatedNote);
  updateTabTitle(updatedNote.id, updatedNote.title);
}
```

**Станет:**
```javascript
async function handleUpdateNote(updatedNote: { id: string; title?: string; content?: string }) {
  try {
    await updateNote(updatedNote.id, {
      title: updatedNote.title,
      content: updatedNote.content,
    });
    if (updatedNote.title !== undefined) {
      updateTabTitle(updatedNote.id, updatedNote.title);
    }
  } catch (error) {
    console.error('Не удалось обновить заметку:', error);
  }
}
```

## Стратегия тестирования

### Ручное тестирование:
1. Открыть приложение в браузере
2. Нажать кнопку `+` рядом с "Страницы" в левой панели
3. **Ожидаемый результат:** Новая страница создаётся и открывается в редакторе
4. Создать подстраницу (через контекстное меню существующей страницы)
5. **Ожидаемый результат:** Подстраница создаётся, родитель разворачивается, редактор открывается
6. Редактировать заголовок и контент страницы
7. **Ожидаемый результат:** Изменения сохраняются на сервере

### Проверка консоли:
- При создании заметки не должно быть ошибок
- В Network tab должны появляться POST/PUT запросы к `/api/notes`

### Автоматические тесты:
- Рекомендуется добавить unit-тесты для проверки async-логики в composables

## Оценка рисков

### Риски:
| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Регрессия при редактировании | Низкая | Средняя | Протестировать редактирование после исправления |
| Несовместимость с существующими заметками | Нет | — | Изменения затрагивают только создание/редактирование |

### Побочные эффекты:
- Нет побочных эффектов, так как исправления касаются только обработки асинхронных вызовов
- Исправления приводят код в соответствие с `App.vue`, где эта логика работает корректно

## Связанные файлы (для справки)

| Файл | Описание |
|------|----------|
| `src/App.vue` | Эталонная реализация с правильным async/await |
| `src/composables/useNotes.ts` | Composable с async функциями createNote, updateNote |
| `src/composables/useTabs.ts` | Composable для работы с вкладками (openTab принимает noteId: string) |
| `src/api/notes.ts` | API клиент для работы с заметками |

---

**Дата диагностики:** 2026-02-18
**Серьёзность:** HIGH
**Статус:** Готов к исправлению
