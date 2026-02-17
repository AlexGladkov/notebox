export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthError {
  code: 'UNAUTHORIZED' | 'SESSION_EXPIRED' | string;
  message: string;
}

export type OAuthProvider = 'google' | 'apple';
