<template>
  <div class="kanban-col-glass">
    <div class="kanban-header">
      <span class="kanban-title">
        <IconSvg :name="icon" :size="16" />
        {{ title }}
      </span>
      <span class="kanban-count">{{ totalCount }}</span>
    </div>

    <!-- Overdue cards -->
    <div
      v-for="task in overdueTasks"
      :key="task.id"
      class="task-card-glass overdue"
      @click="emit('view', task)"
    >
      <div class="task-card-tags">
        <span class="tag tag-red">逾期</span>
        <span class="tag" :class="getPriorityClass(task.priority)">{{ task.priority }}</span>
      </div>
      <div class="task-card-title">{{ task.taskCode }} {{ task.title }}</div>
      <div class="task-card-project">
        <IconSvg name="folder" :size="12" color="var(--text-muted)" /> {{ task.project?.name || '-' }}
      </div>
      <div v-if="task.plannedHours" class="task-card-hours">
        <n-progress :percentage="getHoursPct(task)" type="line" :height="4" :show-indicator="false" />
        <div class="hours-text">{{ task.actualHours || 0 }}h / {{ task.plannedHours }}h</div>
      </div>
      <div class="task-card-actions">
        <button class="btn-sm btn-primary-sm" @click.stop="emit('start', task)">開始</button>
        <button class="btn-sm btn-ghost-sm" @click.stop="emit('logHours', task)">工時</button>
      </div>
    </div>

    <!-- Normal cards -->
    <div
      v-for="task in tasks"
      :key="task.id"
      class="task-card-glass"
      @click="emit('view', task)"
    >
      <div class="task-card-tags">
        <span class="tag" :class="getPriorityClass(task.priority)">{{ task.priority }}</span>
      </div>
      <div class="task-card-title">{{ task.taskCode }} {{ task.title }}</div>
      <div class="task-card-project">
        <IconSvg name="folder" :size="12" color="var(--text-muted)" /> {{ task.project?.name || '-' }}
      </div>
      <div v-if="task.plannedHours" class="task-card-hours">
        <n-progress :percentage="getHoursPct(task)" type="line" :height="4" :show-indicator="false" />
        <div class="hours-text">{{ task.actualHours || 0 }}h / {{ task.plannedHours }}h</div>
      </div>
      <div class="task-card-footer">
        <span class="due-date">
          <IconSvg name="calendar" :size="12" color="var(--text-muted)" /> {{ formatDate(task.dueDate) }}
        </span>
        <div class="task-card-actions">
          <button v-if="task.status === 'TODO'" class="btn-sm btn-primary-sm" @click.stop="emit('start', task)">開始</button>
          <button v-if="task.status === 'IN_PROGRESS'" class="btn-sm btn-success-sm" @click.stop="emit('complete', task)">完成</button>
          <button v-if="task.status === 'IN_PROGRESS'" class="btn-sm btn-ghost-sm" @click.stop="emit('logHours', task)">工時</button>
        </div>
      </div>
    </div>

    <n-empty v-if="totalCount === 0" description="暫無任務" size="small" style="padding: 24px;" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NEmpty, NProgress } from 'naive-ui';
import IconSvg from './IconSvg.vue';
import type { Task } from '../types';

const props = defineProps<{
  title: string;
  icon: string;
  tasks: Task[];
  overdueTasks?: Task[];
}>();

const emit = defineEmits<{
  start: [task: Task];
  complete: [task: Task];
  logHours: [task: Task];
  view: [task: Task];
}>();

const totalCount = computed(() => props.tasks.length + (props.overdueTasks?.length || 0));

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getPriorityClass(p: string): string {
  if (p === 'P0') return 'tag-red';
  if (p === 'P1') return 'tag-yellow';
  return 'tag-blue';
}

function getHoursPct(task: Task): number {
  if (!task.plannedHours || task.plannedHours <= 0) return 0;
  return Math.min(Math.round(((task.actualHours || 0) / task.plannedHours) * 100), 100);
}
</script>

<style scoped>
.kanban-col-glass {
  background: var(--glass-inner-bg);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  padding: 16px;
  min-height: 400px;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.kanban-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.kanban-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-blue);
  background: rgba(79,106,245,0.1);
  padding: 2px 10px;
  border-radius: 10px;
}

.task-card-glass {
  background: rgba(255,255,255,0.5);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  padding: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-card-glass:hover {
  background: rgba(255,255,255,0.7);
  border-color: var(--glass-border-hover);
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow);
}

.task-card-glass.overdue {
  background: rgba(239,68,68,0.05);
  border-color: rgba(239,68,68,0.15);
}

.task-card-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-block;
}

.tag-blue { background: rgba(79,106,245,0.1); color: var(--accent-blue); }
.tag-red { background: rgba(239,68,68,0.1); color: var(--danger); }
.tag-yellow { background: rgba(245,158,11,0.1); color: var(--warning); }
.tag-green { background: rgba(16,185,129,0.1); color: var(--success); }

.task-card-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.task-card-project {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-card-hours {
  margin-bottom: 8px;
}

.hours-text {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.task-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.due-date {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-card-actions {
  display: flex;
  gap: 6px;
}

.btn-sm {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary-sm {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: white;
}

.btn-success-sm {
  background: linear-gradient(135deg, var(--success), var(--accent-cyan));
  color: white;
}

.btn-ghost-sm {
  background: var(--glass-inner-bg);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.btn-ghost-sm:hover {
  background: var(--glass-inner-hover);
}
</style>
