package com.notebox.domain.demo

/**
 * Шаблоны демо-контента для демонстрации возможностей платформы.
 * Все данные в формате TipTap JSON.
 */
object DemoContentData {

    // Заголовки страниц
    const val DASHBOARD_TITLE = "Мой Dashboard"
    const val GOALS_TITLE = "Цели на месяц"
    const val IDEAS_TITLE = "Идеи для проектов"
    const val NOTES_TITLE = "Рабочие заметки"
    const val CONTACTS_TITLE = "Важные контакты"

    // Название базы данных
    const val DATABASE_NAME = "Мои задачи"

    /**
     * Контент главной страницы Dashboard (без ссылок и базы данных - они добавляются позже)
     */
    fun getDashboardContent(): String = """
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Добро пожаловать в NoteBox!" }]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Это ваше персональное рабочее пространство для организации заметок, задач и идей. NoteBox помогает структурировать мысли и быть продуктивнее."
        }
      ]
    },
    {
      "type": "callout",
      "attrs": { "type": "info" },
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "ℹ️ Это демо-режим. Вы можете свободно редактировать, создавать и удалять данные. При каждом входе в демо всё сбрасывается к начальному состоянию."
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Быстрый доступ" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "📄 " },
        {
          "type": "text",
          "text": "Цели на месяц",
          "marks": [{ "type": "link", "attrs": { "href": "/notes/{{GOALS_ID}}" }}]
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "💡 " },
        {
          "type": "text",
          "text": "Идеи для проектов",
          "marks": [{ "type": "link", "attrs": { "href": "/notes/{{IDEAS_ID}}" }}]
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "📝 " },
        {
          "type": "text",
          "text": "Рабочие заметки",
          "marks": [{ "type": "link", "attrs": { "href": "/notes/{{NOTES_ID}}" }}]
        }
      ]
    },
    {
      "type": "horizontalRule"
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Мои задачи" }]
    },
    {
      "type": "database",
      "attrs": { "databaseId": "{{DATABASE_ID}}" }
    }
  ]
}
    """.trimIndent()

    /**
     * Контент страницы "Цели на месяц"
     */
    fun getGoalsContent(): String = """
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Цели на месяц" }]
    },
    {
      "type": "callout",
      "attrs": { "type": "success" },
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "✨ Отличный месяц для новых достижений! Сфокусируйтесь на главном."
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Профессиональные цели" }]
    },
    {
      "type": "taskList",
      "content": [
        {
          "type": "taskItem",
          "attrs": { "checked": true },
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Завершить проект для клиента X" }]
            }
          ]
        },
        {
          "type": "taskItem",
          "attrs": { "checked": false },
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Изучить новый фреймворк для веб-разработки" }]
            }
          ]
        },
        {
          "type": "taskItem",
          "attrs": { "checked": false },
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Провести ревью кода с командой" }]
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Личные цели" }]
    },
    {
      "type": "taskList",
      "content": [
        {
          "type": "taskItem",
          "attrs": { "checked": false },
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Прочитать 2 книги" }]
            }
          ]
        },
        {
          "type": "taskItem",
          "attrs": { "checked": false },
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Начать заниматься спортом 3 раза в неделю" }]
            }
          ]
        }
      ]
    },
    {
      "type": "horizontalRule"
    },
    {
      "type": "callout",
      "attrs": { "type": "warning" },
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "⚠️ Дедлайн по профессиональным целям: конец месяца!"
            }
          ]
        }
      ]
    }
  ]
}
    """.trimIndent()

    /**
     * Контент страницы "Идеи для проектов"
     */
    fun getIdeasContent(): String = """
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Идеи для проектов" }]
    },
    {
      "type": "blockquote",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "\"Лучший способ предсказать будущее — создать его.\""
            }
          ]
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "— Питер Друкер"
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Список идей" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Мобильное приложение для трекинга привычек",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — помогает пользователям формировать полезные привычки"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Телеграм-бот для быстрых заметок",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — отправляешь сообщение боту, оно сохраняется в заметки"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Система управления знаниями",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — персональная wiki с связями между заметками"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Дашборд для отслеживания целей",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — визуализация прогресса по задачам"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Пример кода" }]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Быстрый прототип на JavaScript:"
        }
      ]
    },
    {
      "type": "codeBlock",
      "attrs": { "language": "javascript" },
      "content": [
        {
          "type": "text",
          "text": "// Пример простого приветствия\nconst greeting = 'Hello, NoteBox!';\nconsole.log(greeting);\n\n// Функция для создания заметки\nfunction createNote(title, content) {\n  return {\n    id: Date.now(),\n    title,\n    content,\n    createdAt: new Date()\n  };\n}"
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Следующие шаги" }]
    },
    {
      "type": "orderedList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Выбрать самую интересную идею" }]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Создать минимальный прототип" }]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Протестировать на реальных пользователях" }]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Итерировать на основе фидбека" }]
            }
          ]
        }
      ]
    }
  ]
}
    """.trimIndent()

    /**
     * Контент страницы "Рабочие заметки"
     */
    fun getNotesContent(): String = """
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Рабочие заметки" }]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Это пространство для быстрых заметок и мыслей, которые возникают в течение дня."
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Ключевые моменты" }]
    },
    {
      "type": "orderedList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Регулярно пересматривать цели",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — помогает оставаться на правильном пути"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Документировать процесс",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — через несколько месяцев это очень ценно"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Использовать вложенные страницы",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — для организации связанной информации"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "horizontalRule"
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Полезные ресурсы" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "📋 " },
        {
          "type": "text",
          "text": "Важные контакты",
          "marks": [{ "type": "link", "attrs": { "href": "/notes/{{CONTACTS_ID}}" }}]
        },
        {
          "type": "text",
          "text": " — список ключевых людей и их контакты"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Используйте вложенные страницы для организации информации по темам и проектам."
        }
      ]
    }
  ]
}
    """.trimIndent()

    /**
     * Контент вложенной страницы "Важные контакты"
     */
    fun getContactsContent(): String = """
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Важные контакты" }]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Список ключевых контактов для работы и сотрудничества."
        }
      ]
    },
    {
      "type": "callout",
      "attrs": { "type": "info" },
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "💡 Совет: Храните контакты структурированно, чтобы быстро находить нужную информацию."
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Команда" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Анна Иванова",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — Менеджер проекта | anna@example.com"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Петр Смирнов",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — Разработчик | petr@example.com"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Мария Петрова",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " — Дизайнер | maria@example.com"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Клиенты" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "ООО \"ТехноКомпани\"",
                  "marks": [{ "type": "bold" }]
                },
                {
                  "type": "text",
                  "text": " | Контакт: Сергей Волков | sergey@techno.com"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
    """.trimIndent()
}
