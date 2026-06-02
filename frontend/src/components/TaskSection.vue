<template>
  <n-card style="margin-bottom: 16px;" size="small">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 500; display: flex; align-items: center; gap: 6px;">
          <IconSvg :name="icon" :size="16" />
          {{ title }}
        </span>
        <n-tag size="small" round>{{ tasks.length }}</n-tag>
      </div>
    </template>
    <n-data-table
      :columns="columns"
      :data="tasks"
      :pagination="false"
      size="small"
      :bordered="false"
    />
  </n-card>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { NButton, NCard, NDataTable, NProgress, NTag } from 'naive-ui';
import IconSvg from './IconSvg.vue';
import type { Task } from '../types';

defineProps<{
  title: string;
  icon: string;
  tasks: Task[];
}>();

const emit = defineEmits<{
  start: [task: Task];
  complete: [task: Task];
  logHours: [task: Task];
  view: [task: Task];
}>();

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

const columns = [
  {
    title: '任務',
    key: 'title',
    minWidth: 280,
    render(row: Task) {
      return h('div', {}, [
        h('div', { style: 'font-weight: 500; margin-bottom: 4px;' }, `${row.taskCode} ${row.title}`),
        h('div', { style: 'font-size: 12px; color: #64748b; display: flex; gap: 8px; align-items: center;' }, [
          h(NTag, { size: 'tiny', type: 'info', bordered: false }, { default: () => row.project?.name || '-' }),
          row.requirement ? h('span', { style: 'display: flex; align-items: center; gap: 4px;' }, [h(IconSvg, { name: 'file-text', size: 12, color: '#64748b' }), `${row.requirement.reqCode}`]) : null,
          h(NTag, { size: 'tiny', type: getPriorityType(row.priority) }, { default: () => row.priority }),
        ]),
      ]);
    },
  },
  {
    title: '工時',
    key: 'hours',
    width: 120,
    render(row: Task) {
      if (!row.plannedHours) return h('span', { style: 'color: #94a3b8; font-size: 13px;' }, '-');
      const actual = row.actualHours || 0;
      const pct = Math.min(Math.round((actual / row.plannedHours) * 100), 100);
      return h('div', {}, [
        h('div', { style: 'font-size: 12px; margin-bottom: 4px;' }, `${actual}h / ${row.plannedHours}h`),
        h(NProgress, {
          type: 'line',
          percentage: pct,
          height: 4,
          showIndicator: false,
          status: actual > row.plannedHours ? 'error' : 'success',
        }),
      ]);
    },
  },
  {
    title: '截止',
    key: 'dueDate',
    width: 100,
    render(row: Task) {
      const isOverdue = row.isOverdue;
      return h('span', {
        style: `font-size: 13px; ${isOverdue ? 'color: #ef4444; font-weight: 500;' : 'color: #64748b;'}`
      }, formatDate(row.dueDate) + (isOverdue ? ' ⚠️' : ''));
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row: Task) {
      const buttons: any[] = [];

      if (row.status === 'TODO') {
        buttons.push(
          h(NButton, {
            size: 'tiny',
            type: 'primary',
            onClick: () => emit('start', row),
          }, { default: () => '開始' })
        );
      } else if (row.status === 'IN_PROGRESS') {
        buttons.push(
          h(NButton, {
            size: 'tiny',
            type: 'success',
            onClick: () => emit('complete', row),
          }, { default: () => '完成' })
        );
        buttons.push(
          h(NButton, {
            size: 'tiny',
            onClick: () => emit('logHours', row),
          }, { default: () => '填報工時' })
        );
      }

      buttons.push(
        h(NButton, {
          size: 'tiny',
          text: true,
          onClick: () => emit('view', row),
        }, { default: () => '詳情' })
      );

      return h('div', { style: 'display: flex; gap: 6px;' }, buttons);
    },
  },
];
</script>
