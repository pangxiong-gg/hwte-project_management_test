<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <n-h2 style="margin: 0;">
        {{ project?.name || '專案詳情' }}
        <n-tag :type="statusType" size="small">{{ statusText }}</n-tag>
        <n-tag
          v-if="project?.mode"
          size="small"
          :style="modeTagStyle"
          style="margin-left: 8px;"
        >
          {{ modeLabel }}
        </n-tag>
      </n-h2>
      <n-button @click="$router.push('/')">返回列表</n-button>
    </div>

    <!-- 階段流程（瀑布式/混合型） -->
    <n-card v-if="showPhasePipeline" title="專案階段" style="margin-bottom: 20px;">
      <div class="phase-pipeline">
        <template v-for="(phase, index) in phases" :key="phase.id">
          <div
            class="phase-step"
            :class="{
              'phase-active': phase.status === 'ACTIVE',
              'phase-completed': phase.status === 'COMPLETED',
              'phase-pending': phase.status === 'PENDING',
            }"
          >
            <div class="phase-dot">{{ index + 1 }}</div>
            <div class="phase-name">{{ phase.name }}</div>
            <div class="phase-status-text">{{ phaseStatusText(phase.status) }}</div>
            <div v-if="phase._count?.tasks" class="phase-task-count">{{ phase._count.tasks }} 任務</div>
          </div>
          <div v-if="index < phases.length - 1" class="phase-connector" :class="{ 'connector-active': phase.status === 'COMPLETED' }" />
        </template>
      </div>
      <div v-if="canAdvancePhase" style="margin-top: 16px; text-align: right;">
        <n-button type="primary" :loading="advancing" @click="handleAdvancePhase">
          推進至下一階段
        </n-button>
      </div>
    </n-card>

    <n-card title="基本資訊" style="margin-bottom: 20px;">
      <n-descriptions :columns="3" bordered>
        <n-descriptions-item label="專案代碼">{{ project?.code }}</n-descriptions-item>
        <n-descriptions-item label="狀態">{{ statusText }}</n-descriptions-item>
        <n-descriptions-item label="模式">{{ modeLabel }}</n-descriptions-item>
        <n-descriptions-item label="建立時間">{{ formatDate(project?.createdAt) }}</n-descriptions-item>
        <n-descriptions-item label="當前階段" :span="2">{{ currentPhaseName }}</n-descriptions-item>
      </n-descriptions>
      <n-p style="margin-top: 12px; color: #64748b;">{{ project?.description || '無描述' }}</n-p>
    </n-card>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
      <n-statistic label="需求數" :value="requirements.length" />
      <n-statistic label="任務數" :value="tasks.length" />
      <n-statistic label="Bug 數" :value="bugs.length" />
    </div>

    <n-tabs type="line" v-model:value="activeTab">
      <!-- 需求 Tab -->
      <n-tab-pane name="requirements" tab="需求">
        <div style="margin-bottom: 16px;">
          <n-button type="primary" @click="showReqModal = true">+ 新增需求</n-button>
        </div>
        <n-data-table :columns="reqColumns" :data="requirements" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>

      <!-- 任務 Tab -->
      <n-tab-pane name="tasks" tab="任務">
        <div style="margin-bottom: 16px;">
          <n-button type="primary" @click="openTaskModal">+ 新增任務</n-button>
        </div>
        <TaskBoard :tasks="tasks" :mode="project?.mode" :phases="phases" @update-status="handleUpdateTaskStatus" />
      </n-tab-pane>

      <!-- Bug Tab -->
      <n-tab-pane name="bugs" tab="Bug">
        <div style="margin-bottom: 16px;">
          <n-button type="primary" @click="openBugModal">+ 新增 Bug</n-button>
        </div>
        <n-data-table :columns="bugColumns" :data="bugs" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>
    </n-tabs>

    <!-- 新增需求 Modal -->
    <n-modal v-model:show="showReqModal" title="新增需求" preset="card" style="width: 600px;">
      <n-form :model="reqForm" :rules="reqRules" ref="reqFormRef">
        <n-form-item label="標題" path="title">
          <n-input v-model:value="reqForm.title" placeholder="請輸入需求標題" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="reqForm.description" type="textarea" :rows="4" placeholder="請輸入需求描述" />
        </n-form-item>
        <n-form-item label="優先級" path="priority">
          <n-select v-model:value="reqForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="類型" path="type">
          <n-select v-model:value="reqForm.type" :options="reqTypeOptions" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateRequirement">確定</n-button>
            <n-button @click="showReqModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 新增任務 Modal -->
    <n-modal v-model:show="showTaskModal" title="新增任務" preset="card" style="width: 600px;">
      <n-form :model="taskForm" :rules="taskRules" ref="taskFormRef">
        <n-alert v-if="currentPhase" type="info" :show-icon="false" style="margin-bottom: 16px;">
          當前階段：<strong>{{ currentPhase.name }}</strong>
          <span v-if="currentPhase.allowedTaskTypes">
            — 允許任務類型：{{ allowedTaskTypeLabels }}
          </span>
          <span v-else> — 任務類型不受限制</span>
        </n-alert>
        <n-form-item label="標題" path="title">
          <n-input v-model:value="taskForm.title" placeholder="請輸入任務標題" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="taskForm.description" type="textarea" :rows="3" placeholder="請輸入任務描述" />
        </n-form-item>
        <n-form-item label="類型" path="type">
          <n-select v-model:value="taskForm.type" :options="filteredTaskTypeOptions" />
        </n-form-item>
        <n-form-item label="優先級" path="priority">
          <n-select v-model:value="taskForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="關聯需求" path="requirementId">
          <n-select
            v-model:value="taskForm.requirementId"
            :options="requirementOptions"
            placeholder="選擇關聯需求（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item label="指派人" path="assigneeId">
          <n-select
            v-model:value="taskForm.assigneeId"
            :options="userOptions"
            placeholder="選擇指派人（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item label="預估工時（小時）" path="plannedHours">
          <n-input-number v-model:value="taskForm.plannedHours" :min="0" :precision="1" placeholder="例如：8" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateTask">確定</n-button>
            <n-button @click="showTaskModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 新增 Bug Modal -->
    <n-modal v-model:show="showBugModal" title="新增 Bug" preset="card" style="width: 600px;">
      <n-form :model="bugForm" :rules="bugRules" ref="bugFormRef">
        <n-form-item label="標題" path="title">
          <n-input v-model:value="bugForm.title" placeholder="請輸入 Bug 標題" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="bugForm.description" type="textarea" :rows="4" placeholder="請描述 Bug 的現象、重現步驟、預期結果" />
        </n-form-item>
        <n-form-item label="嚴重程度" path="severity">
          <n-select v-model:value="bugForm.severity" :options="severityOptions" />
        </n-form-item>
        <n-form-item label="優先級" path="priority">
          <n-select v-model:value="bugForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="關聯需求" path="requirementId">
          <n-select
            v-model:value="bugForm.requirementId"
            :options="requirementOptions"
            placeholder="選擇關聯需求（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item label="關聯任務" path="taskId">
          <n-select
            v-model:value="bugForm.taskId"
            :options="taskOptions"
            placeholder="選擇關聯任務（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateBug">確定</n-button>
            <n-button @click="showBugModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import { NTag, NButton, NSpace, NAlert } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { projectApi, phaseApi, requirementApi, taskApi, bugApi, userApi } from '../services/api';
