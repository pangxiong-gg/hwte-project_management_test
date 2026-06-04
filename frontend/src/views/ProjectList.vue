<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">專案總覽</h1>
        <p class="page-subtitle">掌握所有專案進度與團隊動態</p>
      </div>
      <button class="btn-primary" @click="showModal = true">+ 新增專案</button>
    </div>

    <!-- Bento Grid Stats -->
    <div class="bento-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <div>
          <div class="stat-label">總專案數</div>
          <div class="stat-value">{{ projectStore.projects.length }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div>
          <div class="stat-label">進行中</div>
          <div class="stat-value" style="color: var(--success);">{{ activeProjects }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap yellow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div>
          <div class="stat-label">本週完成</div>
          <div class="stat-value" style="color: var(--accent-blue);">{{ weeklyCompletedTasks }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap red">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
        <div>
          <div class="stat-label">未讀通知</div>
          <div class="stat-value" style="color: var(--danger);">{{ unreadNotifications }}</div>
        </div>
      </div>
    </div>

    <!-- Project List -->
    <div class="glass-card">
      <div class="card-header-row">
        <div class="card-header-text">專案列表</div>
        <div style="display: flex; gap: 12px;">
          <button class="btn-ghost" size="small" @click="exportReport('csv')">匯出 CSV</button>
          <button class="btn-ghost" size="small" @click="exportReport('excel')">匯出 Excel</button>
        </div>
      </div>
      <n-data-table
        :columns="columns"
        :data="projectStore.projects"
        :loading="projectStore.loading"
        :pagination="{ pageSize: 10 }"
      />
    </div>

    <!-- Create Modal -->
    <n-modal v-model:show="showModal" title="新增專案" preset="card" style="width: 500px;">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item label="專案代碼" path="code">
          <n-input v-model:value="form.code" placeholder="例如：PROJ-002" />
        </n-form-item>
        <n-form-item label="專案名稱" path="name">
          <n-input v-model:value="form.name" placeholder="請輸入專案名稱" />
        </n-form-item>
        <n-form-item label="專案模式" path="mode">
          <n-select v-model:value="form.mode" :options="modeOptions" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="form.description" type="textarea" placeholder="請輸入專案描述" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">確定</n-button>
            <n-button @click="showModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NButton, NDataTable, NModal, NForm, NFormItem, NInput, NSpace, NSelect,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useProjectStore } from '../stores/project';
import { projectApi, reportApi } from '../services/api';
import { downloadExcel } from '../utils/export';
import type { Project } from '../types';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();

const showModal = ref(false);
const submitting = ref(false);
const formRef = ref();
const form = ref({
  code: '',
  name: '',
  description: '',
  mode: 'HYBRID',
});

const weeklyCompletedTasks = ref(0);
const unreadNotifications = ref(0);

const activeProjects = computed(() =>
  projectStore.projects.filter((p) => p.status === 'ACTIVE').length
);

async function exportReport(format: 'csv' | 'excel') {
  try {
    if (format === 'csv') {
      const res = await reportApi.exportReport('project-progress', 'csv');
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'project-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const res = await reportApi.exportReport('project-progress', 'excel');
      const data = res.data as { headers: string[]; data: Record<string, any>[]; filename: string };
      downloadExcel(data.filename || 'project-report', data.headers, data.data);
    }
    message.success('匯出成功');
  } catch (error: any) {
    message.error('匯出失敗');
  }
}

const modeOptions = [
  { label: '瀑布式', value: 'WATERFALL' },
  { label: '敏捷式', value: 'AGILE' },
  { label: '混合型', value: 'HYBRID' },
];

const rules = {
  code: { required: true, message: '請輸入專案代碼' },
  name: { required: true, message: '請輸入專案名稱' },
  mode: { required: true, message: '請選擇專案模式' },
};

async function handleSubmit() {
  try {
    await formRef.value?.validate();
    submitting.value = true;
    await projectApi.create(form.value);
    message.success('專案建立成功');
    showModal.value = false;
    form.value = { code: '', name: '', description: '', mode: 'HYBRID' };
    await projectStore.fetchProjects();
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

function modeTag(mode: string) {
  const map: Record<string, { text: string; color: string; bg: string }> = {
    WATERFALL: { text: '瀑布式', color: '#4f6af5', bg: 'rgba(79,106,245,0.1)' },
    AGILE: { text: '敏捷式', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    HYBRID: { text: '混合型', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  };
  return map[mode] || { text: mode, color: '#8888a8', bg: 'rgba(136,136,168,0.1)' };
}

const columns: DataTableColumns<Project> = [
  { title: '代碼', key: 'code' },
  { title: '名稱', key: 'name' },
  {
    title: '模式',
    key: 'mode',
    width: 100,
    render: (row) => {
      const m = modeTag(row.mode);
      return h('span', {
        style: `display:inline-block;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:${m.bg};color:${m.color};`
      }, m.text);
    },
  },
  {
    title: '狀態',
    key: 'status',
    render: (row) => {
      const statusMap: Record<string, { text: string; color: string; bg: string }> = {
        ACTIVE: { text: '進行中', color: '#4f6af5', bg: 'rgba(79,106,245,0.1)' },
        COMPLETED: { text: '已完成', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        PLANNING: { text: '規劃中', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      };
      const s = statusMap[row.status] || { text: row.status, color: '#8888a8', bg: 'rgba(136,136,168,0.1)' };
      return h('span', {
        style: `display:inline-block;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:${s.bg};color:${s.color};`
      }, s.text);
    },
  },
  {
    title: '需求數',
    key: 'reqCount',
    render: (row) => row._count?.requirements || 0,
  },
  {
    title: '任務數',
    key: 'taskCount',
    render: (row) => row._count?.tasks || 0,
  },
  {
    title: 'Bug 數',
    key: 'bugCount',
    render: (row) => row._count?.bugs || 0,
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) =>
      h(
        NButton,
        { type: 'primary', size: 'small', onClick: () => router.push(`/projects/${row.id}`) },
        () => '查看'
      ),
  },
];

onMounted(() => {
  projectStore.fetchProjects();
});
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
  margin-bottom: 16px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

.btn-primary {
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: white;
  box-shadow: 0 4px 16px rgba(79, 106, 245, 0.25);
}

.btn-primary:hover {
  box-shadow: 0 6px 24px rgba(79, 106, 245, 0.35);
  transform: translateY(-1px);
}

.btn-ghost {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  backdrop-filter: blur(10px);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-ghost:hover {
  background: var(--btn-ghost-hover);
  color: var(--text-primary);
}

@media (max-width: 1200px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
