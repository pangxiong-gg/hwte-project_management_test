<template>
  <div class="kanban-board">
    <div
      v-for="column in displayColumns"
      :key="column.key"
      class="kanban-column"
      :class="{ 'drag-over': dragOverColumn === column.key }"
      @dragover.prevent="handleDragOver(column.key)"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop(column.key)"
    >
      <div class="kanban-column-header" :style="{ borderColor: column.color }">
        <span class="kanban-column-title">{{ column.title }}</span>
        <n-tag
          size="small"
          :style="{ background: column.color + '15', color: column.color, borderColor: column.color + '30' }"
        >
          {{ columnTasks(column.key).length }}
        </n-tag>
      </div>
      <div class="kanban-column-body">
        <div
          v-for="task in columnTasks(column.key)"
          :key="task.id"
          class="kanban-card"
          :class="{ dragging: draggingTaskId === task.id }"
          draggable="true"
          @dragstart="handleDragStart(task)"
          @dragend="handleDragEnd"
        >
          <div class="kanban-card-header">
            <span class="kanban-card-code">{{ task.taskCode }}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <n-tag
                size="tiny"
                :type="priorityType(task.priority)"
                :style="{ fontSize: '10px' }"
              >
                {{ task.priority }}
              </n-tag>
              <span
                v-if="canEditGit"
                class="kanban-card-edit"
                @click.stop="emit('edit-git', task.id)"
                title="編輯 Git 資訊"
              >
                <IconSvg name="edit" :size="12" color="#94a3b8" />
              </span>
            </div>
          </div>
          <div class="kanban-card-title">{{ task.title }}</div>
          <div v-if="task.tags?.length" class="kanban-card-tags">
            <TagBadge v-for="tag in task.tags.slice(0, 3)" :key="tag.id" :tag="tag" />
            <span v-if="task.tags.length > 3" class="kanban-card-more-tags">+{{ task.tags.length - 3 }}</span>
          </div>
          <div v-if="task.phase?.name" class="kanban-card-phase">
            {{ task.phase.name }}
          </div>
          <div v-if="task.gitBranch || task.gitCommit || task.gitPr" class="kanban-card-git">
            <span v-if="task.gitBranch" class="git-branch"><IconSvg name="link" :size="12" color="#64748b" /> {{ task.gitBranch }}</span>
            <span v-if="task.gitCommit" class="git-commit" :title="task.gitCommit">{{ task.gitCommit.slice(0, 7) }}</span>
            <span v-if="task.gitPr" class="git-pr">PR#{{ task.gitPr }}</span>
          </div>
          <div class="kanban-card-footer">
            <template v-if="canAssign && assigningTaskId === task.id">
              <n-select
                size="tiny"
                :value="task.assigneeId || null"
                :options="[{ label: '未指派', value: undefined }, ...(users || []).map((u) => ({ label: u.name, value: u.id }))]"
                @update:value="(v: string | null) => emitAssign(task.id, v)"
                style="width: 100px;"
              />
            </template>
            <template v-else>
              <span
                v-if="task.assignee"
                :class="canAssign ? 'kanban-card-assignee' : 'kanban-card-assignee-readonly'"
                @click.stop="canAssign ? startAssign(task.id) : null"
              >
                {{ task.assignee.name }}
              </span>
              <span
                v-else
                :class="canAssign ? 'kanban-card-unassigned' : 'kanban-card-unassigned-readonly'"
                @click.stop="canAssign ? startAssign(task.id) : null"
              >
                未指派
              </span>
            </template>
            <span v-if="task.plannedHours" class="kanban-card-hours">
              {{ task.plannedHours }}h
            </span>
          </div>
        </div>
        <div v-if="!columnTasks(column.key).length" class="kanban-empty">
          暫無任務
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NTag, NSelect } from 'naive-ui';
import IconSvg from './IconSvg.vue';
import TagBadge from './TagBadge.vue';
import type { Task, ProjectPhase } from '../types';

interface Props {
  tasks: Task[];
  mode?: string;
  phases?: ProjectPhase[];
  users?: { id: string; name: string }[];
  userRole?: string;
}

const props = defineProps<Props>();

const canEditGit = computed(() => {
  const allowed = ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'];
  return allowed.includes(props.userRole || '');
});

const canAssign = computed(() => {
  const allowed = ['ADMIN', 'PROJECT_MANAGER'];
  return allowed.includes(props.userRole || '');
});
const emit = defineEmits<{
  (e: 'update-status', taskId: string, newStatus: string): void;
  (e: 'assign', taskId: string, assigneeId: string | null): void;
  (e: 'edit-git', taskId: string): void;
}>();

const assigningTaskId = ref<string | null>(null);

const dragOverColumn = ref<string | null>(null);
const draggedTask = ref<Task | null>(null);
const draggingTaskId = ref<string | null>(null);

