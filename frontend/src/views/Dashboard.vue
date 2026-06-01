<template>
  <n-layout has-sider class="dashboard">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="200"
      show-trigger
    >
      <div class="logo">數位化專案管理系統</div>
      <n-menu
        :options="menuOptions"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :value="$route.path"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="header">
        <div class="header-left"></div>
        <div class="header-right">
          <n-popover trigger="click" placement="bottom-end" style="padding: 0; max-width: 360px;">
            <template #trigger>
              <button class="notification-btn">
                <span style="font-size: 18px;">&#128276;</span>
                <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
              </button>
            </template>
            <div class="notification-panel">
              <div class="notification-header">
                <span>通知</span>
                <n-button v-if="unreadCount > 0" text size="small" @click="markAllRead">全部標記已讀</n-button>
              </div>
              <n-list v-if="notifications.length > 0" style="max-height: 320px; overflow-y: auto;">
                <n-list-item
                  v-for="n in notifications"
                  :key="n.id"
                  :class="{ unread: !n.isRead }"
                  @click="handleNotificationClick(n)"
                >
                  <n-thing :title="n.title" :description="n.content" style="cursor: pointer;">
                    <template #description>
                      <div style="font-size: 12px; color: #94a3b8;">{{ n.content }}</div>
                      <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">{{ formatTime(n.createdAt) }}</div>
                    </template>
                  </n-thing>
                </n-list-item>
              </n-list>
              <n-empty v-else description="暫無通知" style="padding: 24px;" />
            </div>
          </n-popover>
          <n-dropdown
            :options="userMenuOptions"
            @select="handleUserMenuSelect"
            trigger="click"
            placement="bottom-end"
          >
            <div class="header-user">
              <div class="user-avatar">{{ userInitial }}</div>
              <div>
                <div class="user-name">{{ authStore.user?.name || '使用者' }}</div>
                <div class="user-role">{{ authStore.user?.role || '' }}</div>
              </div>
            </div>
          </n-dropdown>
        </div>
      </n-layout-header>

      <n-layout-content class="content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
  NMenu, NPopover, NList, NListItem, NThing, NButton, NEmpty, NDropdown,
} from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { notificationApi } from '../services/api';
import type { Notification } from '../types';

const router = useRouter();
const authStore = useAuthStore();

const notifications = ref<Notification[]>([]);
const unreadCount = ref(0);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const userInitial = computed(() => {
  const name = authStore.user?.name || '';
  return name.charAt(0) || 'U';
});

async function loadNotifications() {
  try {
    const res = await notificationApi.getAll();
    notifications.value = res.data.notifications;
    unreadCount.value = res.data.unreadCount;
  } catch (e) {
    // silent fail
  }
}

async function markAllRead() {
  try {
    await notificationApi.markAllRead();
    await loadNotifications();
  } catch (e) {
    // silent fail
  }
}

async function handleNotificationClick(n: Notification) {
  if (!n.isRead) {
    await notificationApi.markRead(n.id);
    await loadNotifications();
  }
  // 如果有關聯頁面，可以導航過去
  if (n.relatedType === 'TASK' && n.projectId) {
    router.push(`/projects/${n.projectId}?tab=tasks`);
  } else if (n.relatedType === 'BUG' && n.projectId) {
    router.push(`/projects/${n.projectId}?tab=bugs`);
  } else if (n.relatedType === 'REQUIREMENT' && n.projectId) {
    router.push(`/projects/${n.projectId}?tab=requirements`);
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderIcon(icon: string) {
  return () => h('span', { style: 'font-size: 18px;', innerHTML: icon });
}

const menuOptions = computed(() => {
  const items = [
    {
      label: '專案總覽',
      key: '/',
      icon: renderIcon('&#9638;'),
    },
  ];
  if (authStore.user?.role === 'ADMIN') {
    items.push({
      label: '用戶管理',
      key: '/users',
      icon: renderIcon('&#9787;'),
    });
  }
  return items;
});

const userMenuOptions = [
  { label: '個人資料', key: 'profile' },
  { label: '登出', key: 'logout' },
];

function handleMenuSelect(key: string) {
  router.push(key);
}

function handleUserMenuSelect(key: string) {
  if (key === 'logout') {
    authStore.logout();
  } else if (key === 'profile') {
    router.push('/profile');
  } else if (key === 'users') {
    router.push('/users');
  }
}

onMounted(() => {
  loadNotifications();
  pollInterval = setInterval(loadNotifications, 30000); // 每 30 秒輪詢
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
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

.notification-panel {
  background: #1e293b;
  border-radius: 8px;
  overflow: hidden;
  min-width: 300px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #334155;
  font-weight: 600;
  font-size: 14px;
}

.notification-panel :deep(.n-list-item) {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.notification-panel :deep(.n-list-item):hover {
  background: #334155;
}

.notification-panel :deep(.n-list-item.unread) {
  background: #1e3a5f40;
  border-left: 3px solid #3b82f6;
}

.notification-panel :deep(.n-list-item.unread):hover {
  background: #1e3a5f60;
}
</style>
