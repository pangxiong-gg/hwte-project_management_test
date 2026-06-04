import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Overview',
          component: () => import('../views/Overview.vue'),
        },
        {
          path: 'projects',
          name: 'ProjectList',
          component: () => import('../views/ProjectList.vue'),
        },
        {
          path: 'projects/:id',
          name: 'ProjectDetail',
          component: () => import('../views/ProjectDetail.vue'),
        },
        {
          path: 'my-tasks',
          name: 'MyTasks',
          component: () => import('../views/MyTasks.vue'),
        },
        {
          path: 'resource-load',
          name: 'ResourceLoad',
          component: () => import('../views/ResourceLoad.vue'),
        },
        {
          path: 'calendar',
          name: 'Calendar',
          component: () => import('../views/CalendarView.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('../views/Profile.vue'),
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('../views/UserManagement.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // If token exists but user not loaded, fetch user
  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchUser();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/');
  } else if (to.meta.requiresAdmin && authStore.user?.role !== 'ADMIN') {
    next('/');
  } else {
    next();
  }
});

export default router;
