package com.notebox.domain.note

import org.springframework.stereotype.Service

@Service
class NoteService(
    private val noteRepository: NoteRepository
) {

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

    fun createNote(
        title: String,
        content: String,
        folderId: String,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note {
        return noteRepository.create(title, content, folderId, icon, backdropType, backdropValue, backdropPositionY)
    }

    fun updateNote(
        id: String,
        title: String,
        content: String,
        folderId: String,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note? {
        return noteRepository.update(id, title, content, folderId, icon, backdropType, backdropValue, backdropPositionY)
    }

    fun deleteNote(id: String): Boolean {
        return noteRepository.delete(id)
    }
}
