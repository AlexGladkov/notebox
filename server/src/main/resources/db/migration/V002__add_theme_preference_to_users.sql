-- Добавление поля theme_preference для сохранения предпочтений темы пользователя
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(10) DEFAULT 'system';
