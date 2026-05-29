# Диагностический отчёт: Корректная обработка ошибок AI API

**Дата анализа:** 2026-05-29  
**Серьёзность:** MEDIUM  
**Статус:** БАГ ВОСПРОИЗВЕДЁН И ПОДТВЕРЖДЁН

---

## Краткое описание бага

При недоступности AI бэкенда (ошибка HTTP 404) приложение молча возвращает mock-данные пользователю вместо показа явного уведомления об ошибке. Пользователь не знает, что AI-сервис недоступен, и может сохранить фейковые данные.

---

## Корневая причина

**Файл:** `src/api/ai.ts`  
**Строки:** 39-43, 55-59, 71-75, 88-93  
**Уверенность:** ВЫСОКАЯ

### Проблемный код

Все четыре AI-функции реализуют одинаковый антипаттерн обработки ошибок:

```typescript
// src/api/ai.ts:65-76 (функция ocr)
async ocr(imageBase64: string): Promise<string> {
  try {
    const response = await apiClient.post<AIResponse>('/api/ai/ocr', {
      imageBase64,
    });
    return response.result;
  } catch (error) {
    console.error('AI OCR error:', error);
    // BUG: Молча возвращает mock-данные вместо уведомления пользователя
    return 'Распознанный текст:\n\nПример распознанного текста с изображения...';
  }
}
```

### Затронутые функции

| Функция | Строки | Mock-данные при ошибке |
|---------|--------|------------------------|
| `summarize()` | 33-44 | `📝 Краткое содержание:\n\n${text.slice(0, 100)}...` |
| `expand()` | 49-60 | `${text}\n\n✨ Расширенная версия...` |
| `ocr()` | 65-76 | `Распознанный текст:\n\nПример распознанного текста...` |
| `findRelatedNotes()` | 81-94 | Пустой массив `[]` |

---

## Результаты консилиума

### Architect (Code Tracer)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
- API клиент (`src/api/client.ts`) корректно выбрасывает `ApiError` при ошибках HTTP
- Модуль `src/api/ai.ts` перехватывает все ошибки и возвращает mock-данные
- Компоненты (PhotoCaptureModal.vue) не получают информацию об ошибке
- В проекте отсутствует глобальная система уведомлений (toast)

**Цепочка данных:**
```
PhotoCaptureModal.vue → aiApi.ocr() → apiClient.post() 
  → fetch('/api/ai/ocr') → HTTP 404 
  → ApiError выброшена → catch в ai.ts 
  → console.error() + return MOCK_DATA 
  → компонент получает "успешный" результат
```

### Stack Expert (Framework)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
- Проект использует Vue 3.4.0 + Vite 5.0.0 + Pinia 2.3.1
- **Отсутствует библиотека toast-уведомлений** (vue-toastification, vue-sonner и т.д.)
- Есть локальные реализации toast в отдельных компонентах (DatabaseBlock.vue)
- Composable `useAI.ts` не показывает уведомления при ошибках
- Конфигурация Vite корректна (proxy для /api работает)

---

## Результаты воспроизведения

**Статус:** ВОСПРОИЗВЕДЁН

### Наблюдаемое поведение

1. Пользователь открывает OCR-диалог и загружает изображение
2. Нажимает "Распознать текст"
3. API возвращает HTTP 404 (эндпоинт не найден)
4. **Уведомление НЕ показывается**
5. **Mock-данные отображаются как реальный результат**
6. Ошибка логируется в консоль (единственный видимый признак)

### Сетевой запрос

```
POST http://host.docker.internal:34287/api/ai/ocr => 404 Not Found
```

### Консольная ошибка

```
AI OCR error: ApiError: Endpoint not found
```

---

## Затронутые файлы

### Требуют изменения

| Файл | Действие | Описание |
|------|----------|----------|
| `src/api/ai.ts` | Модификация | Выбрасывать ошибку вместо возврата mock-данных |
| `src/composables/useToast.ts` | Создание | Новый composable для глобальных уведомлений |
| `src/components/Toast/ToastContainer.vue` | Создание | Компонент контейнера уведомлений |
| `src/composables/useAI.ts` | Модификация | Добавить показ уведомлений при ошибках |
| `src/components/QuickCapture/PhotoCaptureModal.vue` | Модификация | Обработка ошибок и показ уведомлений |
| `src/App.vue` | Модификация | Подключение ToastContainer |

### Требуют проверки

| Файл | Причина |
|------|---------|
| `src/components/BlockEditor/commands/ai.ts` | Использует aiApi.summarize() и expand() |
| `src/composables/useQuickCapture.ts` | Использует aiApi.findRelatedNotes() |

---

## План исправления

### Шаг 1: Создать глобальную систему уведомлений

**Файл:** `src/composables/useToast.ts`

```typescript
import { ref, readonly } from 'vue';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

const toasts = ref<Toast[]>([]);

export function useToast() {
  const show = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = Date.now().toString();
    toasts.value.push({ id, message, type, duration });
    setTimeout(() => remove(id), duration);
  };

  const showError = (message: string) => show(message, 'error', 5000);
  const showSuccess = (message: string) => show(message, 'success', 3000);
  const remove = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  };

  return { toasts: readonly(toasts), show, showError, showSuccess, remove };
}
```

### Шаг 2: Создать компонент ToastContainer

