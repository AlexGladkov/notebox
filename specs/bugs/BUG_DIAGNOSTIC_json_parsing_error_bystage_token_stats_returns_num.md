# Диагностический отчёт: JSON parsing error - byStage token stats returns numbers

**Дата:** 2026-05-24  
**Статус:** ФУНКЦИОНАЛЬНОСТЬ НЕ СУЩЕСТВУЕТ  
**Severity:** HIGH (если бы функция существовала)  

---

## Bug Summary

Pipeline view падает с ошибками JSON-парсинга, так как эндпоинт `/api/v1/state-machine/tasks/{id}/tokens` возвращает `byStage` значения как простые числа (например, `development:5126`), но frontend ожидает объекты.

---

## Root Cause

**КРИТИЧЕСКИЙ ВЫВОД: Функциональность не реализована**

Описанная в баге функциональность **не существует** в текущей кодовой базе. Эндпоинт `/api/v1/state-machine/tasks/{id}/tokens`, Pipeline View, и связанная инфраструктура для отслеживания токенов по стадиям — всё это отсутствует.

**Уровень уверенности:** 99.9%

**Файл/строка:** N/A — код не существует

---

## Consilium Findings

### Subagent 1: Architect (Code Tracer)

**Вывод:** Функция не существует  
**Согласие с root cause:** ДА

**Ключевые находки:**
- Поиск по 269 файлам (92 Kotlin, 177 TypeScript/Vue) — 0 совпадений для `state-machine`, `byStage`, `TokenStats`
- Анализ git истории (50+ коммитов) — нет следов удалённого кода
- Коммит `68bae98` документирует предыдущую диагностику: эндпоинт не существует
- Все 10 существующих контроллеров используют `/api/` (не `/api/v1/`)
- База данных: только 5 миграций (V001-V005), нет таблиц для tasks/state_machines

**Отсутствующие компоненты (Backend):**
- `StateMachineController` 
- `TasksService`
- `TasksRepository`
- Таблицы БД: `tasks`, `state_machines`, `stages`, `stage_token_stats`
- DTO: `TokenStats`, `ByStageDto`, `TaskDto`

**Отсутствующие компоненты (Frontend):**
- `PipelineView.vue`
- Маршрут `/pipeline` или `/tasks`
- API модуль `src/api/tasks.ts`
- Composable `useTasks.ts` или `useStateMachine.ts`

### Subagent 2: Stack Expert

**Вывод:** Функция не существует  
**Согласие с root cause:** ДА

**Ключевые находки:**
- Backend: Kotlin 1.9.22 + Spring Boot 3.2.2, Jackson для JSON
- Frontend: Vue.js 3 + TypeScript, только 4 маршрута
- Нет зависимостей для state machine библиотек
- Нет feature flags или environment variables для pipeline функциональности
- Docker: только postgres, minio, server, nginx — нет микросервисов для tasks

**Проблема exception handling:**
`GlobalExceptionHandler.kt` (строки 111-118) ловит все исключения и возвращает 500 вместо 404 для несуществующих маршрутов. Это маскирует отсутствие эндпоинта.

---

## Reproduction Results

**Воспроизведено:** НЕТ

Согласно `.reproduction-evidence/reproduction-report.md`:
- Попытка открыть `/pipeline` — 404
- Попытка открыть `/tasks` — 404
- Поиск в UI — нет Pipeline View
- Сетевые запросы — нет вызовов к `/api/v1/state-machine/*`
- Консоль браузера — 0 ошибок JSON-парсинга

**Запрос к API:**
```bash
curl http://host.docker.internal:34008/api/v1/state-machine/tasks
```
Возвращает UNAUTHORIZED (общая обработка Spring Security), но код обработчика не существует.

---

## Affected Files

Поскольку функциональность не существует, нет файлов для изменения.

