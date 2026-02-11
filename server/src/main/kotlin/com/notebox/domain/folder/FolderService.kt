package com.notebox.domain.folder

import com.notebox.domain.note.NoteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class FolderService(
    private val folderRepository: FolderRepository,
    private val noteRepository: NoteRepository
) {

    fun getAllFolders(): List<Folder> {
        return folderRepository.findAll()
    }

    fun getFolderById(id: String): Folder? {
        return folderRepository.findById(id)
    }

    fun createFolder(name: String, parentId: String?): Folder {
        return folderRepository.create(name, parentId)
    }

    fun updateFolder(id: String, name: String, parentId: String?): Folder? {
        return folderRepository.update(id, name, parentId)
    }

    @Transactional
    fun deleteFolder(id: String): Boolean {
        // Cascade delete: delete all child folders and notes in one transaction
        deleteFolderRecursive(id)
        return true
    }

    private fun deleteFolderRecursive(folderId: String) {
        // Find and delete all child folders
        val childFolders = folderRepository.findByParentId(folderId)
        childFolders.forEach { deleteFolderRecursive(it.id) }

        // Delete all notes in this folder
        noteRepository.deleteByFolderId(folderId)

        // Delete the folder itself
        folderRepository.delete(folderId)
    }
}
