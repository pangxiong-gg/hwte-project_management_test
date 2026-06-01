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

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
      <n-statistic label="需求數" :value="requirements.length" />
      <n-statistic label="任務數" :value="tasks.length" />
      <n-statistic label="Bug 數" :value="bugs.length" />
      <n-statistic label="測試用例" :value="testCases.length" />
    </div>

    <n-tabs type="line" v-model:value="activeTab">
      <!-- 需求 Tab -->
      <n-tab-pane name="requirements" tab="需求">
        <div style="margin-bottom: 16px;">
          <n-button v-if="canCreateReq" type="primary" @click="showReqModal = true">+ 新增需求</n-button>
        </div>
        <n-data-table :columns="reqColumns" :data="requirements" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>

      <!-- 任務 Tab -->
      <n-tab-pane name="tasks" tab="任務">
        <div style="margin-bottom: 16px;">
          <n-button v-if="canCreateTaskComputed" type="primary" @click="openTaskModal">+ 新增任務</n-button>
        </div>
        <TaskBoard :tasks="tasks" :mode="project?.mode" :phases="phases" :users="users" :user-role="userRole" @update-status="handleUpdateTaskStatus" @assign="handleAssignTask" @edit-git="openGitEditModal" />
      </n-tab-pane>

      <!-- Bug Tab -->
      <n-tab-pane name="bugs" tab="Bug">
        <div style="margin-bottom: 16px;">
          <n-button v-if="canCreateBugComputed" type="primary" @click="openBugModal">+ 新增 Bug</n-button>
        </div>
        <n-data-table :columns="bugColumns" :data="bugs" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>

      <!-- 測試 Tab -->
      <n-tab-pane name="tests" tab="測試">
        <div style="margin-bottom: 16px;">
          <n-button v-if="canManageTest" type="primary" @click="openTestCaseModal">+ 新增測試用例</n-button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
          <n-statistic label="總計" :value="testCases.length" />
          <n-statistic label="通過">
            <n-text type="success">{{ testCases.filter(tc => tc.executions?.[0]?.result === 'PASSED').length }}</n-text>
          </n-statistic>
          <n-statistic label="失敗">
            <n-text type="error">{{ testCases.filter(tc => tc.executions?.[0]?.result === 'FAILED').length }}</n-text>
          </n-statistic>
          <n-statistic label="未執行">
            <n-text type="warning">{{ testCases.filter(tc => !tc.executions?.[0]).length }}</n-text>
          </n-statistic>
        </div>
        <n-data-table :columns="testCaseColumns" :data="testCases" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>
    </n-tabs>

    <!-- 需求變更歷史 Modal -->
    <n-modal v-model:show="showReqChangesModal" title="需求變更歷史" preset="card" style="width: 600px;">
      <n-timeline v-if="requirementChanges.length > 0">
        <n-timeline-item
          v-for="change in requirementChanges"
          :key="change.id"
          :type="changeTypeColor(change.changeType)"
        >
          <div style="font-size: 13px; font-weight: 500;">{{ changeTypeLabel(change.changeType) }}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            <span v-if="change.oldValue">{{ change.oldValue }}</span>
            <span v-else style="color: #cbd5e1;">（空）</span>
            <span style="margin: 0 8px;">→</span>
            <span v-if="change.newValue">{{ change.newValue }}</span>
            <span v-else style="color: #cbd5e1;">（空）</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            {{ change.changedBy?.name }} · {{ formatDate(change.createdAt) }}
          </div>
        </n-timeline-item>
      </n-timeline>
      <n-empty v-else description="暫無變更記錄" />
    </n-modal>

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

    <!-- 編輯 Git Modal -->
    <n-modal v-model:show="showGitModal" title="編輯程式碼關聯" preset="card" style="width: 500px;">
      <n-form :model="gitForm" ref="gitFormRef">
        <n-form-item label="Git Branch">
          <n-input v-model:value="gitForm.gitBranch" placeholder="例如：feature/login-page" />
        </n-form-item>
        <n-form-item label="Git Commit">
          <n-input v-model:value="gitForm.gitCommit" placeholder="完整的 commit hash" />
        </n-form-item>
        <n-form-item label="Pull Request #">
          <n-input v-model:value="gitForm.gitPr" placeholder="例如：42" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleUpdateGit">確定</n-button>
            <n-button @click="showGitModal = false">取消</n-button>
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
        <n-form-item label="指派人" path="assigneeId">
          <n-select
            v-model:value="bugForm.assigneeId"
            :options="userOptions"
            placeholder="選擇指派人（可選）"
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

    <!-- 新增測試用例 Modal -->
    <n-modal v-model:show="showTestCaseModal" title="新增測試用例" preset="card" style="width: 600px;">
      <n-form :model="testCaseForm" :rules="testCaseRules" ref="testCaseFormRef">
        <n-form-item label="標題" path="title">
          <n-input v-model:value="testCaseForm.title" placeholder="請輸入測試用例標題" />
        </n-form-item>
        <n-form-item label="前置條件" path="precondition">
          <n-input v-model:value="testCaseForm.precondition" type="textarea" :rows="2" placeholder="執行測試前的準備條件" />
        </n-form-item>
        <n-form-item label="測試步驟" path="steps">
          <n-input v-model:value="testCaseForm.steps" type="textarea" :rows="4" placeholder="請輸入詳細的測試步驟（每行一步）" />
        </n-form-item>
        <n-form-item label="預期結果" path="expectedResult">
          <n-input v-model:value="testCaseForm.expectedResult" type="textarea" :rows="3" placeholder="請輸入預期結果" />
        </n-form-item>
        <n-form-item label="關聯需求" path="requirementId">
          <n-select
            v-model:value="testCaseForm.requirementId"
            :options="requirementOptions"
            placeholder="選擇關聯需求（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateTestCase">確定</n-button>
            <n-button @click="showTestCaseModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 執行測試 Modal -->
    <n-modal v-model:show="showTestExecutionModal" title="執行測試" preset="card" style="width: 500px;">
      <n-form :model="testExecutionForm" ref="testExecutionFormRef">
        <n-form-item label="測試結果" path="result">
          <n-select v-model:value="testExecutionForm.result" :options="testResultOptions" />
        </n-form-item>
        <n-form-item label="實際結果" path="actualResult">
          <n-input v-model:value="testExecutionForm.actualResult" type="textarea" :rows="3" placeholder="請描述實際執行結果" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateTestExecution">確定</n-button>
            <n-button @click="showTestExecutionModal = false">取消</n-button>
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
import { NTag, NButton, NSpace, NAlert, NSelect, NTimeline, NTimelineItem } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { projectApi, phaseApi, requirementApi, taskApi, bugApi, userApi, requirementChangeApi, testCaseApi } from '../services/api';
import type { Project, ProjectPhase, Requirement, Task, Bug, User, RequirementChange, TestCase } from '../types';
import { useAuthStore } from '../stores/auth';
import { canCreateRequirement, canCreateTask, canCreateBug, canManageTestCase, isAdminOrPM } from '../utils/permissions';
import TaskBoard from '../components/TaskBoard.vue';

