# Диагностический отчёт: Slash-команды меню выходит за пределы viewport

**Дата:** 2026-05-23  
**Серьёзность:** MEDIUM  
**Статус репродукции:** ✅ Баг воспроизведён

---

## Bug Summary

Меню слэш-команд (`SlashCommandMenu`) полностью скрывается за нижней границей viewport, когда пользователь вводит `/` в нижней части экрана. Меню отрисовывается, но находится за пределами видимой области (100.72% меню скрыто).

---

## Root Cause

**Файл:** `src/components/BlockEditor/SlashCommandMenu.vue`  
**Строки:** 151-161  
**Функция:** `updatePosition()`

```typescript
const updatePosition = () => {
  if (!props.editor) return;

  const { selection } = props.editor.state;
  const coords = props.editor.view.coordsAtPos(selection.from);

  position.value = {
    top: coords.bottom + 8,  // ← НЕТ ПРОВЕРКИ ГРАНИЦ VIEWPORT
    left: coords.left,       // ← НЕТ ПРОВЕРКИ ГОРИЗОНТАЛЬНЫХ ГРАНИЦ
  };
};
```

**Проблема:** Функция вычисляет позицию меню только на основе координат курсора (`coords.bottom + 8px`), без проверки:
1. Достаточно ли места под курсором для отображения меню
2. Не выходит ли меню за правую границу экрана
3. Не требуется ли flip (переворот) меню вверх

**Данные репродукции:**
- Позиция меню (top): `495.875px`
- Высота меню: `400px`
- Высота viewport: `493px`
- Результат: меню начинается на 3px ниже границы viewport и полностью невидимо

---

## Consilium Findings

### Architect (Code Tracer)
- **Root Cause Agreed:** ✅ Да
- **Findings:** 
  - Баг существует с момента создания компонента (commit `1f34d0d2`, 11 февраля 2026)
  - Функция `updatePosition()` не проверяет `getBoundingClientRect()` после позиционирования
  - Существует рабочий паттерн в `WikiLinkSuggestion.vue` (строки 116-122)
  - Меню использует `position: fixed`, что требует явной проверки viewport

### Stack Expert
- **Root Cause Agreed:** ✅ Да
- **Findings:**
  - Фреймворки (Vue 3.4.0, Tiptap 2.1.0) работают корректно
  - Конфигурация Docker/CORS не влияет на баг
  - Tiptap `coordsAtPos()` намеренно не проверяет границы — это ответственность вызывающего кода
  - CSS `max-height: 400px` усугубляет проблему при малых viewport

### Консенсус
**Все подагенты согласны:** Корневая причина — отсутствие проверки границ viewport в `updatePosition()` и отсутствие flip-up логики.

---

## Reproduction Results

**Статус:** ✅ Баг воспроизведён в браузере

**Шаги воспроизведения:**
1. Открыть приложение и войти в систему
2. Создать/открыть заметку
3. Добавить контент (~30 строк) чтобы курсор оказался внизу viewport
4. В последней строке ввести `/`
5. **Результат:** Меню появляется за пределами экрана, пользователь его не видит

**Скриншоты:** `.reproduction-evidence/step12-menu-viewport-BUG-REPRODUCED.png`

---

## Affected Files

| Файл | Действие | Описание изменений |
|------|----------|-------------------|
| `src/components/BlockEditor/SlashCommandMenu.vue` | Modify | Добавить проверку границ viewport и flip логику в `updatePosition()` |

---

## Fix Plan

### Step 1: Добавить ref для DOM-элемента меню
**Файл:** `src/components/BlockEditor/SlashCommandMenu.vue`  
**Строка:** ~53  
**Изменение:** Добавить `const menuRef = ref<HTMLElement | null>(null);`

### Step 2: Привязать ref к template
**Файл:** `src/components/BlockEditor/SlashCommandMenu.vue`  
**Строка:** 3  
**Изменение:** Добавить `ref="menuRef"` к корневому div

