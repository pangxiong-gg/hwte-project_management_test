<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">資源負載</h1>
        <p class="page-subtitle">團隊成員工作分配與負載監控</p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="bento-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap">
          <IconSvg name="list" :size="20" color="var(--accent-blue)" />
        </div>
        <div>
          <div class="stat-label">團隊總任務</div>
          <div class="stat-value">{{ summary.totalActiveTasks }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap" style="background: linear-gradient(135deg, rgba(79,106,245,0.15), rgba(139,92,246,0.15)); color: var(--accent-blue);">
          <IconSvg name="layout-grid" :size="20" color="var(--accent-blue)" />
        </div>
        <div>
          <div class="stat-label">平均負載</div>
          <div class="stat-value" style="color: var(--accent-blue);">{{ summary.averageLoad }}%</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap red">
          <IconSvg name="alert-triangle" :size="20" color="var(--danger)" />
        </div>
        <div>
          <div class="stat-label">超載人數</div>
          <div class="stat-value" style="color: var(--danger);">{{ summary.overloadedCount }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap yellow">
          <IconSvg name="tag" :size="20" color="var(--warning)" />
        </div>
        <div>
          <div class="stat-label">未指派任務</div>
          <div class="stat-value" style="color: var(--warning);">{{ summary.unassignedCount }}</div>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <n-alert v-if="overloadedMembers.length > 0" type="error" style="margin-bottom: 20px;">
      <span v-for="(m, i) in overloadedMembers.slice(0, 2)" :key="m.id">
        <n-text strong>{{ m.name }}</n-text>
        <n-text type="error">（{{ m.loadPercentage }}% 超載 · {{ m.overdueCount }} 個逾期）</n-text>
        <n-text v-if="i < Math.min(overloadedMembers.length, 2) - 1">、</n-text>
      </span>
      <n-text v-if="overloadedMembers.length > 2">等 {{ overloadedMembers.length }} 人超載</n-text>
    </n-alert>
    <n-alert v-else-if="warningMembers.length > 0" type="warning" style="margin-bottom: 20px;">
      <span v-for="(m, i) in warningMembers.slice(0, 2)" :key="m.id">
        <n-text strong>{{ m.name }}</n-text>
        <n-text type="warning">（{{ m.loadPercentage }}% 接近滿載）</n-text>
        <n-text v-if="i < Math.min(warningMembers.length, 2) - 1">、</n-text>
      </span>
      <n-text v-if="warningMembers.length > 2">等 {{ warningMembers.length }} 人接近滿載</n-text>
    </n-alert>

    <!-- View Toggle -->
    <div class="glass-tabs" style="margin-bottom: 24px;">
      <button :class="['glass-tab', { active: viewMode === 'cards' }]" @click="viewMode = 'cards'">成員卡片</button>
      <button :class="['glass-tab', { active: viewMode === 'timeline' }]" @click="viewMode = 'timeline'">時間軸</button>
      <button :class="['glass-tab', { active: viewMode === 'chart' }]" @click="viewMode = 'chart'">負載圖表</button>
    </div>

    <!-- Member Cards View -->
    <div v-if="viewMode === 'cards'" class="bento-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
      <div v-for="m in members" :key="m.id" class="glass-card member-card" :class="{ overload: m.isOverloaded }">
        <div class="member-header">
          <div class="glass-avatar">{{ m.name.charAt(0) }}</div>
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
            <div class="mini-stat-value" :style="{ color: m.todoCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }">{{ m.todoCount }}</div>
            <div class="mini-stat-label">待辦</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value" style="color: var(--accent-blue);">{{ m.inProgressCount }}</div>
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
          <span v-if="m.tasks.length > 3" class="task-chip" style="background: var(--glass-inner-bg); color: var(--text-muted);">+{{ m.tasks.length - 3 }}</span>
        </div>
        <div class="hours-bar">
          <div class="hours-bar-label">
            <span>工時負載</span>
            <span :style="{ color: m.isOverloaded ? 'var(--danger)' : m.isWarning ? 'var(--warning)' : 'var(--success)' }">
              {{ m.actualHours }}h / {{ m.plannedHours }}h
            </span>
          </div>
          <div class="hours-track">
            <div class="hours-fill" :class="getLoadClass(m.loadPercentage)" :style="{ width: Math.min(m.loadPercentage, 100) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Unassigned Card -->
      <div v-if="unassigned.length > 0" class="glass-card member-card unassigned">
        <div class="member-header">
          <div class="glass-avatar" style="background: linear-gradient(135deg, var(--text-muted), #666);">?</div>
          <div class="member-info">
            <div class="member-name">未指派任務</div>
            <div class="member-role">待分配</div>
          </div>
          <div class="load-indicator" style="background: var(--glass-inner-bg); color: var(--text-muted);">{{ unassigned.length }}</div>
        </div>
        <div class="task-chips">
          <span v-for="t in unassigned.slice(0, 4)" :key="t.id" class="task-chip">{{ t.taskCode }}</span>
          <span v-if="unassigned.length > 4" class="task-chip" style="background: var(--glass-inner-bg); color: var(--text-muted);">+{{ unassigned.length - 4 }}</span>
        </div>
      </div>
    </div>

    <!-- Chart View -->
    <div v-else-if="viewMode === 'chart'" class="glass-card" style="margin-bottom: 24px;">
      <div class="card-header-text">預估工時 vs 標準容量（40h/周）</div>
      <div class="bar-chart">
        <div v-for="m in members" :key="m.id" class="bar-row">
          <div class="bar-label">{{ m.name }}</div>
          <div class="bar-track">
            <div class="bar-fill" :class="getLoadClass(m.loadPercentage)" :style="{ width: Math.min(m.loadPercentage, 100) + '%' }">
              {{ m.plannedHours }}h
            </div>
          </div>
          <div class="bar-value" :style="{ color: m.isOverloaded ? 'var(--danger)' : m.isWarning ? 'var(--warning)' : 'var(--success)' }">
            {{ m.loadPercentage }}%
          </div>
          <div class="bar-detail">{{ m.totalTasks }} 任務 · {{ m.overdueCount }} 逾期</div>
        </div>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot normal"></div>正常 (&lt;80%)</div>
        <div class="legend-item"><div class="legend-dot warning"></div>警告 (80-100%)</div>
        <div class="legend-item"><div class="legend-dot danger"></div>超載 (&gt;100%)</div>
      </div>
    </div>

    <!-- Timeline View -->
    <div v-else-if="viewMode === 'timeline'" class="glass-card" style="margin-bottom: 24px; padding: 0; overflow: hidden;">
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
    <div v-if="unassigned.length > 0" class="glass-card">
      <div class="card-header-text">未指派任務</div>
      <n-data-table :columns="unassignedColumns" :data="unassigned" size="small" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { NAlert, NDataTable, NText } from 'naive-ui';
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
    TODO: 'var(--text-muted)',
    IN_PROGRESS: 'var(--accent-blue)',
    CODE_REVIEW: 'var(--accent-purple)',
    TESTING: 'var(--warning)',
    DONE: 'var(--success)',
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

      if (leftMs < 0) { widthMs += leftMs; leftMs = 0; }
      if (leftMs + widthMs > totalMs) widthMs = totalMs - leftMs;
      if (widthMs < 0) widthMs = 0;

      const left = (leftMs / totalMs) * 100;
      const width = Math.max((widthMs / totalMs) * 100, 2);

      return { id: t.id, taskCode: t.taskCode, title: `${t.taskCode}: ${t.title} (${t.projectName})`, left, width, color: colors[t.status] || 'var(--text-muted)' };
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
  padding: 24px;
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

.card-header-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 20px;
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
  padding: 8px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  border-radius: calc(var(--radius-md) - 4px);
}
.glass-tab:hover { color: var(--text-secondary); }
.glass-tab.active {
  background: var(--tab-active-bg);
  color: var(--accent-blue);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.glass-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.member-card {
  padding: 20px;
}
.member-card.overload {
  border-color: rgba(239,68,68,0.3);
}
.member-card.unassigned {
  border-style: dashed;
  opacity: 0.8;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.member-info { flex: 1; }
.member-name { font-weight: 700; font-size: 15px; color: var(--text-primary); }
.member-role { font-size: 12px; color: var(--text-muted); }

.load-indicator {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}
.load-indicator.normal { background: rgba(16,185,129,0.1); color: var(--success); }
.load-indicator.warning { background: rgba(245,158,11,0.1); color: var(--warning); }
.load-indicator.danger { background: rgba(239,68,68,0.1); color: var(--danger); }

.member-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.mini-stat {
  text-align: center;
  padding: 8px;
  background: var(--glass-inner-bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
}
.mini-stat-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.mini-stat-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.task-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.task-chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(79,106,245,0.08);
  color: var(--accent-blue);
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-chip.overdue { background: rgba(239,68,68,0.08); color: var(--danger); }

.hours-bar { margin-top: 4px; }
.hours-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.hours-track {
  height: 6px;
  background: var(--progress-track);
  border-radius: 3px;
  overflow: hidden;
}
.hours-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.hours-fill.normal { background: var(--success); }
.hours-fill.warning { background: var(--warning); }
.hours-fill.danger { background: var(--danger); }

/* Chart View */
.bar-chart { display: flex; flex-direction: column; gap: 16px; }
.bar-row { display: flex; align-items: center; gap: 16px; }
.bar-label { width: 100px; text-align: right; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.bar-track {
  flex: 1;
  height: 28px;
  background: var(--progress-track);
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
  font-weight: 600;
  transition: width 0.5s ease;
}
.bar-fill.normal { background: var(--success); }
.bar-fill.warning { background: var(--warning); }
.bar-fill.danger { background: var(--danger); }
.bar-value { width: 60px; font-size: 13px; font-weight: 700; }
.bar-detail { font-size: 12px; color: var(--text-muted); width: 120px; }

.legend {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  justify-content: center;
}
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; }
.legend-dot.normal { background: var(--success); }
.legend-dot.warning { background: var(--warning); }
.legend-dot.danger { background: var(--danger); }

/* Timeline View */
.timeline-header {
  display: flex;
  border-bottom: 1px solid var(--glass-border);
  background: var(--glass-inner-bg);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.timeline-member-col {
  width: 180px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  border-right: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.timeline-dates { display: flex; flex: 1; }
.timeline-date-cell {
  flex: 1;
  padding: 8px 2px;
  text-align: center;
  border-right: 1px solid var(--glass-border);
  font-size: 11px;
  color: var(--text-muted);
  min-width: 36px;
}
.timeline-date-cell.today {
  background: rgba(79,106,245,0.06);
  color: var(--accent-blue);
  font-weight: 700;
}
.timeline-date-cell:last-child { border-right: none; }
.timeline-date-today { font-size: 10px; color: var(--accent-blue); }

.timeline-body { display: flex; flex-direction: column; }
.timeline-row {
  display: flex;
  border-bottom: 1px solid var(--glass-border);
  min-height: 56px;
  align-items: center;
}
.timeline-row:last-child { border-bottom: none; }
.timeline-member-info {
  width: 180px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-right: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.timeline-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.timeline-member-detail { flex: 1; min-width: 0; }
.timeline-member-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.timeline-member-load { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.timeline-member-load.overload { color: var(--danger); }
.timeline-member-load.warning { color: var(--warning); }

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
  font-weight: 600;
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
.timeline-task-text { overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 1200px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 768px) {
  .bento-grid { grid-template-columns: 1fr !important; }
}
</style>
