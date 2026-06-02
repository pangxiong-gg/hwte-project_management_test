<template>
  <div class="tag-selector">
    <div class="tag-selector-input" @click="open = !open">
      <div class="tag-selector-selected">
        <TagBadge
          v-for="tag in selectedTags"
          :key="tag.id"
          :tag="tag"
          closable
          @close="removeTag(tag.id)"
        />
        <span v-if="selectedTags.length === 0" class="tag-selector-placeholder">選擇標籤...</span>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <div v-if="open" class="tag-selector-dropdown" v-click-outside="closeDropdown">
      <div class="tag-selector-create" v-if="canCreate">
        <input
          v-model="newTagName"
          class="tag-selector-new-input"
          placeholder="輸入新標籤名稱..."
          @keydown.enter.prevent="createNewTag"
        />
        <n-button size="tiny" type="primary" :disabled="!newTagName.trim()" @click="createNewTag">新增</n-button>
      </div>
      <div class="tag-selector-list">
        <div
          v-for="tag in availableTags"
          :key="tag.id"
          class="tag-selector-item"
          :class="{ selected: isSelected(tag.id) }"
          @click="toggleTag(tag)"
        >
          <span class="tag-selector-dot" :style="{ backgroundColor: tag.color }"></span>
          <span class="tag-selector-name">{{ tag.name }}</span>
          <svg v-if="isSelected(tag.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div v-if="availableTags.length === 0" class="tag-selector-empty">暫無標籤</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import { tagApi } from '../services/api';
import TagBadge from './TagBadge.vue';

interface TagItem {
  id: string;
  name: string;
  color: string;
}

const props = defineProps<{
  projectId: string;
  modelValue: string[];
  canCreate?: boolean;
}>()

const emit = defineEmits<{
  'update:modelValue': [ids: string[]];
}>()

const message = useMessage();
const open = ref(false);
const tags = ref<TagItem[]>([]);
const newTagName = ref('');
const loading = ref(false);

const selectedTags = computed(() => {
  return tags.value.filter((t) => props.modelValue.includes(t.id));
});

const availableTags = computed(() => {
  return tags.value;
});

function isSelected(tagId: string) {
  return props.modelValue.includes(tagId);
}

function toggleTag(tag: TagItem) {
  const current = [...props.modelValue];
  if (current.includes(tag.id)) {
    emit('update:modelValue', current.filter((id) => id !== tag.id));
  } else {
    emit('update:modelValue', [...current, tag.id]);
  }
}

function removeTag(tagId: string) {
  emit('update:modelValue', props.modelValue.filter((id) => id !== tagId));
}

function closeDropdown() {
  open.value = false;
}

async function loadTags() {
  try {
    const res = await tagApi.getAll(props.projectId);
    tags.value = res.data.tags || [];
  } catch (err: any) {
    message.error('載入標籤失敗');
  }
}

async function createNewTag() {
  const name = newTagName.value.trim();
  if (!name) return;
  try {
    const res = await tagApi.create(props.projectId, { name });
    const newTag = res.data;
    tags.value.push(newTag);
    emit('update:modelValue', [...props.modelValue, newTag.id]);
    newTagName.value = '';
    message.success('標籤已創建');
  } catch (err: any) {
    if (err.response?.status === 409) {
      message.warning('標籤名稱已存在');
    } else {
      message.error('創建標籤失敗');
    }
  }
}

watch(() => props.projectId, loadTags, { immediate: true });

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (event: Event) => {
      if (!el.contains(event.target as Node)) {
        binding.value();
      }
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el._clickOutside);
  },
};
</script>

<style scoped>
.tag-selector {
  position: relative;
  width: 100%;
}
.tag-selector-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  background: white;
}
.tag-selector-input:hover {
  border-color: #cbd5e1;
}
.tag-selector-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1;
}
.tag-selector-placeholder {
  color: #94a3b8;
  font-size: 14px;
}
.tag-selector-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
}
.tag-selector-create {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}
.tag-selector-new-input {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 13px;
}
.tag-selector-new-input:focus {
  outline: none;
  border-color: #3b82f6;
}
.tag-selector-list {
  padding: 4px;
}
.tag-selector-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}
.tag-selector-item:hover {
  background: #f8fafc;
}
.tag-selector-item.selected {
  background: #eff6ff;
}
.tag-selector-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tag-selector-name {
  flex: 1;
}
.tag-selector-empty {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
</style>
