import { ref, onMounted } from 'vue';
import { calendarApi } from '../api/calendar';
import { getErrorMessage } from '../types/composables';

export function useCalendarSync() {
  const isGoogleConnected = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const checkGoogleCalendarStatus = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await calendarApi.getGoogleCalendarStatus();
      isGoogleConnected.value = response.connected;
    } catch (err: unknown) {
      error.value = getErrorMessage(err);
      console.error('Failed to check Google Calendar status:', err);
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    checkGoogleCalendarStatus();
  });

  return {
    isGoogleConnected,
    loading,
    error,
    checkGoogleCalendarStatus,
  };
}
