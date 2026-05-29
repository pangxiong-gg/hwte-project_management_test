<template>
  <n-layout has-sider class="dashboard">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="200"
      show-trigger
    >
      <div class="logo">PM</div>
      <n-menu
        :options="menuOptions"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="header">
        <div class="header-left">
          <span>{{ authStore.user?.name }}</span>
          <n-tag size="small" type="info">{{ authStore.user?.role }}</n-tag>
        </div>
        <div class="header-right">
          <button class="notification-btn">
            <span style="font-size: 18px;">&#128276;</span>
            <span class="badge">3</span>
          </button>
          <div class="header-user">
            <div class="user-avatar">王</div>
            <div>
              <div class="user-name">王小明</div>
              <div class="user-role">系統管理員</div>
            </div>
          </div>
        </div>
      </n-layout-header>

      <n-layout-content class="content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { useRouter } from 'vue-router';
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
  NMenu, NTag,
} from 'naive-ui';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function renderIcon(icon: string) {
  return () => h('span', { style: 'font-size: 18px;' }, icon);
}

const menuOptions = [
  {
    label: '專案總覽',
    key: '/',
    icon: renderIcon('&#9638;'),
  },
];

function handleMenuSelect(key: string) {
  router.push(key);
}
</script>

<style scoped>
.dashboard {
  height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: bold;
  border-bottom: 1px solid #334155;
}

.header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-btn {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: #ef4444;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
}

.header-user:hover {
  background: #334155;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
}

.user-role {
  font-size: 11px;
  color: #64748b;
}

.content {
  padding: 24px;
}
</style>
