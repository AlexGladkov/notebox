import type { Template } from '../types/template';

export const templates: Template[] = [
  {
    id: 'meeting-notes',
    title: 'Заметки со встречи',
    description: 'Повестка, участники, решения, действия',
    icon: '📋',
    category: 'work',
    content: `<h2>📅 Встреча: [Название встречи]</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<p><strong>Участники:</strong></p>
<ul>
  <li></li>
</ul>
<h3>Повестка</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>
<h3>Ключевые решения</h3>
<ul>
  <li></li>
</ul>
<h3>Действия</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>`,
    staticExample: `<h2>📅 Встреча: Еженедельный статус по проекту</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<p><strong>Участники:</strong></p>
<ul>
  <li>Александр (PM)</li>
  <li>Мария (Designer)</li>
  <li>Иван (Developer)</li>
</ul>
<h3>Повестка</h3>
<ul class="task-list">
  <li data-checked="true">Обзор прогресса за неделю</li>
  <li data-checked="true">Обсуждение блокеров</li>
  <li data-checked="false">Планирование на следующую неделю</li>
</ul>
<h3>Ключевые решения</h3>
<ul>
  <li>Перенести дедлайн на 2 дня для доработки дизайна</li>
  <li>Добавить еженедельные демо для заказчика</li>
</ul>
<h3>Действия</h3>
<ul class="task-list">
  <li data-checked="false">Иван: завершить интеграцию API до пятницы</li>
  <li data-checked="false">Мария: подготовить финальные макеты до среды</li>
  <li data-checked="false">Александр: согласовать новый график с заказчиком</li>
</ul>`,
  },
  {
    id: 'project-plan',
    title: 'План проекта',
    description: 'Цели, этапы, сроки, ресурсы',
    icon: '📊',
    category: 'work',
    content: `<h2>📊 Проект: [Название проекта]</h2>
<h3>Цели</h3>
<ul>
  <li><strong>Основная цель:</strong> </li>
  <li><strong>Метрики успеха:</strong> </li>
</ul>
<h3>Этапы реализации</h3>
<ol>
  <li><strong>Этап 1:</strong>
    <ul>
      <li>Сроки: </li>
      <li>Ответственный: </li>
    </ul>
  </li>
  <li><strong>Этап 2:</strong>
    <ul>
      <li>Сроки: </li>
      <li>Ответственный: </li>
    </ul>
  </li>
</ol>
<h3>Ресурсы</h3>
<ul>
  <li><strong>Команда:</strong> </li>
  <li><strong>Бюджет:</strong> </li>
  <li><strong>Инструменты:</strong> </li>
</ul>
<h3>Риски</h3>
<ul>
  <li></li>
</ul>`,
    staticExample: `<h2>📊 Проект: Запуск мобильного приложения</h2>
<h3>Цели</h3>
<ul>
  <li><strong>Основная цель:</strong> Выпустить MVP мобильного приложения для iOS и Android</li>
  <li><strong>Метрики успеха:</strong> 1000 скачиваний в первый месяц, 4.0+ рейтинг в сторах</li>
</ul>
<h3>Этапы реализации</h3>
<ol>
  <li><strong>Фаза дизайна:</strong>
    <ul>
      <li>Сроки: 1-15 июня</li>
      <li>Ответственный: Дизайн-команда</li>
    </ul>
  </li>
  <li><strong>Разработка MVP:</strong>
    <ul>
      <li>Сроки: 16 июня - 31 июля</li>
      <li>Ответственный: Mobile Dev Team</li>
    </ul>
  </li>
  <li><strong>Тестирование и релиз:</strong>
    <ul>
      <li>Сроки: 1-15 августа</li>
      <li>Ответственный: QA + Product Owner</li>
    </ul>
  </li>
</ol>
<h3>Ресурсы</h3>
<ul>
  <li><strong>Команда:</strong> 2 разработчика, 1 дизайнер, 1 QA</li>
  <li><strong>Бюджет:</strong> $50,000</li>
  <li><strong>Инструменты:</strong> React Native, Firebase, Figma</li>
</ul>
<h3>Риски</h3>
<ul>
  <li>Задержки с получением сертификатов Apple Developer</li>
  <li>Сложности интеграции с backend API</li>
</ul>`,
  },
  {
    id: 'learning-log',
    title: 'Журнал обучения',
    description: 'Тема, ключевые идеи, вопросы, следующие шаги',
    icon: '📚',
    category: 'learning',
    content: `<h2>📚 Изучаю: [Тема]</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<p><strong>Источник:</strong> </p>
<h3>Ключевые идеи</h3>
<ul>
  <li></li>
</ul>
<h3>Новые концепции</h3>
<ul>
  <li><strong>Концепция 1:</strong> </li>
  <li><strong>Концепция 2:</strong> </li>
</ul>
<h3>Вопросы для дальнейшего изучения</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>
<h3>Практическое применение</h3>
<p></p>
<h3>Следующие шаги</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>`,
    staticExample: `<h2>📚 Изучаю: Основы TypeScript</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<p><strong>Источник:</strong> TypeScript Handbook, официальная документация</p>
<h3>Ключевые идеи</h3>
<ul>
  <li>TypeScript — это надмножество JavaScript с статической типизацией</li>
  <li>Позволяет находить ошибки на этапе разработки</li>
  <li>Компилируется в обычный JavaScript</li>
</ul>
<h3>Новые концепции</h3>
<ul>
  <li><strong>Интерфейсы:</strong> Определение структуры объектов</li>
  <li><strong>Generics:</strong> Повторное использование кода с разными типами</li>
  <li><strong>Type guards:</strong> Проверка типов в runtime</li>
</ul>
<h3>Вопросы для дальнейшего изучения</h3>
<ul class="task-list">
  <li data-checked="false">Как работают декораторы в TypeScript?</li>
  <li data-checked="false">В чём разница между interface и type?</li>
  <li data-checked="false">Как настроить строгие проверки типов?</li>
</ul>
<h3>Практическое применение</h3>
<p>Переписать текущий JavaScript проект на TypeScript для улучшения поддерживаемости кода</p>
<h3>Следующие шаги</h3>
<ul class="task-list">
  <li data-checked="false">Пройти практические задания в TypeScript Playground</li>
  <li data-checked="false">Изучить продвинутые типы (mapped types, conditional types)</li>
  <li data-checked="false">Настроить TypeScript в существующем проекте</li>
</ul>`,
  },
  {
    id: 'weekly-review',
    title: 'Недельный обзор',
    description: 'Достижения, проблемы, планы на следующую неделю',
    icon: '📅',
    category: 'personal',
    content: `<h2>📅 Недельный обзор</h2>
<p><strong>Неделя:</strong> {{DATE}}</p>
<h3>✅ Достижения</h3>
<ul>
  <li></li>
</ul>
<h3>🚧 Проблемы и блокеры</h3>
<ul>
  <li></li>
</ul>
<h3>💡 Уроки и инсайты</h3>
<ul>
  <li></li>
</ul>
<h3>📋 Планы на следующую неделю</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>
<h3>🎯 Приоритеты</h3>
<ol>
  <li></li>
</ol>`,
    staticExample: `<h2>📅 Недельный обзор</h2>
<p><strong>Неделя:</strong> {{DATE}}</p>
<h3>✅ Достижения</h3>
<ul>
  <li>Завершил редизайн главной страницы приложения</li>
  <li>Исправил 15 багов из backlog</li>
  <li>Провёл презентацию новых фич команде</li>
  <li>Начал изучение нового фреймворка</li>
</ul>
<h3>🚧 Проблемы и блокеры</h3>
<ul>
  <li>Задержка с code review от коллег</li>
  <li>Проблемы с производительностью на мобильных устройствах</li>
  <li>Не хватило времени на рефакторинг старого кода</li>
</ul>
<h3>💡 Уроки и инсайты</h3>
<ul>
  <li>Ранее обсуждение дизайна с командой экономит время на переделку</li>
  <li>Автоматизация тестов критична для быстрого цикла разработки</li>
  <li>Важно выделять время на обучение даже в загруженные недели</li>
</ul>
<h3>📋 Планы на следующую неделю</h3>
<ul class="task-list">
  <li data-checked="false">Завершить интеграцию платёжного шлюза</li>
  <li data-checked="false">Провести performance audit приложения</li>
  <li data-checked="false">Написать документацию по новому API</li>
  <li data-checked="false">Подготовить материалы для tech talk</li>
</ul>
<h3>🎯 Приоритеты</h3>
<ol>
  <li>Стабильность и производительность продукта</li>
  <li>Завершение критических фич для релиза</li>
  <li>Улучшение качества кода через рефакторинг</li>
</ol>`,
  },
  {
    id: 'brainstorm',
    title: 'Мозговой штурм',
    description: 'Проблема, идеи, оценка, следующие шаги',
    icon: '💡',
    category: 'work',
    content: `<h2>💡 Мозговой штурм: [Тема]</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<p><strong>Участники:</strong> </p>
<h3>🎯 Проблема / Вызов</h3>
<p></p>
<h3>💭 Идеи</h3>
<ol>
  <li><strong>Идея 1:</strong>
    <ul>
      <li>Плюсы: </li>
      <li>Минусы: </li>
    </ul>
  </li>
  <li><strong>Идея 2:</strong>
    <ul>
      <li>Плюсы: </li>
      <li>Минусы: </li>
    </ul>
  </li>
</ol>
<h3>✅ Лучшее решение</h3>
<p></p>
<h3>📋 Следующие шаги</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>`,
    staticExample: `<h2>💡 Мозговой штурм: Улучшение onboarding новых пользователей</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<p><strong>Участники:</strong> Product Team, UX Designer, Customer Success</p>
<h3>🎯 Проблема / Вызов</h3>
<p>40% новых пользователей уходят после первого входа в приложение, не завершив базовую настройку. Нужно сделать onboarding более понятным и вовлекающим.</p>
<h3>💭 Идеи</h3>
<ol>
  <li><strong>Интерактивный туториал:</strong>
    <ul>
      <li>Плюсы: Показывает основные возможности, пошаговое обучение</li>
      <li>Минусы: Может раздражать опытных пользователей, требует времени на разработку</li>
    </ul>
  </li>
  <li><strong>Готовые шаблоны и примеры:</strong>
    <ul>
      <li>Плюсы: Быстрый старт, сразу видно ценность продукта</li>
      <li>Минусы: Нужно создать качественные шаблоны для разных use cases</li>
    </ul>
  </li>
  <li><strong>Персонализированный onboarding:</strong>
    <ul>
      <li>Плюсы: Релевантный контент для каждого сегмента пользователей</li>
      <li>Минусы: Сложность реализации, нужны данные о пользователях</li>
    </ul>
  </li>
  <li><strong>Видео-туры:</strong>
    <ul>
      <li>Плюсы: Наглядно, не мешает работе</li>
      <li>Минусus: Не все смотрят видео, нужна локализация</li>
    </ul>
  </li>
</ol>
<h3>✅ Лучшее решение</h3>
<p>Комбинация: краткий интерактивный туториал (пропускаемый) + готовые шаблоны для быстрого старта + контекстные подсказки в UI</p>
<h3>📋 Следующие шаги</h3>
<ul class="task-list">
  <li data-checked="false">Создать прототип нового onboarding flow</li>
  <li data-checked="false">Подготовить 5-7 шаблонов для разных типов пользователей</li>
  <li data-checked="false">Провести A/B тестирование с фокус-группой</li>
  <li data-checked="false">Собрать фидбек и итерировать</li>
</ul>`,
  },
  {
    id: 'daily-journal',
    title: 'Дневник',
    description: 'События дня, мысли, благодарности',
    icon: '✏️',
    category: 'personal',
    content: `<h2>✏️ Дневник</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<h3>📝 События дня</h3>
<p></p>
<h3>💭 Мысли и размышления</h3>
<p></p>
<h3>😊 Что вдохновило / обрадовало</h3>
<ul>
  <li></li>
</ul>
<h3>😔 Что было сложно / огорчило</h3>
<ul>
  <li></li>
</ul>
<h3>🙏 Благодарности</h3>
<ul>
  <li></li>
</ul>
<h3>🎯 Завтра хочу</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>`,
    staticExample: `<h2>✏️ Дневник</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<h3>📝 События дня</h3>
<p>Сегодня был продуктивный день на работе. Утром прошла важная встреча с заказчиком, где мы презентовали новую версию продукта. После обеда работал над сложной задачей по оптимизации производительности. Вечером провёл время с семьёй, играли в настольные игры.</p>
<h3>💭 Мысли и размышления</h3>
<p>Понял, что важно не только делать работу качественно, но и уметь её правильно презентовать. Клиент не всегда понимает технические детали, поэтому нужно объяснять ценность простыми словами. Также заметил, что качественный отдых вечером помогает лучше сосредоточиться на следующий день.</p>
<h3>😊 Что вдохновило / обрадовало</h3>
<ul>
  <li>Положительная реакция заказчика на нашу работу</li>
  <li>Наконец-то решил задачу, над которой бился два дня</li>
  <li>Смех детей во время игры</li>
  <li>Тёплая погода и прогулка в обед</li>
</ul>
<h3>😔 Что было сложно / огорчило</h3>
<ul>
  <li>Несколько неожиданных багов в production</li>
  <li>Не успел завершить все запланированные задачи</li>
  <li>Устал к концу дня</li>
</ul>
<h3>🙏 Благодарности</h3>
<ul>
  <li>Коллеге Марии за помощь с code review</li>
  <li>Семье за понимание и поддержку</li>
  <li>Себе за то, что не сдался при решении сложной проблемы</li>
</ul>
<h3>🎯 Завтра хочу</h3>
<ul class="task-list">
  <li data-checked="false">Начать день с планирования задач</li>
  <li data-checked="false">Исправить критические баги</li>
  <li data-checked="false">Сделать зарядку утром</li>
  <li data-checked="false">Выделить время на чтение технической статьи</li>
</ul>`,
  },
  {
    id: 'personal-journal',
    title: 'Персональный журнал',
    description: 'Ежедневные записи, рефлексия, благодарности',
    icon: '📔',
    category: 'quickstart',
    content: `<h2>📔 Мой журнал</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<h3>Как прошёл день</h3>
<p></p>
<h3>За что благодарен</h3>
<ul>
  <li></li>
</ul>
<h3>Планы на завтра</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>`,
  },
  {
    id: 'knowledge-base',
    title: 'База знаний',
    description: 'Структурированное хранение информации по темам',
    icon: '📚',
    category: 'quickstart',
    content: `<h2>📚 [Тема]</h2>
<h3>Ключевые понятия</h3>
<ul>
  <li><strong>Понятие 1:</strong> </li>
</ul>
<h3>Заметки</h3>
<p></p>
<h3>Связанные темы</h3>
<p>[[]] [[]]</p>
<h3>Источники</h3>
<ul>
  <li></li>
</ul>`,
  },
  {
    id: 'tasks',
    title: 'Задачи',
    description: 'Простой трекер задач с чеклистами и приоритетами',
    icon: '✅',
    category: 'quickstart',
    content: `<h2>✅ Задачи на сегодня</h2>
<p><strong>Дата:</strong> {{DATE}}</p>
<h3>🔴 Высокий приоритет</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>
<h3>🟡 Средний приоритет</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>
<h3>🟢 Низкий приоритет</h3>
<ul class="task-list">
  <li data-checked="false"></li>
</ul>`,
  },
];
