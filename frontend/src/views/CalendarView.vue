<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">日曆</h1>
        <p class="page-subtitle">任務截止日、專案截止日、Sprint 時間線</p>
      </div>
      <div class="glass-tabs">
        <button class="glass-tab" @click="prevMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="calendar-month">{{ year }} 年 {{ month }} 月</div>
        <button class="glass-tab" @click="nextMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>

    <div class="glass-card">
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
    </div>

    <!-- Legend -->
    <div class="calendar-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: var(--accent-blue);"></span>任務截止
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: var(--danger);"></span>專案截止
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: var(--success);"></span>Sprint 開始
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: var(--warning);"></span>Sprint 結束
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
import { useMessage, NModal, NEmpty, NTag } from 'naive-ui';
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

  const prevMonthLastDay = new Date(year.value, month.value - 1, 0).getDate();
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = prevMonthLastDay - i;
    const dateStr = formatDateStr(new Date(year.value, month.value - 2, date));
    cells.push({ date, isCurrentMonth: false, isToday: false, events: getEventsForDate(dateStr) });
  }

  const today = new Date();
  for (let i = 1; i <= totalDays; i++) {
    const dateStr = formatDateStr(new Date(year.value, month.value - 1, i));
    const isToday = today.getFullYear() === year.value && today.getMonth() === month.value - 1 && today.getDate() === i;
    cells.push({ date: i, isCurrentMonth: true, isToday, events: getEventsForDate(dateStr) });
  }

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

.glass-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--tab-bg);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
  border: 1px solid var(--tab-border);
}

.glass-tab {
  width: 36px;
  height: 36px;
  border-radius: calc(var(--radius-md) - 4px);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.glass-tab:hover {
  background: rgba(255,255,255,0.3);
  color: var(--text-primary);
}

.calendar-month {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 120px;
  text-align: center;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.calendar-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-cell {
  aspect-ratio: 1;
  background: var(--glass-inner-bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  min-height: 80px;
}

.calendar-cell:hover {
  background: var(--glass-inner-hover);
  border-color: var(--glass-border-hover);
}

.calendar-cell.today {
  background: rgba(79,106,245,0.08);
  border-color: rgba(79,106,245,0.2);
}

.calendar-cell.today .cell-date {
  color: var(--accent-blue);
  font-weight: 800;
}

.calendar-cell.other-month {
  opacity: 0.4;
}

.cell-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.cell-events {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: center;
  margin-top: 4px;
}

.cell-event-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.cell-event-more {
  font-size: 10px;
  color: var(--text-muted);
}

.calendar-legend {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
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
  background: var(--glass-inner-bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
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
  font-weight: 600;
  color: var(--text-primary);
}

.event-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.event-project {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

@media (max-width: 768px) {
  .calendar-cell {
    min-height: 50px;
    padding: 4px;
  }
  .cell-date {
    font-size: 11px;
  }
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