**Если бы нужно было реализовать функцию, потребовались бы:**

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/.../domain/statemachine/StateMachineController.kt` | Создать | REST контроллер для `/api/v1/state-machine/*` |
| `server/src/.../domain/statemachine/TasksService.kt` | Создать | Бизнес-логика для управления tasks |
| `server/src/.../domain/statemachine/TasksRepository.kt` | Создать | Доступ к данным |
| `server/src/.../dto/TokenStatsDto.kt` | Создать | DTO для статистики токенов |
| `server/src/.../resources/db/migration/V006__create_tasks.sql` | Создать | Миграция БД |
| `src/views/PipelineView.vue` | Создать | Vue компонент |
| `src/api/tasks.ts` | Создать | API клиент |
| `src/router/index.ts` | Изменить | Добавить маршрут |
| `src/composables/useTasks.ts` | Создать | Composable для состояния |

---

## Fix Plan

### Вариант A: Закрыть баг как "Не баг"

Поскольку функциональность не существует:

1. **Уточнить у автора бага** — возможно, это описание планируемой функции или баг из другого репозитория
2. **Пометить баг** как "Won't Fix" или "Feature Not Implemented"
3. **Создать feature request** если функциональность нужна

### Вариант B: Реализовать функциональность (если требуется)

Если Pipeline View и state-machine tasks планируются к разработке:

| Шаг | Файл | Действие | Описание |
|-----|------|----------|----------|
| 1 | `V006__create_tasks_tables.sql` | Создать | Миграция для таблиц tasks, state_machines, stage_token_stats |
| 2 | `TaskDto.kt`, `TokenStatsDto.kt` | Создать | DTO с правильной структурой byStage как объектов |
| 3 | `TasksRepository.kt` | Создать | Repository с Exposed ORM |
| 4 | `TasksService.kt` | Создать | Service layer с бизнес-логикой |
| 5 | `StateMachineController.kt` | Создать | REST controller на `/api/v1/state-machine/*` |
| 6 | `src/api/tasks.ts` | Создать | TypeScript API client |
| 7 | `src/types/tasks.ts` | Создать | TypeScript типы |
| 8 | `PipelineView.vue` | Создать | Vue компонент для отображения |
| 9 | `src/router/index.ts` | Изменить | Добавить route `/pipeline` |
| 10 | `useTasks.ts` | Создать | Composable для state management |

**Важно при реализации:**
- DTO `TokenStatsDto.byStage` должен быть `Map<String, TokenStageInfo>`, а не `Map<String, Int>`
- Где `TokenStageInfo` — объект с полями `count`, `timestamp`, `metadata`

---

## Testing Strategy

Поскольку функция не существует, тестирование невозможно.

**Если функция будет реализована:**
1. Unit тесты для `TasksService` — проверка формирования DTO
2. Integration тесты для API — проверка JSON-сериализации byStage
3. E2E тесты с Playwright — открытие Pipeline View, проверка отображения токенов
4. Regression тесты — проверка что существующая функциональность не сломана

---

## Risk Assessment

### Текущие риски: ОТСУТСТВУЮТ
Функциональность не существует, пользователи не затронуты.

### Риски при реализации (если планируется):

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Конфликт версионирования API | Средняя | Средний | Определить стратегию: `/api/v1/` vs `/api/` |
| Нагрузка на БД от статистики токенов | Низкая | Высокий | Индексы, партиционирование |
| Breaking change в frontend | Низкая | Средний | Новая функция, не влияет на существующую |

---

## Consensus

**Согласие субагентов:** ДА — 100% консенсус

Оба субагента (Architect и Stack Expert) независимо пришли к одному выводу:
- Функциональность **не существует** в кодовой базе
- Нет следов удалённого кода
- Нет feature flags
- Нет environment variables

**Разногласия:** ОТСУТСТВУЮТ

---

## Возможные объяснения существования бага

| Теория | Вероятность | Обоснование |
|--------|-------------|-------------|
| Планируемая функция | 60% | Bug tracker используется для планирования будущей работы |
| Функция из другого репозитория | 25% | Описание точное, но для другого проекта |
| Синтетический/тестовый баг | 15% | Тест системы отслеживания багов |

---

## Рекомендации

1. **Закрыть баг** как "Feature Not Implemented" или "Invalid"
2. **Создать feature request** если Pipeline View действительно нужен
3. **Исправить exception handling** — добавить обработчик `NoHandlerFoundException` для возврата 404 вместо 500
4. **Документировать решение** в комментариях к багу

---

**Отчёт подготовлен:** Consilium (Architect + Stack Expert)  
**Дата:** 2026-05-24  
**Статус:** Готов к review
