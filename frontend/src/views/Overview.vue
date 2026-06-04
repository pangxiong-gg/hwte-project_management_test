<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">數據總覽</h1>
        <p class="page-subtitle">專案進度、團隊效率與 Bug 趨勢一覽</p>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="bento-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <div>
          <div class="stat-label">總專案數</div>
          <div class="stat-value">{{ projectCount }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div>
          <div class="stat-label">進行中</div>
          <div class="stat-value" style="color: var(--success);">{{ activeProjectCount }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap yellow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
        </div>
        <div>
          <div class="stat-label">本週完成任務</div>
          <div class="stat-value" style="color: var(--accent-blue);">{{ weeklyCompletedTasks }}</div>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon-wrap red">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div>
          <div class="stat-label">未修復 Bug</div>
          <div class="stat-value" style="color: var(--danger);">{{ openBugCount }}</div>
        </div>
      </div>
    </div>

    <!-- Charts Grid -->
    <n-spin :show="loading">
      <div class="bento-grid" style="grid-template-columns: repeat(2, 1fr);">
        <div class="glass-card chart-card">
          <div class="card-header-text">專案進度</div>
          <div class="chart-body">
            <ProjectProgressChart v-if="projectProgress.length > 0" :data="projectProgress" />
            <n-empty v-else description="暫無數據" />
          </div>
        </div>
        <div class="glass-card chart-card">
          <div class="card-header-text">團隊效率</div>
          <div class="chart-body">
            <TeamEfficiencyChart v-if="teamEfficiency.length > 0" :data="teamEfficiency" />
            <n-empty v-else description="暫無數據" />
          </div>
        </div>
        <div class="glass-card chart-card">
          <div class="card-header-text">Bug 趨勢</div>
          <div class="chart-body">
            <BugTrendChart v-if="bugTrends.timeline.length > 0" :data="bugTrends.timeline" />
            <n-empty v-else description="暫無數據" />
          </div>
        </div>
        <div class="glass-card chart-card">
          <div class="card-header-text">Bug 嚴重級別</div>
          <div class="chart-body">
            <BugSeverityChart v-if="Object.keys(bugTrends.bySeverity).length > 0" :data="bugTrends.bySeverity" />
            <n-empty v-else description="暫無數據" />
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { NSpin, NEmpty } from 'naive-ui';
import { reportApi, projectApi, bugApi } from '../services/api';
import ProjectProgressChart from '../components/ProjectProgressChart.vue';
import TeamEfficiencyChart from '../components/TeamEfficiencyChart.vue';
import BugTrendChart from '../components/BugTrendChart.vue';
import BugSeverityChart from '../components/BugSeverityChart.vue';
import type { ProjectProgress, TeamMemberEfficiency, BugTrends, Project, Bug } from '../types';

const message = useMessage();

const loading = ref(false);
const projects = ref<Project[]>([]);
const bugs = ref<Bug[]>([]);
const projectProgress = ref<ProjectProgress[]>([]);
const teamEfficiency = ref<TeamMemberEfficiency[]>([]);
const bugTrends = ref<BugTrends>({ timeline: [], bySeverity: {}, byPriority: {} });
const weeklyCompletedTasks = ref(0);

const projectCount = computed(() => projects.value.length);
const activeProjectCount = computed(() => projects.value.filter(p => p.status === 'ACTIVE').length);
const openBugCount = computed(() => bugs.value.filter(b => b.status !== 'CLOSED').length);

async function loadData() {
  loading.value = true;
  try {
    const [projectsRes, , progressRes, efficiencyRes, bugTrendRes] = await Promise.all([
      projectApi.getAll(),
      // Load all bugs across projects
      loadAllBugs().then(() => undefined),
      reportApi.getProjectProgress(),
      reportApi.getTeamEfficiency(),
      reportApi.getBugTrends(30),
    ]);
    projects.value = projectsRes.data;
    projectProgress.value = progressRes.data.projects || [];
    teamEfficiency.value = efficiencyRes.data.members || [];
    bugTrends.value = bugTrendRes.data || { timeline: [], bySeverity: {}, byPriority: {} };
  } catch (error: any) {
    message.error('載入數據失敗');
  } finally {
    loading.value = false;
  }
}

async function loadAllBugs(): Promise<Bug[]> {
  // Load bugs from each project
  const allBugs: Bug[] = [];
  try {
    for (const project of projects.value) {
      try {
        const res = await bugApi.getAll(project.id);
        allBugs.push(...res.data);
      } catch {
        // silent
      }
    }
  } catch {
    // silent
  }
  bugs.value = allBugs;
  return allBugs;
}

onMounted(() => {
  loadData();
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

.chart-card {
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.chart-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
