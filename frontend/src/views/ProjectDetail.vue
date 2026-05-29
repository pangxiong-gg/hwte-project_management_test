<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <n-h2 style="margin: 0;">
        {{ project?.name || '專案詳情' }}
        <n-tag :type="statusType" size="small">{{ statusText }}</n-tag>
      </n-h2>
      <n-button @click="$router.push('/')">返回列表</n-button>
    </div>

    <n-card title="基本資訊" style="margin-bottom: 20px;">
      <n-descriptions :columns="3" bordered>
        <n-descriptions-item label="專案代碼">{{ project?.code }}</n-descriptions-item>
        <n-descriptions-item label="狀態">{{ statusText }}</n-descriptions-item>
        <n-descriptions-item label="建立時間">{{ formatDate(project?.createdAt) }}</n-descriptions-item>
      </n-descriptions>
      <n-p style="margin-top: 12px; color: #94a3b8;">{{ project?.description || '無描述' }}</n-p>
    </n-card>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
      <n-statistic label="需求數" :value="requirements.length" />
      <n-statistic label="任務數" :value="tasks.length" />
      <n-statistic label="Bug 數" :value="bugs.length" />
    </div>

    <n-tabs type="line" v-model:value="activeTab">
      <n-tab-pane name="requirements" tab="需求">
        <n-data-table :columns="reqColumns" :data="requirements" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>
      <n-tab-pane name="tasks" tab="任務">
        <n-data-table :columns="taskColumns" :data="tasks" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>
      <n-tab-pane name="bugs" tab="Bug">
        <n-data-table :columns="bugColumns" :data="bugs" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute } from 'vue-router';
import { NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { projectApi, requirementApi, taskApi, bugApi } from '../services/api';
import type { Project, Requirement, Task, Bug } from '../types';

const route = useRoute();
const projectId = route.params.id as string;

const project = ref<Project | null>(null);
const requirements = ref<Requirement[]>([]);
const tasks = ref<Task[]>([]);
const bugs = ref<Bug[]>([]);
const activeTab = ref('requirements');

const statusMap: Record<string, { text: string; type: string }> = {
  ACTIVE: { text: '進行中', type: 'info' },
  COMPLETED: { text: '已完成', type: 'success' },
  PLANNING: { text: '規劃中', type: 'warning' },
};

const statusText = computed(() => statusMap[project.value?.status || '']?.text || project.value?.status || '');
const statusType = computed(() => statusMap[project.value?.status || '']?.type as any || 'default');

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString('zh-TW') : '-';
}

const reqColumns: DataTableColumns<Requirement> = [
  { title: '編號', key: 'reqCode' },
  { title: '標題', key: 'title' },
  { title: '優先級', key: 'priority' },
  {
    title: '狀態',
    key: 'status',
    render: (row) => h(NTag, { type: 'default', size: 'small' }, { default: () => row.status }),
  },
];

const taskColumns: DataTableColumns<Task> = [
  { title: '編號', key: 'taskCode' },
  { title: '標題', key: 'title' },
  { title: '優先級', key: 'priority' },
  { title: '狀態', key: 'status' },
  { title: '指派人', key: 'assignee.name' },
];

const bugColumns: DataTableColumns<Bug> = [
  { title: '編號', key: 'bugCode' },
  { title: '標題', key: 'title' },
  { title: '嚴重程度', key: 'severity' },
  { title: '優先級', key: 'priority' },
  { title: '狀態', key: 'status' },
];

onMounted(async () => {
  try {
    const [projRes, reqRes, taskRes, bugRes] = await Promise.all([
      projectApi.get(projectId),
      requirementApi.getAll(projectId),
      taskApi.getAll(projectId),
      bugApi.getAll(projectId),
    ]);
    project.value = projRes.data;
    requirements.value = reqRes.data;
    tasks.value = taskRes.data;
    bugs.value = bugRes.data;
  } catch (error) {
    console.error('Failed to load project details:', error);
  }
});
</script>
