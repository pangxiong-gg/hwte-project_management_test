<template>
  <div>
    <!-- Page Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <n-h2 style="margin: 0;">資源負載</n-h2>
        <n-text style="font-size: 14px; color: #64748b;">團隊成員工作分配與負載監控</n-text>
      </div>
      <div style="display: flex; gap: 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <n-button :type="viewMode === 'cards' ? 'primary' : 'default'" size="small" @click="viewMode = 'cards'">卡片</n-button>
        <n-button :type="viewMode === 'chart' ? 'primary' : 'default'" size="small" @click="viewMode = 'chart'">圖表</n-button>
        <n-button :type="viewMode === 'timeline' ? 'primary' : 'default'" size="small" @click="viewMode = 'timeline'">時間軸</n-button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
      <n-card size="small">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <IconSvg name="list" :size="18" color="#64748b" />
          <span style="font-size: 13px; color: #64748b;">團隊總任務</span>
        </div>
        <div style="font-size: 28px; font-weight: 600; color: #1e293b;">{{ summary.totalActiveTasks }}</div>
      </n-card>
      <n-card size="small">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <IconSvg name="layout-grid" :size="18" color="#64748b" />
          <span style="font-size: 13px; color: #64748b;">平均負載</span>
        </div>
        <div style="font-size: 28px; font-weight: 600; color: #1e293b;">{{ summary.averageLoad }}%</div>
      </n-card>
      <n-card size="small">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <IconSvg name="alert-triangle" :size="18" color="#ef4444" />
          <span style="font-size: 13px; color: #64748b;">超載人數</span>
        </div>
        <div style="font-size: 28px; font-weight: 600; color: #1e293b;">{{ summary.overloadedCount }}</div>
      </n-card>
      <n-card size="small">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <IconSvg name="tag" :size="18" color="#f59e0b" />
          <span style="font-size: 13px; color: #64748b;">未指派任務</span>
        </div>
        <div style="font-size: 28px; font-weight: 600; color: #1e293b;">{{ summary.unassignedCount }}</div>
      </n-card>
    </div>

    <!-- Alerts -->
    <n-alert v-if="overloadedMembers.length > 0" type="error" style="margin-bottom: 16px;">
      <span v-for="(m, i) in overloadedMembers.slice(0, 2)" :key="m.id">
        <n-text strong>{{ m.name }}</n-text>
        <n-text type="error">（{{ m.loadPercentage }}% 超載 · {{ m.overdueCount }} 個逾期）</n-text>
        <n-text v-if="i < Math.min(overloadedMembers.length, 2) - 1">、</n-text>
      </span>
      <n-text v-if="overloadedMembers.length > 2">等 {{ overloadedMembers.length }} 人超載</n-text>
    </n-alert>
    <n-alert v-else-if="warningMembers.length > 0" type="warning" style="margin-bottom: 16px;">
      <span v-for="(m, i) in warningMembers.slice(0, 2)" :key="m.id">
        <n-text strong>{{ m.name }}</n-text>
        <n-text type="warning">（{{ m.loadPercentage }}% 接近滿載）</n-text>
        <n-text v-if="i < Math.min(warningMembers.length, 2) - 1">、</n-text>
      </span>
      <n-text v-if="warningMembers.length > 2">等 {{ warningMembers.length }} 人接近滿載</n-text>
    </n-alert>

    <!-- Member Cards View -->
    <div v-if="viewMode === 'cards'" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
      <div v-for="m in members" :key="m.id" class="member-card" :class="{ overload: m.isOverloaded }">
        <div class="member-header">
          <div class="member-avatar">{{ m.name.charAt(0) }}</div>
          <div class="member-info">
            <div class="member-name">{{ m.name }}</div>
            <div class="member-role">{{ m.role }}</div>
          </div>
          <div class="load-indicator" :class="getLoadClass(m.loadPercentage)">
            {{ m.loadPercentage }}%
          </div>
        </div>
        <div class="member-stats">
          <div class="mini-stat">
            <div class="mini-stat-value" :style="{ color: m.todoCount > 0 ? '#f59e0b' : '#94a3b8' }">{{ m.todoCount }}</div>
            <div class="mini-stat-label">待辦</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value" style="color: #3b82f6;">{{ m.inProgressCount }}</div>
            <div class="mini-stat-label">進行中</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value">{{ m.plannedHours }}h</div>
            <div class="mini-stat-label">預估工時</div>
          </div>
        </div>
        <div class="task-chips">
          <span v-for="t in m.tasks.slice(0, 3)" :key="t.id" class="task-chip" :class="{ overdue: t.isOverdue }">
            {{ t.taskCode }}
          </span>
          <span v-if="m.tasks.length > 3" class="task-chip" style="background: #f1f5f9; color: #64748b;">+{{ m.tasks.length - 3 }}</span>
        </div>
        <div class="hours-bar">
          <div class="hours-bar-label">
            <span>工時負載</span>
            <span :style="{ color: m.isOverloaded ? '#ef4444' : m.isWarning ? '#f59e0b' : '#10b981' }">
              {{ m.actualHours }}h / {{ m.plannedHours }}h
            </span>
          </div>
          <div class="hours-track">
            <div class="hours-fill" :class="getLoadClass(m.loadPercentage)" :style="{ width: Math.min(m.loadPercentage, 100) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Unassigned Card -->
      <div v-if="unassigned.length > 0" class="member-card unassigned">
        <div class="member-header">
          <div class="member-avatar" style="background: #94a3b8;">?</div>
          <div class="member-info">
            <div class="member-name">未指派任務</div>
            <div class="member-role">待分配</div>
          </div>
          <div class="load-indicator" style="background: #f1f5f9; color: #64748b;">{{ unassigned.length }}</div>
        </div>
        <div class="task-chips">
          <span v-for="t in unassigned.slice(0, 4)" :key="t.id" class="task-chip">{{ t.taskCode }}</span>
          <span v-if="unassigned.length > 4" class="task-chip" style="background: #f1f5f9; color: #64748b;">+{{ unassigned.length - 4 }}</span>
        </div>
      </div>
    </div>

    <!-- Chart View -->
    <div v-else class="chart-container">
      <div class="chart-title">預估工時 vs 標準容量（40h/周）</div>
      <div class="bar-chart">
        <div v-for="m in members" :key="m.id" class="bar-row">
          <div class="bar-label">{{ m.name }}</div>
          <div class="bar-track">
            <div class="bar-fill" :class="getLoadClass(m.loadPercentage)" :style="{ width: Math.min(m.loadPercentage, 100) + '%' }">
              {{ m.plannedHours }}h
            </div>
          </div>
          <div class="bar-value" :style="{ color: m.isOverloaded ? '#ef4444' : m.isWarning ? '#f59e0b' : '#10b981' }">
            {{ m.loadPercentage }}%
          </div>
          <div class="bar-detail">{{ m.totalTasks }} 任務 · {{ m.overdueCount }} 逾期</div>
        </div>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background: #10b981;"></div>正常 (&lt;80%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: #f59e0b;"></div>警告 (80-100%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: #ef4444;"></div>超載 (&gt;100%)</div>
      </div>
    </div>

    <!-- Timeline View -->
    <div v-else class="timeline-container">
      <div class="timeline-header">
        <div class="timeline-member-col">成員</div>
        <div class="timeline-dates">
          <div
            v-for="(date, idx) in timelineDates"
            :key="idx"
            class="timeline-date-cell"
            :class="{ today: date.isToday }"
          >
            <div class="timeline-date-day">{{ date.day }}</div>
            <div v-if="date.isToday" class="timeline-date-today">今天</div>
          </div>
        </div>
      </div>
      <div class="timeline-body">
        <div v-for="m in members" :key="m.id" class="timeline-row">
          <div class="timeline-member-info">
            <div class="timeline-avatar">{{ m.name.charAt(0) }}</div>
            <div class="timeline-member-detail">
              <div class="timeline-member-name">{{ m.name }}</div>
              <div class="timeline-member-load" :class="{ overload: m.isOverloaded, warning: m.isWarning }">
                {{ m.plannedHours }}h / 40h
                <span v-if="m.isOverloaded"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><triangle points="12 2 22 22 2 22"/></svg></span>
                <span v-else-if="m.isWarning"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><zap points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg></span>
                <span v-else><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>
              </div>
            </div>
          </div>
          <div class="timeline-track">
            <div
              v-for="task in getTimelineTasks(m.tasks)"
              :key="task.id"
              class="timeline-task-bar"
              :style="{
                left: task.left + '%',
                width: task.width + '%',
                backgroundColor: task.color,
              }"
              :title="task.title"
            >
              <span class="timeline-task-text">{{ task.taskCode }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Unassigned Tasks Table -->
    <n-card v-if="unassigned.length > 0" title="未指派任務" size="small" style="margin-top: 20px;">
      <n-data-table :columns="unassignedColumns" :data="unassigned" size="small" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { NAlert, NButton, NCard, NDataTable, NH2, NText } from 'naive-ui';
import IconSvg from '../components/IconSvg.vue';
import { resourceLoadApi } from '../services/api';

const message = useMessage();

interface MemberTask {
  id: string;
  taskCode: string;
  title: string;
  status: string;
  priority: string;
  plannedHours: number | null;
  actualHours: number | null;
  dueDate: string | null;
  startedAt: string | null;
  isOverdue: boolean;
  projectName: string;
  projectId: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
  totalTasks: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  overdueCount: number;
  plannedHours: number;
  actualHours: number;
  loadPercentage: number;
  isOverloaded: boolean;
  isWarning: boolean;
  tasks: MemberTask[];
}

interface Summary {
  totalMembers: number;
  totalActiveTasks: number;
  averageLoad: number;
  overloadedCount: number;
  warningCount: number;
  unassignedCount: number;
}

const members = ref<Member[]>([]);
const unassigned = ref<any[]>([]);
const summary = ref<Summary>({ totalMembers: 0, totalActiveTasks: 0, averageLoad: 0, overloadedCount: 0, warningCount: 0, unassignedCount: 0 });
const loading = ref(false);
const viewMode = ref<'cards' | 'chart' | 'timeline'>('cards');

const overloadedMembers = computed(() => members.value.filter((m) => m.isOverloaded));
const warningMembers = computed(() => members.value.filter((m) => m.isWarning));

function getLoadClass(pct: number): string {
  if (pct > 100) return 'danger';
  if (pct >= 80) return 'warning';
  return 'normal';
}

// 時間軸：從今天開始的 14 天
const TIMELINE_DAYS = 14;
const timelineStart = computed(() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
});
const timelineEnd = computed(() => {
  const d = new Date(timelineStart.value);
  d.setDate(d.getDate() + TIMELINE_DAYS - 1);
  d.setHours(23, 59, 59, 999);
  return d;
});

