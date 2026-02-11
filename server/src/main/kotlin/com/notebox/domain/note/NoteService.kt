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

    fun createNote(title: String, content: String, folderId: String): Note {
        return noteRepository.create(title, content, folderId)
    }

    fun updateNote(id: String, title: String, content: String, folderId: String): Note? {
        return noteRepository.update(id, title, content, folderId)
    }

    fun deleteNote(id: String): Boolean {
        return noteRepository.delete(id)
    }
}
