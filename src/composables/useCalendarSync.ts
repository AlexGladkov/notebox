import { ref, onMounted } from 'vue';
import { calendarApi } from '../api/calendar';

export function useCalendarSync() {
  const isGoogleConnected = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const checkGoogleCalendarStatus = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await calendarApi.getGoogleCalendarStatus();
      isGoogleConnected.value = response.connected;
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to check Google Calendar status:', e);
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
