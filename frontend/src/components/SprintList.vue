<template>
  <div>
    <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <n-radio-group v-model:value="filterStatus" size="small">
        <n-radio-button value="ALL">全部</n-radio-button>
        <n-radio-button value="PLANNING">規劃中</n-radio-button>
        <n-radio-button value="ACTIVE">進行中</n-radio-button>
        <n-radio-button value="COMPLETED">已完成</n-radio-button>
      </n-radio-group>
      <n-button v-if="canManage" type="primary" size="small" @click="openCreateModal">+ 新增 Sprint</n-button>
    </div>

    <div v-if="loading" style="text-align: center; padding: 40px;">
      <n-spin size="medium" />
    </div>
    <n-empty v-else-if="filteredSprints.length === 0" description="暫無 Sprint" />
    <div v-else class="sprint-list">
      <div
        v-for="sprint in filteredSprints"
        :key="sprint.id"
        class="sprint-card"
        :class="{ active: sprint.status === 'ACTIVE' }"
      >
        <div class="sprint-header">
          <div class="sprint-title-row">
            <h4 class="sprint-name">{{ sprint.name }}</h4>
            <n-tag :type="statusType(sprint.status)" size="small">{{ statusLabel(sprint.status) }}</n-tag>
          </div>
          <div class="sprint-dates">
            {{ formatDate(sprint.startDate) }} ~ {{ formatDate(sprint.endDate) }}
          </div>
          <div v-if="sprint.goal" class="sprint-goal">{{ sprint.goal }}</div>
        </div>

        <div class="sprint-stats">
          <div class="stat-item">
            <div class="stat-value">{{ sprint.stats?.totalTasks || 0 }}</div>
            <div class="stat-label">任務</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ sprint.stats?.doneTasks || 0 }}</div>
            <div class="stat-label">完成</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ sprint.stats?.progress || 0 }}%</div>
            <div class="stat-label">進度</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ sprint.stats?.totalHours || 0 }}h</div>
            <div class="stat-label">預估</div>
          </div>
        </div>

        <n-progress
          :percentage="sprint.stats?.progress || 0"
          :show-indicator="false"
          :height="6"
          :border-radius="3"
          :color="sprint.status === 'ACTIVE' ? '#3b82f6' : '#22c55e'"
          style="margin: 12px 0;"
        />

        <div class="sprint-actions">
          <n-button size="tiny" text @click="viewBurndown(sprint)">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </template>
            燃盡圖
          </n-button>
          <n-button size="tiny" text @click="viewSprintBoard(sprint)">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </template>
            看板
          </n-button>
          <template v-if="canManage">
            <n-button v-if="sprint.status === 'PLANNING'" size="tiny" text type="primary" @click="startSprint(sprint.id)">開始</n-button>
            <n-button v-if="sprint.status === 'ACTIVE'" size="tiny" text type="success" @click="completeSprint(sprint.id)">完成</n-button>
            <n-button size="tiny" text type="error" @click="deleteSprint(sprint.id)">刪除</n-button>
          </template>
        </div>
      </div>
    </div>

    <!-- 創建 Sprint Modal -->
    <n-modal v-model:show="showCreateModal" title="新增 Sprint" preset="card" style="width: 500px;">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item label="名稱" path="name">
          <n-input v-model:value="form.name" placeholder="例如：Sprint 1" />
        </n-form-item>
        <n-form-item label="目標" path="goal">
          <n-input v-model:value="form.goal" type="textarea" :rows="2" placeholder="Sprint 目標描述" />
        </n-form-item>
        <n-form-item label="開始日期" path="startDate">
          <n-date-picker v-model:formatted-value="form.startDate" value-format="yyyy-MM-dd" type="date" style="width: 100%;" />
        </n-form-item>
        <n-form-item label="結束日期" path="endDate">
          <n-date-picker v-model:formatted-value="form.endDate" value-format="yyyy-MM-dd" type="date" style="width: 100%;" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreate">確定</n-button>
            <n-button @click="showCreateModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 燃盡圖 Modal -->
    <n-modal v-model:show="showBurndownModal" :title="`${selectedSprint?.name} - 燃盡圖`" preset="card" style="width: 800px;">
      <div v-if="burndownLoading" style="text-align: center; padding: 40px;">
        <n-spin />
      </div>
      <div v-else-if="burndownData.length > 0">
        <div ref="burndownChart" style="width: 100%; height: 400px;"></div>
        <div style="display: flex; gap: 24px; justify-content: center; margin-top: 16px;">
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: 600; color: #1e293b;">{{ selectedSprint?.stats?.totalHours || 0 }}h</div>
            <div style="font-size: 12px; color: #94a3b8;">總預估工時</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: 600; color: #1e293b;">{{ selectedSprint?.stats?.actualHours || 0 }}h</div>
            <div style="font-size: 12px; color: #94a3b8;">實際工時</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: 600; color: #1e293b;">{{ selectedSprint?.stats?.doneTasks || 0 }}/{{ selectedSprint?.stats?.totalTasks || 0 }}</div>
            <div style="font-size: 12px; color: #94a3b8;">任務完成</div>
          </div>
        </div>
      </div>
      <n-empty v-else description="暫無數據" />
    </n-modal>

    <!-- Sprint 看板 Modal -->
    <n-modal v-model:show="showBoardModal" :title="`${selectedSprint?.name} - Sprint 看板`" preset="card" style="width: 900px;">
      <SprintBoard
        v-if="selectedSprint"
        :sprint="selectedSprint"
        :project-id="projectId"
        :all-tasks="allTasks"
        @refresh="loadSprints"
      />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useMessage, NButton, NTag, NSpin, NEmpty, NProgress, NForm, NFormItem, NInput, NModal, NDatePicker, NSpace, NRadioGroup, NRadioButton } from 'naive-ui';
