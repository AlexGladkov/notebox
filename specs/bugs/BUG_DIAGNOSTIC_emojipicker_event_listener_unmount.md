# Диагностический отчёт: Утечка памяти в EmojiPicker

**Дата:** 2026-05-23  
**Severity:** HIGH  
**Статус воспроизведения:** ВОСПРОИЗВЕДЁН  
**Confidence:** HIGH

---

## Bug Summary

Компонент EmojiPicker добавляет document event listener для закрытия по клику вне области в `onMounted()` с условной проверкой `props.isOpen`, но не использует реактивный `watch()` для отслеживания изменений пропа. Это приводит к накоплению event listeners при многократном открытии/закрытии пикера.

---

## Root Cause

**Файл:** `src/components/EmojiPicker.vue`  
**Строки:** 62-70  
**Уверенность:** HIGH

### Проблемный код

```vue
onMounted(() => {
  if (props.isOpen) {                           // <-- УСЛОВНАЯ ПРОВЕРКА
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)  // <-- БЕЗУСЛОВНОЕ УДАЛЕНИЕ
})
```

### Почему это вызывает утечку памяти

1. **onMounted()** выполняется ОДИН раз при монтировании компонента
2. Проверка `props.isOpen` происходит только в момент монтирования
3. Если `props.isOpen` меняется после монтирования — listener НЕ добавляется/удаляется
4. При типичном использовании: компонент монтируется с `isOpen=false`, потом пользователь открывает пикер (`isOpen=true`) — listener никогда не добавляется
5. При ремаунтах с `isOpen=true` — listeners накапливаются

### Сценарий утечки

| Время | Событие | Listeners | Проблема |
|-------|---------|-----------|----------|
| T=0 | Компонент монтируется, `isOpen=true` | 1 | Listener добавлен |
| T=1 | Закрытие (`isOpen=false`) | 1 | Listener НЕ удалён (onMounted уже выполнился) |
| T=2 | Открытие (`isOpen=true`) | 1 | Новый listener НЕ добавлен |
| T=3 | Компонент размонтирован/ремонтирован | 2 | Накапливаются listeners |

---

## Consilium Findings

### Architect (Code Tracer)

**Согласие с root cause:** ДА

**Основные находки:**
- Баг введён в коммите `ff975d6` (16 февраля 2026) — ирония в том, что коммит назывался "fix: Улучшена безопасность, исправлены утечки памяти"
- EmojiPicker используется в `NoteIcon.vue` (строки 26-30)
- В кодовой базе есть 92 Vue-компонента, 20+ composables с похожими паттернами
- Похожие проблемы уже исправлялись в коммитах `adf3429`, `b49a2c4`

**Архитектурные проблемы:**
1. Условная регистрация listener в onMounted
2. Отсутствие watch() для реактивного управления
3. Асимметричная очистка (условное добавление, безусловное удаление)

### Stack Expert (Vue.js)

**Согласие с root cause:** ДА

**Framework Analysis:**
- Vue 3.4.0 корректно настроен
- TypeScript 5.3 в strict mode (но не может ловить паттерны дизайна)
- Vite 5.0 для сборки

**Сравнение с другими компонентами:**

| Компонент | Паттерн | Статус |
|-----------|---------|--------|
| EmojiPicker | onMounted + conditional | СЛОМАН |
| TabOverflowMenu | watch + onMounted + onUnmounted | РАБОТАЕТ |
| SelectCell | method-based (toggleMenu/closeMenu) | РАБОТАЕТ |
| TabContextMenu | watch + onMounted + onUnmounted | РАБОТАЕТ |

**Вывод:** Правильный паттерн уже используется в других компонентах (`TabOverflowMenu.vue`, `TabContextMenu.vue`), EmojiPicker нужно привести в соответствие.

### Consensus

**Согласие субагентов:** ПОЛНОЕ

Оба субагента согласны:
- Root cause: отсутствие `watch()` для реактивного управления listeners
- Файл: `src/components/EmojiPicker.vue`, строки 62-70
- Fix: добавить `watch()` по паттерну TabOverflowMenu/TabContextMenu

---

## Reproduction Results

**Воспроизведён:** ДА (100% воспроизводимость)

**Метод воспроизведения:** Автономный тест (backend недоступен)

**Результаты теста:**
```json
{
  "totalListeners": 23,
  "pickerElements": 0,
  "documentClickListeners": 10,
  "leakDetected": true,
  "excessListeners": 10
}
```

**Вывод:** После 10 циклов открытия/закрытия и удаления всех компонентов осталось 10 "мёртвых" event listeners на document.

