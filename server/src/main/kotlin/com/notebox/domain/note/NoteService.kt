package com.notebox.domain.note

import com.notebox.dto.NoteDto
import com.notebox.exception.NotFoundException
import com.notebox.exception.ValidationException
import com.notebox.exception.CircularReferenceException
import com.notebox.exception.AccessDeniedException
import org.springframework.stereotype.Service

@Service
class NoteService(
    private val noteRepository: NoteRepository,
    private val noteDtoMapper: NoteDtoMapper
) {

    companion object {
        const val MAX_DEPTH = 3
    }

    fun getAllNotes(userId: String): List<Note> {
        return noteRepository.findAll(userId)
    }

    fun getRootNotes(userId: String): List<Note> {
        return noteRepository.findRootNotes(userId)
    }

    fun getNoteById(id: String, userId: String): Note? {
        return noteRepository.findByIdAndUserId(id, userId)
    }

    fun getChildren(parentId: String?, userId: String): List<Note> {
        return noteRepository.findByParentId(parentId, userId)
    }

    fun getAncestorPath(noteId: String, userId: String): List<Note> {
        return noteRepository.getAncestorPath(noteId, userId)
    }

    private fun verifyNoteOwnership(noteId: String, userId: String) {
        val note = noteRepository.findByIdAndUserId(noteId, userId)
            ?: throw AccessDeniedException("Access denied to note: $noteId")
    }

    fun createNote(
        userId: String,
        title: String,
        content: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50,
        color: String? = null
    ): Note {
        // Валидация глубины вложенности
        if (parentId != null) {
            // Проверка существования родителя и ownership
            noteRepository.findByIdAndUserId(parentId, userId)
                ?: throw NotFoundException("Parent note with id '$parentId' not found")

            val parentDepth = noteRepository.getDepth(parentId, userId)
            if (parentDepth >= MAX_DEPTH) {
                throw ValidationException("Maximum nesting depth of $MAX_DEPTH levels exceeded")
            }
        }

        return noteRepository.create(userId, title, content, parentId, icon, backdropType, backdropValue, backdropPositionY, color)
    }

    fun updateNote(
        id: String,
        userId: String,
        title: String,
        content: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50,
        color: String? = null
    ): Note? {
        // Проверка существования заметки и ownership
        val existingNote = noteRepository.findByIdAndUserId(id, userId)
            ?: throw NotFoundException("Note with id '$id' not found")

        // Валидация изменения parentId (если оно меняется)
        if (parentId != existingNote.parentId) {
            if (parentId != null) {
                // Проверка существования нового родителя и ownership
                noteRepository.findByIdAndUserId(parentId, userId)
                    ?: throw NotFoundException("Parent note with id '$parentId' not found")

                if (id == parentId) {
                    throw CircularReferenceException("Note cannot be its own parent")
                }

                // Проверка на циклические ссылки
                val descendants = noteRepository.findAllDescendants(id, userId)
                if (descendants.any { it.id == parentId }) {
                    throw CircularReferenceException("Cannot set parent to a descendant note")
                }

                // Проверка глубины вложенности
                val newParentDepth = noteRepository.getDepth(parentId, userId)
                val noteWithDescendantsDepth = calculateMaxDescendantDepth(id, userId)
                if (newParentDepth + noteWithDescendantsDepth > MAX_DEPTH) {
                    throw ValidationException("This change would exceed maximum nesting depth of $MAX_DEPTH levels")
                }
            }
        }

        return noteRepository.update(id, userId, title, content, parentId, icon, backdropType, backdropValue, backdropPositionY, color)
    }

    fun moveNote(noteId: String, userId: String, newParentId: String?): Note? {
        // Проверка существования заметки и ownership
        noteRepository.findByIdAndUserId(noteId, userId)
            ?: throw NotFoundException("Note with id '$noteId' not found")

        // Проверка на циклические ссылки
        if (newParentId != null) {
            // Проверка существования нового родителя и ownership
            noteRepository.findByIdAndUserId(newParentId, userId)
                ?: throw NotFoundException("Parent note with id '$newParentId' not found")

            if (noteId == newParentId) {
                throw CircularReferenceException("Note cannot be its own parent")
            }

            // Проверка, не является ли новый родитель потомком перемещаемой заметки
            val descendants = noteRepository.findAllDescendants(noteId, userId)
            if (descendants.any { it.id == newParentId }) {
                throw CircularReferenceException("Cannot move note to its own descendant")
            }

            // Проверка глубины вложенности
            val newParentDepth = noteRepository.getDepth(newParentId, userId)
            val noteWithDescendantsDepth = calculateMaxDescendantDepth(noteId, userId)
            if (newParentDepth + noteWithDescendantsDepth > MAX_DEPTH) {
                throw ValidationException("Moving this note would exceed maximum nesting depth of $MAX_DEPTH levels")
            }
        }

        noteRepository.updateParentId(noteId, userId, newParentId)
        return noteRepository.findByIdAndUserId(noteId, userId)
    }

    fun deleteNote(id: String, userId: String, cascadeDelete: Boolean = true): Boolean {
        verifyNoteOwnership(id, userId)
        if (cascadeDelete) {
            noteRepository.deleteWithDescendants(id, userId)
        } else {
            // Переместить детей к родителю удаляемой заметки
            noteRepository.orphanChildren(id, userId)
            noteRepository.delete(id, userId)
        }
        return true
    }

    private fun calculateMaxDescendantDepth(noteId: String, userId: String): Int {
        val children = noteRepository.findByParentId(noteId, userId)
        if (children.isEmpty()) return 0

        return 1 + (children.maxOfOrNull { calculateMaxDescendantDepth(it.id, userId) } ?: 0)
    }

    fun getAllNotesWithTags(userId: String): List<NoteDto> =
        noteDtoMapper.toDtoList(noteRepository.findAll(userId))

    fun getRootNotesWithTags(userId: String): List<NoteDto> =
        noteDtoMapper.toDtoList(noteRepository.findRootNotes(userId))

    fun getNoteByIdWithTags(id: String, userId: String): NoteDto? {
        val note = noteRepository.findByIdAndUserId(id, userId) ?: return null
        return noteDtoMapper.toDto(note)
    }

    fun getChildrenWithTags(parentId: String, userId: String): List<NoteDto> =
        noteDtoMapper.toDtoList(noteRepository.findByParentId(parentId, userId))

    fun getAncestorPathWithTags(noteId: String, userId: String): List<NoteDto> =
        noteDtoMapper.toDtoList(noteRepository.getAncestorPath(noteId, userId))
}
