<template>
  <div>
    <n-h2 style="margin: 0 0 4px 0;">日曆</n-h2>
    <n-text style="font-size: 14px; color: #64748b;">任務截止日、專案截止日、Sprint 時間線</n-text>

    <div style="margin-top: 20px;">
      <!-- Calendar Header -->
      <div class="calendar-header">
        <n-button size="small" circle @click="prevMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </n-button>
        <h3 class="calendar-title">{{ year }} 年 {{ month }} 月</h3>
        <n-button size="small" circle @click="nextMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </n-button>
      </div>

      <!-- Weekday Headers -->
      <div class="calendar-weekdays">
        <div v-for="day in weekdays" :key="day" class="calendar-weekday">{{ day }}</div>
      </div>

      <!-- Calendar Grid -->
      <div class="calendar-grid">
        <div
          v-for="(cell, index) in calendarCells"
          :key="index"
          class="calendar-cell"
          :class="{ 'other-month': !cell.isCurrentMonth, 'today': cell.isToday }"
          @click="selectDate(cell)"
        >
          <div class="cell-date">{{ cell.date }}</div>
          <div class="cell-events">
            <span
              v-for="event in cell.events.slice(0, 3)"
              :key="event.id"
              class="cell-event-dot"
              :style="{ backgroundColor: event.color }"
            ></span>
            <span v-if="cell.events.length > 3" class="cell-event-more">+{{ cell.events.length - 3 }}</span>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div style="display: flex; gap: 20px; margin-top: 16px; justify-content: center;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>任務截止
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span>專案截止
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span>Sprint 開始
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span>Sprint 結束
        </div>
      </div>
    </div>

    <!-- Date Detail Modal -->
    <n-modal v-model:show="showDetailModal" :title="selectedDateTitle" preset="card" style="width: 500px;">
      <n-empty v-if="selectedEvents.length === 0" description="暫無事件" />
      <div v-else class="event-list">
        <div
          v-for="event in selectedEvents"
          :key="event.id"
          class="event-item"
        >
          <span class="event-dot" :style="{ backgroundColor: event.color }"></span>
          <div class="event-info">
            <div class="event-title">{{ event.title }}</div>
            <div class="event-desc">{{ event.description }}</div>
            <div class="event-project">{{ event.projectName }}</div>
          </div>
          <n-tag size="tiny" :style="{ background: event.color + '15', color: event.color, borderColor: event.color + '30' }">
            {{ eventTypeLabel(event.type) }}
          </n-tag>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMessage, NH2, NText, NButton, NModal, NEmpty, NTag } from 'naive-ui';
import { calendarApi } from '../services/api';

const message = useMessage();
const loading = ref(false);
const events = ref<any[]>([]);
const currentDate = ref(new Date());
const showDetailModal = ref(false);
const selectedDate = ref<string>('');

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const year = computed(() => currentDate.value.getFullYear());
const month = computed(() => currentDate.value.getMonth() + 1);
const monthStr = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`);

const selectedDateTitle = computed(() => {
  if (!selectedDate.value) return '';
  const d = new Date(selectedDate.value);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
});

const selectedEvents = computed(() => {
  if (!selectedDate.value) return [];
  return events.value.filter((e) => e.date === selectedDate.value);
});

const calendarCells = computed(() => {
  const cells = [];
  const firstDay = new Date(year.value, month.value - 1, 1);
  const lastDay = new Date(year.value, month.value, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  // Previous month padding
  const prevMonthLastDay = new Date(year.value, month.value - 1, 0).getDate();
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = prevMonthLastDay - i;
    const dateStr = formatDateStr(new Date(year.value, month.value - 2, date));
    cells.push({ date, isCurrentMonth: false, isToday: false, events: getEventsForDate(dateStr) });
  }

  // Current month
  const today = new Date();
  for (let i = 1; i <= totalDays; i++) {
    const dateStr = formatDateStr(new Date(year.value, month.value - 1, i));
    const isToday = today.getFullYear() === year.value && today.getMonth() === month.value - 1 && today.getDate() === i;
    cells.push({ date: i, isCurrentMonth: true, isToday, events: getEventsForDate(dateStr) });
  }

  // Next month padding to fill 6 rows (42 cells)
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const dateStr = formatDateStr(new Date(year.value, month.value, i));
    cells.push({ date: i, isCurrentMonth: false, isToday: false, events: getEventsForDate(dateStr) });
  }

  return cells;
});

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getEventsForDate(dateStr: string): any[] {
  return events.value.filter((e) => e.date === dateStr);
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    TASK_DUE: '任務截止',
    PROJECT_END: '專案截止',
    SPRINT_START: 'Sprint 開始',
    SPRINT_END: 'Sprint 結束',
  };
  return map[type] || type;
}

function prevMonth() {
  currentDate.value = new Date(year.value, month.value - 2, 1);
}

function nextMonth() {
  currentDate.value = new Date(year.value, month.value, 1);
}

function selectDate(cell: any) {
  const d = new Date(year.value, month.value - 1 + (cell.isCurrentMonth ? 0 : cell.date < 15 ? 1 : -1), cell.date);
  selectedDate.value = formatDateStr(d);
  showDetailModal.value = true;
}

async function loadEvents() {
  loading.value = true;
  try {
    const res = await calendarApi.getEvents(monthStr.value);
    events.value = res.data.events || [];
  } catch (err: any) {
    message.error('載入日曆事件失敗');
  } finally {
    loading.value = false;
  }
}

watch(monthStr, loadEvents, { immediate: true });
</script>

<style scoped>
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}
.calendar-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  min-width: 140px;
  text-align: center;
}
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e2e8f0;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}
.calendar-weekday {
  background: #f8fafc;
  padding: 10px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e2e8f0;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
.calendar-cell {
  background: white;
  padding: 8px;
  min-height: 80px;
  cursor: pointer;
  transition: background 0.15s;
}
.calendar-cell:hover {
  background: #f8fafc;
}
.calendar-cell.other-month {
  background: #fafbfc;
  color: #cbd5e1;
}
.calendar-cell.today {
  background: #eff6ff;
}
.calendar-cell.today .cell-date {
  color: #3b82f6;
  font-weight: 600;
}
.cell-date {
  font-size: 13px;
  color: #334155;
  margin-bottom: 4px;
}
.cell-events {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: center;
}
.cell-event-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.cell-event-more {
  font-size: 10px;
  color: #94a3b8;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.event-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}
.event-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.event-info {
  flex: 1;
  min-width: 0;
}
.event-title {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}
.event-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}
.event-project {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
</style>
