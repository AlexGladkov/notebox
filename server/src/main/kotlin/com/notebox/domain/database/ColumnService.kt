package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.SelectOptionDto
import org.springframework.stereotype.Service

/**
 * Сервис для управления колонками баз данных.
 * Отвечает только за операции с Column.
 */
@Service
class ColumnService(
    private val databaseRepository: DatabaseRepository
) {
    fun getColumnsByDatabaseId(databaseId: String): List<Column> {
        return databaseRepository.findColumnsByDatabaseId(databaseId)
    }

    fun addColumn(
        databaseId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column {
        return databaseRepository.createColumn(databaseId, name, type, options, position)
    }

    fun updateColumn(
        id: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column? {
        return databaseRepository.updateColumn(id, name, type, options, position)
    }

    fun deleteColumn(id: String): Boolean {
        return databaseRepository.deleteColumn(id)
    }
}
