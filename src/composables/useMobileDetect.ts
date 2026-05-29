import { ref, onMounted, onUnmounted } from 'vue';

export function useMobileDetect() {
  const updateScreenSize = () => {
    screenWidth.value = window.innerWidth;
    isMobile.value = window.innerWidth < 768;
    isTablet.value = window.innerWidth >= 768 && window.innerWidth < 1024;
  };

  const checkTouch = () => {
    isTouch.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // Initialize values immediately (SSR-safe check)
  const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const isMobile = ref(initialWidth < 768);
  const isTablet = ref(initialWidth >= 768 && initialWidth < 1024);
  const isTouch = ref(typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
  const screenWidth = ref(initialWidth);

  onMounted(() => {
    updateScreenSize();
    checkTouch();
    window.addEventListener('resize', updateScreenSize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateScreenSize);
  });

  return {
    isMobile,
    isTablet,
    isTouch,
    screenWidth,
  };
}
