package com.notebox.domain.database

import com.notebox.dto.RecordDto
import org.springframework.stereotype.Service

/**
 * Сервис для управления записями баз данных.
 * Отвечает только за операции с Record.
 */
@Service
class RecordService(
    private val databaseRepository: DatabaseRepository
) {
    fun getRecordsByDatabaseId(databaseId: String): List<RecordDto> {
        return databaseRepository.findRecordsByDatabaseId(databaseId).map { it.toDto() }
    }

    fun getRecordById(id: String): RecordDto? {
        return databaseRepository.findRecordById(id)?.toDto()
    }

    fun createRecord(databaseId: String, data: Map<String, Any?>): RecordDto {
        return databaseRepository.createRecord(databaseId, data).toDto()
    }

    fun updateRecord(id: String, data: Map<String, Any?>): RecordDto? {
        return databaseRepository.updateRecord(id, data)?.toDto()
    }

    fun deleteRecord(id: String): Boolean {
        return databaseRepository.deleteRecord(id)
    }

    private fun Record.toDto() = RecordDto(
        id = id,
        databaseId = databaseId,
        data = data,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli()
    )
}