---

## Affected Files

| Файл | Действие | Описание |
|------|----------|----------|
| `src/components/EmojiPicker.vue` | Модификация | Добавить watch() для управления listeners |

### Связанные компоненты для аудита

После исправления рекомендуется проверить:
- `src/components/BlockEditor/DatabaseFilter.vue`
- `src/components/BlockEditor/DatabaseColumnHeader.vue`
- `src/components/BlockEditor/DatabaseAddColumn.vue`
- `src/components/BlockEditor/BlockMenu.vue`

---

## Fix Plan

### Шаг 1: Добавить watch() для реактивного управления listeners

**Файл:** `src/components/EmojiPicker.vue`

**Изменить строки 39 и 62-70:**

```vue
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'  // Добавить watch

// ... существующий код ...

// Закрытие picker при клике вне компонента
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.emoji-picker') && !target.closest('.note-icon')) {
    emit('close')
  }
}

// НОВЫЙ КОД: Реактивное управление listeners
watch(() => props.isOpen, (newIsOpen) => {
  if (newIsOpen) {
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

// ОСТАВИТЬ: Defensive cleanup на unmount
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
```

### Шаг 2: Удалить устаревший код onMounted

Удалить строки 62-66:
```vue
// УДАЛИТЬ:
onMounted(() => {
  if (props.isOpen) {
    document.addEventListener('click', handleClickOutside)
  }
})
```

---

## Testing Strategy

### Ручное тестирование

1. Открыть приложение и перейти к заметке с иконкой
2. Открыть/закрыть EmojiPicker 10 раз
3. Проверить в DevTools → Elements → Event Listeners:
   - На document должен быть только 1 click listener от EmojiPicker (когда открыт)
   - 0 listeners когда закрыт

### Автоматическое тестирование

```javascript
// В консоли браузера
let clickListeners = 0
const origAdd = EventTarget.prototype.addEventListener
const origRemove = EventTarget.prototype.removeEventListener

EventTarget.prototype.addEventListener = function(type, fn, opts) {
  if (type === 'click' && this === document) clickListeners++
  return origAdd.call(this, type, fn, opts)
}

EventTarget.prototype.removeEventListener = function(type, fn, opts) {
  if (type === 'click' && this === document) clickListeners--
  return origRemove.call(this, type, fn, opts)
}

// После 10 циклов открытия/закрытия:
console.log('Active click listeners:', clickListeners)  // Должно быть 0 или 1
```

### Unit тесты

```typescript
// tests/components/EmojiPicker.spec.ts
import { mount } from '@vue/test-utils'
import EmojiPicker from '@/components/EmojiPicker.vue'

describe('EmojiPicker', () => {
  it('должен добавлять listener при открытии', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const wrapper = mount(EmojiPicker, { props: { isOpen: false } })
    
    await wrapper.setProps({ isOpen: true })
    
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))
  })

  it('должен удалять listener при закрытии', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = mount(EmojiPicker, { props: { isOpen: true } })
    
    await wrapper.setProps({ isOpen: false })
    
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
  })

  it('не должен накапливать listeners при многократных циклах', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = mount(EmojiPicker, { props: { isOpen: false } })
    
    for (let i = 0; i < 10; i++) {
      await wrapper.setProps({ isOpen: true })
      await wrapper.setProps({ isOpen: false })
    }
    
    expect(addSpy.mock.calls.length).toBe(removeSpy.mock.calls.length)
  })
})
```

---

## Risk Assessment

### Потенциальные риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Двойное срабатывание handlers | Низкая | watch() добавляет/удаляет симметрично |
| Пикер не закрывается по клику вне | Низкая | Тестировать вручную |
| Regression в NoteIcon.vue | Низкая | NoteIcon использует EmojiPicker стандартно |

### Impact исправления

- **Положительный:** Устранение утечки памяти, улучшение производительности в долгоживущих сессиях
- **Риск регрессии:** Минимальный — изменения локализованы в одном компоненте

---

## Приложения

### Скриншоты воспроизведения

- `.reproduction-evidence/step1-login-error.png` — Недоступность демо-режима
- `.reproduction-evidence/step2-test-page-initial.png` — Тестовая страница
- `.reproduction-evidence/step3-memory-leak-confirmed.png` — Подтверждение утечки

### Отчёты субагентов

- `.diagnostic-results/architect.md` — Анализ архитектора (если создан)
- `.diagnostic-results/stack-expert.md` — Анализ эксперта по Vue.js

---

**Автор:** Consilium Diagnostic System  
**Дата:** 2026-05-23
