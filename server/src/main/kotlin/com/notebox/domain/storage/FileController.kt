package com.notebox.domain.storage

import com.notebox.config.BaseController
import com.notebox.dto.ApiResponse
import com.notebox.dto.errorResponse
import com.notebox.dto.successResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

data class UploadFileResponse(
    val fileId: String,
    val filename: String,
    val key: String,
    val contentType: String?,
    val size: Long
)

data class GetFileUrlResponse(val url: String)

@RestController
@RequestMapping("/api/files")
class FileController(
    private val fileService: FileService
) : BaseController() {

    @PostMapping("/upload")
    fun uploadFile(@RequestParam("file") file: MultipartFile): ResponseEntity<ApiResponse<UploadFileResponse>> {
        val result = fileService.uploadFile(file)
        val response = UploadFileResponse(
            fileId = result.fileId,
            filename = result.filename,
            key = result.key,
            contentType = result.contentType,
            size = result.size
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(successResponse(response))
    }

    @GetMapping("/{key}")
    fun getFileUrl(@PathVariable key: String): ResponseEntity<ApiResponse<GetFileUrlResponse>> {
        val url = fileService.getFileUrl(key)
        return ResponseEntity.ok(successResponse(GetFileUrlResponse(url)))
    }

    @DeleteMapping("/{key}")
    fun deleteFile(@PathVariable key: String): ResponseEntity<Void> {
        fileService.deleteFile(key)
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build()
    }
}
