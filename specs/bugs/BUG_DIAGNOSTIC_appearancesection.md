# Диагностический отчёт: AppearanceSection не синхронизирует тему при монтировании

**Дата:** 2026-05-23  
**Серьёзность:** MEDIUM  
**Статус:** БАГ ПОДТВЕРЖДЁН И ВОСПРОИЗВЕДЁН

---

## Краткое описание бага

Компонент AppearanceSection читает тему из localStorage при монтировании, но не подписывается на изменения. Если тема изменена в другой вкладке или через DevTools, компонент показывает устаревшее значение.

---

## Корневая причина

**Файл:** `src/stores/uiStore.ts`  
**Строки:** 216-233 (метод `initializeTheme()`)  
**Уверенность:** ВЫСОКАЯ

### Описание проблемы

Метод `initializeTheme()` в UIStore:
1. Загружает тему из localStorage **один раз** через `loadTheme()`
2. Инициализирует слушатель системных настроек через `initSystemThemeListener()`
3. **НЕ подписывается** на браузерное событие `storage` для синхронизации между вкладками

```typescript
// src/stores/uiStore.ts:216-233
initializeTheme(): void {
  if (this.themeInitialized) return;

  this.loadTheme();
  this.initSystemThemeListener();
  this.applyTheme();

  // Следим за изменениями и применяем тему
  watch(() => this.effectiveTheme, () => {
    this.applyTheme();
  });

  watch(() => this.themeMode, () => {
    this.saveTheme();
  });

  this.themeInitialized = true;
}
// ❌ ОТСУТСТВУЕТ: window.addEventListener('storage', ...)
```

### Цепочка проблемы

```
localStorage.setItem('notebox-theme', 'dark')  // Из другой вкладки
         ↓
  [Event: storage]  // Событие браузера срабатывает
         ↓
UIStore.themeMode  // НЕ ИЗМЕНЯЕТСЯ (слушатель не установлен)
         ↓
AppearanceSection.currentTheme  // Остается старым значением
         ↓
UI показывает устаревшую тему  // БАГ
```

---

## Результаты Consilium

### Architect (Code Tracer)

**Согласен с корневой причиной:** ДА

**Основные находки:**
- UIStore не имеет механизма для реакции на браузерные события `window.addEventListener('storage', ...)`
- Store полностью зависит от внутренних mutations и watch реакций
- Ни один из недавних коммитов не добавлял cross-tab синхронизацию
- Однонаправленная синхронизация: localStorage → UIStore (только при инициализации)

### Stack Expert (Framework Analysis)

**Согласен с корневой причиной:** ДА

**Основные находки:**
- Технологический стек (Vue 3.4, Pinia 2.3, Vite 5.0) настроен корректно
- Нет версионных конфликтов или несовместимостей
- Проблема не в фреймворке, а в архитектурном упущении приложения
- Дополнительно: AppearanceSection использует anti-pattern с промежуточным ref

### Консенсус

**Согласие:** ПОЛНОЕ  
**Разногласия:** НЕТ

Оба субагента единогласно определили:
1. Корневая причина — отсутствие storage event listener в UIStore
2. Сложность исправления — НИЗКАЯ (~5-10 строк кода)
3. Файл для исправления — `src/stores/uiStore.ts`

---

## Результаты воспроизведения

**Статус:** БАГ УСПЕШНО ВОСПРОИЗВЕДЁН

**Шаги воспроизведения:**
1. Вход в демо-режим приложения
2. Открытие раздела Settings → Внешний вид
3. Установка светлой темы (`localStorage: notebox-theme = "light"`)
4. Открытие второй вкладки и изменение темы через DevTools: `localStorage.setItem('notebox-theme', 'dark')`
5. Возврат на первую вкладку

**Ожидаемый результат:** Компонент показывает тёмную тему  
**Фактический результат:** Компонент показывает светлую тему (устаревшее значение)

**Доказательства:** `.reproduction-evidence/step6-first-tab-after-change.png`

