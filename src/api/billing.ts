import { apiClient } from './client';

export interface UsageStats {
  current: number;
  limit: number;
}

export interface BillingUsage {
  planType: string;
  databases: UsageStats;
  reminders: UsageStats;
}

export const billingApi = {
  async getUsage(): Promise<BillingUsage> {
    return apiClient.get<BillingUsage>('/api/billing');
  },
};
