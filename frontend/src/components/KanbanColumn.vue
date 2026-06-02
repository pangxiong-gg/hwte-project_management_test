<template>
  <div style="background: #f8fafc; border-radius: 8px; padding: 12px; min-height: 400px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
      <span style="font-weight: 600; font-size: 14px;">{{ icon }} {{ title }}</span>
      <n-tag size="small" round>{{ totalCount }}</n-tag>
    </div>

    <!-- Overdue cards in this column (for todo) -->
    <div
      v-for="task in overdueTasks"
      :key="task.id"
      style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 8px; cursor: pointer;"
      @click="emit('view', task)"
    >
      <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
        <n-tag size="tiny" type="error">逾期</n-tag>
        <n-tag size="tiny">{{ task.priority }}</n-tag>
      </div>
      <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">{{ task.taskCode }} {{ task.title }}</div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
        📁 {{ task.project?.name || '-' }}
      </div>
      <div v-if="task.plannedHours" style="margin-bottom: 8px;">
        <n-progress :percentage="getHoursPct(task)" type="line" :height="4" :show-indicator="false" />
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">{{ task.actualHours || 0 }}h / {{ task.plannedHours }}h</div>
      </div>
      <div style="display: flex; gap: 6px;">
        <n-button size="tiny" type="primary" @click.stop="emit('start', task)">開始</n-button>
        <n-button size="tiny" @click.stop="emit('logHours', task)">工時</n-button>
      </div>
    </div>

    <!-- Normal cards -->
    <div
      v-for="task in tasks"
      :key="task.id"
      style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 8px; cursor: pointer;"
      @click="emit('view', task)"
    >
      <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
        <n-tag size="tiny" :type="getPriorityType(task.priority)">{{ task.priority }}</n-tag>
      </div>
      <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">{{ task.taskCode }} {{ task.title }}</div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
        📁 {{ task.project?.name || '-' }}
      </div>
      <div v-if="task.plannedHours" style="margin-bottom: 8px;">
        <n-progress :percentage="getHoursPct(task)" type="line" :height="4" :show-indicator="false" />
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">{{ task.actualHours || 0 }}h / {{ task.plannedHours }}h</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #94a3b8;">📅 {{ formatDate(task.dueDate) }}</span>
        <div style="display: flex; gap: 6px;">
          <n-button
            v-if="task.status === 'TODO'"
            size="tiny"
            type="primary"
            @click.stop="emit('start', task)"
          >開始</n-button>
          <n-button
            v-if="task.status === 'IN_PROGRESS'"
            size="tiny"
            type="success"
            @click.stop="emit('complete', task)"
          >完成</n-button>
          <n-button
            v-if="task.status === 'IN_PROGRESS'"
            size="tiny"
            @click.stop="emit('logHours', task)"
          >工時</n-button>
        </div>
      </div>
    </div>

    <n-empty v-if="totalCount === 0" description="暫無任務" size="small" style="padding: 24px;" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NEmpty, NProgress, NTag } from 'naive-ui';
import type { Task } from '../types';

const props = defineProps<{
  title: string;
  icon: string;
  color: string;
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

function getPriorityType(p: string): 'error' | 'warning' | 'info' | 'default' {
  if (p === 'P0') return 'error';
  if (p === 'P1') return 'warning';
  if (p === 'P2') return 'info';
  return 'default';
}

function getHoursPct(task: Task): number {
  if (!task.plannedHours || task.plannedHours <= 0) return 0;
  const actual = task.actualHours || 0;
  return Math.min(Math.round((actual / task.plannedHours) * 100), 100);
}
</script>
