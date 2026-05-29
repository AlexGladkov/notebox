import { ref, watch, onUnmounted, type Ref } from 'vue';

export interface SwipeOptions {
  threshold?: number; // Минимальное расстояние для срабатывания (в пикселях)
  restraint?: number; // Максимальное отклонение в перпендикулярном направлении
  allowedTime?: number; // Максимальное время свайпа (в мс)
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipe(target: Ref<HTMLElement | null>, options: SwipeOptions = {}) {
  const {
    threshold = 50,
    restraint = 100,
    allowedTime = 500,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const touchStartX = ref(0);
  const touchStartY = ref(0);
  const touchEndX = ref(0);
  const touchEndY = ref(0);
  const startTime = ref(0);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.value = touch.clientX;
    touchStartY.value = touch.clientY;
    startTime.value = Date.now();
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchEndX.value = touch.clientX;
    touchEndY.value = touch.clientY;
  };

  const handleTouchEnd = () => {
    const elapsedTime = Date.now() - startTime.value;

    if (elapsedTime > allowedTime) {
      return;
    }

    const distX = touchEndX.value - touchStartX.value;
    const distY = touchEndY.value - touchStartY.value;
    const absDistX = Math.abs(distX);
    const absDistY = Math.abs(distY);

    // Горизонтальный свайп
    if (absDistX >= threshold && absDistY <= restraint) {
      if (distX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (distX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    // Вертикальный свайп
    if (absDistY >= threshold && absDistX <= restraint) {
      if (distY < 0 && onSwipeUp) {
        onSwipeUp();
      } else if (distY > 0 && onSwipeDown) {
        onSwipeDown();
      }
    }

    // Сброс значений
    touchStartX.value = 0;
    touchStartY.value = 0;
    touchEndX.value = 0;
    touchEndY.value = 0;
  };

  // Watch for target changes and attach/detach listeners
  watch(target, (newTarget, oldTarget) => {
    // Remove listeners from old target
    if (oldTarget) {
      oldTarget.removeEventListener('touchstart', handleTouchStart);
      oldTarget.removeEventListener('touchmove', handleTouchMove);
      oldTarget.removeEventListener('touchend', handleTouchEnd);
    }

    // Add listeners to new target
    if (newTarget) {
      newTarget.addEventListener('touchstart', handleTouchStart, { passive: true });
      newTarget.addEventListener('touchmove', handleTouchMove, { passive: true });
      newTarget.addEventListener('touchend', handleTouchEnd);
    }
  }, { immediate: true });

  onUnmounted(() => {
    if (target.value) {
      target.value.removeEventListener('touchstart', handleTouchStart);
      target.value.removeEventListener('touchmove', handleTouchMove);
      target.value.removeEventListener('touchend', handleTouchEnd);
    }
  });

  return {
    touchStartX,
    touchStartY,
    touchEndX,
    touchEndY,
  };
}
