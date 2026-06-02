<template>
  <div>
    <div style="display: flex; gap: 16px; margin-bottom: 16px;">
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
          待分配任務
        </div>
        <div class="sprint-pool">
          <div
            v-for="task in unassignedTasks"
            :key="task.id"
            class="sprint-task-card"
            draggable="true"
            @dragstart="handleDragStart(task)"
            @dragend="handleDragEnd"
          >
            <div class="task-code">{{ task.taskCode }}</div>
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
              <n-tag size="tiny" :type="priorityType(task.priority)">{{ task.priority }}</n-tag>
              <span v-if="task.plannedHours" class="task-hours">{{ task.plannedHours }}h</span>
            </div>
          </div>
          <n-empty v-if="unassignedTasks.length === 0" description="暫無任務" size="small" />
        </div>
      </div>
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
          Sprint 任務 ({{ sprintTasks.length }})
        </div>
        <div
          class="sprint-pool sprint-drop-zone"
          :class="{ 'drag-over': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="handleDrop"
        >
          <div
            v-for="task in sprintTasks"
            :key="task.id"
            class="sprint-task-card"
          >
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="task-code">{{ task.taskCode }}</span>
              <n-button size="tiny" text type="error" @click="removeTask(task.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </n-button>
            </div>
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
              <n-tag size="tiny" :type="priorityType(task.priority)">{{ task.priority }}</n-tag>
              <span v-if="task.plannedHours" class="task-hours">{{ task.plannedHours }}h</span>
            </div>
          </div>
          <n-empty v-if="sprintTasks.length === 0" description="拖拽任務到這裡" size="small" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMessage, NTag, NEmpty, NButton } from 'naive-ui';
import { taskApi } from '../services/api';
import type { Task, Sprint } from '../types';

const props = defineProps<{
  sprint: Sprint;
  projectId: string;
  allTasks: Task[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const message = useMessage();
const draggedTask = ref<Task | null>(null);
const dragOver = ref(false);

const sprintTasks = computed(() => {
  return props.allTasks.filter((t) => t.sprintId === props.sprint.id);
});

const unassignedTasks = computed(() => {
  return props.allTasks.filter((t) => !t.sprintId && t.status !== 'DONE');
});

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
}

function handleDragEnd() {
  draggedTask.value = null;
  dragOver.value = false;
}

async function handleDrop() {
  dragOver.value = false;
  if (!draggedTask.value) return;
  if (draggedTask.value.sprintId === props.sprint.id) return;

  try {
    await taskApi.update(props.projectId, draggedTask.value.id, { sprintId: props.sprint.id });
    message.success('任務已分配到 Sprint');
    emit('refresh');
  } catch (err: any) {
    message.error('分配失敗');
  }
  draggedTask.value = null;
}

async function removeTask(taskId: string) {
  try {
    await taskApi.update(props.projectId, taskId, { sprintId: null });
    message.success('任務已移出 Sprint');
    emit('refresh');
  } catch (err: any) {
    message.error('移除失敗');
  }
}
</script>

<style scoped>
.sprint-pool {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}
.sprint-drop-zone {
  transition: background 0.2s, border-color 0.2s;
}
.sprint-drop-zone.drag-over {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px #3b82f615;
}
.sprint-task-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: grab;
  transition: box-shadow 0.15s;
}
.sprint-task-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.sprint-task-card:active {
  cursor: grabbing;
}
.task-code {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}
.task-title {
  font-size: 13px;
  color: #1e293b;
  margin: 4px 0;
  line-height: 1.4;
}
.task-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}
.task-hours {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
