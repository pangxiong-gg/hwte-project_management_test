<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { ProjectProgress } from '../types';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps<{ data: ProjectProgress[] }>();

const option = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['任务完成率', '需求完成率'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
  xAxis: { type: 'category', data: props.data.map((p) => p.name), axisLabel: { rotate: 30 } },
  yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
  series: [
    { name: '任务完成率', type: 'bar', data: props.data.map((p) => p.taskCompletionRate), itemStyle: { color: '#3b82f6' } },
    { name: '需求完成率', type: 'bar', data: props.data.map((p) => p.reqCompletionRate), itemStyle: { color: '#10b981' } },
  ],
}));
</script>

<style scoped>
.chart { height: 280px; }
</style>