const route = useRoute();
const message = useMessage();
const authStore = useAuthStore();
const projectId = route.params.id as string;

const project = ref<Project | null>(null);
const phases = ref<ProjectPhase[]>([]);
const requirements = ref<Requirement[]>([]);
const tasks = ref<Task[]>([]);
const bugs = ref<Bug[]>([]);
const users = ref<User[]>([]);
const testCases = ref<TestCase[]>([]);
const requirementChanges = ref<RequirementChange[]>([]);
const selectedRequirementId = ref<string>('');
const activeTab = ref('requirements');
const submitting = ref(false);
const advancing = ref(false);

// Modals
const showReqModal = ref(false);
const showTaskModal = ref(false);
const showBugModal = ref(false);
const showReqChangesModal = ref(false);
const showTestCaseModal = ref(false);
const showTestExecutionModal = ref(false);
const showGitModal = ref(false);

// Form refs
const reqFormRef = ref();
const taskFormRef = ref();
const bugFormRef = ref();
const testCaseFormRef = ref();
const testExecutionFormRef = ref();
const gitFormRef = ref();

// 測試用例表單
const testCaseForm = ref({
  title: '',
  precondition: '',
  steps: '',
  expectedResult: '',
  requirementId: null as string | null,
});

// 測試執行表單
const testExecutionForm = ref<{
  testCaseId: string;
  result: 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED';
  actualResult: string;
}>({
  testCaseId: '',
  result: 'PASSED',
  actualResult: '',
});

