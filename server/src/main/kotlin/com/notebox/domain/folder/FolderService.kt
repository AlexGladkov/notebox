package com.notebox.domain.folder

import com.notebox.domain.note.NoteRepository
import com.notebox.exception.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class FolderService(
    private val folderRepository: FolderRepository,
    private val noteRepository: NoteRepository
) {

    fun getAllFolders(userId: String): List<Folder> {
        return folderRepository.findAll(userId)
    }

    fun getFolderById(id: String, userId: String): Folder? {
        return folderRepository.findByIdAndUserId(id, userId)
    }

    fun createFolder(userId: String, name: String, parentId: String?): Folder {
        // Если указан parentId, проверяем что он принадлежит пользователю
        if (parentId != null) {
            folderRepository.findByIdAndUserId(parentId, userId)
                ?: throw AccessDeniedException("Access denied to parent folder: $parentId")
        }
        return folderRepository.create(userId, name, parentId)
    }

    fun updateFolder(id: String, userId: String, name: String, parentId: String?): Folder? {
        // Проверяем ownership обновляемой папки
        folderRepository.findByIdAndUserId(id, userId)
            ?: throw AccessDeniedException("Access denied to folder: $id")

        // Если указан новый parentId, проверяем что он принадлежит пользователю
        if (parentId != null) {
            folderRepository.findByIdAndUserId(parentId, userId)
                ?: throw AccessDeniedException("Access denied to parent folder: $parentId")
        }
        return folderRepository.update(id, userId, name, parentId)
    }

    @Transactional
    fun deleteFolder(id: String, userId: String): Boolean {
        // Проверяем ownership перед удалением
        folderRepository.findByIdAndUserId(id, userId)
            ?: throw AccessDeniedException("Access denied to folder: $id")

        // Cascade delete: delete all child folders and notes in one transaction
        deleteFolderRecursive(id, userId)
        return true
    }

    private fun deleteFolderRecursive(folderId: String, userId: String) {
        // Find and delete all child folders
        val childFolders = folderRepository.findByParentId(folderId, userId)
        childFolders.forEach { deleteFolderRecursive(it.id, userId) }

        // Delete all notes in this folder
        noteRepository.deleteByParentId(folderId, userId)

        // Delete the folder itself
        folderRepository.delete(folderId, userId)
    }
}
