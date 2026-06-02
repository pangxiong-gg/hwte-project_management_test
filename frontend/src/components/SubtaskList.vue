<template>
  <div>
    <div v-if="parentTasks.length > 0">
      <div v-for="parent in parentTasks" :key="parent.id" class="parent-task-card">
        <div class="parent-header">
          <div class="parent-info">
            <div class="parent-code">{{ parent.taskCode }}</div>
            <div class="parent-title">{{ parent.title }}</div>
          </div>
          <div class="parent-progress">
            <div class="progress-label">子任務進度</div>
            <div class="progress-value" :style="{ color: getProgressColor(parent) }">{{ getProgress(parent) }}%</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :class="getProgressClass(parent)" :style="{ width: getProgress(parent) + '%' }"></div>
        </div>

        <div class="subtask-list">
          <div v-for="sub in parent.children" :key="sub.id" class="subtask-row">
            <n-checkbox :checked="sub.status === 'DONE'" @update:checked="toggleSubtask(sub)">
              <span :class="{ 'subtask-done': sub.status === 'DONE' }">{{ sub.taskCode }} {{ sub.title }}</span>
            </n-checkbox>
            <n-tag size="tiny" :type="sub.status === 'DONE' ? 'success' : sub.status === 'IN_PROGRESS' ? 'info' : 'default'">
              {{ sub.status === 'DONE' ? '已完成' : sub.status === 'IN_PROGRESS' ? '進行中' : '待辦' }}
            </n-tag>
          </div>
        </div>

        <div v-if="isAdminOrPM" class="add-subtask">
          <n-input v-model:value="newSubtaskTitle[parent.id]" size="small" placeholder="新增子任務..." @keyup.enter="addSubtask(parent.id)">
            <template #suffix>
              <n-button text size="tiny" @click="addSubtask(parent.id)">+</n-button>
            </template>
          </n-input>
        </div>
      </div>
    </div>
    <n-empty v-else description="暫無子任務" style="padding: 40px 0;" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NCheckbox, NTag, NInput, NButton, NEmpty } from 'naive-ui';
import type { Task } from '../types';
import { taskApi } from '../services/api';

const props = defineProps<{
  tasks: Task[];
  projectId: string;
  userRole?: string;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const newSubtaskTitle = ref<Record<string, string>>({});

const isAdminOrPM = computed(() => ['ADMIN', 'PROJECT_MANAGER'].includes(props.userRole || ''));

const parentTasks = computed(() => {
  return props.tasks.filter((t) => t.children && t.children.length > 0);
});

function getProgress(parent: Task): number {
  if (!parent.children || parent.children.length === 0) return 0;
  const done = parent.children.filter((c: any) => c.status === 'DONE').length;
  return Math.round((done / parent.children.length) * 100);
}

function getProgressColor(parent: Task): string {
  const p = getProgress(parent);
  if (p === 100) return '#10b981';
  if (p >= 50) return '#3b82f6';
  return '#f59e0b';
}

function getProgressClass(parent: Task): string {
  const p = getProgress(parent);
  if (p === 100) return 'complete';
  if (p >= 50) return 'half';
  return 'start';
}

async function toggleSubtask(sub: any) {
  const newStatus = sub.status === 'DONE' ? 'TODO' : 'DONE';
  try {
    await taskApi.update(props.projectId, sub.id, { status: newStatus });
    emit('refresh');
  } catch (e) {
    // silent
  }
}

async function addSubtask(parentId: string) {
  const title = newSubtaskTitle.value[parentId]?.trim();
  if (!title) return;
  try {
    await taskApi.create(props.projectId, {
      title,
      parentId,
      type: 'SUBTASK',
      priority: 'P2',
    });
    newSubtaskTitle.value[parentId] = '';
    emit('refresh');
  } catch (e) {
    // silent
  }
}
</script>

<style scoped>
.parent-task-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  margin-bottom: 16px;
}
.parent-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.parent-code { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.parent-title { font-size: 16px; font-weight: 600; }
.parent-progress { text-align: right; }
.progress-label { font-size: 11px; color: #94a3b8; }
.progress-value { font-size: 20px; font-weight: 600; }

.progress-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.progress-fill.complete { background: #10b981; }
.progress-fill.half { background: #3b82f6; }
.progress-fill.start { background: #f59e0b; }

.subtask-list { margin-bottom: 12px; }
.subtask-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}
.subtask-row:last-child { border-bottom: none; }
.subtask-done { text-decoration: line-through; color: #94a3b8; }

.add-subtask { margin-top: 8px; }
</style>
