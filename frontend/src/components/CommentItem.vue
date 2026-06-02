<template>
  <div class="comment-item">
    <div class="comment-main">
      <div class="comment-avatar">{{ getInitial(comment.user?.name) }}</div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">{{ comment.user?.name || '未知用戶' }}</span>
          <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
        </div>
        <div class="comment-text" v-html="renderMentions(comment.content)"></div>
        <div class="comment-actions">
          <span class="comment-action" @click="$emit('reply', comment)">回覆</span>
          <template v-if="comment.user?.id === currentUserId">
            <span class="comment-action" @click="$emit('edit', comment)">編輯</span>
            <span class="comment-action" @click="$emit('delete', comment.id)">刪除</span>
          </template>
        </div>

        <!-- Nested Reply Input -->
        <div v-if="replyingTo === comment.id" class="reply-input-area">
          <textarea
            v-model="localReplyContent"
            class="reply-textarea"
            :placeholder="`回覆 ${comment.user?.name}...`"
            @keydown.enter.prevent="submitReply"
          ></textarea>
          <div class="reply-toolbar">
            <span class="reply-hint">按 Enter 發送 · Shift+Enter 換行</span>
            <n-space>
              <n-button size="small" @click="cancelReply">取消</n-button>
              <n-button size="small" type="primary" :loading="submitting" @click="submitReply">發送</n-button>
            </n-space>
          </div>
        </div>

        <!-- Nested Replies (Recursive) -->
        <div v-if="comment.replies?.length > 0" class="replies">
          <CommentItem
            v-for="reply in comment.replies"
            :key="reply.id"
            :comment="reply"
            :replying-to="replyingTo"
            :editing-comment="editingComment"
            :current-user-id="currentUserId"
            @reply="(c) => $emit('reply', c)"
            @edit="(c) => $emit('edit', c)"
            @delete="(id) => $emit('delete', id)"
            @submit-reply="(data) => $emit('submit-reply', data)"
            @cancel-reply="() => $emit('cancel-reply')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NButton, NSpace } from 'naive-ui';

const props = defineProps<{
  comment: any;
  replyingTo: string | null;
  editingComment: string | null;
  currentUserId: string;
}>();

const emit = defineEmits<{
  reply: [comment: any];
  edit: [comment: any];
  delete: [id: string];
  'submit-reply': [data: { content: string; parentId: string }];
  'cancel-reply': [];
}>();

const localReplyContent = ref('');
const submitting = ref(false);

watch(() => props.replyingTo, (newVal) => {
  if (newVal !== props.comment.id) {
    localReplyContent.value = '';
  }
});

function getInitial(name: string | undefined): string {
  return (name || 'U').charAt(0);
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

function renderMentions(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/@([^\s]+)/g, '<span class="mention-highlight">@$1</span>');
}

function submitReply() {
  if (!localReplyContent.value.trim()) return;
  emit('submit-reply', { content: localReplyContent.value, parentId: props.comment.id });
  localReplyContent.value = '';
}

function cancelReply() {
  localReplyContent.value = '';
  emit('cancel-reply');
}
</script>

<style scoped>
.comment-item {
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.comment-item:last-child {
  border-bottom: none;
}
.comment-main {
  display: flex;
  gap: 12px;
}
.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1a1a2e;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}
.comment-body {
  flex: 1;
  min-width: 0;
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.comment-author {
  font-weight: 600;
  font-size: 14px;
}
.comment-time {
  font-size: 12px;
  color: #94a3b8;
}
.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}
:deep(.mention-highlight) {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 13px;
}
.comment-actions {
  display: flex;
  gap: 14px;
  margin-top: 6px;
}
.comment-action {
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
}
.comment-action:hover {
  color: #1a1a2e;
}

.replies {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid #e2e8f0;
}

.reply-input-area {
  margin-top: 12px;
}
.reply-textarea {
  width: 100%;
  min-height: 56px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}
.reply-textarea:focus {
  outline: none;
  border-color: #1a1a2e;
}
.reply-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.reply-hint {
  font-size: 12px;
  color: #94a3b8;
}
</style>
