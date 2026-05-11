import { apiClient } from './client';
import type {
  PushSubscription,
  SubscribePushRequest,
  UnsubscribePushRequest
} from '../types/reminder';

export const notificationsApi = {
  async getVapidPublicKey(): Promise<{ configured: boolean; publicKey?: string }> {
    return apiClient.get<{ configured: boolean; publicKey?: string }>(
      '/api/notifications/vapid-public-key'
    );
  },

  async getSubscriptions(): Promise<PushSubscription[]> {
    return apiClient.get<PushSubscription[]>('/api/notifications/subscriptions');
  },

  async subscribe(request: SubscribePushRequest): Promise<PushSubscription> {
    return apiClient.post<PushSubscription>('/api/notifications/subscribe', request);
  },

  async unsubscribe(request: UnsubscribePushRequest): Promise<void> {
    return apiClient.post('/api/notifications/unsubscribe', request);
  },
};
