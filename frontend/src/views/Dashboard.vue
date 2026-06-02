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
        <div class="header-left">
          <n-input
            v-model:value="searchQuery"
            placeholder="全局搜索任務/需求/Bug..."
            size="small"
            style="width: 280px;"
            clearable
            @keyup.enter="handleSearch"
            @clear="showSearchModal = false"
          >
            <template #prefix>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </template>
          </n-input>
        </div>
        <div class="header-right">
          <n-popover trigger="click" placement="bottom-end" style="padding: 0; max-width: 360px;">
            <template #trigger>
              <button class="notification-btn">
                <IconSvg name="bell" :size="18" color="#94a3b8" />
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

      <!-- Search Modal -->
      <n-modal
        v-model:show="showSearchModal"
        title="搜索結果"
        preset="card"
        style="width: 600px; max-height: 70vh;"
      >
        <n-spin v-if="searchLoading" style="padding: 40px;" />
        <n-empty v-else-if="!searchResults.tasks?.length && !searchResults.requirements?.length && !searchResults.bugs?.length && !searchResults.projects?.length" description="暫無結果" />
        <div v-else class="search-results">
          <div v-if="searchResults.projects?.length > 0" class="search-section">
            <div class="search-section-title">專案</div>
            <div
              v-for="item in searchResults.projects"
              :key="item.id"
              class="search-result-item"
              @click="navigateToSearchResult('project', item)"
            >
              <span class="search-result-code">{{ item.code }}</span>
              <span class="search-result-name">{{ item.name }}</span>
            </div>
          </div>
          <div v-if="searchResults.tasks?.length > 0" class="search-section">
            <div class="search-section-title">任務</div>
            <div
              v-for="item in searchResults.tasks"
              :key="item.id"
              class="search-result-item"
              @click="navigateToSearchResult('task', item)"
            >
              <span class="search-result-code">{{ item.taskCode }}</span>
              <span class="search-result-name">{{ item.title }}</span>
              <span class="search-result-project">{{ item.project?.name }}</span>
            </div>
          </div>
          <div v-if="searchResults.requirements?.length > 0" class="search-section">
            <div class="search-section-title">需求</div>
            <div
              v-for="item in searchResults.requirements"
              :key="item.id"
              class="search-result-item"
              @click="navigateToSearchResult('requirement', item)"
            >
              <span class="search-result-code">{{ item.reqCode }}</span>
              <span class="search-result-name">{{ item.title }}</span>
              <span class="search-result-project">{{ item.project?.name }}</span>
            </div>
          </div>
          <div v-if="searchResults.bugs?.length > 0" class="search-section">
            <div class="search-section-title">Bug</div>
            <div
              v-for="item in searchResults.bugs"
              :key="item.id"
              class="search-result-item"
              @click="navigateToSearchResult('bug', item)"
            >
              <span class="search-result-code">{{ item.bugCode }}</span>
              <span class="search-result-name">{{ item.title }}</span>
              <span class="search-result-project">{{ item.project?.name }}</span>
            </div>
          </div>
        </div>
      </n-modal>

      <n-drawer v-model:show="showProfileDrawer" placement="right" :width="480">
        <n-drawer-content title="個人資料" closable>
          <n-card title="基本資訊" style="margin-bottom: 20px;">
            <n-descriptions :columns="2" bordered>
              <n-descriptions-item label="姓名">{{ profileUser?.name }}</n-descriptions-item>
              <n-descriptions-item label="Email">{{ profileUser?.email }}</n-descriptions-item>
              <n-descriptions-item label="角色">{{ roleLabel }}</n-descriptions-item>
              <n-descriptions-item label="狀態">{{ statusLabel }}</n-descriptions-item>
              <n-descriptions-item label="建立時間" :span="2">{{ formatDate(profileUser?.createdAt) }}</n-descriptions-item>
            </n-descriptions>
          </n-card>

          <n-card title="修改資料">
            <n-form :model="profileForm" :rules="profileRules" ref="profileFormRef">
              <n-form-item label="姓名" path="name">
                <n-input v-model:value="profileForm.name" placeholder="請輸入姓名" />
              </n-form-item>
              <n-form-item label="新密碼" path="password">
                <n-input v-model:value="profileForm.password" type="password" placeholder="不修改請留空" />
              </n-form-item>
              <n-form-item label="確認密碼">
                <n-input v-model:value="profileForm.confirmPassword" type="password" placeholder="不修改請留空" />
              </n-form-item>
              <n-form-item>
                <n-space>
                  <n-button type="primary" :loading="profileSubmitting" @click="handleProfileSubmit">儲存變更</n-button>
                </n-space>
              </n-form-item>
            </n-form>
          </n-card>
        </n-drawer-content>
      </n-drawer>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
  NMenu, NPopover, NList, NListItem, NThing, NButton, NEmpty, NDropdown,
  NDrawer, NDrawerContent, NCard, NDescriptions, NDescriptionsItem, NForm, NFormItem, NInput, NSpace,
} from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { notificationApi, userApi, searchApi } from '../services/api';
import IconSvg from '../components/IconSvg.vue';
import type { Notification, User } from '../types';

