package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.SelectOptionDto
import com.notebox.exception.AccessDeniedException
import org.springframework.stereotype.Service

/**
 * Сервис для управления колонками баз данных.
 * Отвечает только за операции с Column.
 */
@Service
class ColumnService(
    private val databaseRepository: DatabaseRepository
) {
    fun getColumnsByDatabaseId(databaseId: String, userId: String): List<Column> {
        // Проверяем ownership parent database
        verifyDatabaseOwnership(databaseId, userId)
        return databaseRepository.findColumnsByDatabaseId(databaseId)
    }

    fun addColumn(
        databaseId: String,
        userId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column {
        // Проверяем ownership parent database
        verifyDatabaseOwnership(databaseId, userId)
        return databaseRepository.createColumn(databaseId, name, type, options, position)
    }

    fun updateColumn(
        id: String,
        userId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column? {
        // Проверяем ownership через parent database
        val column = databaseRepository.findColumnById(id)
            ?: return null
        verifyDatabaseOwnership(column.databaseId, userId)
        return databaseRepository.updateColumn(id, name, type, options, position)
    }

    fun deleteColumn(id: String, userId: String): Boolean {
        // Проверяем ownership через parent database
        val column = databaseRepository.findColumnById(id)
            ?: return false
        verifyDatabaseOwnership(column.databaseId, userId)
        return databaseRepository.deleteColumn(id)
    }

    private fun verifyDatabaseOwnership(databaseId: String, userId: String) {
        databaseRepository.findDatabaseByIdAndUserId(databaseId, userId)
            ?: throw AccessDeniedException("Access denied to database: $databaseId")
    }
}
