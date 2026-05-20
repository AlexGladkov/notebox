package com.notebox.domain.demo

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Сервис для создания и управления демо-контентом.
 * Координирует работу специализированных компонентов.
 */
@Service
class DemoContentService(
    private val demoDataCleaner: DemoDataCleaner,
    private val demoNoteBuilder: DemoNoteBuilder,
    private val demoDatabaseBuilder: DemoDatabaseBuilder
) {
    private val logger = LoggerFactory.getLogger(DemoContentService::class.java)

    fun clearDemoData() {
        try {
            demoDataCleaner.clearAllDemoData()
        } catch (e: Exception) {
            logger.error("Error clearing demo data", e)
            throw e
        }
    }

    fun createDemoContent() {
        logger.info("Creating demo content...")
        try {
            // Phase 1: Создаём заметки
            val notes = demoNoteBuilder.createDemoNotes()

            // Phase 2: Создаём базу данных
            val database = demoDatabaseBuilder.createDemoDatabase()

            // Phase 3: Обновляем заметки с правильными ссылками
            demoNoteBuilder.updateNotesWithLinks(notes, database.id)

            logger.info("Demo content created successfully: 5 notes, 1 database with 4 records")
        } catch (e: Exception) {
            logger.error("Error creating demo content", e)
            rollbackDemoContent()
            throw e
        }
    }

    private fun rollbackDemoContent() {
        try {
            logger.warn("Rolling back: clearing partially created demo data")
            demoDataCleaner.clearAllDemoData()
        } catch (cleanupError: Exception) {
            logger.error("Failed to cleanup after demo content creation error", cleanupError)
        }
    }
}
