<template>
  <button class="demo-button" @click="$emit('click')">
    <span class="demo-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </span>
    <span class="demo-text">
      Войти в демо
    </span>
  </button>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
.demo-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 12px 24px;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #78350f;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
}

.demo-button:hover {
  background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%);
  border-color: #fbbf24;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
}

.demo-button:active {
  transform: translateY(0);
}

.demo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-text {
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .demo-button {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border-color: #d97706;
    color: #fef3c7;
  }

  .demo-button:hover {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border-color: #f59e0b;
  }
}
</style>
