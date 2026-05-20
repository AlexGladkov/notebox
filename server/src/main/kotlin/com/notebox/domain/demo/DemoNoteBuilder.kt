package com.notebox.domain.demo

import com.notebox.domain.note.Note
import com.notebox.domain.note.NoteService
import org.springframework.stereotype.Component

/**
 * Компонент для создания демо-заметок.
 * Отвечает только за создание и обновление заметок с демо-контентом.
 */
@Component
class DemoNoteBuilder(
    private val noteService: NoteService
) {
    data class DemoNotes(
        val dashboard: Note,
        val goals: Note,
        val ideas: Note,
        val workNotes: Note,
        val contacts: Note
    )

    fun createDemoNotes(): DemoNotes {
        val dashboardNote = noteService.createNote(
            title = DemoContentData.DASHBOARD_TITLE,
            content = "{\"type\":\"doc\",\"content\":[]}",
            icon = "🏠"
        )

        val goalsNote = noteService.createNote(
            title = DemoContentData.GOALS_TITLE,
            content = DemoContentData.getGoalsContent(),
            icon = "🎯"
        )

        val ideasNote = noteService.createNote(
            title = DemoContentData.IDEAS_TITLE,
            content = DemoContentData.getIdeasContent(),
            icon = "💡"
        )

        val workNotesNote = noteService.createNote(
            title = DemoContentData.NOTES_TITLE,
            content = "{\"type\":\"doc\",\"content\":[]}",
            icon = "📝"
        )

        val contactsNote = noteService.createNote(
            title = DemoContentData.CONTACTS_TITLE,
            content = DemoContentData.getContactsContent(),
            parentId = workNotesNote.id,
            icon = "📋"
        )

        return DemoNotes(dashboardNote, goalsNote, ideasNote, workNotesNote, contactsNote)
    }

    fun updateNotesWithLinks(notes: DemoNotes, databaseId: String) {
        val dashboardContent = DemoContentData.getDashboardContent()
            .replace("{{GOALS_ID}}", notes.goals.id)
            .replace("{{IDEAS_ID}}", notes.ideas.id)
            .replace("{{NOTES_ID}}", notes.workNotes.id)
            .replace("{{DATABASE_ID}}", databaseId)

        noteService.updateNote(
            id = notes.dashboard.id,
            title = notes.dashboard.title,
            content = dashboardContent,
            icon = notes.dashboard.icon
        )

        val workNotesContent = DemoContentData.getNotesContent()
            .replace("{{CONTACTS_ID}}", notes.contacts.id)

        noteService.updateNote(
            id = notes.workNotes.id,
            title = notes.workNotes.title,
            content = workNotesContent,
            icon = notes.workNotes.icon
        )
    }
}
