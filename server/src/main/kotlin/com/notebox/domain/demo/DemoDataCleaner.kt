package com.notebox.domain.demo

import com.notebox.domain.auth.UserRepository
import com.notebox.domain.database.DatabaseRepository
import com.notebox.domain.note.NoteRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

/**
 * Компонент для очистки демо-данных с проверкой безопасности.
 * Отвечает только за валидацию и удаление данных.
 */
@Component
class DemoDataCleaner(
    private val userRepository: UserRepository,
    private val databaseRepository: DatabaseRepository,
    private val noteRepository: NoteRepository
) {
    private val logger = LoggerFactory.getLogger(DemoDataCleaner::class.java)

    companion object {
        private const val DEMO_EMAIL = "demo@notebox.app"
    }

    /**
     * Очищает все демо-данные (заметки и базы данных)
     *
     * ВАЖНО: Этот метод удаляет ВСЕ заметки и базы данных в системе.
     * Безопасность обеспечивается проверкой: в системе должен быть только демо-пользователь.
     */
    fun clearAllDemoData() {
        logger.info("Clearing demo data...")
        validateOnlyDemoUserExists()

        databaseRepository.deleteAllDatabases()
        noteRepository.deleteAll()
        logger.info("Demo data cleared successfully")
    }

    private fun validateOnlyDemoUserExists() {
        val allUsers = userRepository.findAll()
        val nonDemoUsers = allUsers.filter { it.email != DEMO_EMAIL }

        if (nonDemoUsers.isNotEmpty()) {
            val errorMsg = "SECURITY: Cannot clear demo data - system has ${nonDemoUsers.size} non-demo user(s)"
            logger.error(errorMsg)
            throw IllegalStateException(errorMsg)
        }
        logger.info("Safety check passed: only demo user exists")
    }
}
