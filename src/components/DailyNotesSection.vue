<template>
  <div class="daily-notes-section">
    <!-- Заголовок секции -->
    <div class="flex items-center justify-between px-3 py-2">
      <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Дневник</span>
      <button
        @click="showCalendar = !showCalendar"
        class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
        :title="showCalendar ? 'Скрыть календарь' : 'Показать календарь'"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>

    <!-- Навигация по датам -->
    <div class="px-3 py-2 space-y-2">
      <!-- Текущая дата -->
      <div
        @click="handleOpenDailyNote"
        class="px-3 py-2 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md cursor-pointer transition-colors"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">📅</span>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ formattedCurrentDate }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ isToday ? 'Сегодня' : formatDayOfWeek(currentDate) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Кнопки навигации -->
      <div class="flex items-center gap-1">
        <button
          @click="goToPreviousDay"
          class="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Предыдущий день"
        >
          ← Назад
        </button>
        <button
          v-if="!isToday"
          @click="goToToday"
          class="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
          title="Вернуться к сегодняшнему дню"
        >
          Сегодня
        </button>
        <button
          @click="goToNextDay"
          class="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Следующий день"
        >
          Вперёд →
        </button>
      </div>
    </div>

    <!-- Календарь -->
    <div v-if="showCalendar" class="px-3 py-2">
      <div class="bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
        <!-- Заголовок календаря -->
        <div class="flex items-center justify-between mb-3">
          <button
            @click="previousMonth"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ formatMonthYear(calendarDate) }}
          </div>
          <button
            @click="nextMonth"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Дни недели -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div
            v-for="day in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']"
            :key="day"
            class="text-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {{ day }}
          </div>
        </div>

        <!-- Дни месяца -->
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="(day, index) in calendarDays"
            :key="index"
            @click="day.date && selectDate(day.date)"
            :disabled="!day.date"
            :class="[
              'aspect-square text-xs rounded flex items-center justify-center transition-colors',
              {
                'text-gray-400 dark:text-gray-600': !day.date,
                'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300': day.date && !day.isToday && !day.isSelected,
                'bg-blue-500 text-white font-medium': day.isSelected,
                'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium': day.isToday && !day.isSelected,
              }
            ]"
          >
            {{ day.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Список недавних дневных заметок -->
    <div v-if="!showCalendar && recentDailyNotes.length > 0" class="px-3 py-2">
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Недавние</div>
      <div class="space-y-1">
        <div
          v-for="note in recentDailyNotes"
          :key="note.id"
          @click="$emit('selectNote', note.id)"
          class="px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2"
        >
          <span>📅</span>
          <span>{{ note.title.replace('📅 ', '') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDailyNotes } from '../composables/useDailyNotes';

const emit = defineEmits<{
  selectNote: [noteId: string];
  openDailyNote: [date: Date];
}>();

const {
  currentDate,
  getCurrentDailyNote,
  goToPreviousDay: goToPrev,
  goToNextDay: goToNext,
  goToToday: goToTod,
  goToDate,
  isToday,
  formatDisplayDate,
  getAllDailyNotes,
} = useDailyNotes();

const showCalendar = ref(false);
const calendarDate = ref(new Date(currentDate.value));

// Синхронизация calendarDate с currentDate
watch(currentDate, (newDate) => {
  calendarDate.value = new Date(newDate);
});

// Форматирование текущей даты
const formattedCurrentDate = computed(() => {
  return formatDisplayDate(currentDate.value);
});

// Форматирование дня недели
const formatDayOfWeek = (date: Date): string => {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return days[date.getDay()];
};

// Форматирование месяца и года
const formatMonthYear = (date: Date): string => {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Навигация по датам
const goToPreviousDay = () => {
  goToPrev();
};

const goToNextDay = () => {
  goToNext();
};

const goToToday = () => {
  goToTod();
};

// Открытие дневной заметки
const handleOpenDailyNote = () => {
  emit('openDailyNote', currentDate.value);
};

// Недавние дневные заметки (последние 5)
const recentDailyNotes = computed(() => {
  return getAllDailyNotes.value.slice(0, 5);
});

// Календарь
const previousMonth = () => {
  const newDate = new Date(calendarDate.value);
  newDate.setMonth(newDate.getMonth() - 1);
  calendarDate.value = newDate;
};

const nextMonth = () => {
  const newDate = new Date(calendarDate.value);
  newDate.setMonth(newDate.getMonth() + 1);
  calendarDate.value = newDate;
};

const selectDate = (date: Date) => {
  goToDate(date);
  showCalendar.value = false;
  emit('openDailyNote', date);
};

interface CalendarDay {
  date: Date | null;
  label: string;
  isToday: boolean;
  isSelected: boolean;
}

// Генерация дней для календаря
const calendarDays = computed((): CalendarDay[] => {
  const year = calendarDate.value.getFullYear();
  const month = calendarDate.value.getMonth();

  // Первый день месяца
  const firstDay = new Date(year, month, 1);
  // Последний день месяца
  const lastDay = new Date(year, month + 1, 0);

  // День недели первого дня (0 = воскресенье, преобразуем в 0 = понедельник)
  let firstDayOfWeek = firstDay.getDay() - 1;
  if (firstDayOfWeek === -1) firstDayOfWeek = 6;

  const days: CalendarDay[] = [];

  // Заполняем пустые дни в начале
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({
      date: null,
      label: '',
      isToday: false,
      isSelected: false,
    });
  }

  // Заполняем дни месяца
  const today = new Date();
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isSelected =
      date.getDate() === currentDate.value.getDate() &&
      date.getMonth() === currentDate.value.getMonth() &&
      date.getFullYear() === currentDate.value.getFullYear();

    days.push({
      date,
      label: String(day),
      isToday,
      isSelected,
    });
  }

  return days;
});
</script>

<style scoped>
.daily-notes-section {
  border-bottom: 1px solid;
  @apply border-gray-200 dark:border-gray-700;
}
</style>
