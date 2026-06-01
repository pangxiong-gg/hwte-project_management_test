<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { BugTrendPoint } from '../types';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps<{ data: BugTrendPoint[] }>();

const option = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['发现', '修复'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: props.data.map((d) => d.date.slice(5)) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    { name: '发现', type: 'line', data: props.data.map((d) => d.opened), smooth: true, itemStyle: { color: '#ef4444' }, areaStyle: { opacity: 0.1 } },
    { name: '修复', type: 'line', data: props.data.map((d) => d.closed), smooth: true, itemStyle: { color: '#22c55e' }, areaStyle: { opacity: 0.1 } },
  ],
}));
</script>

<style scoped>
.chart { height: 280px; }
</style>
