package com.notebox.domain.storage

import org.springframework.web.multipart.MultipartFile

interface FileStorageService {
    fun uploadFile(file: MultipartFile, key: String): String
    fun getFileUrl(key: String): String
    fun deleteFile(key: String): Boolean
}