const timelineDates = computed(() => {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < TIMELINE_DAYS; i++) {
    const d = new Date(timelineStart.value);
    d.setDate(d.getDate() + i);
    const isToday = d.getTime() === today.getTime();
    dates.push({
      day: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      isToday,
    });
  }
  return dates;
});

function getTimelineTasks(tasks: MemberTask[]) {
  const colors: Record<string, string> = {
    TODO: '#94a3b8',
    IN_PROGRESS: '#3b82f6',
    CODE_REVIEW: '#8b5cf6',
    TESTING: '#f59e0b',
    DONE: '#22c55e',
  };
  return tasks
    .filter((t) => t.status !== 'DONE')
    .map((t) => {
      const start = t.startedAt ? new Date(t.startedAt) : new Date();
      const end = t.dueDate ? new Date(t.dueDate) : new Date(start.getTime() + 86400000);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const totalMs = timelineEnd.value.getTime() - timelineStart.value.getTime();
      let leftMs = start.getTime() - timelineStart.value.getTime();
      let widthMs = end.getTime() - start.getTime();

      // 裁剪到時間軸範圍
      if (leftMs < 0) {
        widthMs += leftMs;
        leftMs = 0;
      }
      if (leftMs + widthMs > totalMs) {
        widthMs = totalMs - leftMs;
      }
      if (widthMs < 0) widthMs = 0;

      const left = (leftMs / totalMs) * 100;
      const width = Math.max((widthMs / totalMs) * 100, 2); // 最小 2%

      return {
        id: t.id,
        taskCode: t.taskCode,
        title: `${t.taskCode}: ${t.title} (${t.projectName})`,
        left,
        width,
        color: colors[t.status] || '#64748b',
      };
    })
    .filter((t) => t.width > 0);
}

