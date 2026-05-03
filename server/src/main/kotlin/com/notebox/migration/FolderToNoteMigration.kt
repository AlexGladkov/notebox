package com.notebox.migration

import com.notebox.domain.folder.FoldersTable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.javatime.timestamp
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.UUID

/**
 * Legacy table definition that includes the old folderId column
 * Used only during migration from folder-based to page-based hierarchy
 */
internal object LegacyNotesTable : Table("notes") {
    val id = varchar("id", 36)
    val title = varchar("title", 500)
    val content = text("content")
    val folderId = varchar("folder_id", 36)
    val parentId = varchar("parent_id", 36).nullable()
    val icon = varchar("icon", 50).nullable()
    val backdropType = varchar("backdrop_type", 20).nullable()
    val backdropValue = text("backdrop_value").nullable()
    val backdropPositionY = integer("backdrop_position_y").default(50)
    val createdAt = timestamp("created_at").default(Instant.now())
    val updatedAt = timestamp("updated_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}

/**
 * Миграция для преобразования папок в страницы
 *
 * Этот компонент выполняет следующие действия:
 * 1. Преобразует все папки в страницы (заметки с пустым content)
 * 2. Обновляет parentId у заметок, которые находились в папках
 * 3. Удаляет старую колонку folderId из таблицы notes
 */
@Component
class FolderToNoteMigration {

    private val logger = LoggerFactory.getLogger(FolderToNoteMigration::class.java)

    /**
     * Топологическая сортировка папок для корректной миграции иерархии
     * Сначала обрабатываются корневые папки, затем их дочерние
     */
    private fun topologicalSortFolders(folders: List<ResultRow>): List<ResultRow> {
        val sortedFolders = mutableListOf<ResultRow>()
        val processed = mutableSetOf<String>()

        // Рекурсивная функция для добавления папки и её потомков
        fun addFolderWithDescendants(folderId: String?) {
            folders.forEach { folder ->
                val id = folder[FoldersTable.id]
                val parentId = folder[FoldersTable.parentId]

                // Добавляем папку, если её родитель соответствует текущему уровню
                if (parentId == folderId && !processed.contains(id)) {
                    sortedFolders.add(folder)
                    processed.add(id)
                    // Рекурсивно добавляем дочерние папки
                    addFolderWithDescendants(id)
                }
            }
        }

        // Начинаем с корневых папок (parentId == null)
        addFolderWithDescendants(null)

        // Обрабатываем оставшиеся папки (на случай циклов или orphans)
        folders.forEach { folder ->
            val id = folder[FoldersTable.id]
            if (!processed.contains(id)) {
                sortedFolders.add(folder)
                processed.add(id)
            }
        }

        return sortedFolders
    }

    /**
     * Выполняет миграцию папок в страницы
     *
     * @return true если миграция выполнена успешно, false если она уже была выполнена ранее
     */
    fun migrate(): Boolean = transaction {
        logger.info("Начало миграции папок в страницы...")

        // Проверяем, существует ли колонка folderId через information_schema
        val hasFolderIdColumn = try {
            val result = exec("SELECT column_name FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'folder_id'") { rs ->
                rs.next()
            }
            result == true
        } catch (e: Exception) {
            logger.error("Ошибка при проверке наличия колонки folder_id: ${e.message}")
            false
        }

        if (!hasFolderIdColumn) {
            logger.info("Миграция уже выполнена (колонка folder_id отсутствует)")
            return@transaction false
        }

        // Шаг 1: Создаем мапу для отслеживания преобразованных папок
        val folderToNoteIdMap = mutableMapOf<String, String>()

        // Шаг 2: Получаем все папки
        val folders = FoldersTable.selectAll().toList()
        logger.info("Найдено ${folders.size} папок для преобразования")

        // Шаг 3: Сортируем папки топологически (сначала корневые, потом дочерние)
        val sortedFolders = topologicalSortFolders(folders)
        logger.debug("Папки отсортированы в правильном порядке для миграции")

        // Шаг 4: Преобразуем каждую папку в страницу
        sortedFolders.forEach { folderRow ->
            val folderId = folderRow[FoldersTable.id]
            val folderName = folderRow[FoldersTable.name]
            val folderParentId = folderRow[FoldersTable.parentId]
            val folderCreatedAt = folderRow[FoldersTable.createdAt]
            val folderUpdatedAt = folderRow[FoldersTable.updatedAt]

            // Создаем новую заметку-страницу из папки
            val noteId = UUID.randomUUID().toString()

            LegacyNotesTable.insert {
                it[id] = noteId
                it[title] = folderName
                it[content] = "" // Папки превращаются в пустые страницы
                it[LegacyNotesTable.folderId] = folderId // Временно сохраняем старый folderId
                it[parentId] = if (folderParentId != null) {
                    // Родительская папка уже обработана благодаря топологической сортировке
                    folderToNoteIdMap[folderParentId]
                } else {
                    null
                }
                it[icon] = "📁" // Иконка папки для бывших папок
                it[backdropType] = null
                it[backdropValue] = null
                it[backdropPositionY] = 50
                it[createdAt] = folderCreatedAt
                it[updatedAt] = folderUpdatedAt
            }

            folderToNoteIdMap[folderId] = noteId
            logger.debug("Папка '$folderName' ($folderId) преобразована в страницу ($noteId)")
        }

        // Шаг 4: Обновляем parentId для всех заметок, которые были в папках
        val notes = LegacyNotesTable.selectAll().toList()
        logger.info("Обновление parentId для ${notes.size} заметок...")

        notes.forEach { noteRow ->
            val noteId = noteRow[LegacyNotesTable.id]
            val noteFolderId = noteRow[LegacyNotesTable.folderId]
            val noteParentId = noteRow[LegacyNotesTable.parentId]

            // Если у заметки не было родителя, её родителем становится страница-папка
            if (noteParentId == null && noteFolderId in folderToNoteIdMap) {
                val newParentId = folderToNoteIdMap[noteFolderId]
                LegacyNotesTable.update({ LegacyNotesTable.id eq noteId }) {
                    it[parentId] = newParentId
                    it[updatedAt] = Instant.now()
                }
                logger.debug("Заметка $noteId: установлен parentId = $newParentId (из folderId = $noteFolderId)")
            }
        }

        logger.info("Миграция завершена: ${folderToNoteIdMap.size} папок преобразованы в страницы")
        return@transaction true
    }

    /**
     * Удаляет колонку folderId из таблицы notes
     * ВНИМАНИЕ: Эта операция необратима!
     *
     * Необходимо вызывать только после успешного выполнения migrate()
     */
    fun dropFolderIdColumn() = transaction {
        logger.warn("ВНИМАНИЕ: Удаление колонки folderId из таблицы notes...")

        // Exposed не поддерживает ALTER TABLE DROP COLUMN напрямую
        // Используем чистый SQL
        exec("ALTER TABLE notes DROP COLUMN IF EXISTS folder_id")

        logger.info("Колонка folderId успешно удалена")
    }

    /**
     * Удаляет таблицу folders
     * ВНИМАНИЕ: Эта операция необратима!
     *
     * Необходимо вызывать только после успешного выполнения migrate() и dropFolderIdColumn()
     */
    fun dropFoldersTable() = transaction {
        logger.warn("ВНИМАНИЕ: Удаление таблицы folders...")

        SchemaUtils.drop(FoldersTable)

        logger.info("Таблица folders успешно удалена")
    }

    /**
     * Полная миграция: преобразование папок, удаление колонки folderId, удаление таблицы folders
     *
     * @return true если миграция выполнена успешно
     */
    fun fullMigration(): Boolean {
        return try {
            val migrated = migrate()
            if (migrated) {
                dropFolderIdColumn()
                dropFoldersTable()
                logger.info("Полная миграция завершена успешно")
                true
            } else {
                logger.info("Миграция пропущена (уже была выполнена ранее)")
                false
            }
        } catch (e: Exception) {
            logger.error("Ошибка при выполнении миграции", e)
            throw e
        }
    }
}
