<template>
  <div class="timeline-container">
    <!-- 時間範圍信息 -->
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <n-text depth="3" style="font-size: 13px;">
        📅 {{ formatDateRange }}
      </n-text>
      <n-text depth="3" style="font-size: 12px;">
        共 {{ validTasks.length }} 個任務
      </n-text>
    </div>

    <!-- 里程碑條 -->
    <div v-if="milestones.length > 0" class="milestone-bar">
      <div class="milestone-label">🎯 里程碑</div>
      <div class="timeline-track">
        <div
          v-for="ms in milestones"
          :key="ms.id"
          class="milestone-marker"
          :style="{ left: ms.position + '%' }"
        >
          <n-tooltip>
            <template #trigger>
              <div class="milestone-dot" :class="ms.type">
                {{ ms.type === 'deadline' ? '🔴' : '🟢' }}
              </div>
            </template>
            {{ ms.name }} — {{ formatDate(ms.date.toISOString()) }}
          </n-tooltip>
        </div>
      </div>
    </div>

    <!-- 時間軸刻度 -->
    <div class="time-axis">
      <div class="time-axis-label">任務</div>
      <div class="time-axis-track">
        <div
          v-for="tick in timeTicks"
          :key="tick.value"
          class="time-tick"
          :style="{ left: tick.position + '%' }"
        >
          {{ tick.label }}
        </div>
      </div>
    </div>

    <!-- 甘特圖主體 -->
    <div class="gantt-body">
      <div
        v-for="task in validTasks"
        :key="task.id"
        class="gantt-row"
      >
        <!-- 任務名稱 + 負責人 -->
        <div class="gantt-row-label">
          <n-avatar
            v-if="task.assignee"
            :style="{ backgroundColor: stringToColor(task.assignee.name) }"
            size="small"
            class="assignee-avatar"
          >
            {{ task.assignee.name.charAt(0) }}
          </n-avatar>
          <n-avatar v-else size="small" class="assignee-avatar" style="background: #e2e8f0; color: #94a3b8;">
            ?
          </n-avatar>
          <n-tooltip>
            <template #trigger>
              <span class="task-name">{{ task.title }}</span>
            </template>
            {{ task.title }}
            <br />
            負責人: {{ task.assignee?.name || '未指派' }}
            <br />
            開始: {{ formatDate(task.startedAt) || '未開始' }}
            <br />
            截止: {{ formatDate(task.dueDate) || '未設定' }}
          </n-tooltip>
        </div>

        <!-- 任務條軌道 -->
        <div class="gantt-track">
          <!-- 今天線 -->
          <div
            v-if="todayPosition >= 0 && todayPosition <= 100"
            class="today-line"
            :style="{ left: todayPosition + '%' }"
          >
            <div class="today-label">今天</div>
          </div>

          <!-- 任務條 -->
          <div
            v-if="getTaskBar(task)"
            class="task-bar"
            :class="{
              'task-completed': task.completedAt,
              'task-in-progress': task.startedAt && !task.completedAt,
              'task-pending': !task.startedAt,
            }"
            :style="{
              left: getTaskBar(task)!.left + '%',
              width: getTaskBar(task)!.width + '%',
              backgroundColor: getTaskColor(task.type),
            }"
            @click="$emit('view-task', task)"
          >
            <span class="task-bar-text">{{ taskProgressText(task) }}</span>
          </div>
        </div>
      </div>

      <!-- 無任務提示 -->
      <n-empty v-if="validTasks.length === 0" description="沒有時間信息完整的任務" style="padding: 40px;" />
    </div>

    <!-- 圖例 -->
    <div class="timeline-legend">
      <span class="legend-item"><span class="legend-dot" style="background: #3b82f6;"></span>開發</span>
      <span class="legend-item"><span class="legend-dot" style="background: #8b5cf6;"></span>設計</span>
      <span class="legend-item"><span class="legend-dot" style="background: #ef4444;"></span>測試</span>
      <span class="legend-item"><span class="legend-dot" style="background: #22c55e;"></span>文檔</span>
      <span class="legend-item"><span class="legend-dot" style="background: #64748b;"></span>其他</span>
      <span class="legend-item" style="margin-left: 16px;">|</span>
      <span class="legend-item"><span class="legend-line completed"></span>已完成</span>
      <span class="legend-item"><span class="legend-line in-progress"></span>進行中</span>
      <span class="legend-item"><span class="legend-line pending"></span>未開始</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Task, Project, ProjectPhase } from '../types';
