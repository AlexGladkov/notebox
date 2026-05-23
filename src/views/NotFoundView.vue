<template>
  <div class="not-found-container">
    <div class="not-found-card">
      <div class="not-found-icon">404</div>
      <h1 class="not-found-title">Страница не найдена</h1>
      <p class="not-found-subtitle">
        Запрашиваемая страница не существует или была удалена
      </p>
      <router-link to="/" class="home-link">
        Вернуться на главную
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// Простой статический компонент 404
</script>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.not-found-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.not-found-icon {
  font-size: 96px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
}

.not-found-title {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.not-found-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

.home-link {
  display: inline-block;
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
}

.home-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}
</style>

<style>
/* Dark theme styles (unscoped) */
.dark .not-found-card {
  background: #1f1f1f;
}

.dark .not-found-title {
  color: #ffffff;
}

.dark .not-found-subtitle {
  color: #9ca3af;
}
</style>
