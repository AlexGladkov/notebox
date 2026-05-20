package com.notebox.domain.database

import com.notebox.config.BaseController
import com.notebox.dto.*
import com.notebox.exception.NotFoundException
import com.notebox.validation.ValidUuid
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*

@Validated
@RestController
@RequestMapping("/api/databases")
class DatabaseController(
    private val databaseService: DatabaseService
) : BaseController() {

    @GetMapping
    fun getAllDatabases(): ResponseEntity<ApiResponse<List<CustomDatabaseDto>>> {
        val userId = getCurrentUserId()
        val databases = databaseService.getAllDatabasesWithColumns(userId)
            .map { (db, columns) -> db.toDto(columns) }
        return ResponseEntity.ok(successResponse(databases))
    }

    @GetMapping("/{id}")
    fun getDatabaseById(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<CustomDatabaseDto>> {
        val userId = getCurrentUserId()
        val (database, columns) = databaseService.getDatabaseById(id, userId)
            ?: throw NotFoundException("Database with id '$id' not found")

        return ResponseEntity.ok(successResponse(database.toDto(columns)))
    }

    @PostMapping
    fun createDatabase(@Valid @RequestBody request: CreateDatabaseRequest): ResponseEntity<ApiResponse<CustomDatabaseDto>> {
        val userId = getCurrentUserId()
        val (database, columns) = databaseService.createDatabase(userId, request.name, request.folderId)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(database.toDto(columns)))
    }

    @PutMapping("/{id}")
    fun updateDatabase(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateDatabaseRequest
    ): ResponseEntity<ApiResponse<CustomDatabaseDto>> {
        val userId = getCurrentUserId()
        val (database, columns) = databaseService.updateDatabase(id, userId, request.name, request.folderId)
            ?: throw NotFoundException("Database with id '$id' not found")

        return ResponseEntity.ok(successResponse(database.toDto(columns)))
    }

    @DeleteMapping("/{id}")
    fun deleteDatabase(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<Void> {
        val userId = getCurrentUserId()
        databaseService.deleteDatabase(id, userId)
        return ResponseEntity.noContent().build()
    }

    // Column endpoints
    @PostMapping("/{id}/columns")
    fun addColumn(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: CreateColumnRequest
    ): ResponseEntity<ApiResponse<ColumnDto>> {
        val userId = getCurrentUserId()
        val column = databaseService.addColumn(
            id,
            userId,
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
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @PathVariable @ValidUuid(fieldName = "columnId") columnId: String,
        @Valid @RequestBody request: UpdateColumnRequest
    ): ResponseEntity<ApiResponse<ColumnDto>> {
        val userId = getCurrentUserId()
        val column = databaseService.updateColumn(
            columnId,
            userId,
            request.name,
            request.type,
            request.options,
            request.position
        ) ?: throw NotFoundException("Column with id '$columnId' not found")

        return ResponseEntity.ok(successResponse(column.toDto()))
    }

    @DeleteMapping("/{id}/columns/{columnId}")
    fun deleteColumn(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @PathVariable @ValidUuid(fieldName = "columnId") columnId: String
    ): ResponseEntity<Void> {
        val userId = getCurrentUserId()
        databaseService.deleteColumn(columnId, userId)
        return ResponseEntity.noContent().build()
    }

    // Record endpoints
    @GetMapping("/{id}/records")
    fun getRecords(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<List<RecordDto>>> {
        val userId = getCurrentUserId()
        val records = databaseService.getRecordsByDatabaseId(id, userId)
        return ResponseEntity.ok(successResponse(records))
    }

    @PostMapping("/{id}/records")
    fun createRecord(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: CreateRecordRequest
    ): ResponseEntity<ApiResponse<RecordDto>> {
        val userId = getCurrentUserId()
        val record = databaseService.createRecord(id, userId, request.data)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(record))
    }

    @PutMapping("/{id}/records/{recordId}")
    fun updateRecord(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @PathVariable @ValidUuid(fieldName = "recordId") recordId: String,
        @Valid @RequestBody request: UpdateRecordRequest
    ): ResponseEntity<ApiResponse<RecordDto>> {
        val userId = getCurrentUserId()
        val record = databaseService.updateRecord(recordId, userId, request.data)
            ?: throw NotFoundException("Record with id '$recordId' not found")

        return ResponseEntity.ok(successResponse(record))
    }

    @DeleteMapping("/{id}/records/{recordId}")
    fun deleteRecord(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @PathVariable @ValidUuid(fieldName = "recordId") recordId: String
    ): ResponseEntity<Void> {
        val userId = getCurrentUserId()
        databaseService.deleteRecord(recordId, userId)
        return ResponseEntity.noContent().build()
    }
}
