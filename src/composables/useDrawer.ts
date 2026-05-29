import { ref, watch } from 'vue';

export function useDrawer() {
  const isOpen = ref(false);

  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  // Блокировка скролла body при открытом drawer
  watch(isOpen, (newValue) => {
    if (newValue) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
