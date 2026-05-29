<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="drawer-overlay fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
      @click="$emit('close')"
    ></div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
.drawer-overlay {
  transition: opacity 0.3s ease-out;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
