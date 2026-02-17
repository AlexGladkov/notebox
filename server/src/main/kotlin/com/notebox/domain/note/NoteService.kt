package com.notebox.domain.note

import org.springframework.stereotype.Service

@Service
class NoteService(
    private val noteRepository: NoteRepository
) {

    companion object {
        const val MAX_DEPTH = 3
    }

    fun getAllNotes(): List<Note> {
        return noteRepository.findAll()
    }

    fun getRootNotes(): List<Note> {
        return noteRepository.findRootNotes()
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
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note {
        // Валидация глубины вложенности
        if (parentId != null) {
            // Проверка существования родителя
            val parent = noteRepository.findById(parentId)
                ?: throw IllegalArgumentException("Parent note not found")

            val parentDepth = noteRepository.getDepth(parentId)
            if (parentDepth >= MAX_DEPTH) {
                throw IllegalArgumentException("Maximum nesting depth of $MAX_DEPTH levels exceeded")
            }
        }

        return noteRepository.create(title, content, parentId, icon, backdropType, backdropValue, backdropPositionY)
    }

    fun updateNote(
        id: String,
        title: String,
        content: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note? {
        // Проверка существования заметки
        val existingNote = noteRepository.findById(id)
            ?: throw IllegalArgumentException("Note not found")

        // Валидация изменения parentId (если оно меняется)
        if (parentId != existingNote.parentId) {
            if (parentId != null) {
                // Проверка существования нового родителя
                noteRepository.findById(parentId)
                    ?: throw IllegalArgumentException("Parent note not found")

                if (id == parentId) {
                    throw IllegalArgumentException("Note cannot be its own parent")
                }

                // Проверка на циклические ссылки
                val descendants = noteRepository.findAllDescendants(id)
                if (descendants.any { it.id == parentId }) {
                    throw IllegalArgumentException("Cannot set parent to a descendant note")
                }

                // Проверка глубины вложенности
                val newParentDepth = noteRepository.getDepth(parentId)
                val noteWithDescendantsDepth = calculateMaxDescendantDepth(id)
                if (newParentDepth + noteWithDescendantsDepth > MAX_DEPTH) {
                    throw IllegalArgumentException("This change would exceed maximum nesting depth of $MAX_DEPTH levels")
                }
            }
        }

        return noteRepository.update(id, title, content, parentId, icon, backdropType, backdropValue, backdropPositionY)
    }

    fun moveNote(noteId: String, newParentId: String?): Note? {
        // Проверка существования заметки
        noteRepository.findById(noteId)
            ?: throw IllegalArgumentException("Note not found")

        // Проверка на циклические ссылки
        if (newParentId != null) {
            // Проверка существования нового родителя
            noteRepository.findById(newParentId)
                ?: throw IllegalArgumentException("Parent note not found")

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
