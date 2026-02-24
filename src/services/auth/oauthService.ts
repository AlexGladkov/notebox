import type { OAuthProvider } from './types';

export const oauthService = {
  initiateLogin(provider: OAuthProvider) {
    const apiUrl = import.meta.env.VITE_API_URL ?? '';
    window.location.href = `${apiUrl}/api/auth/login/${provider}`;
  }
};
