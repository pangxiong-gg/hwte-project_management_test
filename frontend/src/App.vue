<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { darkTheme } from 'naive-ui';
import { useThemeStore } from './stores/theme';

const themeStore = useThemeStore();
const theme = computed(() => themeStore.isDark ? darkTheme : null);
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ========== Light theme (Glassmorphism) ========== */
:root, body[data-theme="light"] {
  /* Background gradient */
  --bg-body: linear-gradient(135deg, #e8ecff 0%, #f0e8ff 40%, #fff0f8 100%);
  --bg-body-fallback: #e8ecff;

  /* Glass card */
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-bg-hover: rgba(255, 255, 255, 0.38);
  --glass-border: rgba(255, 255, 255, 0.5);
  --glass-border-hover: rgba(255, 255, 255, 0.7);
  --glass-shadow: 0 8px 32px rgba(79, 106, 245, 0.08), inset 0 1px 0 rgba(255,255,255,0.4);
  --glass-shadow-hover: 0 12px 48px rgba(79, 106, 245, 0.15), inset 0 1px 0 rgba(255,255,255,0.5);

  /* Inner glass */
  --glass-inner-bg: rgba(255, 255, 255, 0.35);
  --glass-inner-hover: rgba(255, 255, 255, 0.55);

  /* Sidebar glass */
  --sidebar-bg: rgba(255, 255, 255, 0.15);
  --sidebar-border: rgba(255, 255, 255, 0.4);

  /* Text */
  --text-primary: #1a1a3e;
  --text-secondary: #4a4a6e;
  --text-muted: #8888a8;

  /* Accent colors */
  --accent-blue: #4f6af5;
  --accent-purple: #8b5cf6;
  --accent-cyan: #06b6d4;
  --accent-pink: #ec4899;

  /* Functional colors */
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;

  /* Header */
  --bg-header: rgba(255, 255, 255, 0.2);
  --header-border: rgba(255, 255, 255, 0.4);

  /* Search / Input */
  --search-bg: rgba(255, 255, 255, 0.35);
  --search-border: rgba(255, 255, 255, 0.4);
  --search-focus-border: var(--accent-blue);

  /* Tab */
  --tab-bg: rgba(255, 255, 255, 0.25);
  --tab-active-bg: rgba(255, 255, 255, 0.6);
  --tab-border: rgba(255, 255, 255, 0.4);

  /* Button ghost */
  --btn-ghost-bg: rgba(255, 255, 255, 0.35);
  --btn-ghost-border: rgba(255, 255, 255, 0.4);
  --btn-ghost-hover: rgba(255, 255, 255, 0.55);

  /* Notification */
  --notification-bg: rgba(255, 255, 255, 0.85);
  --notification-border: rgba(255, 255, 255, 0.6);
  --notification-hover: rgba(255, 255, 255, 0.95);
  --notification-unread-bg: rgba(79, 106, 245, 0.06);

  /* Login */
  --login-bg: linear-gradient(135deg, #e8ecff 0%, #f0e8ff 40%, #fff0f8 100%);
  --login-card-bg: rgba(255, 255, 255, 0.3);

  /* Progress bar */
  --progress-track: rgba(0, 0, 0, 0.04);

  /* Table */
  --table-header-bg: rgba(255, 255, 255, 0.4);
  --table-row-hover: rgba(255, 255, 255, 0.5);
  --table-border: rgba(255, 255, 255, 0.35);

  /* Code bg */
  --code-bg: rgba(255, 255, 255, 0.4);

  /* Search result */
  --search-result-hover: rgba(255, 255, 255, 0.5);

  /* Radius */
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
}

/* ========== Dark theme (Dark Glassmorphism) ========== */
body[data-theme="dark"] {
  --bg-body: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 40%, #1e1b4b 100%);
  --bg-body-fallback: #0f0f23;

  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-bg-hover: rgba(255, 255, 255, 0.10);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-hover: rgba(255, 255, 255, 0.20);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.06);
  --glass-shadow-hover: 0 12px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.10);

  --glass-inner-bg: rgba(255, 255, 255, 0.05);
  --glass-inner-hover: rgba(255, 255, 255, 0.10);

  --sidebar-bg: rgba(0, 0, 0, 0.25);
  --sidebar-border: rgba(255, 255, 255, 0.10);

  --text-primary: #e8e8f0;
  --text-secondary: #a0a0c0;
  --text-muted: #686888;

  --accent-blue: #6b7ff5;
  --accent-purple: #a78bfa;
  --accent-cyan: #22d3ee;
  --accent-pink: #f472b6;

  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;

  --bg-header: rgba(0, 0, 0, 0.20);
  --header-border: rgba(255, 255, 255, 0.10);

  --search-bg: rgba(255, 255, 255, 0.08);
  --search-border: rgba(255, 255, 255, 0.12);
  --search-focus-border: var(--accent-blue);

  --tab-bg: rgba(255, 255, 255, 0.06);
  --tab-active-bg: rgba(255, 255, 255, 0.12);
  --tab-border: rgba(255, 255, 255, 0.12);

  --btn-ghost-bg: rgba(255, 255, 255, 0.08);
  --btn-ghost-border: rgba(255, 255, 255, 0.12);
  --btn-ghost-hover: rgba(255, 255, 255, 0.15);

  --notification-bg: rgba(30, 30, 60, 0.95);
  --notification-border: rgba(255, 255, 255, 0.1);
  --notification-hover: rgba(40, 40, 80, 0.95);
  --notification-unread-bg: rgba(79, 106, 245, 0.1);

  --login-bg: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 40%, #1e1b4b 100%);
  --login-card-bg: rgba(255, 255, 255, 0.06);

  --progress-track: rgba(255, 255, 255, 0.06);

  --table-header-bg: rgba(255, 255, 255, 0.06);
  --table-row-hover: rgba(255, 255, 255, 0.08);
  --table-border: rgba(255, 255, 255, 0.08);

  --code-bg: rgba(255, 255, 255, 0.06);
  --search-result-hover: rgba(255, 255, 255, 0.08);
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-body);
  background-attachment: fixed;
  color: var(--text-primary);
  min-height: 100vh;
}