const router = useRouter();
const authStore = useAuthStore();

const notifications = ref<Notification[]>([]);
const unreadCount = ref(0);
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Search
const searchQuery = ref('');
const showSearchModal = ref(false);
const searchLoading = ref(false);
const searchResults = ref({ tasks: [], requirements: [], bugs: [], projects: [] });

// Profile drawer
const showProfileDrawer = ref(false);

// Profile data
const profileUser = ref<User | null>(null);
const profileFormRef = ref();
const profileSubmitting = ref(false);
const profileForm = ref({ name: '', password: '', confirmPassword: '' });

const profileRules = {
  name: { required: true, message: '請輸入姓名', trigger: 'blur' },
};

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    ADMIN: '系統管理員',
    PROJECT_MANAGER: '專案經理',
    DEVELOPER: '開發人員',
    TESTER: '測試人員',
  };
  return map[profileUser.value?.role || ''] || profileUser.value?.role || '';
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    ACTIVE: '啟用',
    INACTIVE: '停用',
  };
  return map[profileUser.value?.status || ''] || profileUser.value?.status || '';
});

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString('zh-TW') : '-';
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return;
  searchLoading.value = true;
  showSearchModal.value = true;
  try {
    const res = await searchApi.search(searchQuery.value.trim());
    searchResults.value = res.data;
  } catch (e) {
    // silent
  } finally {
    searchLoading.value = false;
  }
}

function navigateToSearchResult(type: string, item: any) {
  showSearchModal.value = false;
  searchQuery.value = '';
  if (type === 'project') {
    router.push(`/projects/${item.id}`);
  } else if (type === 'task' && item.projectId) {
    router.push(`/projects/${item.projectId}?tab=tasks`);
  } else if (type === 'bug' && item.projectId) {
    router.push(`/projects/${item.projectId}?tab=bugs`);
  } else if (type === 'requirement' && item.projectId) {
    router.push(`/projects/${item.projectId}?tab=requirements`);
  }
}

async function loadProfileUser() {
  try {
    const res = await userApi.getMe();
    profileUser.value = res.data;
    profileForm.value.name = res.data.name;
  } catch {
    // silent
  }
}

async function handleProfileSubmit() {
  try {
    await profileFormRef.value?.validate();
    if (profileForm.value.password && profileForm.value.password !== profileForm.value.confirmPassword) {
      // Use naive-ui message or just return
      return;
    }
    profileSubmitting.value = true;
    const data: Partial<{ name: string; password: string }> = {};
    if (profileForm.value.name !== profileUser.value?.name) {
      data.name = profileForm.value.name;
    }
    if (profileForm.value.password) {
      data.password = profileForm.value.password;
    }
    if (Object.keys(data).length === 0) {
      profileSubmitting.value = false;
      return;
    }
    const res = await userApi.updateMe(data);
    profileUser.value = res.data;
    authStore.user = res.data;
    profileForm.value.password = '';
    profileForm.value.confirmPassword = '';
  } catch (error: any) {
    // silent
  } finally {
    profileSubmitting.value = false;
  }
}

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
    {
      label: '我的任務',
      key: '/my-tasks',
      icon: renderIcon('&#9989;'),
    },
    {
      label: '資源負載',
      key: '/resource-load',
      icon: renderIcon('&#128200;'),
    },
    {
      label: '日曆',
      key: '/calendar',
      icon: renderIcon('&#128197;'),
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
    showProfileDrawer.value = true;
    loadProfileUser();
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

.search-results {
  max-height: 60vh;
  overflow-y: auto;
}
.search-section {
  margin-bottom: 16px;
}
.search-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}
.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}
.search-result-item:hover {
  background: #f1f5f9;
}
.search-result-code {
  font-family: monospace;
  font-size: 11px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.search-result-name {
  flex: 1;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-result-project {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}
</style>
