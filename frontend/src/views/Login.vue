<template>
  <div class="login-container">
    <n-card class="login-card" title="數位化專案管理系統">
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
    </n-card>
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
  background: #0f172a;
}

.login-card {
  width: 400px;
}
</style>
