import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';
import { authApi } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    token.value = newToken;
    user.value = userData;
  }

  async function fetchUser() {
    try {
      const response = await authApi.me();
      user.value = response.data.user;
    } catch {
      logout();
    }
  }

  function logout() {
    localStorage.removeItem('token');
    token.value = null;
    user.value = null;
    window.location.href = '/login';
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    fetchUser,
    logout,
  };
});
