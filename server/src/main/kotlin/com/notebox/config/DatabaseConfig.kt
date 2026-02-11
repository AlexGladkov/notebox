package com.notebox.config

import com.notebox.domain.database.ColumnsTable
import com.notebox.domain.database.CustomDatabasesTable
import com.notebox.domain.database.FilesTable
import com.notebox.domain.database.RecordsTable
import com.notebox.domain.folder.FoldersTable
import com.notebox.domain.note.NotesTable
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.annotation.Configuration
import org.springframework.context.event.EventListener
import javax.sql.DataSource

@Configuration
class DatabaseConfig(
    private val dataSource: DataSource
) {
    @EventListener(ApplicationReadyEvent::class)
    fun initDatabase() {
        Database.connect(dataSource)

        transaction {
            SchemaUtils.create(
                FoldersTable,
                NotesTable,
                CustomDatabasesTable,
                ColumnsTable,
                RecordsTable,
                FilesTable
            )
        }
    }
}
