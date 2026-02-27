# Feature: Database Entity (Slash Command)

**ID:** F-73ee3384
**Status:** Specification Complete
**Created:** 2026-02-27

## Summary

Реализация новой сущности "База данных" (Database), которая создается через slash-команду `/database` в редакторе. База данных отображается как inline-таблица в стиле Notion с поддержкой различных типов колонок и возможностью переиспользования в нескольких заметках.

## Requirements (Interview Results)

### Представление данных
- **View:** Только табличное представление (Table view) для MVP
- **Отображение:** Inline (встроенная в заметку) — таблица отображается прямо в теле заметки

### Типы колонок (полный набор как в Notion)
| Тип | Описание | Особенности |
|-----|----------|-------------|
| TEXT | Текстовое поле | Произвольный текст |
| NUMBER | Число | Числовые значения |
| BOOLEAN | Чекбокс | true/false |
| DATE | Дата и время | Date + time picker |
| SELECT | Выбор из списка | Одно значение, автоцвета |
| MULTI_SELECT | Множественный выбор | Несколько значений, автоцвета |
| RELATION | Связь с заметкой | Ссылка на другие notes (не на записи БД) |
| FORMULA | Формула | Базовые математические операции (+, -, *, /) |
| FILE | Файл/изображение | Только ссылки на внешние URL |
| PERSON | Персона | Свободный ввод имени с особым отображением |
| URL | Ссылка | URL с возможностью открытия |
| EMAIL | Email | Email с mailto: |
| PHONE | Телефон | Телефон с tel: |
| CREATED_TIME | Время создания | Автоматически при создании записи |
| LAST_EDITED_TIME | Время изменения | Автоматически обновляется |

### Slash-команда `/database`
- При вводе `/database` показывается меню с двумя секциями:
  1. "Create new database" — создает новую пустую базу
  2. Список существующих баз данных — для вставки ссылки на существующую
- При создании новой базы сразу вставляется пустая таблица с одной колонкой "Name" (тип TEXT)

### Редактирование
- **Ячейки:** Клик на ячейку — сразу начинается редактирование (как в Excel)
- **Добавление колонок:** Кнопка "+" в конце заголовков колонок, dropdown с выбором типа
- **Добавление строк:** Кнопка "+ New" под таблицей
- **Удаление:** Через контекстное меню (правый клик) для строк и колонок

### Select/Multi-select
- Новые значения вводятся прямо в ячейке — автоматически добавляются в список опций
- Цвета автоматически присваиваются из палитры при создании опции

### Архитектура хранения
- База данных — отдельная сущность в БД с ссылкой из заметки
- Можно переиспользовать одну базу в разных заметках
- Изменения синхронизируются во всех местах вставки (одна база = один источник данных)

### Удаление базы данных
- При удалении показать предупреждение со списком заметок, где используется база
- Запросить подтверждение перед удалением

### Визуальный стиль
- Максимально похоже на Notion: минималистичная таблица, тонкие границы, hover-эффекты
- Desktop only (без адаптации для мобильных)

## Files to Create/Modify

### New Files

1. **`src/components/editor/DatabaseBlock.vue`**
   - Основной компонент inline-базы данных
   - Отображение таблицы, управление состоянием

2. **`src/components/editor/DatabaseTable.vue`**
   - Компонент таблицы с ячейками
   - Рендеринг колонок и строк

3. **`src/components/editor/DatabaseCell.vue`**
   - Компонент ячейки таблицы
   - Редактирование в зависимости от типа колонки

4. **`src/components/editor/DatabaseColumnHeader.vue`**
   - Заголовок колонки
   - Переименование, изменение типа, контекстное меню

5. **`src/components/editor/DatabaseAddColumn.vue`**
   - Кнопка "+" и dropdown выбора типа колонки

6. **`src/components/editor/DatabaseAddRow.vue`**
   - Кнопка "+ New" для добавления строки

7. **`src/components/editor/cells/`** (директория)
   - `TextCell.vue`
   - `NumberCell.vue`
   - `BooleanCell.vue`
   - `DateCell.vue`
   - `SelectCell.vue`
   - `MultiSelectCell.vue`
   - `RelationCell.vue`
   - `FormulaCell.vue`
   - `FileCell.vue`
   - `PersonCell.vue`
   - `UrlCell.vue`
   - `EmailCell.vue`
   - `PhoneCell.vue`
   - `CreatedTimeCell.vue`
   - `LastEditedTimeCell.vue`

8. **`src/extensions/DatabaseExtension.ts`**
   - TipTap Node Extension для встраивания базы данных в редактор

9. **`src/composables/useDatabases.ts`**
   - Composable для работы с базами данных (CRUD операции)

10. **`src/components/editor/DatabaseSlashMenu.vue`**
    - Меню slash-команды /database с выбором создания/вставки

### Files to Modify

1. **`src/types/index.ts`**
   - Добавить новые типы колонок: RELATION, FORMULA, PERSON, URL, EMAIL, PHONE, CREATED_TIME, LAST_EDITED_TIME
   - Добавить интерфейс для формул

2. **`src/api/databases.ts`**
   - Добавить методы для получения списка заметок, использующих базу данных

