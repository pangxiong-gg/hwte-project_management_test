<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { RadarChart } from 'echarts/charts';
import { RadarComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { TeamMemberEfficiency } from '../types';

use([CanvasRenderer, RadarChart, RadarComponent, TooltipComponent, LegendComponent]);

const props = defineProps<{ data: TeamMemberEfficiency[] }>();

const option = computed(() => {
  const indicators = [
    { name: '任务完成率', max: 100 },
    { name: 'Bug 修复率', max: 100 },
    { name: '完成任务数', max: Math.max(...props.data.map((d) => d.completedTasks), 1) * 1.2 },
    { name: '修复 Bug 数', max: Math.max(...props.data.map((d) => d.fixedBugs), 1) * 1.2 },
    { name: '效率 (1/天数)', max: 100 },
  ];

  const seriesData = props.data.map((m) => ({
    value: [
      m.taskCompletionRate,
      m.bugFixRate,
      m.completedTasks,
      m.fixedBugs,
      m.avgCompletionDays > 0 ? Math.min(100, Math.round(10 / m.avgCompletionDays)) : 0,
    ],
    name: m.name,
  }));

  return {
    tooltip: {},
    legend: { data: props.data.map((d) => d.name), bottom: 0 },
    radar: { indicator: indicators, radius: '65%' },
    series: [{ type: 'radar', data: seriesData }],
  };
});
</script>

<style scoped>
.chart { height: 280px; }
</style>
