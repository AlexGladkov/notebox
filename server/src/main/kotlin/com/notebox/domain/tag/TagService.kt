package com.notebox.domain.tag

import org.springframework.stereotype.Service

@Service
class TagService(
    private val tagRepository: TagRepository
) {

    fun getAllTags(userId: String): List<Tag> {
        return tagRepository.findAllByUserId(userId)
    }

    fun getTagById(id: String): Tag? {
        return tagRepository.findById(id)
    }

    fun createTag(userId: String, name: String, color: String?): Tag {
        if (name.isBlank()) {
            throw IllegalArgumentException("Tag name cannot be blank")
        }

        if (name.length > 100) {
            throw IllegalArgumentException("Tag name must be less than 100 characters")
        }

        val existingTag = tagRepository.findByUserIdAndName(userId, name)
        if (existingTag != null) {
            throw IllegalArgumentException("Tag with this name already exists")
        }

        val tagColor = color ?: "#e5e7eb"
        return tagRepository.create(userId, name, tagColor)
    }

    fun updateTag(id: String, name: String?, color: String?): Tag? {
        if (name != null && name.isBlank()) {
            throw IllegalArgumentException("Tag name cannot be blank")
        }

        if (name != null && name.length > 100) {
            throw IllegalArgumentException("Tag name must be less than 100 characters")
        }

        val tag = tagRepository.findById(id)
            ?: throw IllegalArgumentException("Tag not found")

        if (name != null && name != tag.name) {
            val existingTag = tagRepository.findByUserIdAndName(tag.userId, name)
            if (existingTag != null) {
                throw IllegalArgumentException("Tag with this name already exists")
            }
        }

        return tagRepository.update(id, name, color)
    }

    fun deleteTag(id: String): Boolean {
        return tagRepository.delete(id)
    }

    fun getNoteTags(noteId: String): List<Tag> {
        return tagRepository.findTagsByNoteId(noteId)
    }

    fun setNoteTags(noteId: String, tagIds: List<String>) {
        tagRepository.setNoteTags(noteId, tagIds)
    }
}
