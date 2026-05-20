import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRemindersStore } from '../stores/remindersStore';

export function useReminders() {
  const store = useRemindersStore();
  const { reminders, loading, error } = storeToRefs(store);

  return {
    reminders,
    loading,
    error,
    fetchReminders: store.fetchReminders,
    fetchRemindersByNoteId: (noteId: string) => computed(() => store.getRemindersByNoteId(noteId)),
    createReminder: store.createReminder,
    updateReminder: store.updateReminder,
    deleteReminder: store.deleteReminder,
    getUpcomingReminders: computed(() => store.upcomingReminders),
  };
}
