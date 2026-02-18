<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">Добро пожаловать в NoteBox</h1>
        <p class="login-subtitle">Войдите, чтобы продолжить</p>
      </div>

      <div class="login-buttons">
        <OAuthButton provider="google" @click="handleGoogleLogin" />
        <OAuthButton provider="apple" @click="handleAppleLogin" />
        <DemoButton v-if="demoModeEnabled" @click="handleDemoLogin" />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OAuthButton from '../components/auth/OAuthButton.vue';
import DemoButton from '../components/auth/DemoButton.vue';
import { oauthService } from '../services/auth/oauthService';
import { authService } from '../services/auth/authService';
import { authStore } from '../stores/authStore';

const route = useRoute();
const router = useRouter();
const error = ref<string | null>(null);
const demoModeEnabled = ref<boolean>(false);

onMounted(async () => {
  const errorParam = route.query.error;
  if (errorParam === 'auth_failed') {
    error.value = 'Не удалось выполнить вход. Попробуйте еще раз.';
  }

  // Check if demo mode is enabled
  try {
    const config = await authService.getConfig();
    demoModeEnabled.value = config.demoModeEnabled;
  } catch (err) {
    console.error('Failed to load config:', err);
  }
});

function handleGoogleLogin() {
  oauthService.initiateLogin('google');
}

function handleAppleLogin() {
  oauthService.initiateLogin('apple');
}

async function handleDemoLogin() {
  try {
    error.value = null;
    const user = await authService.loginDemo();
    authStore.setUser(user);
    router.push('/');
  } catch (err) {
    error.value = 'Не удалось войти в демо-режим. Попробуйте еще раз.';
    console.error('Demo login failed:', err);
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #fee;
  color: #c33;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .login-card {
    background: #1f1f1f;
  }

  .login-title {
    color: #ffffff;
  }

  .login-subtitle {
    color: #9ca3af;
  }
}
</style>
