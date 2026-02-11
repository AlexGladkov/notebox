package com.notebox.domain.database

import com.notebox.dto.*
import com.notebox.util.ValidationUtils
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/databases")
class DatabaseController(
    private val databaseService: DatabaseService
) {

    @GetMapping
    fun getAllDatabases(): ResponseEntity<ApiResponse<List<CustomDatabaseDto>>> {
        val databases = databaseService.getAllDatabasesWithColumns()
            .map { (db, columns) -> db.toDto(columns) }
        return ResponseEntity.ok(successResponse(databases))
    }

    @GetMapping("/{id}")
    fun getDatabaseById(@PathVariable id: String): ResponseEntity<ApiResponse<CustomDatabaseDto>> {
        ValidationUtils.validateUUID(id, "id")
        val (database, columns) = databaseService.getDatabaseById(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Database not found"))

        return ResponseEntity.ok(successResponse(database.toDto(columns)))
    }

    @PostMapping
    fun createDatabase(@Valid @RequestBody request: CreateDatabaseRequest): ResponseEntity<ApiResponse<CustomDatabaseDto>> {
        if (request.folderId != null) {
            ValidationUtils.validateUUID(request.folderId, "folderId")
        }
        val (database, columns) = databaseService.createDatabase(request.name, request.folderId)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(database.toDto(columns)))
    }

    @PutMapping("/{id}")
    fun updateDatabase(
        @PathVariable id: String,
        @Valid @RequestBody request: UpdateDatabaseRequest
    ): ResponseEntity<ApiResponse<CustomDatabaseDto>> {
        ValidationUtils.validateUUID(id, "id")
        if (request.folderId != null) {
            ValidationUtils.validateUUID(request.folderId, "folderId")
        }
        val (database, columns) = databaseService.updateDatabase(id, request.name, request.folderId)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Database not found"))

        return ResponseEntity.ok(successResponse(database.toDto(columns)))
    }

    @DeleteMapping("/{id}")
    fun deleteDatabase(@PathVariable id: String): ResponseEntity<Void> {
        ValidationUtils.validateUUID(id, "id")
        databaseService.deleteDatabase(id)
        return ResponseEntity.noContent().build()
    }

    // Column endpoints
    @PostMapping("/{id}/columns")
    fun addColumn(
        @PathVariable id: String,
        @Valid @RequestBody request: CreateColumnRequest
    ): ResponseEntity<ApiResponse<ColumnDto>> {
        ValidationUtils.validateUUID(id, "id")
        val column = databaseService.addColumn(
            id,
            request.name,
            request.type,
            request.options,
            request.position
        )
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(column.toDto()))
    }

    @PutMapping("/{id}/columns/{columnId}")
    fun updateColumn(
        @PathVariable id: String,
        @PathVariable columnId: String,
        @Valid @RequestBody request: UpdateColumnRequest
    ): ResponseEntity<ApiResponse<ColumnDto>> {
        ValidationUtils.validateUUID(id, "id")
        ValidationUtils.validateUUID(columnId, "columnId")
        val column = databaseService.updateColumn(
            columnId,
            request.name,
            request.type,
            request.options,
            request.position
        ) ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(errorResponse("NOT_FOUND", "Column not found"))

        return ResponseEntity.ok(successResponse(column.toDto()))
    }

    @DeleteMapping("/{id}/columns/{columnId}")
    fun deleteColumn(
        @PathVariable id: String,
        @PathVariable columnId: String
    ): ResponseEntity<Void> {
        ValidationUtils.validateUUID(id, "id")
        ValidationUtils.validateUUID(columnId, "columnId")
        databaseService.deleteColumn(columnId)
        return ResponseEntity.noContent().build()
    }

    // Record endpoints
    @GetMapping("/{id}/records")
    fun getRecords(@PathVariable id: String): ResponseEntity<ApiResponse<List<RecordDto>>> {
        ValidationUtils.validateUUID(id, "id")
        val records = databaseService.getRecordsByDatabaseId(id)
        return ResponseEntity.ok(successResponse(records))
    }

    @PostMapping("/{id}/records")
    fun createRecord(
        @PathVariable id: String,
        @Valid @RequestBody request: CreateRecordRequest
    ): ResponseEntity<ApiResponse<RecordDto>> {
        ValidationUtils.validateUUID(id, "id")
        val record = databaseService.createRecord(id, request.data)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(record))
    }

    @PutMapping("/{id}/records/{recordId}")
    fun updateRecord(
        @PathVariable id: String,
        @PathVariable recordId: String,
        @Valid @RequestBody request: UpdateRecordRequest
    ): ResponseEntity<ApiResponse<RecordDto>> {
        ValidationUtils.validateUUID(id, "id")
        ValidationUtils.validateUUID(recordId, "recordId")
        val record = databaseService.updateRecord(recordId, request.data)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Record not found"))

        return ResponseEntity.ok(successResponse(record))
    }

    @DeleteMapping("/{id}/records/{recordId}")
    fun deleteRecord(
        @PathVariable id: String,
        @PathVariable recordId: String
    ): ResponseEntity<Void> {
        ValidationUtils.validateUUID(id, "id")
        ValidationUtils.validateUUID(recordId, "recordId")
        databaseService.deleteRecord(recordId)
        return ResponseEntity.noContent().build()
    }
}
