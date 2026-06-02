<template>
  <div>
    <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <n-button type="primary" size="small" @click="showCreateModal = true">+ 新增標籤</n-button>
    </div>
    <n-data-table
      :columns="columns"
      :data="tags"
      :loading="loading"
      :pagination="false"
    />

    <!-- 創建標籤 Modal -->
    <n-modal v-model:show="showCreateModal" title="新增標籤" preset="card" style="width: 400px;">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item label="名稱" path="name">
          <n-input v-model:value="form.name" placeholder="輸入標籤名稱" />
        </n-form-item>
        <n-form-item label="顏色">
          <div class="color-grid">
            <div
              v-for="color in presetColors"
              :key="color"
              class="color-option"
              :class="{ selected: form.color === color }"
              :style="{ backgroundColor: color }"
              @click="form.color = color"
            />
          </div>
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreate">確定</n-button>
            <n-button @click="showCreateModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 編輯標籤 Modal -->
    <n-modal v-model:show="showEditModal" title="編輯標籤" preset="card" style="width: 400px;">
      <n-form :model="editForm" :rules="rules" ref="editFormRef">
        <n-form-item label="名稱" path="name">
          <n-input v-model:value="editForm.name" placeholder="輸入標籤名稱" />
        </n-form-item>
        <n-form-item label="顏色">
          <div class="color-grid">
            <div
              v-for="color in presetColors"
              :key="color"
              class="color-option"
              :class="{ selected: editForm.color === color }"
              :style="{ backgroundColor: color }"
              @click="editForm.color = color"
            />
          </div>
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleUpdate">儲存</n-button>
            <n-button @click="showEditModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { useMessage, NButton, NSpace, NInput, NForm, NFormItem, NModal, NDataTable } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { tagApi } from '../services/api';
import TagBadge from './TagBadge.vue';

const props = defineProps<{
  projectId: string;
}>();

const message = useMessage();
const loading = ref(false);
const submitting = ref(false);
const tags = ref<any[]>([]);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const formRef = ref();
const editFormRef = ref();

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#0ea5e9',
];

const presetColors = PRESET_COLORS;

const form = ref({
  name: '',
  color: PRESET_COLORS[0],
});

const editForm = ref({
  id: '',
  name: '',
  color: '',
});

const rules = {
  name: { required: true, message: '請輸入標籤名稱', trigger: 'blur' },
};

const columns: DataTableColumns<any> = [
  {
    title: '標籤',
    key: 'name',
    render: (row) => h(TagBadge, { tag: row }),
  },
  {
    title: '使用數',
    key: 'usage',
    width: 100,
    render: (row) => {
      const total = (row._count?.tasks || 0) + (row._count?.bugs || 0) + (row._count?.requirements || 0);
      return total;
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) =>
      h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, { size: 'tiny', text: true, onClick: () => openEdit(row) }, { default: () => '編輯' }),
          h(NButton, { size: 'tiny', text: true, type: 'error', onClick: () => handleDelete(row.id) }, { default: () => '刪除' }),
        ],
      }),
  },
];

async function loadTags() {
  loading.value = true;
  try {
    const res = await tagApi.getAll(props.projectId);
    tags.value = res.data.tags || [];
  } catch (err: any) {
    message.error('載入標籤失敗');
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  try {
    await formRef.value?.validate();
    submitting.value = true;
    await tagApi.create(props.projectId, form.value);
    message.success('標籤創建成功');
    showCreateModal.value = false;
    form.value = { name: '', color: PRESET_COLORS[0] };
    loadTags();
  } catch (err: any) {
    if (err?.response?.status === 409) {
      message.warning('標籤名稱已存在');
    } else if (err?.response?.data?.error) {
      message.error(err.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

function openEdit(row: any) {
  editForm.value = { id: row.id, name: row.name, color: row.color };
  showEditModal.value = true;
}

async function handleUpdate() {
  try {
    await editFormRef.value?.validate();
    submitting.value = true;
    await tagApi.update(props.projectId, editForm.value.id, { name: editForm.value.name, color: editForm.value.color });
    message.success('標籤更新成功');
    showEditModal.value = false;
    loadTags();
  } catch (err: any) {
    if (err?.response?.status === 409) {
      message.warning('標籤名稱已存在');
    } else if (err?.response?.data?.error) {
      message.error(err.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(id: string) {
  try {
    await tagApi.delete(props.projectId, id);
    message.success('標籤刪除成功');
    loadTags();
  } catch (err: any) {
    message.error(err?.response?.data?.error || '刪除失敗');
  }
}

onMounted(loadTags);
</script>

<style scoped>
.color-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}
.color-option {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, border-color 0.15s;
}
.color-option:hover {
  transform: scale(1.1);
}
.color-option.selected {
  border-color: #1e293b;
  transform: scale(1.15);
}
</style>
