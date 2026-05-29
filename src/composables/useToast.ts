import { ref, reactive } from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

const toasts = reactive<Toast[]>([]);
const toastIdCounter = ref(0);

// Дедупликация: храним последние сообщения
const recentMessages = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 2000;

function shouldShowToast(message: string): boolean {
  const now = Date.now();
  const lastShown = recentMessages.get(message);

  if (lastShown && (now - lastShown) < DEDUPLICATION_WINDOW_MS) {
    return false;
  }

  recentMessages.set(message, now);

  // Очистка старых записей
  for (const [msg, timestamp] of recentMessages.entries()) {
    if (now - timestamp > DEDUPLICATION_WINDOW_MS * 2) {
      recentMessages.delete(msg);
    }
  }

  return true;
}

export function useToast() {
  const show = (message: string, type: ToastType = 'info', duration: number = 5000) => {
    if (!shouldShowToast(message)) {
      return;
    }

    const id = `toast-${toastIdCounter.value++}`;
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now(),
    };

    toasts.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  };

  const showSuccess = (message: string, duration?: number) => {
    show(message, 'success', duration);
  };

  const showError = (message: string, duration?: number) => {
    show(message, 'error', duration);
  };

  const showWarning = (message: string, duration?: number) => {
    show(message, 'warning', duration);
  };

  const showInfo = (message: string, duration?: number) => {
    show(message, 'info', duration);
  };

  const remove = (id: string) => {
    const index = toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
    }
  };

  const clear = () => {
    toasts.splice(0, toasts.length);
  };

  return {
    toasts,
    show,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    remove,
    clear,
  };
}
