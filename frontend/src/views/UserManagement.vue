<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">用戶管理</h1>
      <button class="btn-primary" @click="openCreateModal">+ 新增用戶</button>
    </div>

    <div class="glass-card">
      <n-data-table :columns="columns" :data="users" :pagination="{ pageSize: 10 }" />
    </div>

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

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.8px;
  margin: 0;
  color: var(--text-primary);
}

.btn-primary {
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: white;
  box-shadow: 0 4px 16px rgba(79, 106, 245, 0.25);
}

.btn-primary:hover {
  box-shadow: 0 6px 24px rgba(79, 106, 245, 0.35);
  transform: translateY(-1px);
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--glass-shadow);
  position: relative;
  overflow: hidden;
}

.glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), rgba(255,255,255,0.4), transparent);
}
</style>