import type { Project, ProjectPhase, Requirement, Task, Bug, User } from '../types';
import TaskBoard from '../components/TaskBoard.vue';

const route = useRoute();
const message = useMessage();
const projectId = route.params.id as string;

const project = ref<Project | null>(null);
const phases = ref<ProjectPhase[]>([]);
const requirements = ref<Requirement[]>([]);
const tasks = ref<Task[]>([]);
const bugs = ref<Bug[]>([]);
const users = ref<User[]>([]);
const activeTab = ref('requirements');
const submitting = ref(false);
const advancing = ref(false);

// Modals
const showReqModal = ref(false);
const showTaskModal = ref(false);
const showBugModal = ref(false);

// Form refs
const reqFormRef = ref();
const taskFormRef = ref();
const bugFormRef = ref();

// 需求表單
const reqForm = ref({
  title: '',
  description: '',
  priority: 'P2',
  type: 'FUNCTIONAL',
});

// 任務表單
const taskForm = ref({
  title: '',
  description: '',
  type: 'DEVELOPMENT',
  priority: 'P2',
  requirementId: null as string | null,
  assigneeId: null as string | null,
  plannedHours: null as number | null,
});

// Bug 表單
const bugForm = ref({
  title: '',
  description: '',
  severity: 'MEDIUM',
  priority: 'P2',
  requirementId: null as string | null,
  taskId: null as string | null,
});

// 選項
const priorityOptions = [
  { label: 'P0 - 緊急', value: 'P0' },
  { label: 'P1 - 高', value: 'P1' },
  { label: 'P2 - 中', value: 'P2' },
  { label: 'P3 - 低', value: 'P3' },
];

const reqTypeOptions = [
  { label: '功能性需求', value: 'FUNCTIONAL' },
  { label: '非功能性需求', value: 'NON_FUNCTIONAL' },
  { label: 'Bug 修復', value: 'BUG_FIX' },
  { label: '技術債', value: 'TECH_DEBT' },
];

