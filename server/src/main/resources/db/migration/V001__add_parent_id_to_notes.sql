-- Добавление поля parent_id для поддержки иерархии заметок
ALTER TABLE notes ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36);

-- Создание индекса для быстрого поиска дочерних элементов
CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id);

-- Добавление внешнего ключа (опционально, можно закомментировать если не нужно)
-- ALTER TABLE notes ADD CONSTRAINT fk_notes_parent
--     FOREIGN KEY (parent_id) REFERENCES notes(id) ON DELETE SET NULL;
