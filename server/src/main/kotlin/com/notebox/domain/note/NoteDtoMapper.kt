package com.notebox.domain.note

import com.notebox.domain.tag.TagRepository
import com.notebox.dto.NoteDto
import org.springframework.stereotype.Component

/**
 * Компонент для маппинга Note в NoteDto с тегами.
 * Устраняет дублирование логики загрузки тегов.
 */
@Component
class NoteDtoMapper(
    private val noteRepository: NoteRepository,
    private val tagRepository: TagRepository
) {
    fun toDto(note: Note): NoteDto {
        val tags = tagRepository.findTagsByNoteId(note.id).map { it.toDto() }
        return note.toDto(tags)
    }

    fun toDtoList(notes: List<Note>): List<NoteDto> {
        if (notes.isEmpty()) return emptyList()

        val noteIds = notes.map { it.id }
        val tagsMap = tagRepository.findTagsForNoteIds(noteIds)

        return notes.map { note ->
            val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
            note.toDto(tags)
        }
    }
}
