<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <n-h2 style="margin: 0;">用戶管理</n-h2>
      <n-button type="primary" @click="openCreateModal">+ 新增用戶</n-button>
    </div>

    <n-data-table :columns="columns" :data="users" :pagination="{ pageSize: 10 }" />

    <!-- 新增用戶 Modal -->
    <n-modal v-model:show="showCreateModal" title="新增用戶" preset="card" style="width: 500px;">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item label="姓名" path="name">
          <n-input v-model:value="form.name" placeholder="請輸入姓名" />
        </n-form-item>
        <n-form-item label="Email" path="email">
          <n-input v-model:value="form.email" placeholder="請輸入 Email" />
        </n-form-item>
        <n-form-item label="密碼" path="password">
          <n-input v-model:value="form.password" type="password" placeholder="請輸入密碼" />
        </n-form-item>
        <n-form-item label="角色" path="role">
          <n-select v-model:value="form.role" :options="roleOptions" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreate">確定</n-button>
            <n-button @click="showCreateModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { useMessage } from 'naive-ui';
import { NButton, NSelect, NInput, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { userApi } from '../services/api';
import type { User } from '../types';

const message = useMessage();
const users = ref<User[]>([]);
const showCreateModal = ref(false);
const submitting = ref(false);
const formRef = ref();

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'DEVELOPER',
});

const rules = {
  name: { required: true, message: '請輸入姓名', trigger: 'blur' },
  email: { required: true, message: '請輸入 Email', trigger: 'blur' },
  password: { required: true, message: '請輸入密碼', trigger: 'blur' },
  role: { required: true, message: '請選擇角色', trigger: 'change' },
};

const roleOptions = [
  { label: '系統管理員', value: 'ADMIN' },
  { label: '專案經理', value: 'PROJECT_MANAGER' },
  { label: '開發人員', value: 'DEVELOPER' },
  { label: '測試人員', value: 'TESTER' },
];

const statusOptions = [
  { label: '啟用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' },
];

const columns: DataTableColumns<User> = [
  { title: '姓名', key: 'name' },
  { title: 'Email', key: 'email' },
  {
    title: '角色',
    key: 'role',
    width: 160,
    render: (row) =>
      h(NSelect, {
        size: 'small',
        value: row.role,
        options: roleOptions,
        onUpdateValue: (value: string) => handleUpdateRole(row.id, value),
      }),
  },
  {
    title: '狀態',
    key: 'status',
    width: 120,
    render: (row) =>
      h(NSelect, {
        size: 'small',
        value: row.status,
        options: statusOptions,
        onUpdateValue: (value: string) => handleUpdateStatus(row.id, value),
      }),
  },
  {
    title: '建立時間',
    key: 'createdAt',
    render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString('zh-TW') : '-'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) =>
      h(NButton, { size: 'tiny', type: 'error', text: true, onClick: () => handleDelete(row.id) }, { default: () => '刪除' }),
  },
];

function openCreateModal() {
  form.value = { name: '', email: '', password: '', role: 'DEVELOPER' };
  showCreateModal.value = true;
}

async function handleCreate() {
  try {
    await formRef.value?.validate();
    submitting.value = true;
    await userApi.create(form.value);
    message.success('用戶已創建');
    showCreateModal.value = false;
    await loadUsers();
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

async function loadUsers() {
  try {
    const res = await userApi.getAll();
    users.value = res.data;
  } catch {
    message.error('載入用戶列表失敗');
  }
}

async function handleUpdateRole(id: string, role: string) {
  try {
    await userApi.update(id, { role });
    message.success('角色已更新');
    await loadUsers();
  } catch (error: any) {
    message.error(error?.response?.data?.error || '更新失敗');
  }
}

async function handleUpdateStatus(id: string, status: string) {
  try {
    await userApi.update(id, { status });
    message.success('狀態已更新');
    await loadUsers();
  } catch (error: any) {
    message.error(error?.response?.data?.error || '更新失敗');
  }
}

async function handleDelete(id: string) {
  try {
    await userApi.delete(id);
    message.success('用戶已刪除');
    await loadUsers();
  } catch (error: any) {
    message.error(error?.response?.data?.error || '刪除失敗');
  }
}

onMounted(loadUsers);
</script>
