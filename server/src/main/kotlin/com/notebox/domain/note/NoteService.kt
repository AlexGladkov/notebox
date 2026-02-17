package com.notebox.domain.note

import org.springframework.stereotype.Service

@Service
class NoteService(
    private val noteRepository: NoteRepository
) {

    companion object {
        const val MAX_DEPTH = 3
    }

    fun getAllNotes(folderId: String?): List<Note> {
        return if (folderId != null) {
            noteRepository.findByFolderId(folderId)
        } else {
            noteRepository.findAll()
        }
    }

    fun getNoteById(id: String): Note? {
        return noteRepository.findById(id)
    }

    fun getChildren(parentId: String?): List<Note> {
        return noteRepository.findByParentId(parentId)
    }

    fun getAncestorPath(noteId: String): List<Note> {
        return noteRepository.getAncestorPath(noteId)
    }

    fun createNote(
        title: String,
        content: String,
        folderId: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note {
        // Валидация глубины вложенности
        if (parentId != null) {
            val parentDepth = noteRepository.getDepth(parentId)
            if (parentDepth >= MAX_DEPTH) {
                throw IllegalArgumentException("Maximum nesting depth of $MAX_DEPTH levels exceeded")
            }
        }

        return noteRepository.create(title, content, folderId, parentId, icon, backdropType, backdropValue, backdropPositionY)
    }

    fun updateNote(
        id: String,
        title: String,
        content: String,
        folderId: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note? {
        return noteRepository.update(id, title, content, folderId, parentId, icon, backdropType, backdropValue, backdropPositionY)
    }

    fun moveNote(noteId: String, newParentId: String?): Note? {
        // Проверка на циклические ссылки
        if (newParentId != null) {
            if (noteId == newParentId) {
                throw IllegalArgumentException("Note cannot be its own parent")
            }

            // Проверка, не является ли новый родитель потомком перемещаемой заметки
            val descendants = noteRepository.findAllDescendants(noteId)
            if (descendants.any { it.id == newParentId }) {
                throw IllegalArgumentException("Cannot move note to its own descendant")
            }

            // Проверка глубины вложенности
            val newParentDepth = noteRepository.getDepth(newParentId)
            val noteWithDescendantsDepth = calculateMaxDescendantDepth(noteId)
            if (newParentDepth + noteWithDescendantsDepth > MAX_DEPTH) {
                throw IllegalArgumentException("Moving this note would exceed maximum nesting depth of $MAX_DEPTH levels")
            }
        }

        noteRepository.updateParentId(noteId, newParentId)
        return noteRepository.findById(noteId)
    }

    fun deleteNote(id: String, cascadeDelete: Boolean = true): Boolean {
        if (cascadeDelete) {
            noteRepository.deleteWithDescendants(id)
        } else {
            // Переместить детей к родителю удаляемой заметки
            noteRepository.orphanChildren(id)
            noteRepository.delete(id)
        }
        return true
    }

    private fun calculateMaxDescendantDepth(noteId: String): Int {
        val children = noteRepository.findByParentId(noteId)
        if (children.isEmpty()) return 0

        return 1 + (children.maxOfOrNull { calculateMaxDescendantDepth(it.id) } ?: 0)
    }
}
