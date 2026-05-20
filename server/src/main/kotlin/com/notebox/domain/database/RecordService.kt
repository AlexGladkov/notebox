package com.notebox.domain.database

import com.notebox.dto.RecordDto
import com.notebox.exception.AccessDeniedException
import org.springframework.stereotype.Service

/**
 * Сервис для управления записями баз данных.
 * Отвечает только за операции с Record.
 */
@Service
class RecordService(
    private val databaseRepository: DatabaseRepository
) {
    fun getRecordsByDatabaseId(databaseId: String, userId: String): List<RecordDto> {
        // Проверяем ownership parent database
        verifyDatabaseOwnership(databaseId, userId)
        return databaseRepository.findRecordsByDatabaseId(databaseId).map { it.toDto() }
    }

    fun getRecordById(id: String, userId: String): RecordDto? {
        // Проверяем ownership через parent database
        val record = databaseRepository.findRecordById(id) ?: return null
        verifyDatabaseOwnership(record.databaseId, userId)
        return record.toDto()
    }

    fun createRecord(databaseId: String, userId: String, data: Map<String, Any?>): RecordDto {
        // Проверяем ownership parent database
        verifyDatabaseOwnership(databaseId, userId)
        return databaseRepository.createRecord(databaseId, data).toDto()
    }

    fun updateRecord(id: String, userId: String, data: Map<String, Any?>): RecordDto? {
        // Проверяем ownership через parent database
        val record = databaseRepository.findRecordById(id) ?: return null
        verifyDatabaseOwnership(record.databaseId, userId)
        return databaseRepository.updateRecord(id, data)?.toDto()
    }

    fun deleteRecord(id: String, userId: String): Boolean {
        // Проверяем ownership через parent database
        val record = databaseRepository.findRecordById(id) ?: return false
        verifyDatabaseOwnership(record.databaseId, userId)
        return databaseRepository.deleteRecord(id)
    }

    private fun verifyDatabaseOwnership(databaseId: String, userId: String) {
        databaseRepository.findDatabaseByIdAndUserId(databaseId, userId)
            ?: throw AccessDeniedException("Access denied to database: $databaseId")
    }

    private fun Record.toDto() = RecordDto(
        id = id,
        databaseId = databaseId,
        data = data,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli()
    )
}
