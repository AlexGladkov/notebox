import { storeToRefs } from 'pinia';
import { useUIStore } from '../stores/uiStore';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme() {
  const store = useUIStore();
  const { themeMode, effectiveTheme } = storeToRefs(store);

  return {
    themeMode,
    effectiveTheme,
    cycleTheme: store.cycleTheme,
    setTheme: store.setTheme,
    initialize: store.initializeTheme,
  };
}