const allTaskTypeOptions = [
  { label: '開發', value: 'DEVELOPMENT' },
  { label: '設計', value: 'DESIGN' },
  { label: '測試', value: 'TESTING' },
  { label: '文件', value: 'DOCUMENTATION' },
  { label: 'Bug 修復', value: 'BUG_FIX' },
  { label: '需求文件', value: 'REQUIREMENT_DOC' },
  { label: '運維', value: 'OPERATION' },
];

const severityOptions = [
  { label: '嚴重', value: 'CRITICAL' },
  { label: '高', value: 'HIGH' },
  { label: '中', value: 'MEDIUM' },
  { label: '低', value: 'LOW' },
];

// 下拉選項（動態）
const requirementOptions = computed(() =>
  requirements.value.map((r) => ({ label: `${r.reqCode} - ${r.title}`, value: r.id }))
);

const taskOptions = computed(() =>
  tasks.value.map((t) => ({ label: `${t.taskCode} - ${t.title}`, value: t.id }))
);

const userOptions = computed(() =>
  users.value.map((u) => ({ label: `${u.name} (${u.role})`, value: u.id }))
);

// 表單驗證規則
const reqRules = {
  title: { required: true, message: '請輸入需求標題', trigger: 'blur' },
};

const taskRules = {
  title: { required: true, message: '請輸入任務標題', trigger: 'blur' },
};

const bugRules = {
  title: { required: true, message: '請輸入 Bug 標題', trigger: 'blur' },
  description: { required: true, message: '請輸入 Bug 描述', trigger: 'blur' },
};

// 狀態顯示
const statusMap: Record<string, { text: string; type: string }> = {
  ACTIVE: { text: '進行中', type: 'info' },
  COMPLETED: { text: '已完成', type: 'success' },
  PLANNING: { text: '規劃中', type: 'warning' },
};

const statusText = computed(() => statusMap[project.value?.status || '']?.text || project.value?.status || '');
const statusType = computed(() => statusMap[project.value?.status || '']?.type as any || 'default');

// 模式相關
const modeLabel = computed(() => {
  const map: Record<string, string> = {
    WATERFALL: '瀑布式',
    AGILE: '敏捷式',
    HYBRID: '混合型',
  };
  return map[project.value?.mode || ''] || project.value?.mode || '';
});

const modeTagStyle = computed(() => {
  const map: Record<string, { color: string; bg: string }> = {
    WATERFALL: { color: '#3b82f6', bg: '#3b82f620' },
    AGILE: { color: '#10b981', bg: '#10b98120' },
    HYBRID: { color: '#8b5cf6', bg: '#8b5cf620' },
  };
  const m = map[project.value?.mode || ''] || { color: '#64748b', bg: '#64748b20' };
  return { background: m.bg, color: m.color, borderColor: m.color + '40' };
});

// 階段相關
const showPhasePipeline = computed(() => {
  return project.value?.mode === 'WATERFALL' || project.value?.mode === 'HYBRID';
});

const currentPhase = computed(() => {
  return phases.value.find((p) => p.status === 'ACTIVE') || null;
});

const currentPhaseName = computed(() => {
  return currentPhase.value?.name || '無';
});

const canAdvancePhase = computed(() => {
  if (!currentPhase.value) return false;
  const activeIndex = phases.value.findIndex((p) => p.status === 'ACTIVE');
  return activeIndex >= 0 && activeIndex < phases.value.length - 1;
});

function phaseStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: '未開始',
    ACTIVE: '進行中',
    COMPLETED: '已完成',
  };
  return map[status] || status;
}

// 動態過濾任務類型
const filteredTaskTypeOptions = computed(() => {
  if (!currentPhase.value || !currentPhase.value.allowedTaskTypes) {
    return allTaskTypeOptions;
  }
  const allowed = currentPhase.value.allowedTaskTypes.split(',');
  return allTaskTypeOptions.filter((opt) => allowed.includes(opt.value));
});

const allowedTaskTypeLabels = computed(() => {
  if (!currentPhase.value?.allowedTaskTypes) return '所有類型';
  const allowed = currentPhase.value.allowedTaskTypes.split(',');
  return allTaskTypeOptions
    .filter((opt) => allowed.includes(opt.value))
    .map((opt) => opt.label)
    .join('、');
});

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString('zh-TW') : '-';
}

// 表格欄位
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

const bugColumns: DataTableColumns<Bug> = [
  { title: '編號', key: 'bugCode' },
  { title: '標題', key: 'title' },
  { title: '嚴重程度', key: 'severity' },
  { title: '優先級', key: 'priority' },
  { title: '狀態', key: 'status' },
];