---

## Затронутые файлы

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `src/stores/uiStore.ts` | MODIFY | Добавить storage event listener в `initializeTheme()` |
| `src/components/settings/AppearanceSection.vue` | OPTIONAL | Можно упростить, убрав промежуточный ref |

---

## План исправления

### Шаг 1: Добавить storage event listener в UIStore (ОБЯЗАТЕЛЬНО)

**Файл:** `src/stores/uiStore.ts`  
**Метод:** `initializeTheme()`

Добавить подписку на событие `storage`:

```typescript
initializeTheme(): void {
  if (this.themeInitialized) return;

  this.loadTheme();
  this.initSystemThemeListener();
  this.applyTheme();

  // НОВОЕ: Слушаем изменения localStorage из других вкладок
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY && e.newValue) {
      const newTheme = e.newValue as ThemeMode;
      if (['light', 'dark', 'system'].includes(newTheme)) {
        this.themeMode = newTheme;
      }
    }
  });

  watch(() => this.effectiveTheme, () => {
    this.applyTheme();
  });

  watch(() => this.themeMode, () => {
    this.saveTheme();
  });

  this.themeInitialized = true;
}
```

### Шаг 2: (Опционально) Упростить AppearanceSection

**Файл:** `src/components/settings/AppearanceSection.vue`

Удалить промежуточный ref и использовать `themeMode` напрямую:

```typescript
// БЫЛО:
const currentTheme = ref<ThemeMode>(themeMode.value);
onMounted(() => {
  currentTheme.value = themeMode.value;
});
watch(themeMode, (newTheme) => {
  currentTheme.value = newTheme;
});

// СТАЛО:
// Использовать themeMode напрямую в шаблоне
// currentTheme → themeMode
```

---

## Стратегия тестирования

### Ручное тестирование

1. Открыть приложение в двух вкладках браузера
2. В первой вкладке открыть Settings → Внешний вид
3. Во второй вкладке изменить тему
4. Проверить, что первая вкладка обновила отображение темы

### Автоматическое тестирование

1. Unit-тест для UIStore:
   - Проверить, что при dispatch события `storage` с ключом `notebox-theme` состояние `themeMode` обновляется

2. E2E-тест (Playwright):
   - Открыть два контекста браузера
   - Изменить тему в одном
   - Проверить синхронизацию во втором

---

## Оценка рисков

### Низкий риск

**Что может сломаться:**
- Событие `storage` НЕ срабатывает в той же вкладке (это by design)
- Если localStorage недоступен, код продолжит работать (try-catch уже есть)

**Митигация:**
- Storage events — стандартный браузерный API, поддерживается всеми современными браузерами
- Изменение локализовано в одном файле
- Не влияет на существующую функциональность (только добавляет новую)

### Обратная совместимость

- Изменение полностью обратно совместимо
- Не требует миграции данных
- Не меняет API компонентов

---

## Техническая информация

### Ключ localStorage

```
THEME_STORAGE_KEY = 'notebox-theme'
```

### Допустимые значения

```typescript
type ThemeMode = 'light' | 'dark' | 'system';
```

### Browser API

```typescript
window.addEventListener('storage', (event: StorageEvent) => {
  event.key;        // 'notebox-theme'
  event.newValue;   // 'dark'
  event.oldValue;   // 'light'
  event.url;        // URL источника изменения
});
```

**Важно:** Событие `storage` срабатывает ТОЛЬКО в других вкладках, не в той, которая изменила значение.

---

## Связанные файлы

- `src/stores/uiStore.ts` — Pinia store с логикой темы
- `src/components/settings/AppearanceSection.vue` — UI компонент настроек
- `src/composables/useTheme.ts` — Composable для доступа к store
- `src/App.vue` — Инициализация темы при загрузке приложения
- `.reproduction-evidence/reproduction-report.md` — Отчёт о воспроизведении

---

**Отчёт подготовлен:** Consilium Bug Diagnostic  
**Версия:** 1.0