import { sprintApi, taskApi } from '../services/api';
import type { Sprint, Task } from '../types';
import SprintBoard from './SprintBoard.vue';
import * as echarts from 'echarts';

const props = defineProps<{
  projectId: string;
  canManage?: boolean;
}>();

const message = useMessage();
const loading = ref(false);
const submitting = ref(false);
const sprints = ref<Sprint[]>([]);
const allTasks = ref<Task[]>([]);
const filterStatus = ref('ALL');
const showCreateModal = ref(false);
const showBurndownModal = ref(false);
const showBoardModal = ref(false);
const selectedSprint = ref<Sprint | null>(null);
const burndownData = ref<any[]>([]);
const burndownLoading = ref(false);
const burndownChart = ref<HTMLElement | null>(null);
const formRef = ref();

const form = ref({
  name: '',
  goal: '',
  startDate: null as string | null,
  endDate: null as string | null,
});

const rules = {
  name: { required: true, message: '請輸入 Sprint 名稱', trigger: 'blur' },
  startDate: { required: true, message: '請選擇開始日期', trigger: 'change' },
  endDate: { required: true, message: '請選擇結束日期', trigger: 'change' },
};

const filteredSprints = computed(() => {
  if (filterStatus.value === 'ALL') return sprints.value;
  return sprints.value.filter((s) => s.status === filterStatus.value);
});

function statusType(status: string) {
  const map: Record<string, string> = {
    PLANNING: 'default',
    ACTIVE: 'info',
    COMPLETED: 'success',
  };
  return map[status] || 'default';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PLANNING: '規劃中',
    ACTIVE: '進行中',
    COMPLETED: '已完成',
  };
  return map[status] || status;
}

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString('zh-TW') : '-';
}

async function loadSprints() {
  loading.value = true;
  try {
    const [sprintRes, taskRes] = await Promise.all([
      sprintApi.getAll(props.projectId),
      taskApi.getAll(props.projectId),
    ]);
    sprints.value = sprintRes.data.sprints || [];
    allTasks.value = taskRes.data || [];
  } catch (err: any) {
    message.error('載入 Sprint 失敗');
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  form.value = { name: '', goal: '', startDate: null, endDate: null };
  showCreateModal.value = true;
}

async function handleCreate() {
  try {
    await formRef.value?.validate();
    submitting.value = true;
    await sprintApi.create(props.projectId, form.value);
    message.success('Sprint 創建成功');
    showCreateModal.value = false;
    loadSprints();
  } catch (err: any) {
    if (err?.response?.data?.error) {
      message.error(err.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

async function startSprint(id: string) {
  try {
    await sprintApi.update(props.projectId, id, { status: 'ACTIVE' });
    message.success('Sprint 已開始');
    loadSprints();
  } catch (err: any) {
    message.error(err?.response?.data?.error || '操作失敗');
  }
}

async function completeSprint(id: string) {
  try {
    await sprintApi.update(props.projectId, id, { status: 'COMPLETED' });
    message.success('Sprint 已完成');
    loadSprints();
  } catch (err: any) {
    message.error(err?.response?.data?.error || '操作失敗');
  }
}

async function deleteSprint(id: string) {
  try {
    await sprintApi.delete(props.projectId, id);
    message.success('Sprint 已刪除');
    loadSprints();
  } catch (err: any) {
    message.error(err?.response?.data?.error || '刪除失敗');
  }
}

async function viewBurndown(sprint: Sprint) {
  selectedSprint.value = sprint;
  showBurndownModal.value = true;
  burndownLoading.value = true;
  try {
    const res = await sprintApi.getBurndown(props.projectId, sprint.id);
    burndownData.value = res.data.data || [];
    nextTick(() => renderBurndownChart(res.data.data));
  } catch (err: any) {
    message.error('載入燃盡圖失敗');
  } finally {
    burndownLoading.value = false;
  }
}

function renderBurndownChart(data: any[]) {
  if (!burndownChart.value) return;
  const chart = echarts.init(burndownChart.value);
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['實際剩餘', '理想線'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map((d) => d.date.slice(5)), boundaryGap: false },
    yAxis: { type: 'value', name: '工時' },
    series: [
      {
        name: '實際剩餘',
        type: 'line',
        data: data.map((d) => d.remaining),
        smooth: true,
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.1)' },
      },
      {
        name: '理想線',
        type: 'line',
        data: data.map((d) => d.ideal),
        lineStyle: { color: '#94a3b8', width: 2, type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
      },
    ],
  });
}

function viewSprintBoard(sprint: Sprint) {
  selectedSprint.value = sprint;
  showBoardModal.value = true;
}

watch(() => props.projectId, loadSprints, { immediate: true });
</script>

<style scoped>
.sprint-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.sprint-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.sprint-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.sprint-card.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #3b82f620;
}
.sprint-header {
  margin-bottom: 12px;
}
.sprint-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.sprint-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}
.sprint-dates {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}
.sprint-goal {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}
.sprint-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}
.stat-item {
  text-align: center;
  flex: 1;
}
.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}
.stat-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.sprint-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}
</style>