/* Background light spots for glass effect */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    radial-gradient(ellipse 600px 400px at 15% 20%, rgba(79, 106, 245, 0.18), transparent),
    radial-gradient(ellipse 500px 350px at 80% 70%, rgba(139, 92, 246, 0.15), transparent),
    radial-gradient(ellipse 400px 300px at 60% 10%, rgba(236, 72, 153, 0.10), transparent),
    radial-gradient(ellipse 450px 350px at 30% 80%, rgba(6, 182, 212, 0.12), transparent);
  pointer-events: none;
  z-index: 0;
}

/* Grid pattern */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(79, 106, 245, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79, 106, 245, 0.04) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(79, 106, 245, 0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(79, 106, 245, 0.25); }

/* Naive UI overrides for glass theme */
body[data-theme="light"] .n-card {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--glass-shadow) !important;
}

body[data-theme="dark"] .n-card {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--glass-shadow) !important;
}

/* Layout — transparent so body gradient shows through */
body[data-theme="light"] .n-layout,
body[data-theme="dark"] .n-layout {
  background: transparent !important;
}

body[data-theme="light"] .n-layout-header {
  background: var(--bg-header) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border-bottom: 1px solid var(--header-border) !important;
}

body[data-theme="dark"] .n-layout-header {
  background: var(--bg-header) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border-bottom: 1px solid var(--header-border) !important;
}

body[data-theme="light"] .n-card-header {
  border-bottom: 1px solid var(--glass-border) !important;
}

body[data-theme="dark"] .n-card-header {
  border-bottom: 1px solid var(--glass-border) !important;
}

body[data-theme="light"] .n-data-table .n-data-table-thead {
  background: var(--table-header-bg) !important;
}

body[data-theme="dark"] .n-data-table .n-data-table-thead {
  background: var(--table-header-bg) !important;
}

body[data-theme="light"] .n-data-table .n-data-table-th {
  background: transparent !important;
  border-bottom: 1px solid var(--table-border) !important;
}

body[data-theme="dark"] .n-data-table .n-data-table-th {
  background: transparent !important;
  border-bottom: 1px solid var(--table-border) !important;
}

body[data-theme="light"] .n-data-table .n-data-table-td {
  border-bottom: 1px solid var(--table-border) !important;
}

body[data-theme="dark"] .n-data-table .n-data-table-td {
  border-bottom: 1px solid var(--table-border) !important;
}

body[data-theme="light"] .n-data-table .n-data-table-tr:hover .n-data-table-td {
  background: var(--table-row-hover) !important;
}

body[data-theme="dark"] .n-data-table .n-data-table-tr:hover .n-data-table-td {
  background: var(--table-row-hover) !important;
}

body[data-theme="light"] .n-modal,
body[data-theme="dark"] .n-modal {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(30px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(30px) saturate(1.3) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--glass-shadow-hover) !important;
}