const selectedTestCaseId = ref<string>('');
const selectedTaskIdForGit = ref<string>('');

// Git 表單
const gitForm = ref({
  gitBranch: '',
  gitCommit: '',
  gitPr: '',
});

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
  assigneeId: null as string | null,
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

const requirementStatusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '審核中', value: 'REVIEW' },
  { label: '已批准', value: 'APPROVED' },
  { label: '已拒絕', value: 'REJECTED' },
  { label: '已實現', value: 'IMPLEMENTED' },
];

const bugStatusOptions = [
  { label: '新建', value: 'NEW' },
  { label: '已確認', value: 'CONFIRMED' },
  { label: '處理中', value: 'IN_PROGRESS' },
  { label: '已解決', value: 'RESOLVED' },
  { label: '已關閉', value: 'CLOSED' },
  { label: '重新打開', value: 'REOPENED' },
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

const testCaseRules = {
  title: { required: true, message: '請輸入測試用例標題', trigger: 'blur' },
  steps: { required: true, message: '請輸入測試步驟', trigger: 'blur' },
  expectedResult: { required: true, message: '請輸入預期結果', trigger: 'blur' },
};

const testResultOptions = [
  { label: '通過', value: 'PASSED' },
  { label: '失敗', value: 'FAILED' },
  { label: '跳過', value: 'SKIPPED' },
  { label: '阻塞', value: 'BLOCKED' },
];

// 狀態顯示
const statusMap: Record<string, { text: string; type: string }> = {
  ACTIVE: { text: '進行中', type: 'info' },
  COMPLETED: { text: '已完成', type: 'success' },
  PLANNING: { text: '規劃中', type: 'warning' },
};

const userRole = computed(() => authStore.user?.role);
const canCreateReq = computed(() => canCreateRequirement(userRole.value));
const canCreateTaskComputed = computed(() => canCreateTask(userRole.value));
const canCreateBugComputed = computed(() => canCreateBug(userRole.value));
const canManageTest = computed(() => canManageTestCase(userRole.value));
const isAdminOrPMComputed = computed(() => isAdminOrPM(userRole.value));

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
    width: 140,
    render: (row) =>
      h(NSelect, {
        size: 'small',
        value: row.status,
        options: requirementStatusOptions,
        onUpdateValue: (value: string) => handleUpdateRequirementStatus(row.id, value),
      }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) =>
      h(NButton, { size: 'tiny', text: true, onClick: () => openReqChanges(row.id) }, { default: () => '變更歷史' }),
  },
];