const unassignedColumns = [
  { title: '任務代碼', key: 'taskCode', width: 120 },
  { title: '標題', key: 'title' },
  { title: '優先級', key: 'priority', width: 80 },
  { title: '專案', key: 'projectName', width: 150 },
  { title: '預估工時', key: 'plannedHours', width: 100, render(row: any) { return row.plannedHours ? `${row.plannedHours}h` : '-'; } },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await resourceLoadApi.getAll();
    members.value = res.data.members || [];
    unassigned.value = res.data.unassigned || [];
    summary.value = res.data.summary || { totalMembers: 0, totalActiveTasks: 0, averageLoad: 0, overloadedCount: 0, warningCount: 0, unassignedCount: 0 };
  } catch (err: any) {
    message.error('載入失敗：' + (err.response?.data?.error || err.message));
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.member-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  transition: box-shadow 0.15s;
}
.member-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.member-card.overload { border-color: #fca5a5; }
.member-card.unassigned { border-style: dashed; opacity: 0.8; }

.member-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.member-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #1a1a2e;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}
.member-info { flex: 1; }
.member-name { font-weight: 600; font-size: 15px; }
.member-role { font-size: 12px; color: #64748b; }

.load-indicator {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}
.load-indicator.normal { background: #d1fae5; color: #065f46; }
.load-indicator.warning { background: #fef3c7; color: #92400e; }
.load-indicator.danger { background: #fee2e2; color: #991b1b; }

.member-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.mini-stat {
  text-align: center;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
}
.mini-stat-value { font-size: 18px; font-weight: 600; }
.mini-stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }

.task-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.task-chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: #e0e7ff;
  color: #4338ca;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-chip.overdue { background: #fee2e2; color: #991b1b; }

.hours-bar { margin-top: 12px; }
.hours-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}
.hours-track {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.hours-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.hours-fill.normal { background: #10b981; }
.hours-fill.warning { background: #f59e0b; }
.hours-fill.danger { background: #ef4444; }

.chart-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 24px;
}
.chart-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
.bar-chart { display: flex; flex-direction: column; gap: 16px; }
.bar-row { display: flex; align-items: center; gap: 16px; }
.bar-label { width: 100px; text-align: right; font-size: 13px; font-weight: 500; }
.bar-track {
  flex: 1;
  height: 28px;
  background: #f1f5f9;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.bar-fill {
  height: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding-left: 10px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  transition: width 0.5s ease;
}
.bar-fill.normal { background: #10b981; }
.bar-fill.warning { background: #f59e0b; }
.bar-fill.danger { background: #ef4444; }
.bar-value { width: 60px; font-size: 13px; font-weight: 600; }
.bar-detail { font-size: 12px; color: #64748b; width: 120px; }
.legend {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  justify-content: center;
}
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; }

/* Timeline View */
.timeline-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.timeline-header {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.timeline-member-col {
  width: 180px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-right: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.timeline-dates {
  display: flex;
  flex: 1;
}
.timeline-date-cell {
  flex: 1;
  padding: 8px 2px;
  text-align: center;
  border-right: 1px solid #e2e8f0;
  font-size: 11px;
  color: #94a3b8;
  min-width: 36px;
}
.timeline-date-cell.today {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 600;
}
.timeline-date-cell:last-child {
  border-right: none;
}
.timeline-date-today {
  font-size: 10px;
  color: #3b82f6;
}

.timeline-body {
  display: flex;
  flex-direction: column;
}
.timeline-row {
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  min-height: 56px;
  align-items: center;
}
.timeline-row:last-child {
  border-bottom: none;
}
.timeline-member-info {
  width: 180px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-right: 1px solid #f1f5f9;
  flex-shrink: 0;
}
.timeline-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1a1a2e;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}
.timeline-member-detail {
  flex: 1;
  min-width: 0;
}
.timeline-member-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}
.timeline-member-load {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}
.timeline-member-load.overload {
  color: #ef4444;
}
.timeline-member-load.warning {
  color: #f59e0b;
}

.timeline-track {
  flex: 1;
  position: relative;
  height: 40px;
  margin: 0 8px;
}
.timeline-task-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  color: white;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.timeline-task-bar:hover {
  opacity: 0.9;
  transform: translateY(-50%) scale(1.02);
  z-index: 10;
}
.timeline-task-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
