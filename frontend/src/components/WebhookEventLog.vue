<template>
  <div>
    <n-data-table
      :columns="columns"
      :data="events"
      :pagination="{ pageSize: 10 }"
      size="small"
    />
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import type { WebhookEvent } from '../types';
import { NDataTable, NTag } from 'naive-ui';

defineProps<{
  events: WebhookEvent[];
}>();

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    push: 'Push',
    pull_request: 'Pull Request',
    workflow_run: 'Workflow Run',
  };
  return map[type] || type;
}

function eventTypeTagType(type: string): 'info' | 'warning' | 'success' | 'default' {
  const map: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
    push: 'info',
    pull_request: 'warning',
    workflow_run: 'success',
  };
  return map[type] || 'default';
}

function statusTagType(status: string): 'success' | 'warning' | 'error' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    PROCESSED: 'success',
    PENDING: 'warning',
    ERROR: 'error',
  };
  return map[status] || 'default';
}

const columns = [
  {
    title: '時間',
    key: 'createdAt',
    width: 120,
    render(row: WebhookEvent) {
      return formatDate(row.createdAt);
    },
  },
  {
    title: '事件',
    key: 'eventType',
    width: 130,
    render(row: WebhookEvent) {
      return h(NTag, { type: eventTypeTagType(row.eventType), size: 'small' }, {
        default: () => eventTypeLabel(row.eventType),
      });
    },
  },
  {
    title: '動作',
    key: 'action',
    width: 100,
    render(row: WebhookEvent) {
      return row.action || '-';
    },
  },
  {
    title: '狀態',
    key: 'status',
    width: 100,
    render(row: WebhookEvent) {
      return h(NTag, { type: statusTagType(row.status), size: 'small' }, {
        default: () => row.status,
      });
    },
  },
  {
    title: '關聯任務',
    key: 'taskIds',
    render(row: WebhookEvent) {
      return row.taskIds || '-';
    },
  },
  {
    title: '錯誤',
    key: 'errorMsg',
    render(row: WebhookEvent) {
      return row.errorMsg || '-';
    },
  },
];
</script>