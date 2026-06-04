import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('theme') !== 'light');

  function toggle() {
    isDark.value = !isDark.value;
  }

  watch(isDark, (dark) => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, { immediate: true });

  return { isDark, toggle };
});
