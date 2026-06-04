<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="color"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    style="flex-shrink: 0;"
  >
    <!-- clock: 时钟 -->
    <template v-if="name === 'clock'">
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 7v5l3 3" />
    </template>

    <!-- loader: 齿轮/进行中 -->
    <template v-if="name === 'loader'">
      <path d="M12 6V3" />
      <path d="M16.25 7.75L18.4 5.6" />
      <path d="M18 12h3" />
      <path d="M16.25 16.25L18.4 18.4" />
      <path d="M12 18v3" />
      <path d="M7.75 16.25L5.6 18.4" />
      <path d="M6 12H3" />
      <path d="M7.75 7.75L5.6 5.6" />
    </template>

    <!-- check-circle: 已完成 -->
    <template v-if="name === 'check-circle'">
      <path d="M9 12l2 2l4 -4" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    </template>

    <!-- alert-triangle: 警告/逾期 -->
    <template v-if="name === 'alert-triangle'">
      <path d="M12 9v4" />
      <path d="M10.363 3.591L2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87L13.637 3.59a1.914 1.914 0 0 0 -3.274 0z" />
      <path d="M12 16h.01" />
    </template>

    <!-- search: 搜索 -->
    <template v-if="name === 'search'">
      <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
      <path d="M21 21l-6 -6" />
    </template>

    <!-- folder: 项目/文件夹 -->
    <template v-if="name === 'folder'">
      <path d="M5 4h4l3 3h7a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1H5a1 1 0 0 1 -1 -1V5a1 1 0 0 1 1 -1" />
    </template>

    <!-- file-text: 需求/文档 -->
    <template v-if="name === 'file-text'">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
      <path d="M9 9h1" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </template>

    <!-- calendar: 日历 -->
    <template v-if="name === 'calendar'">
      <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2V7z" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M4 11h16" />
    </template>

    <!-- layout-grid: 看板 -->
    <template v-if="name === 'layout-grid'">
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </template>

    <!-- list: 列表 -->
    <template v-if="name === 'list'">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M5 6v.01" />
      <path d="M5 12v.01" />
      <path d="M5 18v.01" />
    </template>

    <!-- play: 播放/开始 -->
    <template v-if="name === 'play'">
      <path d="M7 4v16l13 -8z" />
    </template>

    <!-- check: 勾选 -->
    <template v-if="name === 'check'">
      <path d="M5 12l5 5l9 -9" />
    </template>

    <!-- arrow-right: 箭头/进入详情 -->
    <template v-if="name === 'arrow-right'">
      <path d="M5 12h14" />
      <path d="M13 18l6 -6" />
      <path d="M13 6l6 6" />
    </template>

    <!-- tag: 标签 -->
    <template v-if="name === 'tag'">
      <path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M3 7v4.172a2 2 0 0 0 .586 1.414l5.71 5.71a2.41 2.41 0 0 0 3.408 0l3.592 -3.592a2.41 2.41 0 0 0 0 -3.408l-5.71 -5.71A2 2 0 0 0 11.172 3H7a2 2 0 0 0 -2 2z" />
    </template>

    <!-- edit: 编辑/工时 -->
    <template v-if="name === 'edit'">
      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97L9 12v3h3l8.385 -8.415z" />
    </template>

    <!-- user: 用户 -->
    <template v-if="name === 'user'">
      <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    </template>

    <!-- users: 团队 -->
    <template v-if="name === 'users'">
      <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
    </template>

    <!-- bell: 通知铃铛 -->
    <template v-if="name === 'bell'">
      <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
      <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    </template>

    <!-- link: 链接 -->
    <template v-if="name === 'link'">
      <path d="M9 15l6 -6" />
      <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
      <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
    </template>

    <!-- star: 星星/里程碑 -->
    <template v-if="name === 'star'">
      <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
    </template>

    <!-- dashboard: 專案總覽 / 四宮格 -->
    <template v-if="name === 'dashboard'">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </template>

    <!-- task-square: 我的任務 / 帶勾方塊 -->
    <template v-if="name === 'task-square'">
      <path d="M9 11l3 3l8 -8" />
      <path d="M20 12v6a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2V6a2 2 0 0 1 2 -2h11" />
    </template>

    <!-- chart-bar: 資源負載 / 柱狀圖 -->
    <template v-if="name === 'chart-bar'">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </template>

    <!-- sun: 太阳/浅色主题 -->
    <template v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M3 12h1" />
      <path d="M12 3v1" />
      <path d="M20 12h1" />
      <path d="M12 20v1" />
      <path d="M5.6 5.6l.7 .7" />
      <path d="M18.4 5.6l-.7 .7" />
      <path d="M17.7 17.7l.7 .7" />
      <path d="M6.3 17.7l-.7 .7" />
    </template>

    <!-- moon: 月亮/深色主题 -->
    <template v-if="name === 'moon'">
      <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  size?: number | string;
  color?: string;
}>();
</script>