**Файл:** `src/components/Toast/ToastContainer.vue`

Создать Vue-компонент для отображения стека уведомлений с анимацией.

### Шаг 3: Исправить обработку ошибок в AI API

**Файл:** `src/api/ai.ts`

```typescript
// БЫЛО:
async ocr(imageBase64: string): Promise<string> {
  try {
    const response = await apiClient.post<AIResponse>('/api/ai/ocr', { imageBase64 });
    return response.result;
  } catch (error) {
    console.error('AI OCR error:', error);
    return 'Mock data...';  // BUG
  }
}

// СТАЛО:
async ocr(imageBase64: string): Promise<string> {
  try {
    const response = await apiClient.post<AIResponse>('/api/ai/ocr', { imageBase64 });
    return response.result;
  } catch (error) {
    console.error('AI OCR error:', error);
    throw error;  // Пробрасываем ошибку для обработки в UI
  }
}
```

### Шаг 4: Обновить useAI composable

**Файл:** `src/composables/useAI.ts`

Добавить показ toast-уведомления при ошибках AI API:

```typescript
import { useToast } from './useToast';

export function useAI() {
  const { showError } = useToast();
  
  const summarize = async (text: string): Promise<string | null> => {
    try {
      loading.value = true;
      const result = await aiApi.summarize(text);
      return result;
    } catch (err) {
      console.error('Summarize error:', err);
      showError('AI временно недоступен');
      return null;
    } finally {
      loading.value = false;
    }
  };
  // ...
}
```

### Шаг 5: Обновить PhotoCaptureModal

**Файл:** `src/components/QuickCapture/PhotoCaptureModal.vue`

Добавить обработку ошибок и показ уведомлений при OCR.

### Шаг 6: Подключить ToastContainer в App.vue

**Файл:** `src/App.vue`

Добавить `<ToastContainer />` в корневой компонент.

---

## Стратегия тестирования

### Ручное тестирование

1. **Позитивный сценарий:**
   - Настроить работающий AI бэкенд
   - Проверить успешное распознавание текста
   - Убедиться, что toast не показывается при успехе

2. **Негативный сценарий (основной):**
   - Отключить AI бэкенд (или использовать несуществующий endpoint)
   - Попытаться использовать OCR
   - **Ожидаемо:** toast "AI временно недоступен"
   - **Ожидаемо:** mock-данные НЕ отображаются
   - **Ожидаемо:** приложение продолжает работать

3. **Проверка всех AI-функций:**
   - Суммаризация текста (slash-команда /summarize)
   - Расширение текста (slash-команда /expand)
   - OCR распознавание
   - Поиск связанных заметок

### Автоматические тесты

1. Unit-тесты для `useToast`:
   - Проверка добавления/удаления уведомлений
   - Проверка auto-dismiss по таймеру

2. Unit-тесты для `aiApi`:
   - Проверка выброса исключения при ошибке
   - Проверка отсутствия mock-данных в ответе

3. E2E-тесты (Playwright):
   - Симуляция недоступности API
   - Проверка появления toast-уведомления

---

## Оценка рисков

### Низкий риск

- **Изменение контракта API:** Функции aiApi теперь выбрасывают исключения вместо возврата данных
- **Компоненты без обработки:** Компоненты, которые используют aiApi напрямую без try-catch, начнут видеть ошибки
- **Митигация:** Обновить все места использования aiApi для обработки исключений

### Средний риск

- **Множественные уведомления:** При быстрых повторных запросах могут показываться дублирующиеся toast
- **Митигация:** Добавить дедупликацию по сообщению или throttling

### Минимальный риск

- **UI регрессии:** Добавление ToastContainer может повлиять на z-index других элементов
- **Митигация:** Использовать высокий z-index (1000+) и фиксированное позиционирование

---

## Консенсус субагентов

| Аспект | Architect | Stack Expert | Консенсус |
|--------|-----------|--------------|-----------|
| Корневая причина в src/api/ai.ts | ДА | ДА | СОГЛАСИЕ |
| Отсутствует глобальный toast | ДА | ДА | СОГЛАСИЕ |
| Нужно выбрасывать ошибки | ДА | ДА | СОГЛАСИЕ |
| Graceful degradation работает | ДА | ДА | СОГЛАСИЕ |

**Разногласий не выявлено.** Оба эксперта единогласны в определении причины и подхода к исправлению.

---

## Критерии приёмки

| Критерий | Текущее состояние | После исправления |
|----------|-------------------|-------------------|
| Toast "AI временно недоступен" | НЕ ВЫПОЛНЕНО | ВЫПОЛНЕНО |
| Не возвращать mock-данные | НЕ ВЫПОЛНЕНО | ВЫПОЛНЕНО |
| Graceful degradation | ВЫПОЛНЕНО | ВЫПОЛНЕНО |
| Логирование ошибок | ВЫПОЛНЕНО | ВЫПОЛНЕНО |

---

## Заключение

Баг подтверждён и полностью диагностирован. Корневая причина — антипаттерн "тихого fallback" в модуле `src/api/ai.ts`. Для исправления требуется:

1. Создать глобальную систему toast-уведомлений
2. Изменить AI-функции для выброса исключений вместо возврата mock-данных
3. Обновить все места использования для показа уведомлений пользователю

Оценка трудозатрат: 2-4 часа разработки.
