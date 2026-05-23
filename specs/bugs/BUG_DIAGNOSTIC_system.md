# Диагностический отчёт: Переключатель темы в режиме System

## Bug Summary

В настройках Appearance при выборе режима System переключатель Light/Dark остаётся кликабельным, но ничего не делает — тема определяется системными настройками.

**Вердикт: БАГ НЕ ВОСПРОИЗВОДИТСЯ**

Переключатель Light/Dark **уже корректно отключён** (disabled) когда активен режим System. Функциональность была реализована в коммите 33b9a1e2 (24 апреля 2026).

## Root Cause

**Статус:** Исправлено

**Файл:** `src/components/settings/AppearanceSection.vue:28`

**Код отключения:**
```vue
<button
  :disabled="currentTheme === 'system'"
  :class="['toggle-track', { disabled: currentTheme === 'system' }]"
  @click="toggleTheme"
>
```

**Механизм защиты реализован в три уровня:**
1. HTML атрибут `disabled` — полностью блокирует взаимодействие
2. CSS класс `.disabled` — визуальная обратная связь (opacity: 0.6, cursor: not-allowed)
3. Guard в обработчике `toggleTheme()` — `if (currentTheme.value === 'system') return;`

## Consilium Findings

### Architect (Согласен: баг отсутствует)
- Проследил data flow от checkbox System до переключателя Light/Dark
- Подтвердил что `:disabled="currentTheme === 'system'"` на строке 28 корректно отключает кнопку
- Нашёл коммит 33b9a1e2 (24 апреля 2026) где была добавлена эта функциональность
- Отметил defense-in-depth подход с тремя уровнями защиты

### Stack Expert (Согласен: баг отсутствует)
- Определил технологический стек: Vue 3 + Pinia + Tailwind CSS
- Подтвердил что Tailwind использует `darkMode: 'class'` стратегию
- Нашёл что тема хранится в localStorage (`notebox-theme`) и синхронизируется с сервером
- Подтвердил корректную реализацию disabled state

### Consensus
**Единогласное мнение:** Баг НЕ существует в текущей версии кода. Переключатель корректно отключается при активации режима System.

## Reproduction Results

**Воспроизведение:** ❌ Не удалось воспроизвести

**Тестирование через Playwright подтвердило:**
- ✅ Переключатель имеет атрибут `disabled` в режиме System
- ✅ Визуально отображается серым (opacity: 0.6)
- ✅ cursor: not-allowed применён
- ✅ Playwright не смог кликнуть на элемент (ошибка "element is not enabled")
- ✅ При отключении System режима переключатель становится активным
- ✅ При включении System режима обратно — снова disabled

**Ошибки консоли:** 1 ошибка (401 на /api/auth/me) — ожидаемое поведение для неавторизованного пользователя на странице входа.

## Affected Files

Файлы НЕ требуют изменений — функциональность уже реализована:

| Файл | Строки | Описание |
|------|--------|----------|
| `src/components/settings/AppearanceSection.vue` | 28, 30, 211-214 | Disabled binding и CSS стили |
| `src/stores/uiStore.ts` | 34-41, 172-174 | Theme state management |
| `src/composables/useTheme.ts` | - | Theme composable wrapper |

## Fix Plan

**Действие не требуется.** Баг уже исправлен.

### Рекомендуемые действия:

1. **Закрыть баг-репорт** как RESOLVED/FIXED
2. **Добавить автотест** для предотвращения регрессии:
   ```typescript
   it('should disable Light/Dark toggle when System mode is active', async () => {
     // Enable System mode
     await wrapper.find('[data-testid="system-theme-checkbox"]').setValue(true);
     
     // Verify toggle is disabled
     const toggle = wrapper.find('[role="switch"]');
     expect(toggle.attributes('disabled')).toBeDefined();
     expect(toggle.classes()).toContain('disabled');
   });
   ```

3. **Уточнить у репортера** — возможно баг наблюдался в более ранней версии

## Testing Strategy

Для подтверждения работоспособности:

1. **Ручное тестирование:**
   - Открыть Settings → Appearance
   - Включить "Использовать системные настройки"
   - Убедиться что переключатель Light/Dark визуально неактивен
   - Попытаться кликнуть — должен игнорироваться

2. **Автоматическое тестирование:**
   - E2E тест через Playwright (уже выполнен, см. reproduction-report.md)
   - Unit test для компонента AppearanceSection

## Risk Assessment

**Риск:** Минимальный

**Потенциальные проблемы:**
- Нет — баг отсутствует, изменения не требуются

**Митигация:**
- Добавить E2E тест для регрессионного тестирования
- Документировать ожидаемое поведение в спецификации

## Заключение

Баг-репорт описывает поведение, которое **уже исправлено** в текущей версии приложения. Переключатель Light/Dark корректно отключается (disabled) при активации режима System через три уровня защиты:
1. HTML disabled атрибут
2. CSS визуальный фидбек
3. Guard в обработчике клика

**Рекомендация:** Закрыть баг-репорт как FIXED и добавить автотест для предотвращения регрессии.
