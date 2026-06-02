<template>
  <span
    v-if="tag"
    class="tag-badge"
    :style="badgeStyle"
  >
    {{ tag.name }}
    <span
      v-if="closable"
      class="tag-close"
      @click.stop="$emit('close', tag.id)"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  tag: { id: string; name: string; color: string } | null;
  closable?: boolean;
}>();

const emit = defineEmits<{
  close: [id: string];
}>();

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1e293b' : '#ffffff';
}

const badgeStyle = computed(() => {
  if (!props.tag) return {};
  const bg = props.tag.color;
  const text = getContrastColor(bg);
  return {
    backgroundColor: bg + '20',
    color: bg,
    border: `1px solid ${bg}40`,
  };
});
</script>

<style scoped>
.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1.4;
}
.tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
}
.tag-close:hover {
  opacity: 1;
  background: rgba(0,0,0,0.08);
}
</style>
