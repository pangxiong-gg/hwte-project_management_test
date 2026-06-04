<template>
  <div class="login-container">
    <div class="login-glass-card">
      <div class="login-logo">
        <div class="login-logo-icon">P</div>
        <h1 class="login-title">數位化專案管理系統</h1>
      </div>
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item path="email" label="帳號">
          <n-input v-model:value="form.email" placeholder="請輸入帳號" />
        </n-form-item>
        <n-form-item path="password" label="密碼">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="請輸入密碼"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item>
          <n-button
            type="primary"
            :loading="loading"
            block
            size="large"
            @click="handleLogin"
          >
            登入
          </n-button>
        </n-form-item>
      </n-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const formRef = ref();
const loading = ref(false);

const form = ref({
  email: 'admin@company.com',
  password: 'password123',
});

const rules = {
  email: { required: true, message: '請輸入帳號' },
  password: { required: true, message: '請輸入密碼' },
};

async function handleLogin() {
  try {
    loading.value = true;
    await authStore.login(form.value.email, form.value.password);
    message.success('登入成功');
    router.push('/');
  } catch {
    message.error('登入失敗，請檢查帳號密碼');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--login-bg);
  background-attachment: fixed;
  position: relative;
  z-index: 1;
}

.login-glass-card {
  width: 400px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--glass-shadow);
  position: relative;
  overflow: hidden;
}

.login-glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), rgba(255,255,255,0.4), transparent);
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.login-logo-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: white;
  box-shadow: 0 4px 16px rgba(79, 106, 245, 0.3);
}

.login-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

:deep(.n-form-item .n-form-item-label) {
  color: var(--text-secondary) !important;
  font-weight: 500 !important;
}

:deep(.n-input .n-input__input-el) {
  background: var(--search-bg) !important;
  border: 1px solid var(--search-border) !important;
  border-radius: var(--radius-sm) !important;
}

:deep(.n-input .n-input__input-el:focus) {
  border-color: var(--accent-blue) !important;
  box-shadow: none !important;
}

@media (max-width: 480px) {
  .login-glass-card {
    width: 90%;
    padding: 32px 24px;
  }
}
</style>
