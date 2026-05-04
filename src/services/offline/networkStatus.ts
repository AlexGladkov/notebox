import { ref, readonly } from 'vue';

const isOnline = ref(navigator.onLine);
const lastOnlineTime = ref<number | null>(navigator.onLine ? Date.now() : null);

let checkInterval: ReturnType<typeof setInterval> | null = null;

async function checkConnectivity(): Promise<boolean> {
  try {
    // Проверяем соединение через существующий API endpoint
    const response = await fetch('/api/notes', {
      method: 'HEAD',
      cache: 'no-cache',
      credentials: 'include',
    });
    // Считаем соединение активным если получен любой ответ от сервера
    // (включая 401/403 - это означает что сервер доступен)
    return response.ok || response.status === 401 || response.status === 403;
  } catch {
    return false;
  }
}

function handleOnline() {
  isOnline.value = true;
  lastOnlineTime.value = Date.now();
}

function handleOffline() {
  isOnline.value = false;
}

export function initNetworkStatus() {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Периодическая проверка соединения
  checkInterval = setInterval(async () => {
    const wasOnline = isOnline.value;
    const isActuallyOnline = await checkConnectivity();

    if (isActuallyOnline && !wasOnline) {
      handleOnline();
    } else if (!isActuallyOnline && wasOnline) {
      handleOffline();
    }
  }, 30000); // Проверка каждые 30 секунд
}

export function destroyNetworkStatus() {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

export function useNetworkStatus() {
  return {
    isOnline: readonly(isOnline),
    lastOnlineTime: readonly(lastOnlineTime),
  };
}
