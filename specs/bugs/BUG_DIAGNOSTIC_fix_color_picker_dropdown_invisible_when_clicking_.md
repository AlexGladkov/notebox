# Bug Diagnostic: Color Picker Dropdown Invisible When Clicking Button

**Дата диагностики:** 20 мая 2026 г.  
**Серьёзность:** HIGH  
**Статус воспроизведения:** ПОДТВЕРЖДЁН

---

## Bug Summary

При клике на кнопку ⋮ рядом с опциями в selector-колонках (Статус, Приоритет) таблицы базы данных, ColorPicker компонент рендерится в DOM, но визуально невидим для пользователя из-за CSS-проблемы позиционирования.

---

## Root Cause

**Корневая причина:** CSS позиционирование `.color-picker-container` с `position: absolute` и `left: 100%` внутри контейнера с `overflow-y: auto`.

**Файлы с багом:**
- `src/components/BlockEditor/cells/SelectCell.vue` (строки 335-341)
- `src/components/BlockEditor/cells/MultiSelectCell.vue` (строки 389-395)

**Проблемный CSS:**
```css
.color-picker-container {
  position: absolute;
  left: 100%;        /* Позиционируется на 100% вправо от .menu-option */
  top: 0;
  margin-left: 8px;
  z-index: 1001;
}
```

**Иерархия стекинг-контекста:**
```
.data-cell (max-width: 300px)
  └── .select-cell (position: relative)
      └── .select-menu (position: absolute, z-index: 1000)
          └── .menu-options (overflow-y: auto, max-height: 250px) ← СОЗДАЁТ КЛИППИНГ
              └── .menu-option (position: relative)
                  └── .color-picker-container (left: 100%) ← ОБРЕЗАЕТСЯ
```

**Уверенность:** HIGH - баг воспроизведён, CSS-код идентифицирован, причина очевидна.

---

## Consilium Findings

### Architect (Code Tracer)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
1. Баг введён в коммите `0e7a4aa` (feat: добавить цветовую кодировку для selector-полей)
2. Коммит `8260215` исправил state management, но не CSS позиционирование
3. `.menu-options` имеет `overflow-y: auto`, что создаёт контекст обрезки
4. ColorPicker позиционируется за пределами видимой области dropdown

### Stack Expert (Framework)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
1. Проект использует Vue 3.4.0, Vite 5.0.0, TypeScript 5.3.0 - все совместимы
2. Паттерн `<Teleport to="body">` уже используется в 10+ модальных компонентах
3. Проблема НЕ связана с фреймворком, зависимостями или конфигурацией
4. Чисто CSS-проблема стекинг-контекста

### Консенсус

**Оба субагента согласны:** Корневая причина - CSS позиционирование с `left: 100%` внутри `overflow-y: auto` контейнера.

**Разногласия:** Нет

---

## Reproduction Results

**Статус:** БАГ УСПЕШНО ВОСПРОИЗВЕДЁН

**Шаги воспроизведения:**
1. Открыть приложение, войти в демо-режим
2. Перейти на Dashboard с таблицей "Мои задачи"
3. Кликнуть на ячейку Статус (например, "В процессе")
4. В открывшемся dropdown кликнуть на кнопку ⋮ рядом с любой опцией
5. **Результат:** ColorPicker в DOM, но визуально невидим

**Доказательства:**
- DOM snapshot показывает ColorPicker с 8 цветами (green, yellow, pink, purple, blue, orange, red, gray)
- Скриншоты не показывают ColorPicker визуально
- Консольные ошибки: нет ошибок связанных с ColorPicker

---

## Affected Files

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `src/components/BlockEditor/cells/SelectCell.vue` | Modify | Изменить позиционирование ColorPicker с использованием Teleport |
| `src/components/BlockEditor/cells/MultiSelectCell.vue` | Modify | Идентичное изменение для multi-select |

---

## Fix Plan

### Шаг 1: Добавить Teleport в SelectCell.vue

**Файл:** `src/components/BlockEditor/cells/SelectCell.vue`

**Изменение:** Обернуть `.color-picker-container` в `<Teleport to="body">` и использовать `position: fixed` с динамически вычисляемыми координатами.

```vue
<Teleport to="body">
  <div 
    v-if="colorPickerVisible === option.id" 
    class="color-picker-popup"
    :style="colorPickerStyle"
  >
    <ColorPicker 
      :selected-color="option.color"
      @select="(color) => updateOptionColor(option.id, color)"
      @close="colorPickerVisible = null"
    />
  </div>
</Teleport>
```

**Логика позиционирования:**
- Использовать `ref` на кнопку ⋮ для получения координат через `getBoundingClientRect()`
- Позиционировать popup справа от кнопки с учётом границ viewport

### Шаг 2: Применить идентичное исправление в MultiSelectCell.vue

**Файл:** `src/components/BlockEditor/cells/MultiSelectCell.vue`

**Изменение:** Точно такое же, как в SelectCell.vue

### Шаг 3: Обновить CSS

**Новые стили:**
```css
.color-picker-popup {
  position: fixed;
  z-index: 10000;
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### Шаг 4: Добавить click-outside обработчик

Убедиться, что клик вне ColorPicker закрывает его.

---

## Testing Strategy

### Ручное тестирование

1. **Базовый тест:** Кликнуть на ⋮ в dropdown Статус - ColorPicker должен быть виден
2. **Позиционирование:** ColorPicker появляется справа от кнопки, не выходя за viewport
3. **Выбор цвета:** Клик на цвет изменяет цвет опции
4. **Закрытие:** Клик вне ColorPicker закрывает его
5. **Multi-select:** Повторить тесты для колонки Приоритет
6. **Dark mode:** Проверить отображение в тёмной теме

### Регрессионное тестирование

1. Dropdown всё ещё открывается и закрывается корректно
2. Опции можно выбирать
3. Поиск/фильтрация работает
4. Создание новых опций работает

### Edge cases

1. ColorPicker при опции в самом низу dropdown (проверить позиционирование вверх)
2. ColorPicker при узком viewport (проверить адаптивность)
3. Несколько открытых dropdown одновременно

---

## Risk Assessment

### Низкий риск

**Что может сломаться:**
- CSS стили ColorPicker при использовании fixed positioning

**Митигация:**
- Тщательно протестировать позиционирование в разных состояниях
- Использовать существующие z-index паттерны из проекта (модальные окна используют z-index: 9999)

### Минимальный риск

**Изменения изолированы:**
- Затрагивают только SelectCell и MultiSelectCell
- Не влияют на логику выбора опций
- Не затрагивают backend

### Совместимость

- Vue Teleport нативно поддерживается (Vue 3.4.0)
- Паттерн уже используется в проекте
- Нет новых зависимостей

---

## Timeline

**Оценка времени:** 1-2 часа

| Этап | Время |
|------|-------|
| Реализация исправления | 30-45 мин |
| Тестирование | 30-45 мин |
| Code review | 15-30 мин |

---

**Отчёт подготовлен:** Lead Engineer (Consilium Diagnostic)  
**Дата:** 20 мая 2026 г.
