package com.notebox.config

import com.notebox.domain.database.ColumnsTable
import com.notebox.domain.database.CustomDatabasesTable
import com.notebox.domain.database.FilesTable
import com.notebox.domain.database.RecordsTable
import com.notebox.domain.note.NotesTable
import com.notebox.domain.tag.TagsTable
import com.notebox.domain.tag.NoteTagsTable
import com.notebox.migration.FolderToNoteMigration
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.annotation.Configuration
import org.springframework.context.event.EventListener
import javax.sql.DataSource

@Configuration
class DatabaseInitializer(
    private val dataSource: DataSource,
    private val folderToNoteMigration: FolderToNoteMigration
) {
    private val logger = LoggerFactory.getLogger(DatabaseInitializer::class.java)

    @EventListener(ApplicationReadyEvent::class)
    fun initDatabase() {
        Database.connect(dataSource)

        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                NotesTable,
                CustomDatabasesTable,
                ColumnsTable,
                RecordsTable,
                FilesTable,
                TagsTable,
                NoteTagsTable
            )
        }

        // Выполняем миграцию папок в страницы
        try {
            logger.info("Запуск миграции папок в страницы...")
            // Временно отключено для тестирования
            // folderToNoteMigration.fullMigration()
            logger.info("Миграция пропущена (отключена для тестирования)")
        } catch (e: Exception) {
            logger.warn("Миграция не выполнена или уже была выполнена ранее: ${e.message}")
        }
    }
}