const bugColumns: DataTableColumns<Bug> = [
  { title: '編號', key: 'bugCode' },
  { title: '標題', key: 'title' },
  { title: '嚴重程度', key: 'severity' },
  { title: '優先級', key: 'priority' },
  {
    title: '狀態',
    key: 'status',
    width: 140,
    render: (row) =>
      h(NSelect, {
        size: 'small',
        value: row.status,
        options: bugStatusOptions,
        onUpdateValue: (value: string) => handleUpdateBugStatus(row.id, value),
      }),
  },
  {
    title: '指派人',
    key: 'assignee',
    render: (row) => {
      if (isAdminOrPMComputed.value) {
        return h(NSelect, {
          size: 'small',
          value: row.assigneeId || null,
          options: [{ label: '未指派', value: undefined }, ...userOptions.value],
          onUpdateValue: (value: string | null) => handleAssignBug(row.id, value),
        });
      }
      return row.assignee?.name || '未指派';
    },
  },
];

const testCaseColumns: DataTableColumns<TestCase> = [
  { title: '編號', key: 'tcCode' },
  { title: '標題', key: 'title' },
  {
    title: '最後結果',
    key: 'lastResult',
    width: 100,
    render: (row) => {
      const last = row.executions?.[0];
      if (!last) return h(NTag, { size: 'small', type: 'default' }, { default: () => '未執行' });
      const resultMap: Record<string, { text: string; type: string }> = {
        PASSED: { text: '通過', type: 'success' },
        FAILED: { text: '失敗', type: 'error' },
        SKIPPED: { text: '跳過', type: 'warning' },
        BLOCKED: { text: '阻塞', type: 'warning' },
      };
      const r = resultMap[last.result] || { text: last.result, type: 'default' };
      return h(NTag, { size: 'small', type: r.type as any }, { default: () => r.text });
    },
  },
  {
    title: '關聯需求',
    key: 'requirement',
    render: (row) => row.requirement?.reqCode || '-',
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) => {
      if (!canManageTest.value) return '-';
      return h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'tiny', type: 'primary', onClick: () => openTestExecution(row.id) }, { default: () => '執行' }),
          h(NButton, { size: 'tiny', type: 'error', text: true, onClick: () => handleDeleteTestCase(row.id) }, { default: () => '刪除' }),
        ],
      });
    },
  },
];

// 載入資料
async function loadData() {
  try {
    const [projRes, phaseRes, reqRes, taskRes, bugRes, userRes, tcRes] = await Promise.all([
      projectApi.get(projectId),
      phaseApi.getAll(projectId),
      requirementApi.getAll(projectId),
      taskApi.getAll(projectId),
      bugApi.getAll(projectId),
      userApi.getAll(),
      testCaseApi.getAll(projectId),
    ]);
    project.value = projRes.data;
    phases.value = phaseRes.data;
    requirements.value = reqRes.data;
    tasks.value = taskRes.data;
    bugs.value = bugRes.data;
    users.value = userRes.data;
    testCases.value = tcRes.data;
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

// 開啟測試用例 Modal
function openTestCaseModal() {
  testCaseForm.value = {
    title: '',
    precondition: '',
    steps: '',
    expectedResult: '',
    requirementId: null,
  };
  showTestCaseModal.value = true;
}

// 開啟測試執行 Modal
function openTestExecution(testCaseId: string) {
  selectedTestCaseId.value = testCaseId;
  testExecutionForm.value = {
    testCaseId,
    result: 'PASSED',
    actualResult: '',
  };
  showTestExecutionModal.value = true;
}

// 新增測試用例
async function handleCreateTestCase() {
  try {
    await testCaseFormRef.value?.validate();
    submitting.value = true;
    const data = {
      ...testCaseForm.value,
      requirementId: testCaseForm.value.requirementId || undefined,
    };
    await testCaseApi.create(projectId, data);
    message.success('測試用例建立成功');
    showTestCaseModal.value = false;
    const res = await testCaseApi.getAll(projectId);
    testCases.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

// 執行測試
async function handleCreateTestExecution() {
  try {
    submitting.value = true;
    await testCaseApi.createExecution(projectId, selectedTestCaseId.value, testExecutionForm.value);
    message.success('測試執行記錄已儲存');
    showTestExecutionModal.value = false;
    const res = await testCaseApi.getAll(projectId);
    testCases.value = res.data;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '執行失敗');
  } finally {
    submitting.value = false;
  }
}

// 刪除測試用例
async function handleDeleteTestCase(id: string) {
  try {
    await testCaseApi.delete(projectId, id);
    message.success('測試用例已刪除');
    const res = await testCaseApi.getAll(projectId);
    testCases.value = res.data;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '刪除失敗');
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
    assigneeId: null,
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
      assigneeId: bugForm.value.assigneeId || undefined,
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

// 更新需求狀態
async function handleUpdateRequirementStatus(id: string, status: string) {
  try {
    await requirementApi.update(projectId, id, { status });
    message.success('需求狀態已更新');
    const res = await requirementApi.getAll(projectId);
    requirements.value = res.data;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '更新失敗');
  }
}

// 更新 Bug 狀態
async function handleUpdateBugStatus(id: string, status: string) {
  try {
    await bugApi.update(projectId, id, { status });
    message.success('Bug 狀態已更新');
    const res = await bugApi.getAll(projectId);
    bugs.value = res.data;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '更新失敗');
  }
}

// 指派 Bug
async function handleAssignBug(id: string, assigneeId: string | null) {
  try {
    await bugApi.update(projectId, id, { assigneeId: assigneeId || undefined });
    message.success(assigneeId ? '指派成功' : '已取消指派');
    const res = await bugApi.getAll(projectId);
    bugs.value = res.data;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '指派失敗');
  }
}

// 指派任務（看板）
async function handleAssignTask(taskId: string, assigneeId: string | null) {
  try {
    await taskApi.update(projectId, taskId, { assigneeId: assigneeId || undefined });
    message.success(assigneeId ? '指派成功' : '已取消指派');
    const res = await taskApi.getAll(projectId);
    tasks.value = res.data;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '指派失敗');
  }
}