// 瀑布式看板欄位：按 phase 分組
const waterfallColumns = computed(() => {
  if (!props.phases?.length) return [];
  const colors = ['#64748b', '#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ec4899'];
  return props.phases.map((phase, idx) => ({
    key: phase.id,
    title: phase.name,
    color: colors[idx % colors.length],
  }));
});

// 敏捷式/混合型看板欄位：按 status 分組
const agileColumns = [
  { key: 'TODO', title: '待辦', color: '#94a3b8' },
  { key: 'IN_PROGRESS', title: '進行中', color: '#3b82f6' },
  { key: 'CODE_REVIEW', title: 'Code Review', color: '#8b5cf6' },
  { key: 'TESTING', title: '測試中', color: '#f59e0b' },
  { key: 'DONE', title: '完成', color: '#22c55e' },
];

const displayColumns = computed(() => {
  if (props.mode === 'WATERFALL') {
    return waterfallColumns.value;
  }
  return agileColumns;
});

function columnTasks(columnKey: string): Task[] {
  if (props.mode === 'WATERFALL') {
    return props.tasks.filter((t) => t.phaseId === columnKey);
  }
  return props.tasks.filter((t) => (t.status || 'TODO') === columnKey);
}

function priorityType(priority: string): any {
  const map: Record<string, string> = {
    P0: 'error',
    P1: 'warning',
    P2: 'default',
    P3: 'default',
  };
  return map[priority] || 'default';
}

function handleDragStart(task: Task) {
  draggedTask.value = task;
  draggingTaskId.value = task.id;
}

function handleDragEnd() {
  draggingTaskId.value = null;
  draggedTask.value = null;
  dragOverColumn.value = null;
}

function handleDragOver(key: string) {
  dragOverColumn.value = key;
}

function handleDragLeave() {
  dragOverColumn.value = null;
}

function handleDrop(key: string) {
  dragOverColumn.value = null;
  if (!draggedTask.value) return;

  if (props.mode === 'WATERFALL') {
    if (draggedTask.value.phaseId !== key) {
      emit('update-status', draggedTask.value.id, key);
    }
  } else {
    if (draggedTask.value.status !== key) {
      emit('update-status', draggedTask.value.id, key);
    }
  }
  draggedTask.value = null;
  draggingTaskId.value = null;
}

function startAssign(taskId: string) {
  assigningTaskId.value = taskId;
}

function emitAssign(taskId: string, assigneeId: string | null) {
  assigningTaskId.value = null;
  emit('assign', taskId, assigneeId);
}
</script>

<style scoped>
.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-column {
  flex: 1;
  min-width: 240px;
  max-width: 320px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.kanban-column.drag-over {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px #3b82f615;
  background: #f8fafc;
}

.kanban-column.drag-over .kanban-column-header {
  background: #eff6ff;
}

.kanban-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 2px solid;
  font-weight: 600;
  font-size: 14px;
}

.kanban-column-title {
  color: #1e293b;
}

.kanban-column-body {
  padding: 12px;
  flex: 1;
  min-height: 120px;
}

.kanban-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: grab;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.kanban-card:hover {
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kanban-card:active {
  cursor: grabbing;
}

.kanban-card.dragging {
  opacity: 0.5;
  transform: scale(0.98) rotate(1deg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.kanban-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kanban-card-code {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}

.kanban-card-edit {
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.kanban-card:hover .kanban-card-edit {
  opacity: 1;
}

.kanban-card-edit:hover {
  color: #3b82f6;
}

.kanban-card-title {
  font-size: 13px;
  color: #1e293b;
  line-height: 1.4;
  margin-bottom: 6px;
  word-break: break-word;
  font-weight: 500;
}
.kanban-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.kanban-card-more-tags {
  font-size: 10px;
  color: #94a3b8;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 10px;
}

.kanban-card-phase {
  font-size: 11px;
  color: #8b5cf6;
  background: #8b5cf610;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 8px;
}

.kanban-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.kanban-card-assignee {
  color: #64748b;
}

.kanban-card-unassigned {
  color: #cbd5e1;
  font-style: italic;
}

.kanban-card-assignee-readonly {
  color: #64748b;
}

.kanban-card-unassigned-readonly {
  color: #cbd5e1;
  font-style: italic;
}

.kanban-card-hours {
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.kanban-card-git {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.git-branch {
  font-size: 10px;
  color: #3b82f6;
  background: #3b82f610;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.git-commit {
  font-size: 10px;
  color: #8b5cf6;
  background: #8b5cf610;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.git-pr {
  font-size: 10px;
  color: #10b981;
  background: #10b98110;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.kanban-empty {
  text-align: center;
  color: #cbd5e1;
  font-size: 12px;
  padding: 24px 0;
}
</style>
