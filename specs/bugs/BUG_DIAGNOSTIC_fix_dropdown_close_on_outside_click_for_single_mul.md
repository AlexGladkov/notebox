# Bug Diagnostic: Dropdown не закрывается при клике вне области

## Bug Summary

Dropdown меню в ячейках single-select и multi-select таблицы не закрывается при клике вне его области, по клавише Escape, и блокирует переключение на другие ячейки.

## Root Cause

**Файл**: `src/components/BlockEditor/cells/SelectCell.vue` (строки 43-47, 116-128)  
**Файл**: `src/components/BlockEditor/cells/MultiSelectCell.vue` (строки 58-62, 136-148)

**Описание**: Компоненты используют только локальный overlay-элемент для закрытия меню, но не регистрируют обработчики событий на уровне документа. Это приводит к тому, что:

1. Клики вне overlay не обрабатываются
2. Нажатие Escape не закрывает меню
3. Клик на другую ячейку перехватывается overlay, но не закрывает текущий dropdown

**Уверенность**: HIGH

## Consilium Findings

### Architect (Code Tracer)

**Консенсус**: Согласен с root cause

**Находки**:
- Overlay существует, но z-index (999) ниже чем у меню (1000)
- Отсутствует document-level click handler
- Отсутствует Escape key handler  
- Отсутствует onUnmounted cleanup
- Работающий паттерн найден в DatabaseAddColumn.vue (строки 62-131)

### Stack Expert (Vue/TS)

**Консенсус**: Согласен с root cause

**Находки**:
- Vue 3.4.0 с Composition API - framework patterns корректны
- В проекте нет внешней библиотеки для click-outside
- Работающие компоненты используют:
  - `document.addEventListener('click', handleClickOutside)`
  - `document.addEventListener('keydown', handleEscape)`
  - `setTimeout(..., 0)` для deferral toggle click
  - `onUnmounted()` для cleanup

**Разногласия**: Нет

## Reproduction Results

**Статус**: ✅ Баг успешно воспроизведён

**Тестовое окружение**: 
- URL: http://host.docker.internal:33513
- Браузер: Chromium (Playwright)
- Дата: 19 мая 2026

**Воспроизведённые сценарии**:
1. ❌ Клик на overlay не закрывает dropdown
2. ❌ Escape key не закрывает dropdown
3. ❌ Невозможно открыть dropdown в другой ячейке

## Affected Files

| Файл | Действие | Описание изменений |
|------|----------|-------------------|
| `src/components/BlockEditor/cells/SelectCell.vue` | Modify | Добавить document-level listeners, Escape handler, onUnmounted cleanup |
| `src/components/BlockEditor/cells/MultiSelectCell.vue` | Modify | Добавить document-level listeners, Escape handler, onUnmounted cleanup |

## Fix Plan

### Step 1: Модифицировать SelectCell.vue

**Файл**: `src/components/BlockEditor/cells/SelectCell.vue`

1. Добавить импорт `onUnmounted`:
   ```javascript
   import { ref, computed, nextTick, onUnmounted } from 'vue';
   ```

2. Добавить переменную для таймера:
   ```javascript
   let clickOutsideTimer: ReturnType<typeof setTimeout> | null = null;
   ```

3. Добавить функцию `handleEscape`:
   ```javascript
   const handleEscape = (event: KeyboardEvent) => {
     if (event.key === 'Escape') {
       closeMenu();
     }
   };
   ```

4. Добавить функцию `handleClickOutside`:
   ```javascript
   const handleClickOutside = (event: MouseEvent) => {
     const menu = document.querySelector('.select-menu');
     const target = event.target as Node;
     if (menu && !menu.contains(target)) {
       closeMenu();
     }
   };
   ```

5. Модифицировать `toggleMenu()`:
   ```javascript
   const toggleMenu = async () => {
     if (!menuVisible.value) {
       menuVisible.value = true;
       searchQuery.value = '';
       await nextTick();
       searchInput.value?.focus();
       document.addEventListener('keydown', handleEscape);
       clickOutsideTimer = setTimeout(() => {
         document.addEventListener('click', handleClickOutside);
       }, 0);
     } else {
       closeMenu();
     }
   };
   ```

6. Модифицировать `closeMenu()`:
   ```javascript
   const closeMenu = () => {
     menuVisible.value = false;
     searchQuery.value = '';
     document.removeEventListener('keydown', handleEscape);
     document.removeEventListener('click', handleClickOutside);
     if (clickOutsideTimer) {
       clearTimeout(clickOutsideTimer);
       clickOutsideTimer = null;
     }
   };
   ```

7. Добавить `onUnmounted()`:
   ```javascript
   onUnmounted(() => {
     document.removeEventListener('keydown', handleEscape);
     document.removeEventListener('click', handleClickOutside);
     if (clickOutsideTimer) {
       clearTimeout(clickOutsideTimer);
     }
   });
   ```

### Step 2: Модифицировать MultiSelectCell.vue

**Файл**: `src/components/BlockEditor/cells/MultiSelectCell.vue`

Применить те же изменения что и для SelectCell.vue:
- Добавить импорт `onUnmounted`
- Добавить `clickOutsideTimer`
- Добавить `handleEscape()`
- Добавить `handleClickOutside()` (использовать класс `.select-menu` как в SelectCell)
- Модифицировать `toggleMenu()` для регистрации listeners
- Модифицировать `closeMenu()` для удаления listeners
- Добавить `onUnmounted()` для cleanup

## Testing Strategy

### Manual Testing

1. **Клик вне dropdown**:
   - Открыть dropdown в ячейке Статус
   - Кликнуть на пустую область страницы
   - **Ожидаемо**: dropdown закрывается

2. **Escape key**:
   - Открыть dropdown
   - Нажать Escape
   - **Ожидаемо**: dropdown закрывается

3. **Переключение между ячейками**:
   - Открыть dropdown в ячейке Статус
   - Кликнуть на ячейку Приоритет
   - **Ожидаемо**: первый dropdown закрывается, второй открывается

4. **Multi-select тестирование**:
   - Повторить все сценарии для multi-select ячеек

### Automated Testing

- Playwright тесты из `.reproduction-evidence/` должны проходить успешно

## Risk Assessment

### Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Memory leak от незакрытых listeners | Низкая | Средняя | onUnmounted cleanup |
| Конфликт с другими document listeners | Низкая | Низкая | Уникальные handler функции |
| Regression в select функционале | Низкая | Высокая | Manual testing выбора опций |

### Что может сломаться

1. **Выбор опций**: После добавления click handler нужно убедиться, что `@click.stop` на меню продолжает работать
2. **Создание новых опций**: Проверить что Enter в search input работает
3. **Remove tag в multi-select**: Проверить что клик на × удаляет тег

### Митигация

- Паттерн скопирован из работающего компонента DatabaseAddColumn.vue
- `@click.stop` на меню предотвращает срабатывание handleClickOutside при кликах внутри меню
- setTimeout(0) предотвращает немедленное закрытие при toggle click

## Consensus

**Согласие subagents**: ДА

**Разногласия**: Нет

Оба subagent идентифицировали одну и ту же root cause и предложили одинаковое решение, основанное на работающем паттерне из DatabaseAddColumn.vue.