### Step 3: Переписать функцию `updatePosition()`
**Файл:** `src/components/BlockEditor/SlashCommandMenu.vue`  
**Строки:** 151-161  
**Изменение:** Реализовать проверку границ viewport

```typescript
const updatePosition = () => {
  if (!props.editor) return;

  const { selection } = props.editor.state;
  const coords = props.editor.view.coordsAtPos(selection.from);

  // Начальная позиция под курсором
  position.value = {
    top: coords.bottom + 8,
    left: coords.left,
  };

  // Проверка границ после первого рендера
  nextTick(() => {
    if (!menuRef.value) return;
    
    const menuRect = menuRef.value.getBoundingClientRect();
    
    // Flip вверх если меню выходит за нижнюю границу
    if (menuRect.bottom > window.innerHeight) {
      position.value.top = coords.top - menuRect.height - 8;
    }
    
    // Сдвиг влево если меню выходит за правую границу
    if (menuRect.right > window.innerWidth) {
      position.value.left = window.innerWidth - menuRect.width - 10;
    }
    
    // Минимум 0 для left
    if (position.value.left < 0) {
      position.value.left = 10;
    }
  });
};
```

### Step 4: Добавить импорт nextTick
**Файл:** `src/components/BlockEditor/SlashCommandMenu.vue`  
**Строка:** 37  
**Изменение:** `import { ref, computed, watch, nextTick } from 'vue';`

---

## Testing Strategy

### Ручное тестирование
1. **Нормальный случай:** Ввести `/` в середине редактора — меню появляется под курсором
2. **Нижняя граница:** Ввести `/` внизу viewport — меню flip'ается вверх и видимо
3. **Правая граница:** Ввести `/` в правой части редактора — меню сдвигается влево
4. **Угол:** Ввести `/` в правом нижнем углу — меню flip'ается вверх и сдвигается влево
5. **Маленький viewport:** Изменить размер окна на ~400px высоты и повторить тесты

### Автоматическое тестирование
- Добавить E2E тест в Playwright: ввод `/` внизу viewport должен отображать видимое меню
- Проверить accessibility: меню должно быть доступно для screen readers в любой позиции

---

## Risk Assessment

### Риски
| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Мерцание меню при flip | Низкая | Низкое | nextTick гарантирует расчёт после рендера |
| Неправильный flip когда места мало и сверху, и снизу | Низкая | Среднее | Добавить проверку: выбирать направление с большим пространством |
| Регрессия в нормальных случаях | Низкая | Среднее | Тестировать нормальный случай (меню под курсором) |

### Что может сломаться
- Если `menuRef` не привязан корректно — меню вернётся к текущему поведению (без проверок)
- Если `nextTick` не дождётся рендера — расчёт `getBoundingClientRect()` будет неверным

### Митигация
- Использовать существующий паттерн из `WikiLinkSuggestion.vue` (строки 116-122)
- Тестировать на разных viewport размерах

---

## Референсный код

**WikiLinkSuggestion.vue (строки 115-123):**
```typescript
// Проверяем, не выходит ли меню за пределы окна
const menuRect = menuRef.value.getBoundingClientRect();
if (menuRect.right > window.innerWidth) {
  menuRef.value.style.left = `${window.innerWidth - menuRect.width - 10}px`;
}
if (menuRect.bottom > window.innerHeight) {
  menuRef.value.style.top = `${rect.top - menuRect.height - 5}px`;
}
```

---

## Приложения

- **Отчёт о репродукции:** `.reproduction-evidence/reproduction-report.md`
- **Скриншоты:** `.reproduction-evidence/*.png`
- **Architect анализ:** `.diagnostic-results/architect.md`
- **Stack Expert анализ:** `.diagnostic-results/stack-expert.md`

---

**Диагностику выполнил:** Claude Opus 4.5  
**Следующий этап:** FIX IMPLEMENTATION
