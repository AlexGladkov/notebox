import { ref, onMounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const installPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const canInstall = ref(false);
  const isInstalled = ref(false);

  const {
    needRefresh,
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('Service Worker зарегистрирован:', registration);
    },
    onRegisterError(error) {
      console.error('Ошибка регистрации Service Worker:', error);
    }
  });

  onMounted(() => {
    // Проверяем, установлено ли приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true;
    }

    // Слушаем событие beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      installPrompt.value = e as BeforeInstallPromptEvent;
      canInstall.value = true;
    });

    // Слушаем успешную установку
    window.addEventListener('appinstalled', () => {
      installPrompt.value = null;
      canInstall.value = false;
      isInstalled.value = true;
    });
  });

  const install = async () => {
    if (!installPrompt.value) return false;

    try {
      await installPrompt.value.prompt();
      const { outcome } = await installPrompt.value.userChoice;

      if (outcome === 'accepted') {
        installPrompt.value = null;
        canInstall.value = false;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка при установке PWA:', error);
      return false;
    }
  };

  return {
    canInstall,
    isInstalled,
    needRefresh,
    install,
    updateServiceWorker
  };
}
