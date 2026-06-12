import { inject } from 'vue';

export function useAuth() {
  const auth = inject('auth');
  if (!auth) throw new Error('Auth context is not available');
  return auth;
}
