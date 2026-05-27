# Specification: Импорт заметок из Markdown файлов

## Summary
Реализовать импорт Markdown файлов с сохранением структуры:

1. Создать UI для загрузки .md файлов (drag & drop или file picker)
2. Реализовать парсер Markdown в формат TipTap/ProseMirror
3. Поддержать импорт папки с .md файлами с сохранением иерархии
4. Обрабатывать wiki-ссылки [[page]] при импорте
5. Конвертировать изображения и вложения

Критерии приёмки:
- Можно импортировать один .md файл или .zip архив с папками
- Заголовки, списки, код, таблицы корректно конвертируются
- Вложенные папки создают иерархию страниц
- Wiki-ссылки [[name]] связываются с существующими или создают новые страницы
- Показывается превью перед импортом с возможностью выбора

## Requirements
- Implement the feature as described in the task title and description.
- Follow existing codebase conventions and patterns.

## Acceptance Criteria
- The feature works as described.
- Code follows existing patterns.

*Note: This is a fallback spec generated because the interview stage did not produce a spec file.*