body[data-theme="light"] .n-drawer,
body[data-theme="dark"] .n-drawer {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(30px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(30px) saturate(1.3) !important;
  border-left: 1px solid var(--glass-border) !important;
}

body[data-theme="light"] .n-tabs .n-tabs-nav {
  background: var(--tab-bg) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--tab-border) !important;
  padding: 4px !important;
  width: fit-content !important;
}

body[data-theme="dark"] .n-tabs .n-tabs-nav {
  background: var(--tab-bg) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--tab-border) !important;
  padding: 4px !important;
  width: fit-content !important;
}

body[data-theme="light"] .n-tabs .n-tabs-tab {
  border-radius: calc(var(--radius-md) - 4px) !important;
  transition: all 0.2s !important;
}

body[data-theme="dark"] .n-tabs .n-tabs-tab {
  border-radius: calc(var(--radius-md) - 4px) !important;
  transition: all 0.2s !important;
}

body[data-theme="light"] .n-tabs .n-tabs-tab.n-tabs-tab--active {
  background: var(--tab-active-bg) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
}

body[data-theme="dark"] .n-tabs .n-tabs-tab.n-tabs-tab--active {
  background: var(--tab-active-bg) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
}

body[data-theme="light"] .n-statistic .n-statistic__label {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--text-muted) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.8px !important;
}

body[data-theme="dark"] .n-statistic .n-statistic__label {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--text-muted) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.8px !important;
}

body[data-theme="light"] .n-statistic .n-statistic__value {
  font-size: 28px !important;
  font-weight: 800 !important;
  letter-spacing: -1px !important;
  color: var(--text-primary) !important;
}

body[data-theme="dark"] .n-statistic .n-statistic__value {
  font-size: 28px !important;
  font-weight: 800 !important;
  letter-spacing: -1px !important;
  color: var(--text-primary) !important;
}

body[data-theme="light"] .n-input .n-input__input-el,
body[data-theme="light"] .n-input .n-input__textarea-el {
  background: var(--search-bg) !important;
}

body[data-theme="dark"] .n-input .n-input__input-el,
body[data-theme="dark"] .n-input .n-input__textarea-el {
  background: var(--search-bg) !important;
}

body[data-theme="light"] .n-select .n-base-selection {
  background: var(--search-bg) !important;
  border: 1px solid var(--search-border) !important;
}

body[data-theme="dark"] .n-select .n-base-selection {
  background: var(--search-bg) !important;
  border: 1px solid var(--search-border) !important;
}

body[data-theme="light"] .n-menu .n-menu-item-content--selected {
  background: linear-gradient(135deg, rgba(79,106,245,0.12), rgba(139,92,246,0.12)) !important;
}

body[data-theme="dark"] .n-menu .n-menu-item-content--selected {
  background: linear-gradient(135deg, rgba(79,106,245,0.2), rgba(139,92,246,0.2)) !important;
}

body[data-theme="light"] .n-menu .n-menu-item-content--selected::before {
  content: '' !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 3px !important;
  height: 20px !important;
  background: linear-gradient(180deg, var(--accent-blue), var(--accent-purple)) !important;
  border-radius: 0 3px 3px 0 !important;
}

body[data-theme="dark"] .n-menu .n-menu-item-content--selected::before {
  content: '' !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 3px !important;
  height: 20px !important;
  background: linear-gradient(180deg, var(--accent-blue), var(--accent-purple)) !important;
  border-radius: 0 3px 3px 0 !important;
}

/* Alert glass style */
body[data-theme="light"] .n-alert {
  background: var(--glass-inner-bg) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-md) !important;
}

body[data-theme="dark"] .n-alert {
  background: var(--glass-inner-bg) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-md) !important;
}

/* Tag glass style */
body[data-theme="light"] .n-tag {
  background: rgba(79,106,245,0.08) !important;
  border-color: rgba(79,106,245,0.15) !important;
  border-radius: 8px !important;
}

body[data-theme="dark"] .n-tag {
  background: rgba(79,106,245,0.1) !important;
  border-color: rgba(79,106,245,0.2) !important;
  border-radius: 8px !important;
}

/* Form glass style */
body[data-theme="light"] .n-form-item .n-form-item-label {
  color: var(--text-secondary) !important;
  font-weight: 500 !important;
}

body[data-theme="dark"] .n-form-item .n-form-item-label {
  color: var(--text-secondary) !important;
  font-weight: 500 !important;
}

/* Descriptions glass */
body[data-theme="light"] .n-descriptions .n-descriptions-header {
  border-bottom: 1px solid var(--glass-border) !important;
}