import { NTooltip, NAvatar, NText, NEmpty } from 'naive-ui';

const props = defineProps<{
  project: Project | null;
  tasks: Task[];
  phases: ProjectPhase[];
}>();

defineEmits<{
  (e: 'view-task', task: Task): void;
}>();

const taskTypeColors: Record<string, string> = {
  DEVELOPMENT: '#3b82f6',
  DESIGN: '#8b5cf6',
  TESTING: '#ef4444',
  DOCUMENTATION: '#22c55e',
};

function getTaskColor(type: string): string {
  return taskTypeColors[type?.toUpperCase()] || '#64748b';
}

function stringToColor(str: string): string {
  const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const timeRange = computed(() => {
  const tasksWithDates = props.tasks.filter(t => t.startedAt || t.dueDate);
  if (tasksWithDates.length === 0) return null;

  const dates: Date[] = [];
  tasksWithDates.forEach(t => {
    if (t.startedAt) dates.push(new Date(t.startedAt));
    if (t.dueDate) dates.push(new Date(t.dueDate));
  });

  if (props.project?.startDate) dates.push(new Date(props.project.startDate));
  if (props.project?.endDate) dates.push(new Date(props.project.endDate));

  const start = new Date(Math.min(...dates.map(d => d.getTime())));
  const end = new Date(Math.max(...dates.map(d => d.getTime())));

  const minEnd = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (end < minEnd) return { start, end: minEnd };

  return { start, end };
});

const formatDateRange = computed(() => {
  if (!timeRange.value) return '暫無時間數據';
  const { start, end } = timeRange.value;
  return `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()} ~ ${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`;
});

const totalDays = computed(() => {
  if (!timeRange.value) return 1;
  return Math.max(1, (timeRange.value.end.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24));
});

const todayPosition = computed(() => {
  if (!timeRange.value) return -1;
  const today = new Date();
  const daysSinceStart = (today.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24);
  return (daysSinceStart / totalDays.value) * 100;
});

const timeTicks = computed(() => {
  if (!timeRange.value) return [];
  const ticks: { label: string; position: number; value: number }[] = [];
  const days = totalDays.value;
  const tickCount = Math.min(7, Math.max(3, Math.floor(days / 3)));

  for (let i = 0; i <= tickCount; i++) {
    const dayOffset = (days / tickCount) * i;
    const date = new Date(timeRange.value.start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    ticks.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      position: (dayOffset / days) * 100,
      value: date.getTime(),
    });
  }
  return ticks;
});

const validTasks = computed(() => {
  return props.tasks.filter(t => t.startedAt || t.dueDate);
});

const milestones = computed(() => {
  const ms: { id: string; name: string; date: Date; position: number; type: 'complete' | 'deadline' }[] = [];
  if (!timeRange.value) return ms;

  props.phases.forEach(phase => {
    if (phase.completedAt) {
      const date = new Date(phase.completedAt);
      const daysSinceStart = (date.getTime() - timeRange.value!.start.getTime()) / (1000 * 60 * 60 * 24);
      ms.push({
        id: `phase-${phase.id}`,
        name: phase.name,
        date,
        position: Math.min(100, Math.max(0, (daysSinceStart / totalDays.value) * 100)),
        type: 'complete',
      });
    }
  });

  if (props.project?.endDate) {
    const date = new Date(props.project.endDate);
    const daysSinceStart = (date.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24);
    ms.push({
      id: 'project-end',
      name: '專案截止',
      date,
      position: Math.min(100, Math.max(0, (daysSinceStart / totalDays.value) * 100)),
      type: 'deadline',
    });
  }

  return ms.sort((a, b) => a.position - b.position);
});

