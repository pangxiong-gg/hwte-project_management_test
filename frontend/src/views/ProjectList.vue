<template>
  <div>
    <n-h2>專案總覽</n-h2>
    <n-data-table
      :columns="columns"
      :data="projectStore.projects"
      :loading="projectStore.loading"
      :pagination="{ pageSize: 10 }"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { NButton } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useProjectStore } from '../stores/project';
import type { Project } from '../types';

const router = useRouter();
const projectStore = useProjectStore();

const columns: DataTableColumns<Project> = [
  { title: '代碼', key: 'code' },
  { title: '名稱', key: 'name' },
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
