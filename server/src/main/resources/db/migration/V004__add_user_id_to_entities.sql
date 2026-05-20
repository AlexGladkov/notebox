-- Добавление user_id в notes для устранения IDOR уязвимости
ALTER TABLE notes ADD COLUMN user_id VARCHAR(36);
UPDATE notes SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Добавление user_id в folders для устранения IDOR уязвимости
ALTER TABLE folders ADD COLUMN user_id VARCHAR(36);
UPDATE folders SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
ALTER TABLE folders ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_folders_user_id ON folders(user_id);

-- Добавление user_id в custom_databases для устранения IDOR уязвимости
ALTER TABLE custom_databases ADD COLUMN user_id VARCHAR(36);
UPDATE custom_databases SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
ALTER TABLE custom_databases ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_custom_databases_user_id ON custom_databases(user_id);
