<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">我的任務</h1>
        <p class="page-subtitle">跨專案任務集中管理</p>
      </div>
      <div class="glass-tabs">
        <button
          :class="['glass-tab', { active: viewMode === 'list' }]"
          @click="viewMode = 'list'"
        >列表</button>
        <button
          :class="['glass-tab', { active: viewMode === 'kanban' }]"
          @click="viewMode = 'kanban'"
        >看板</button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="bento-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap yellow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <div class="stat-label">待辦</div>
          <div class="stat-value">{{ stats.todo }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap" style="background: linear-gradient(135deg, rgba(79,106,245,0.15), rgba(139,92,246,0.15)); color: var(--accent-blue);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div>
          <div class="stat-label">進行中</div>
          <div class="stat-value" style="color: var(--accent-blue);">{{ stats.inProgress }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div>
          <div class="stat-label">已完成</div>
          <div class="stat-value" style="color: var(--success);">{{ stats.done }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap red">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div>
          <div class="stat-label">已逾期</div>
          <div class="stat-value" style="color: var(--danger);">{{ stats.overdue }}</div>
        </div>
      </div>
    </div>

    <!-- Overdue Alert -->
    <n-alert
      v-if="overdueTasks.length > 0"
      type="error"
      :title="`你有 ${overdueTasks.length} 個任務已逾期`"
      style="margin-bottom: 20px;"
    >
      <span v-for="(t, i) in overdueTasks.slice(0, 3)" :key="t.id">
        <n-text strong>{{ t.taskCode }} {{ t.title }}</n-text>
        <n-text type="error">（逾期 {{ getOverdueDays(t.dueDate!) }} 天）</n-text>
        <n-text v-if="i < Math.min(overdueTasks.length, 3) - 1">、</n-text>
      </span>
      <n-text v-if="overdueTasks.length > 3">等</n-text>
    </n-alert>

    <!-- Filters -->
    <div style="display: flex; gap: 8px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
      <button
        v-for="f in filters"
        :key="f.key"
        :class="['filter-btn', { active: activeFilter === f.key }]"
        @click="activeFilter = f.key"
      >
        {{ f.label }} ({{ getFilterCount(f.key) }})
      </button>
      <div style="flex: 1;"></div>
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索任務..."
        size="small"
        class="glass-search-sm"
        clearable
      >
        <template #prefix>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </template>
      </n-input>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'">
      <TaskSection
        v-if="filteredOverdue.length > 0"
        title="已逾期"
        icon="alert-triangle"
        :tasks="filteredOverdue"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <TaskSection
        v-if="filteredTodo.length > 0"
        title="待辦"
        icon="clock"
        :tasks="filteredTodo"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <TaskSection
        v-if="filteredInProgress.length > 0"
        title="進行中"
        icon="loader"
        :tasks="filteredInProgress"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <TaskSection
        v-if="filteredDone.length > 0"
        title="已完成"
        icon="check-circle"
        :tasks="filteredDone"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <n-empty v-if="displayedTasks.length === 0" description="暫無任務" style="padding: 60px;" />
    </div>

    <!-- Kanban View -->
    <div v-else class="kanban-grid">
      <KanbanColumn
        title="待辦"
        icon="clock"
        :tasks="filteredTodo"
        :overdue-tasks="filteredOverdue"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <KanbanColumn
        title="進行中"
        icon="loader"
        :tasks="filteredInProgress"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <KanbanColumn
        title="已完成"
        icon="check-circle"
        :tasks="filteredDone"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
    </div>

    <!-- Hours Modal -->
    <n-modal v-model:show="showHoursModal" title="填報工時" preset="card" style="width: 400px;">
      <n-form v-if="hoursForm.task">
        <n-form-item label="任務">
          <n-text strong>{{ hoursForm.task.taskCode }} {{ hoursForm.task.title }}</n-text>
        </n-form-item>
        <n-form-item label="預估工時">
          <n-text>{{ hoursForm.task.plannedHours || '-' }} 小時</n-text>
        </n-form-item>
        <n-form-item label="已投入工時">
          <n-input-number v-model:value="hoursForm.actualHours" :min="0" :precision="1" placeholder="請輸入實際工時" style="width: 100%;">
            <template #suffix>小時</template>
          </n-input-number>
        </n-form-item>
        <n-space justify="end">
          <n-button @click="showHoursModal = false">取消</n-button>
          <n-button type="primary" :loading="hoursLoading" @click="submitHours">儲存</n-button>
        </n-space>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NAlert, NButton, NEmpty, NInput, NInputNumber,
  NModal, NForm, NFormItem, NSpace, NText,
} from 'naive-ui';
import type { Task } from '../types';
import { myTaskApi } from '../services/api';
import TaskSection from '../components/TaskSection.vue';
import KanbanColumn from '../components/KanbanColumn.vue';

const router = useRouter();
const message = useMessage();

const tasks = ref<Task[]>([]);
const stats = ref({ total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 });
const loading = ref(false);
const viewMode = ref<'list' | 'kanban'>('list');
const activeFilter = ref('all');
const searchQuery = ref('');

const showHoursModal = ref(false);
const hoursLoading = ref(false);
const hoursForm = ref<{ task: Task | null; actualHours: number | null }>({ task: null, actualHours: null });

const filters = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待辦' },
  { key: 'inProgress', label: '進行中' },
  { key: 'done', label: '已完成' },
  { key: 'overdue', label: '已逾期' },
];

const overdueTasks = computed(() => tasks.value.filter((t) => t.isOverdue));

const filteredTasks = computed(() => {
  let result = tasks.value;
  if (activeFilter.value === 'todo') result = result.filter((t) => t.status === 'TODO');
  else if (activeFilter.value === 'inProgress') result = result.filter((t) => t.status === 'IN_PROGRESS');
  else if (activeFilter.value === 'done') result = result.filter((t) => t.status === 'DONE');
  else if (activeFilter.value === 'overdue') result = result.filter((t) => t.isOverdue);

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (t) => t.title.toLowerCase().includes(q) || t.taskCode.toLowerCase().includes(q) || t.project?.name.toLowerCase().includes(q)
    );
  }
  return result;
});