body[data-theme="dark"] .n-descriptions .n-descriptions-header {
  border-bottom: 1px solid var(--glass-border) !important;
}

body[data-theme="light"] .n-descriptions .n-descriptions-table-content {
  border-bottom: 1px solid var(--glass-border) !important;
}

body[data-theme="dark"] .n-descriptions .n-descriptions-table-content {
  border-bottom: 1px solid var(--glass-border) !important;
}

body[data-theme="light"] .n-descriptions .n-descriptions-table-header {
  background: var(--glass-inner-bg) !important;
}

body[data-theme="dark"] .n-descriptions .n-descriptions-table-header {
  background: var(--glass-inner-bg) !important;
}

/* Popover / Dropdown glass */
body[data-theme="light"] .n-popover {
  background: var(--notification-bg) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border: 1px solid var(--notification-border) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--glass-shadow-hover) !important;
}

body[data-theme="dark"] .n-popover {
  background: var(--notification-bg) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border: 1px solid var(--notification-border) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--glass-shadow-hover) !important;
}

body[data-theme="light"] .n-dropdown-menu {
  background: var(--notification-bg) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border: 1px solid var(--notification-border) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--glass-shadow-hover) !important;
}

body[data-theme="dark"] .n-dropdown-menu {
  background: var(--notification-bg) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border: 1px solid var(--notification-border) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--glass-shadow-hover) !important;
}

/* Spin loader color */
body[data-theme="light"] .n-spin {
  color: var(--accent-blue) !important;
}

body[data-theme="dark"] .n-spin {
  color: var(--accent-blue) !important;
}

/* Empty state */
body[data-theme="light"] .n-empty .n-empty__description {
  color: var(--text-muted) !important;
}

body[data-theme="dark"] .n-empty .n-empty__description {
  color: var(--text-muted) !important;
}

/* Progress bar */
body[data-theme="light"] .n-progress .n-progress-graph-line-fill {
  border-radius: 4px !important;
}

body[data-theme="dark"] .n-progress .n-progress-graph-line-fill {
  border-radius: 4px !important;
}

/* Timeline */
body[data-theme="light"] .n-timeline .n-timeline-item-content__title {
  color: var(--text-primary) !important;
}

body[data-theme="dark"] .n-timeline .n-timeline-item-content__title {
  color: var(--text-primary) !important;
}

body[data-theme="light"] .n-timeline .n-timeline-item-content__content {
  color: var(--text-secondary) !important;
}

body[data-theme="dark"] .n-timeline .n-timeline-item-content__content {
  color: var(--text-secondary) !important;
}

/* List */
body[data-theme="light"] .n-list {
  background: transparent !important;
}

body[data-theme="dark"] .n-list {
  background: transparent !important;
}

body[data-theme="light"] .n-list-item {
  border-bottom: 1px solid var(--glass-border) !important;
}

body[data-theme="dark"] .n-list-item {
  border-bottom: 1px solid var(--glass-border) !important;
}

/* Button primary gradient */
body[data-theme="light"] .n-button.n-button--primary-type:not(.n-button--ghost) {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)) !important;
  box-shadow: 0 4px 16px rgba(79, 106, 245, 0.25) !important;
  border: none !important;
}

body[data-theme="dark"] .n-button.n-button--primary-type:not(.n-button--ghost) {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)) !important;
  box-shadow: 0 4px 16px rgba(79, 106, 245, 0.3) !important;
  border: none !important;
}

body[data-theme="light"] .n-button.n-button--primary-type:not(.n-button--ghost):hover {
  box-shadow: 0 6px 24px rgba(79, 106, 245, 0.35) !important;
  transform: translateY(-1px) !important;
}

body[data-theme="dark"] .n-button.n-button--primary-type:not(.n-button--ghost):hover {
  box-shadow: 0 6px 24px rgba(79, 106, 245, 0.4) !important;
  transform: translateY(-1px) !important;
}

/* Pagination */
body[data-theme="light"] .n-pagination .n-pagination-item {
  background: var(--glass-inner-bg) !important;
  border: 1px solid var(--glass-border) !important;
}

body[data-theme="dark"] .n-pagination .n-pagination-item {
  background: var(--glass-inner-bg) !important;
  border: 1px solid var(--glass-border) !important;
}

body[data-theme="light"] .n-pagination .n-pagination-item--active {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)) !important;
  border-color: transparent !important;
}

body[data-theme="dark"] .n-pagination .n-pagination-item--active {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)) !important;
  border-color: transparent !important;
}
</style>
