import { useNetworkStatus as useNetworkStatusService } from '../services/offline/networkStatus';

export function useNetworkStatus() {
  return useNetworkStatusService();
}
