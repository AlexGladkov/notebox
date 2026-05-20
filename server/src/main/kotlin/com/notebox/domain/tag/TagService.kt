package com.notebox.domain.tag

import com.notebox.exception.AccessDeniedException
import com.notebox.exception.NotFoundException
import com.notebox.exception.ValidationException
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

    fun getTagByIdForUser(id: String, userId: String): Tag {
        val tag = getTagById(id)
            ?: throw NotFoundException("Tag not found: $id")
        if (tag.userId != userId) {
            throw AccessDeniedException("Access denied to tag: $id")
        }
        return tag
    }

    fun verifyTagOwnership(tagId: String, userId: String) {
        val tag = getTagById(tagId)
            ?: throw NotFoundException("Tag not found: $tagId")
        if (tag.userId != userId) {
            throw AccessDeniedException("Access denied to tag: $tagId")
        }
    }

    fun verifyTagsOwnership(tagIds: List<String>, userId: String) {
        tagIds.forEach { verifyTagOwnership(it, userId) }
    }

    fun createTag(userId: String, name: String, color: String?): Tag {
        if (name.isBlank()) {
            throw ValidationException("Tag name cannot be blank")
        }

        if (name.length > 100) {
            throw ValidationException("Tag name must be less than 100 characters")
        }

        val existingTag = tagRepository.findByUserIdAndName(userId, name)
        if (existingTag != null) {
            throw ValidationException("Tag with this name already exists")
        }

        val tagColor = color ?: "#e5e7eb"
        return tagRepository.create(userId, name, tagColor)
    }

    fun updateTag(id: String, name: String?, color: String?): Tag? {
        if (name != null && name.isBlank()) {
            throw ValidationException("Tag name cannot be blank")
        }

        if (name != null && name.length > 100) {
            throw ValidationException("Tag name must be less than 100 characters")
        }

        val tag = tagRepository.findById(id)
            ?: throw NotFoundException("Tag not found: $id")

        if (name != null && name != tag.name) {
            val existingTag = tagRepository.findByUserIdAndName(tag.userId, name)
            if (existingTag != null) {
                throw ValidationException("Tag with this name already exists")
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
