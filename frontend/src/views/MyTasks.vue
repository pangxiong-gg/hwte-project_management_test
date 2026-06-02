<template>
  <div>
    <!-- Page Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <n-h2 style="margin: 0;">我的任務</n-h2>
        <n-text style="font-size: 14px; color: #64748b;">跨專案任務集中管理</n-text>
      </div>
      <div style="display: flex; gap: 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <n-button
          :type="viewMode === 'list' ? 'primary' : 'default'"
          size="small"
          @click="viewMode = 'list'"
        >列表</n-button>
        <n-button
          :type="viewMode === 'kanban' ? 'primary' : 'default'"
          size="small"
          @click="viewMode = 'kanban'"
        >看板</n-button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
      <n-card size="small">
        <n-statistic label="待辦" :value="stats.todo">
          <template #suffix><span style="font-size: 20px;">&#128347;</span></template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="進行中" :value="stats.inProgress">
          <template #suffix><span style="font-size: 20px;">&#9881;&#65039;</span></template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="已完成" :value="stats.done">
          <template #suffix><span style="font-size: 20px;">&#9989;</span></template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="已逾期" :value="stats.overdue">
          <template #suffix><span style="font-size: 20px;">&#9888;&#65039;</span></template>
        </n-statistic>
      </n-card>
    </div>

    <!-- Overdue Alert -->
    <n-alert
      v-if="overdueTasks.length > 0"
      type="error"
      :title="`你有 ${overdueTasks.length} 個任務已逾期`"
      style="margin-bottom: 16px;"
    >
      <span v-for="(t, i) in overdueTasks.slice(0, 3)" :key="t.id">
        <n-text strong>{{ t.taskCode }} {{ t.title }}</n-text>
        <n-text type="error">（逾期 {{ getOverdueDays(t.dueDate!) }} 天）</n-text>
        <n-text v-if="i < Math.min(overdueTasks.length, 3) - 1">、</n-text>
      </span>
      <n-text v-if="overdueTasks.length > 3">等</n-text>
    </n-alert>

    <!-- Filters -->
    <div style="display: flex; gap: 12px; margin-bottom: 16px; align-items: center;">
      <n-button
        v-for="f in filters"
        :key="f.key"
        :type="activeFilter === f.key ? 'primary' : 'default'"
        size="small"
        @click="activeFilter = f.key"
      >
        {{ f.label }} ({{ getFilterCount(f.key) }})
      </n-button>
      <div style="flex: 1;"></div>
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索任務..."
        size="small"
        style="width: 240px;"
        clearable
      >
        <template #prefix>
          <span>&#128269;</span>
        </template>
      </n-input>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'">
      <!-- Overdue Section -->
      <TaskSection
        v-if="filteredOverdue.length > 0"
        title="已逾期"
        icon="🔴"
        :tasks="filteredOverdue"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />

      <!-- Todo Section -->
      <TaskSection
        v-if="filteredTodo.length > 0"
        title="待辦"
        icon="🟡"
        :tasks="filteredTodo"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />

      <!-- In Progress Section -->
      <TaskSection
        v-if="filteredInProgress.length > 0"
        title="進行中"
        icon="🔵"
        :tasks="filteredInProgress"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />

      <!-- Done Section -->
      <TaskSection
        v-if="filteredDone.length > 0"
        title="已完成"
        icon="🟢"
        :tasks="filteredDone"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />

      <n-empty
        v-if="displayedTasks.length === 0"
        description="暫無任務"
        style="padding: 60px;"
      />
    </div>

    <!-- Kanban View -->
    <div v-else style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <KanbanColumn
        title="待辦"
        icon="🟡"
        color="#fef3c7"
        :tasks="filteredTodo"
        :overdue-tasks="filteredOverdue"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <KanbanColumn
        title="進行中"
        icon="🔵"
        color="#dbeafe"
        :tasks="filteredInProgress"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
      <KanbanColumn
        title="已完成"
        icon="🟢"
        color="#d1fae5"
        :tasks="filteredDone"
        @start="handleStart"
        @complete="handleComplete"
        @log-hours="openHoursModal"
        @view="goToProject"
      />
    </div>

    <!-- Hours Modal -->
    <n-modal
      v-model:show="showHoursModal"
      title="填報工時"
      preset="card"
      style="width: 400px;"
    >
      <n-form v-if="hoursForm.task">
        <n-form-item label="任務">
          <n-text strong>{{ hoursForm.task.taskCode }} {{ hoursForm.task.title }}</n-text>
        </n-form-item>
        <n-form-item label="預估工時">
          <n-text>{{ hoursForm.task.plannedHours || '-' }} 小時</n-text>
        </n-form-item>
        <n-form-item label="已投入工時">
          <n-input-number
            v-model:value="hoursForm.actualHours"
            :min="0"
            :precision="1"
            placeholder="請輸入實際工時"
            style="width: 100%;"
          >
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
  NAlert, NButton, NCard, NEmpty, NH2, NInput, NInputNumber,
  NModal, NForm, NFormItem, NSpace, NStatistic,
} from 'naive-ui';
import type { Task } from '../types';
import { myTaskApi } from '../services/api';
import TaskSection from '../components/TaskSection.vue';
import KanbanColumn from '../components/KanbanColumn.vue';

const router = useRouter();
const message = useMessage();

// State
const tasks = ref<Task[]>([]);
const stats = ref({ total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 });
const loading = ref(false);
const viewMode = ref<'list' | 'kanban'>('list');
const activeFilter = ref('all');
const searchQuery = ref('');

// Hours modal
const showHoursModal = ref(false);
const hoursLoading = ref(false);
const hoursForm = ref<{ task: Task | null; actualHours: number | null }>({
  task: null,
  actualHours: null,
});

const filters = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待辦' },
  { key: 'inProgress', label: '進行中' },
  { key: 'done', label: '已完成' },
  { key: 'overdue', label: '已逾期' },
];

// Computed
const overdueTasks = computed(() => tasks.value.filter((t) => t.isOverdue));

const filteredTasks = computed(() => {
  let result = tasks.value;

  // Filter by status
  if (activeFilter.value === 'todo') {
    result = result.filter((t) => t.status === 'TODO');
  } else if (activeFilter.value === 'inProgress') {
    result = result.filter((t) => t.status === 'IN_PROGRESS');
  } else if (activeFilter.value === 'done') {
    result = result.filter((t) => t.status === 'DONE');
  } else if (activeFilter.value === 'overdue') {
    result = result.filter((t) => t.isOverdue);
  }

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.taskCode.toLowerCase().includes(q) ||
        t.project?.name.toLowerCase().includes(q)
    );
  }

  return result;
});

const filteredOverdue = computed(() => filteredTasks.value.filter((t) => t.isOverdue));
const filteredTodo = computed(() =>
  filteredTasks.value.filter((t) => !t.isOverdue && t.status === 'TODO')
);
const filteredInProgress = computed(() =>
  filteredTasks.value.filter((t) => !t.isOverdue && t.status === 'IN_PROGRESS')
);
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
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// Actions
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
  hoursForm.value = {
    task,
    actualHours: task.actualHours ?? null,
  };
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
  if (task.projectId) {
    router.push(`/projects/${task.projectId}?tab=tasks`);
  }
}

onMounted(loadTasks);
</script>

<style scoped>
:deep(.n-statistic__label) {
  font-size: 13px;
  color: #64748b;
}
:deep(.n-statistic__value) {
  font-size: 28px;
  font-weight: 600;
}
</style>
