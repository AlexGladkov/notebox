import { ref, computed, watch, onMounted } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'notebox-theme';

const themeMode = ref<ThemeMode>('system');
const systemPrefersDark = ref(false);

export function useTheme() {
  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light';
    }
    return themeMode.value;
  });

  const applyTheme = () => {
    const html = document.documentElement;
    if (effectiveTheme.value === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(themeMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    themeMode.value = modes[nextIndex];
  };

  const loadTheme = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        themeMode.value = stored as ThemeMode;
      }
    } catch (e) {
      // localStorage недоступен, используем системную тему
      console.warn('localStorage недоступен, используется системная тема');
    }
  };

  const saveTheme = () => {
    try {
      localStorage.setItem(STORAGE_KEY, themeMode.value);
    } catch (e) {
      // localStorage недоступен, ничего не делаем
      console.warn('localStorage недоступен, тема не сохранена');
    }
  };

  const initSystemThemeListener = () => {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemPrefersDark.value = mediaQuery.matches;

      const listener = (e: MediaQueryListEvent) => {
        systemPrefersDark.value = e.matches;
      };

      // Поддержка старого и нового API
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(listener);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', listener);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(listener);
        }
      };
    } else {
      // prefers-color-scheme не поддерживается
      systemPrefersDark.value = false;
      return () => {};
    }
  };

  onMounted(() => {
    loadTheme();
    initSystemThemeListener();
    applyTheme();

    // Следим за изменениями темы и применяем их
    watch([effectiveTheme], () => {
      applyTheme();
    });

    // Сохраняем выбор пользователя
    watch(themeMode, () => {
      saveTheme();
    });
  });

  return {
    themeMode: computed(() => themeMode.value),
    effectiveTheme,
    cycleTheme,
  };
}