// 開啟 Git 編輯 Modal
function openGitEditModal(taskId: string) {
  selectedTaskIdForGit.value = taskId;
  const task = tasks.value.find((t) => t.id === taskId);
  gitForm.value = {
    gitBranch: task?.gitBranch || '',
    gitCommit: task?.gitCommit || '',
    gitPr: task?.gitPr || '',
  };
  showGitModal.value = true;
}

// 更新 Git 資訊
async function handleUpdateGit() {
  try {
    submitting.value = true;
    const data = {
      gitBranch: gitForm.value.gitBranch || undefined,
      gitCommit: gitForm.value.gitCommit || undefined,
      gitPr: gitForm.value.gitPr || undefined,
    };
    await taskApi.update(projectId, selectedTaskIdForGit.value, data);
    message.success('程式碼關聯已更新');
    showGitModal.value = false;
    const res = await taskApi.getAll(projectId);
    tasks.value = res.data;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '更新失敗');
  } finally {
    submitting.value = false;
  }
}

// 開啟需求變更歷史
async function openReqChanges(requirementId: string) {
  selectedRequirementId.value = requirementId;
  showReqChangesModal.value = true;
  await loadRequirementChanges(requirementId);
}

// 載入需求變更歷史
async function loadRequirementChanges(requirementId: string) {
  try {
    const res = await requirementChangeApi.getAll(projectId, requirementId);
    requirementChanges.value = res.data;
  } catch (error: any) {
    message.error('載入變更歷史失敗');
  }
}

// 變更類型顯示
function changeTypeLabel(type: string): string {
  const map: Record<string, string> = {
    STATUS: '狀態變更',
    TITLE: '標題變更',
    DESCRIPTION: '描述變更',
    PRIORITY: '優先級變更',
    TYPE: '類型變更',
  };
  return map[type] || type;
}

function changeTypeColor(type: string): any {
  const map: Record<string, string> = {
    STATUS: 'info',
    TITLE: 'warning',
    DESCRIPTION: 'default',
    PRIORITY: 'error',
    TYPE: 'success',
  };
  return map[type] || 'default';
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