3. **`src/components/editor/BlockEditor.vue`** (или аналогичный)
   - Интегрировать DatabaseExtension
   - Добавить обработку slash-команды /database

4. **`server/`** (если backend в этом репозитории)
   - Добавить новые поля в модель Column для новых типов
   - Добавить endpoint для получения связанных заметок

## Implementation Approach

### Phase 1: Core Infrastructure
1. Расширить типы колонок в `src/types/index.ts`
2. Создать `DatabaseExtension.ts` как TipTap Node
3. Реализовать базовый `DatabaseBlock.vue` с таблицей

### Phase 2: Table Rendering
1. Создать `DatabaseTable.vue` с рендерингом колонок и строк
2. Реализовать `DatabaseColumnHeader.vue` с контекстным меню
3. Добавить `DatabaseAddColumn.vue` и `DatabaseAddRow.vue`

### Phase 3: Cell Components
1. Создать базовый `DatabaseCell.vue` с роутингом по типу
2. Реализовать компоненты ячеек для каждого типа колонки
3. Начать с простых (Text, Number, Boolean), затем сложные (Select, Date, Relation)

### Phase 4: Slash Command Integration
1. Создать `DatabaseSlashMenu.vue`
2. Интегрировать в существующий SlashCommand extension
3. Добавить команду `/database` в список команд

### Phase 5: Data Synchronization
1. Реализовать `useDatabases.ts` composable
2. Обеспечить синхронизацию изменений через API
3. Добавить предупреждение при удалении с зависимостями

## Acceptance Criteria

### Основной функционал
- [ ] Пользователь может ввести `/database` и увидеть меню с опциями
- [ ] При выборе "Create new" создается новая база с колонкой "Name"
- [ ] При выборе существующей базы она вставляется в заметку
- [ ] Таблица отображается inline в редакторе

### Редактирование данных
- [ ] Клик на ячейку активирует редактирование
- [ ] Кнопка "+" добавляет новую колонку с выбором типа
- [ ] Кнопка "+ New" добавляет новую строку
- [ ] Правый клик показывает контекстное меню для удаления

### Типы колонок
- [ ] Все 15 типов колонок работают корректно
- [ ] Select/Multi-select позволяют вводить новые опции на лету
- [ ] Опции автоматически получают цвета из палитры
- [ ] Формулы поддерживают +, -, *, / над числовыми колонками
- [ ] Relation показывает picker для выбора заметки

### Синхронизация
- [ ] Одна база данных может быть встроена в несколько заметок
- [ ] Изменения в одном месте отражаются во всех остальных
- [ ] При удалении базы показывается предупреждение со списком зависимых заметок

### Визуальный стиль
- [ ] Таблица имеет минималистичный дизайн в стиле Notion
- [ ] Присутствуют hover-эффекты на строках
- [ ] Тонкие границы между ячейками

## Edge Cases and Risks

### Edge Cases
1. **Пустая база данных** — отображать placeholder "No records yet"
2. **Длинный текст в ячейке** — truncate с tooltip или wrap
3. **Удаление колонки с данными** — подтверждение с предупреждением о потере данных
4. **Циклические связи в Relation** — A -> B -> A (допустимо, но отслеживать)
5. **Формула с делением на ноль** — показывать "Error" или "∞"
6. **Несуществующая связанная заметка** — показать "[Deleted note]"

### Risks
1. **Производительность** — большие таблицы (100+ строк) могут тормозить редактор
   - *Mitigation:* Виртуализация списка или пагинация
2. **Конфликты редактирования** — два пользователя редактируют одну базу
   - *Mitigation:* Оптимистичные обновления + last-write-wins
3. **Сложность формул** — пользователи могут ожидать Excel-подобных формул
   - *Mitigation:* Четко документировать ограничения MVP

## Out of Scope

Следующие функции **НЕ** входят в текущую реализацию:

1. Kanban, List, Calendar, Gallery views — только Table view
2. Сортировка и фильтрация данных
3. Полноценные формулы (условия, строковые функции, работа с датами)
4. Загрузка файлов на сервер — только внешние URL
5. Привязка Person к пользователям системы
6. Мобильная адаптация
7. Экспорт/импорт данных (CSV, Excel)
8. Rollup колонки (агрегация из связанных записей)
9. Автоматизации (при изменении значения делать X)
10. История изменений / версионирование

## Technical Notes

### TipTap Integration
База данных должна быть реализована как кастомный Node в TipTap:
```typescript
// DatabaseExtension.ts
import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import DatabaseBlock from '../components/editor/DatabaseBlock.vue'

export const DatabaseExtension = Node.create({
  name: 'database',
  group: 'block',
  atom: true, // не редактируемый напрямую

  addAttributes() {
    return {
      databaseId: { default: null }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(DatabaseBlock)
  }
})
```

### Color Palette for Select Options
Предлагаемая палитра цветов (как в Notion):
- Light Gray, Gray, Brown, Orange, Yellow, Green, Blue, Purple, Pink, Red

### API Considerations
- Существующий API в `src/api/databases.ts` покрывает основные CRUD операции
- Необходимо добавить endpoint для получения заметок, использующих конкретную базу данных
