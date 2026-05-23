package com.notebox.domain.demo

import com.notebox.domain.auth.User
import com.notebox.domain.auth.UserRepository
import com.notebox.domain.database.DatabaseRepository
import com.notebox.domain.note.NoteRepository
import com.notebox.domain.notification.PushSubscriptionRepository
import com.notebox.domain.reminder.ReminderRepository
import com.notebox.domain.storage.FileRepository
import com.notebox.domain.tag.TagRepository
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
    private val noteRepository: NoteRepository,
    private val tagRepository: TagRepository,
    private val fileRepository: FileRepository,
    private val reminderRepository: ReminderRepository,
    private val pushSubscriptionRepository: PushSubscriptionRepository
) {
    private val logger = LoggerFactory.getLogger(DemoDataCleaner::class.java)

    companion object {
        private const val DEMO_EMAIL = "demo@notebox.app"
    }

    /**
     * Очищает все демо-данные (заметки, базы данных, теги, файлы, напоминания, подписки)
     *
     * ВАЖНО: Этот метод удаляет ВСЕ данные демо-пользователя.
     * Безопасность обеспечивается проверкой: в системе должен быть только демо-пользователь.
     */
    fun clearAllDemoData() {
        logger.info("Clearing demo data...")
        val demoUser = validateOnlyDemoUserExists()
        val demoUserId = demoUser.id

        // Удаляем данные в правильном порядке (учитываем foreign key constraints)
        val remindersDeleted = reminderRepository.deleteAllByUserId(demoUserId)
        val tagsDeleted = tagRepository.deleteAllByUserId(demoUserId)
        val filesDeleted = fileRepository.deleteAllByUserId(demoUserId)
        val subscriptionsDeleted = pushSubscriptionRepository.deleteAllByUserId(demoUserId)

        val databasesDeleted = databaseRepository.deleteAllDatabases()
        val notesDeleted = noteRepository.deleteAll()

        logger.info("Demo data cleared successfully: " +
            "notes=$notesDeleted, databases=$databasesDeleted, reminders=$remindersDeleted, " +
            "tags=$tagsDeleted, files=$filesDeleted, subscriptions=$subscriptionsDeleted")
    }

    private fun validateOnlyDemoUserExists(): User {
        val allUsers = userRepository.findAll()
        val demoUser = allUsers.find { it.email == DEMO_EMAIL }
            ?: throw IllegalStateException("Demo user not found")

        val nonDemoUsers = allUsers.filter { it.email != DEMO_EMAIL }

        if (nonDemoUsers.isNotEmpty()) {
            val errorMsg = "SECURITY: Cannot clear demo data - system has ${nonDemoUsers.size} non-demo user(s)"
            logger.error(errorMsg)
            throw IllegalStateException(errorMsg)
        }
        logger.info("Safety check passed: only demo user exists")
        return demoUser
    }
}
