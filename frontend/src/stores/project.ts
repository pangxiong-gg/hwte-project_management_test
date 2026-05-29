import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Project } from '../types';
import { projectApi } from '../services/api';

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const loading = ref(false);

  async function fetchProjects() {
    loading.value = true;
    try {
      const response = await projectApi.getAll();
      projects.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProject(id: string) {
    loading.value = true;
    try {
      const response = await projectApi.get(id);
      currentProject.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  return {
    projects,
    currentProject,
    loading,
    fetchProjects,
    fetchProject,
  };
});
