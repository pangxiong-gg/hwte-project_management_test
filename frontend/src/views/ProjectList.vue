<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <n-h2 style="margin: 0;">專案總覽</n-h2>
      <n-button type="primary" @click="showModal = true">+ 新增專案</n-button>
    </div>
    <n-data-table
      :columns="columns"
      :data="projectStore.projects"
      :loading="projectStore.loading"
      :pagination="{ pageSize: 10 }"
    />

    <n-modal v-model:show="showModal" title="新增專案" preset="card" style="width: 500px;">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item label="專案代碼" path="code">
          <n-input v-model:value="form.code" placeholder="例如：PROJ-002" />
        </n-form-item>
        <n-form-item label="專案名稱" path="name">
          <n-input v-model:value="form.name" placeholder="請輸入專案名稱" />
        </n-form-item>
        <n-form-item label="專案模式" path="mode">
          <n-select v-model:value="form.mode" :options="modeOptions" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="form.description" type="textarea" placeholder="請輸入專案描述" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">確定</n-button>
            <n-button @click="showModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { NButton, NH2, NDataTable, NModal, NForm, NFormItem, NInput, NSpace, NSelect, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useProjectStore } from '../stores/project';
import { projectApi } from '../services/api';
import type { Project } from '../types';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();

const showModal = ref(false);
const submitting = ref(false);
const formRef = ref();
const form = ref({
  code: '',
  name: '',
  description: '',
  mode: 'HYBRID',
});

const modeOptions = [
  { label: '瀑布式', value: 'WATERFALL' },
  { label: '敏捷式', value: 'AGILE' },
  { label: '混合型', value: 'HYBRID' },
];

const rules = {
  code: { required: true, message: '請輸入專案代碼' },
  name: { required: true, message: '請輸入專案名稱' },
  mode: { required: true, message: '請選擇專案模式' },
};

async function handleSubmit() {
  try {
    await formRef.value?.validate();
    submitting.value = true;
    await projectApi.create(form.value);
    message.success('專案建立成功');
    showModal.value = false;
    form.value = { code: '', name: '', description: '', mode: 'HYBRID' };
    await projectStore.fetchProjects();
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

function modeTag(mode: string) {
  const map: Record<string, { text: string; color: string; bg: string }> = {
    WATERFALL: { text: '瀑布式', color: '#3b82f6', bg: '#3b82f620' },
    AGILE: { text: '敏捷式', color: '#10b981', bg: '#10b98120' },
    HYBRID: { text: '混合型', color: '#8b5cf6', bg: '#8b5cf620' },
  };
  return map[mode] || { text: mode, color: '#64748b', bg: '#64748b20' };
}

const columns: DataTableColumns<Project> = [
  { title: '代碼', key: 'code' },
  { title: '名稱', key: 'name' },
  {
    title: '模式',
    key: 'mode',
    width: 100,
    render: (row) => {
      const m = modeTag(row.mode);
      return h(NTag, { size: 'small', style: { background: m.bg, color: m.color, borderColor: m.color + '40' } }, { default: () => m.text });
    },
  },
  {
    title: '狀態',
    key: 'status',
    render: (row) => {
      const statusMap: Record<string, { text: string; color: string }> = {
        ACTIVE: { text: '進行中', color: '#3b82f6' },
        COMPLETED: { text: '已完成', color: '#22c55e' },
        PLANNING: { text: '規劃中', color: '#f59e0b' },
      };
      const s = statusMap[row.status] || { text: row.status, color: '#94a3b8' };
      return h('span', { style: `color: ${s.color};` }, s.text);
    },
  },
  {
    title: '需求數',
    key: 'reqCount',
    render: (row) => row._count?.requirements || 0,
  },
  {
    title: '任務數',
    key: 'taskCount',
    render: (row) => row._count?.tasks || 0,
  },
  {
    title: 'Bug 數',
    key: 'bugCount',
    render: (row) => row._count?.bugs || 0,
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) =>
      h(
        NButton,
        { type: 'primary', size: 'small', onClick: () => router.push(`/projects/${row.id}`) },
        () => '查看'
      ),
  },
];

onMounted(() => {
  projectStore.fetchProjects();
});
</script>
