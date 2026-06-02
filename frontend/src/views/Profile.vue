<template>
  <div>
    <n-h2>個人資料</n-h2>

    <n-card title="基本資訊" style="max-width: 600px; margin-bottom: 20px;">
      <n-descriptions :columns="2" bordered>
        <n-descriptions-item label="姓名">{{ user?.name }}</n-descriptions-item>
        <n-descriptions-item label="Email">{{ user?.email }}</n-descriptions-item>
        <n-descriptions-item label="角色">{{ roleLabel }}</n-descriptions-item>
        <n-descriptions-item label="狀態">{{ statusLabel }}</n-descriptions-item>
        <n-descriptions-item label="建立時間" :span="2">{{ formatDate(user?.createdAt) }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <n-card title="郵件通知" style="max-width: 600px; margin-bottom: 20px;">
      <n-form>
        <n-form-item label="郵件通知開關">
          <n-switch v-model:value="emailNotifications" @update:value="toggleEmailNotifications">
            <template #checked>開啟</template>
            <template #unchecked>關閉</template>
          </n-switch>
        </n-form-item>
        <n-alert v-if="emailNotifications" type="info" :show-icon="false">
          當有人指派任務給您、任務狀態變更、或有人在評論中提到您時，系統將發送郵件通知到 {{ user?.email }}
        </n-alert>
        <n-alert v-else type="warning" :show-icon="false">
          已關閉郵件通知，您只會在系統內收到通知
        </n-alert>
      </n-form>
    </n-card>

    <n-card title="修改資料" style="max-width: 600px;">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item label="姓名" path="name">
          <n-input v-model:value="form.name" placeholder="請輸入姓名" />
        </n-form-item>
        <n-form-item label="新密碼" path="password">
          <n-input v-model:value="form.password" type="password" placeholder="不修改請留空" />
        </n-form-item>
        <n-form-item label="確認密碼" path="confirmPassword">
          <n-input v-model:value="form.confirmPassword" type="password" placeholder="不修改請留空" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">儲存變更</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { userApi } from '../services/api';
import type { User } from '../types';

const message = useMessage();
const authStore = useAuthStore();

const user = ref<User | null>(null);
const formRef = ref();
const submitting = ref(false);
const emailSubmitting = ref(false);
const emailNotifications = ref(false);

const form = ref({
  name: '',
  password: '',
  confirmPassword: '',
});

const rules = {
  name: { required: true, message: '請輸入姓名', trigger: 'blur' },
};

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    ADMIN: '系統管理員',
    PROJECT_MANAGER: '專案經理',
    DEVELOPER: '開發人員',
    TESTER: '測試人員',
  };
  return map[user.value?.role || ''] || user.value?.role || '';
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    ACTIVE: '啟用',
    INACTIVE: '停用',
  };
  return map[user.value?.status || ''] || user.value?.status || '';
});

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString('zh-TW') : '-';
}

async function loadUser() {
  try {
    const res = await userApi.getMe();
    user.value = res.data;
    form.value.name = res.data.name;
    emailNotifications.value = res.data.emailNotifications ?? true;
  } catch {
    message.error('載入用戶資料失敗');
  }
}

async function toggleEmailNotifications(value: boolean) {
  try {
    emailSubmitting.value = true;
    const res = await userApi.updateMe({ emailNotifications: value });
    message.success(value ? '郵件通知已開啟' : '郵件通知已關閉');
    user.value = res.data;
    authStore.user = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
    emailNotifications.value = !value;
  } finally {
    emailSubmitting.value = false;
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();

    if (form.value.password && form.value.password !== form.value.confirmPassword) {
      message.error('兩次輸入的密碼不一致');
      return;
    }

    submitting.value = true;
    const data: Partial<{ name: string; password: string }> = {};
    if (form.value.name !== user.value?.name) {
      data.name = form.value.name;
    }
    if (form.value.password) {
      data.password = form.value.password;
    }

    if (Object.keys(data).length === 0) {
      message.info('沒有變更需要儲存');
      submitting.value = false;
      return;
    }

    const res = await userApi.updateMe(data);
    message.success('資料已更新');
    user.value = res.data;
    authStore.user = res.data;
    form.value.password = '';
    form.value.confirmPassword = '';
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(loadUser);
</script>
