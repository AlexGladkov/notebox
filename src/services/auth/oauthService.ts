import type { OAuthProvider } from './types';

export const oauthService = {
  initiateLogin(provider: OAuthProvider) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    window.location.href = `${apiUrl}/api/auth/login/${provider}`;
  }
};