const filteredOverdue = computed(() => filteredTasks.value.filter((t) => t.isOverdue));
const filteredTodo = computed(() => filteredTasks.value.filter((t) => !t.isOverdue && t.status === 'TODO'));
const filteredInProgress = computed(() => filteredTasks.value.filter((t) => !t.isOverdue && t.status === 'IN_PROGRESS'));
const filteredDone = computed(() => filteredTasks.value.filter((t) => t.status === 'DONE'));
const displayedTasks = computed(() => filteredTasks.value);

function getFilterCount(key: string): number {
  if (key === 'all') return stats.value.total;
  if (key === 'todo') return stats.value.todo;
  if (key === 'inProgress') return stats.value.inProgress;
  if (key === 'done') return stats.value.done;
  if (key === 'overdue') return stats.value.overdue;
  return 0;
}

function getOverdueDays(dueDate: string): number {
  const d = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

async function loadTasks() {
  loading.value = true;
  try {
    const res = await myTaskApi.getAll();
    tasks.value = res.data.tasks || [];
    stats.value = res.data.stats || { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 };
  } catch (err: any) {
    message.error('載入任務失敗：' + (err.response?.data?.error || err.message));
  } finally {
    loading.value = false;
  }
}

async function handleStart(task: Task) {
  try {
    await myTaskApi.updateStatus(task.id, 'IN_PROGRESS');
    message.success('任務已開始');
    loadTasks();
  } catch (err: any) {
    message.error('操作失敗：' + (err.response?.data?.error || err.message));
  }
}

async function handleComplete(task: Task) {
  try {
    await myTaskApi.updateStatus(task.id, 'DONE');
    message.success('任務已完成');
    loadTasks();
  } catch (err: any) {
    message.error('操作失敗：' + (err.response?.data?.error || err.message));
  }
}

function openHoursModal(task: Task) {
  hoursForm.value = { task, actualHours: task.actualHours ?? null };
  showHoursModal.value = true;
}

async function submitHours() {
  if (!hoursForm.value.task) return;
  hoursLoading.value = true;
  try {
    await myTaskApi.updateHours(hoursForm.value.task.id, hoursForm.value.actualHours);
    message.success('工時已更新');
    showHoursModal.value = false;
    loadTasks();
  } catch (err: any) {
    message.error('更新失敗：' + (err.response?.data?.error || err.message));
  } finally {
    hoursLoading.value = false;
  }
}

function goToProject(task: Task) {
  if (task.projectId) router.push(`/projects/${task.projectId}?tab=tasks`);
}

onMounted(loadTasks);
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}
.page-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.8px;
  margin: 0;
  color: var(--text-primary);
}
.page-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin: 4px 0 0 0;
}

.bento-grid {
  display: grid;
  gap: 20px;
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--glass-shadow);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.glass-card:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  box-shadow: var(--glass-shadow-hover);
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

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(79,106,245,0.15), rgba(139,92,246,0.15));
  color: var(--accent-blue);
  flex-shrink: 0;
}
.stat-icon-wrap.green { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15)); color: var(--success); }
.stat-icon-wrap.red { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(236,72,153,0.15)); color: var(--danger); }
.stat-icon-wrap.yellow { background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15)); color: var(--warning); }

.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.stat-value {
  font-size: 28px;
  font-weight: 800;
  margin-top: 2px;
  letter-spacing: -1px;
  color: var(--text-primary);
}

.glass-tabs {
  display: flex;
  gap: 0;
  padding: 4px;
  background: var(--tab-bg);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
  border: 1px solid var(--tab-border);
  width: fit-content;
  overflow: hidden;
}
.glass-tab {
  padding: 8px 18px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: calc(var(--radius-md) - 4px);
  transition: all 0.2s;
}
.glass-tab:hover { color: var(--text-secondary); }
.glass-tab.active {
  background: var(--tab-active-bg);
  color: var(--accent-blue);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.filter-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--glass-border);
  background: var(--glass-inner-bg);
  backdrop-filter: blur(10px);
  color: var(--text-secondary);
  transition: all 0.2s;
}
.filter-btn:hover {
  background: var(--glass-inner-hover);
  color: var(--text-primary);
}
.filter-btn.active {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(79, 106, 245, 0.25);
}

.glass-search-sm {
  width: 240px;
}
.glass-search-sm :deep(.n-input__input-el) {
  background: transparent !important;
  border: none !important;
  border-radius: var(--radius-sm) !important;
}
.glass-search-sm :deep(.n-input__border) {
  border: none !important;
}
.glass-search-sm :deep(.n-input__state-border) {
  border: none !important;
}

.kanban-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .kanban-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .bento-grid { grid-template-columns: 1fr !important; }
  .kanban-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 16px; }
}
</style>
