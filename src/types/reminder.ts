export type RepeatType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Reminder {
  id: string;
  noteId: string;
  title: string;
  remindAt: number; // timestamp
  repeatType: RepeatType;
  repeatEndAt?: number;
  notificationSent: boolean;
  googleEventId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateReminderRequest {
  noteId: string;
  title?: string;
  remindAt: number;
  repeatType?: RepeatType;
  repeatEndAt?: number;
  syncToGoogleCalendar?: boolean;
}

export interface UpdateReminderRequest {
  title?: string;
  remindAt?: number;
  repeatType?: RepeatType;
  repeatEndAt?: number;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  createdAt: number;
}

export interface SubscribePushRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface UnsubscribePushRequest {
  endpoint: string;
}
