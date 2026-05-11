import { ref, onMounted } from 'vue';
import { notificationsApi } from '../api/notifications';

export function usePushNotifications() {
  const isSupported = ref(false);
  const isGranted = ref(false);
  const isConfigured = ref(false);
  const vapidPublicKey = ref<string>('');
  const error = ref<string | null>(null);

  const checkSupport = () => {
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window;
  };

  const checkPermission = () => {
    if (!isSupported.value) return;
    isGranted.value = Notification.permission === 'granted';
  };

  const loadVapidKey = async () => {
    try {
      const response = await notificationsApi.getVapidPublicKey();
      isConfigured.value = response.configured;
      if (response.publicKey) {
        vapidPublicKey.value = response.publicKey;
      }
    } catch (e: any) {
      console.error('Failed to load VAPID key:', e);
      error.value = e.message;
    }
  };

  const requestPermission = async () => {
    if (!isSupported.value) {
      error.value = 'Push-уведомления не поддерживаются в этом браузере';
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      isGranted.value = permission === 'granted';
      return isGranted.value;
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to request notification permission:', e);
      return false;
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    if (!isSupported.value || !isGranted.value || !isConfigured.value) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Проверяем существующую подписку
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Создаем новую подписку
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey.value);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        });
      }

      // Отправляем подписку на сервер
      const subscriptionJSON = subscription.toJSON();
      await notificationsApi.subscribe({
        endpoint: subscription.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh || '',
        auth: subscriptionJSON.keys?.auth || '',
      });

      return subscription;
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to subscribe to push notifications:', e);
      return null;
    }
  };

  const unsubscribe = async () => {
    if (!isSupported.value) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await notificationsApi.unsubscribe({
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to unsubscribe from push notifications:', e);
    }
  };

  onMounted(() => {
    checkSupport();
    checkPermission();
    loadVapidKey();
  });

  return {
    isSupported,
    isGranted,
    isConfigured,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
