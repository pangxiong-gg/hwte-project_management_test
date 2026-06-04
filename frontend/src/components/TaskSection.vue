<template>
  <div class="glass-card task-section">
    <div class="section-header">
      <span class="section-title">
        <IconSvg :name="icon" :size="16" />
        {{ title }}
      </span>
      <span class="section-count">{{ tasks.length }}</span>
    </div>
    <n-data-table
      :columns="columns"
      :data="tasks"
      :pagination="false"
      size="small"
      :bordered="false"
    />
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { NButton, NDataTable, NProgress } from 'naive-ui';
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

function getPriorityClass(p: string): string {
  if (p === 'P0') return 'tag-red';
  if (p === 'P1') return 'tag-yellow';
  return 'tag-blue';
}

const columns = [
  {
    title: '任務',
    key: 'title',
    minWidth: 280,
    render(row: Task) {
      return h('div', {}, [
        h('div', { style: 'font-weight: 600; margin-bottom: 4px; color: var(--text-primary);' }, `${row.taskCode} ${row.title}`),
        h('div', { style: 'font-size: 12px; color: var(--text-secondary); display: flex; gap: 8px; align-items: center; flex-wrap: wrap;' }, [
          h('span', { style: 'font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: rgba(79,106,245,0.1); color: var(--accent-blue);' }, row.project?.name || '-'),
          row.requirement ? h('span', { style: 'display: flex; align-items: center; gap: 4px; color: var(--text-muted);' }, [h(IconSvg, { name: 'file-text', size: 12, color: 'var(--text-muted)' }), `${row.requirement.reqCode}`]) : null,
          h('span', { class: getPriorityClass(row.priority), style: 'font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; display: inline-block;' }, row.priority),
        ]),
      ]);
    },
  },
  {
    title: '工時',
    key: 'hours',
    width: 120,
    render(row: Task) {
      if (!row.plannedHours) return h('span', { style: 'color: var(--text-muted); font-size: 13px;' }, '-');
      const actual = row.actualHours || 0;
      const pct = Math.min(Math.round((actual / row.plannedHours) * 100), 100);
      return h('div', {}, [
        h('div', { style: 'font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);' }, `${actual}h / ${row.plannedHours}h`),
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
        style: `font-size: 13px; ${isOverdue ? 'color: var(--danger); font-weight: 600;' : 'color: var(--text-secondary);'}`
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
        buttons.push(h(NButton, { size: 'tiny', type: 'primary', onClick: () => emit('start', row) }, { default: () => '開始' }));
      } else if (row.status === 'IN_PROGRESS') {
        buttons.push(h(NButton, { size: 'tiny', type: 'success', onClick: () => emit('complete', row) }, { default: () => '完成' }));
        buttons.push(h(NButton, { size: 'tiny', onClick: () => emit('logHours', row) }, { default: () => '填報工時' }));
      }
      buttons.push(h(NButton, { size: 'tiny', text: true, onClick: () => emit('view', row) }, { default: () => '詳情' }));
      return h('div', { style: 'display: flex; gap: 6px;' }, buttons);
    },
  },
];
</script>

<style scoped>
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--glass-shadow);
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
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

.task-section {
  padding-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--glass-border);
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-blue);
  background: rgba(79,106,245,0.1);
  padding: 2px 10px;
  border-radius: 10px;
}

.tag-blue { background: rgba(79,106,245,0.1); color: var(--accent-blue); }
.tag-red { background: rgba(239,68,68,0.1); color: var(--danger); }
.tag-yellow { background: rgba(245,158,11,0.1); color: var(--warning); }
.tag-green { background: rgba(16,185,129,0.1); color: var(--success); }
</style>
