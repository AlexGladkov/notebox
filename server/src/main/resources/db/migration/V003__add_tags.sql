-- Добавление тегов для организации заметок
CREATE TABLE tags (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#e5e7eb',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE note_tags (
    note_id VARCHAR(36) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id VARCHAR(36) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