function getTaskBar(task: Task): { left: number; width: number } | null {
  if (!timeRange.value) return null;

  const start = task.startedAt
    ? new Date(task.startedAt)
    : task.dueDate
      ? new Date(new Date(task.dueDate).getTime() - (task.plannedHours || 8) * 60 * 60 * 1000)
      : null;

  const end = task.dueDate
    ? new Date(task.dueDate)
    : task.startedAt && task.plannedHours
      ? new Date(new Date(task.startedAt).getTime() + task.plannedHours * 60 * 60 * 1000)
      : null;

  if (!start && !end) return null;

  const barStart = start || end!;
  const barEnd = end || start!;

  const daysSinceStart = (barStart.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24);
  const duration = (barEnd.getTime() - barStart.getTime()) / (1000 * 60 * 60 * 24);

  const left = (daysSinceStart / totalDays.value) * 100;
  const width = Math.max(2, (duration / totalDays.value) * 100);

  return {
    left: Math.max(0, Math.min(98, left)),
    width: Math.max(2, Math.min(100 - left, width)),
  };
}

function taskProgressText(task: Task): string {
  if (task.completedAt) return '✓';
  if (task.startedAt) return '進行中';
  return '待開始';
}
</script>

<style scoped>
.timeline-container {
  padding: 8px 0;
}

.milestone-bar {
  margin-bottom: 16px;
  padding: 10px 12px;
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 8px;
}

.milestone-label {
  font-size: 12px;
  font-weight: 600;
  color: #854d0e;
  margin-bottom: 8px;
}

.timeline-track {
  position: relative;
  height: 24px;
  background: #fef9c3;
  border-radius: 4px;
}

.milestone-marker {
  position: absolute;
  top: 2px;
  transform: translateX(-50%);
}

.milestone-dot {
  font-size: 14px;
  cursor: pointer;
}

.time-axis {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}

.time-axis-label {
  width: 160px;
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

.time-axis-track {
  flex: 1;
  position: relative;
  height: 20px;
}

.time-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 10px;
  color: #94a3b8;
}

.gantt-body {
  min-height: 100px;
}

.gantt-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.gantt-row-label {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #334155;
}

.assignee-avatar {
  flex-shrink: 0;
}

.task-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
}

.gantt-track {
  flex: 1;
  position: relative;
  height: 24px;
  background: #f8fafc;
  border-radius: 4px;
}

.today-line {
  position: absolute;
  top: -6px;
  bottom: -6px;
  width: 2px;
  background: #ef4444;
  border-left: 1px dashed #ef4444;
  z-index: 10;
}

.today-label {
  position: absolute;
  top: -16px;
  left: -14px;
  font-size: 9px;
  color: #ef4444;
  background: #fef2f2;
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

.task-bar {
  position: absolute;
  top: 3px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
  min-width: 24px;
}

.task-bar:hover {
  opacity: 0.85;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.task-bar-text {
  font-size: 9px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
}

.task-completed {
  opacity: 0.9;
}

.task-in-progress {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255,255,255,0.15) 4px,
    rgba(255,255,255,0.15) 8px
  );
}

.task-pending {
  opacity: 0.5;
}

.timeline-legend {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-line {
  width: 16px;
  height: 8px;
  border-radius: 2px;
}

.legend-line.completed {
  background: #64748b;
  opacity: 0.9;
}

.legend-line.in-progress {
  background: repeating-linear-gradient(
    45deg,
    #64748b,
    #64748b 2px,
    transparent 2px,
    transparent 4px
  );
}

.legend-line.pending {
  background: #64748b;
  opacity: 0.4;
}
</style>