// 載入資料
async function loadData() {
  try {
    const [projRes, phaseRes, reqRes, taskRes, bugRes, userRes] = await Promise.all([
      projectApi.get(projectId),
      phaseApi.getAll(projectId),
      requirementApi.getAll(projectId),
      taskApi.getAll(projectId),
      bugApi.getAll(projectId),
      userApi.getAll(),
    ]);
    project.value = projRes.data;
    phases.value = phaseRes.data;
    requirements.value = reqRes.data;
    tasks.value = taskRes.data;
    bugs.value = bugRes.data;
    users.value = userRes.data;
  } catch (error) {
    console.error('Failed to load project details:', error);
    message.error('載入專案資料失敗');
  }
}

// 階段推進
async function handleAdvancePhase() {
  if (!currentPhase.value) return;
  try {
    advancing.value = true;
    const res = await phaseApi.advance(projectId, currentPhase.value.id);
    message.success(res.data.message);
    phases.value = res.data.phases;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '推進階段失敗');
  } finally {
    advancing.value = false;
  }
}

// 開啟任務 Modal
function openTaskModal() {
  const defaultType = filteredTaskTypeOptions.value.length > 0
    ? filteredTaskTypeOptions.value[0].value
    : 'DEVELOPMENT';

  taskForm.value = {
    title: '',
    description: '',
    type: defaultType,
    priority: 'P2',
    requirementId: null,
    assigneeId: null,
    plannedHours: null,
  };
  showTaskModal.value = true;
}

// 開啟 Bug Modal
function openBugModal() {
  bugForm.value = {
    title: '',
    description: '',
    severity: 'MEDIUM',
    priority: 'P2',
    requirementId: null,
    taskId: null,
  };
  showBugModal.value = true;
}

// 新增需求
async function handleCreateRequirement() {
  try {
    await reqFormRef.value?.validate();
    submitting.value = true;
    await requirementApi.create(projectId, reqForm.value);
    message.success('需求建立成功');
    showReqModal.value = false;
    reqForm.value = { title: '', description: '', priority: 'P2', type: 'FUNCTIONAL' };
    const res = await requirementApi.getAll(projectId);
    requirements.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

// 新增任務
async function handleCreateTask() {
  try {
    await taskFormRef.value?.validate();
    submitting.value = true;
    const data = {
      ...taskForm.value,
      requirementId: taskForm.value.requirementId || undefined,
      assigneeId: taskForm.value.assigneeId || undefined,
      plannedHours: taskForm.value.plannedHours || undefined,
    };
    await taskApi.create(projectId, data);
    message.success('任務建立成功');
    showTaskModal.value = false;
    const res = await taskApi.getAll(projectId);
    tasks.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

// 更新任務狀態（看板拖拽）
async function handleUpdateTaskStatus(taskId: string, newStatus: string) {
  try {
    const isPhaseKey = project.value?.mode === 'WATERFALL' && phases.value.some((p) => p.id === newStatus);
    const updateData = isPhaseKey ? { phaseId: newStatus } : { status: newStatus };

    await taskApi.update(projectId, taskId, updateData);
    message.success(isPhaseKey ? '階段已更新' : '狀態已更新');
    const res = await taskApi.getAll(projectId);
    tasks.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    } else {
      message.error('更新失敗');
    }
  }
}

// 新增 Bug
async function handleCreateBug() {
  try {
    await bugFormRef.value?.validate();
    submitting.value = true;
    const data = {
      ...bugForm.value,
      requirementId: bugForm.value.requirementId || undefined,
      taskId: bugForm.value.taskId || undefined,
    };
    await bugApi.create(projectId, data);
    message.success('Bug 建立成功');
    showBugModal.value = false;
    const res = await bugApi.getAll(projectId);
    bugs.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.phase-pipeline {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  overflow-x: auto;
  padding: 8px 0;
}

.phase-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  text-align: center;
}

.phase-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  border: 2px solid;
  transition: all 0.2s;
}

.phase-pending .phase-dot {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #94a3b8;
}

.phase-active .phase-dot {
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  border-color: #3b82f6;
  color: white;
}

.phase-completed .phase-dot {
  background: #22c55e;
  border-color: #22c55e;
  color: white;
}

.phase-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
}

.phase-status-text {
  font-size: 11px;
  color: #64748b;
}

.phase-task-count {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.phase-connector {
  flex: 1;
  min-width: 24px;
  height: 2px;
  background: #e2e8f0;
  margin-top: 16px;
  transition: background 0.2s;
}

.phase-connector.connector-active {
  background: #22c55e;
}
</style>
