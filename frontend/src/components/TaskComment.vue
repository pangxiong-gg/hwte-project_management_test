<template>
  <div>
    <!-- Comments List -->
    <div v-if="comments.length > 0" class="comments-list">
      <div v-for="comment in comments" :key="comment.id" class="comment">
        <div class="comment-avatar">{{ getInitial(comment.user?.name) }}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">{{ comment.user?.name || '未知用戶' }}</span>
            <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
          </div>
          <div class="comment-text" v-html="renderMentions(comment.content)"></div>
          <div class="comment-actions">
            <span class="comment-action" @click="startReply(comment)">回覆</span>
            <template v-if="comment.user?.id === currentUserId">
              <span class="comment-action" @click="startEdit(comment)">編輯</span>
              <span class="comment-action" @click="deleteComment(comment.id)">刪除</span>
            </template>
          </div>

          <!-- Replies -->
          <div v-if="comment.replies?.length > 0" class="replies">
            <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
              <div class="reply-avatar">{{ getInitial(reply.user?.name) }}</div>
              <div class="reply-body">
                <div class="comment-header">
                  <span class="comment-author">{{ reply.user?.name || '未知用戶' }}</span>
                  <span class="comment-time">{{ formatTime(reply.createdAt) }}</span>
                </div>
                <div class="comment-text" v-html="renderMentions(reply.content)"></div>
                <div class="comment-actions">
                  <template v-if="reply.user?.id === currentUserId">
                    <span class="comment-action" @click="startEdit(reply)">編輯</span>
                    <span class="comment-action" @click="deleteComment(reply.id)">刪除</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Reply Input -->
          <div v-if="replyingTo === comment.id" class="reply-input-area">
            <textarea
              v-model="replyForm.content"
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
        </div>
      </div>
    </div>

    <n-empty v-else description="暫無評論" style="padding: 40px 0;" />

    <!-- Main Input -->
    <div class="comment-input-area">
      <div class="comment-input-avatar">{{ getInitial(currentUserName) }}</div>
      <div class="comment-input-box">
        <textarea
          v-if="editingComment"
          v-model="editForm.content"
          class="comment-textarea"
          placeholder="編輯評論..."
          @keydown.enter.prevent="submitEdit"
        ></textarea>
        <textarea
          v-else
          v-model="form.content"
          class="comment-textarea"
          placeholder="輸入評論... 使用 @ 提及成員"
          @keydown.enter.prevent="submitComment"
        ></textarea>
        <div class="comment-toolbar">
          <span class="comment-hint">支援 @提及 · 按 Enter 發送 · Shift+Enter 換行</span>
          <n-space v-if="editingComment">
            <n-button size="small" @click="cancelEdit">取消</n-button>
            <n-button size="small" type="primary" :loading="submitting" @click="submitEdit">儲存</n-button>
          </n-space>
          <n-button v-else size="small" type="primary" :loading="submitting" @click="submitComment">發送</n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMessage, NButton, NSpace, NEmpty } from 'naive-ui';
import { commentApi } from '../services/api';

const props = defineProps<{
  projectId: string;
  relatedType: string;
  relatedId: string;
}>();

const emit = defineEmits<{
  countChange: [count: number];
}>();

const message = useMessage();

const comments = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);
const form = ref({ content: '' });
const replyForm = ref({ content: '', parentId: '' });
const editForm = ref({ content: '', id: '' });
const replyingTo = ref<string | null>(null);
const editingComment = ref<string | null>(null);

const currentUserId = computed(() => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || '';
  } catch {
    return '';
  }
});

const currentUserName = computed(() => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '我';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email?.split('@')[0] || '我';
  } catch {
    return '我';
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

async function loadComments() {
  loading.value = true;
  try {
    const res = await commentApi.getAll(props.projectId, props.relatedType, props.relatedId);
    comments.value = res.data.comments || [];
    const totalCount = comments.value.reduce((sum: number, c: any) => sum + 1 + (c.replies?.length || 0), 0);
    emit('countChange', totalCount);
  } catch (err: any) {
    message.error('載入評論失敗：' + (err.response?.data?.error || err.message));
  } finally {
    loading.value = false;
  }
}

async function submitComment() {
  if (!form.value.content.trim()) return;
  submitting.value = true;
  try {
    await commentApi.create(props.projectId, {
      content: form.value.content,
      relatedType: props.relatedType,
      relatedId: props.relatedId,
    });
    form.value.content = '';
    loadComments();
  } catch (err: any) {
    message.error('發送失敗：' + (err.response?.data?.error || err.message));
  } finally {
    submitting.value = false;
  }
}

function startReply(comment: any) {
  replyingTo.value = comment.id;
  replyForm.value = { content: '', parentId: comment.id };
  editingComment.value = null;
}

function cancelReply() {
  replyingTo.value = null;
  replyForm.value = { content: '', parentId: '' };
}

async function submitReply() {
  if (!replyForm.value.content.trim()) return;
  submitting.value = true;
  try {
    await commentApi.create(props.projectId, {
      content: replyForm.value.content,
      relatedType: props.relatedType,
      relatedId: props.relatedId,
      parentId: replyForm.value.parentId,
    });
    replyingTo.value = null;
    replyForm.value = { content: '', parentId: '' };
    loadComments();
  } catch (err: any) {
    message.error('發送失敗：' + (err.response?.data?.error || err.message));
  } finally {
    submitting.value = false;
  }
}

function startEdit(comment: any) {
  editingComment.value = comment.id;
  editForm.value = { content: comment.content, id: comment.id };
  replyingTo.value = null;
}

function cancelEdit() {
  editingComment.value = null;
  editForm.value = { content: '', id: '' };
}

async function submitEdit() {
  if (!editForm.value.content.trim()) return;
  submitting.value = true;
  try {
    await commentApi.update(props.projectId, editForm.value.id, { content: editForm.value.content });
    editingComment.value = null;
    editForm.value = { content: '', id: '' };
    loadComments();
  } catch (err: any) {
    message.error('更新失敗：' + (err.response?.data?.error || err.message));
  } finally {
    submitting.value = false;
  }
}

async function deleteComment(id: string) {
  try {
    await commentApi.delete(props.projectId, id);
    loadComments();
  } catch (err: any) {
    message.error('刪除失敗：' + (err.response?.data?.error || err.message));
  }
}

onMounted(loadComments);
</script>

<style scoped>
.comments-list { margin-bottom: 16px; }
.comment {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #f1f5f9;
}
.comment:last-child { border-bottom: none; }
.comment-avatar, .reply-avatar {
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
.reply-avatar { width: 28px; height: 28px; font-size: 12px; }
.comment-body { flex: 1; }
.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.comment-author { font-weight: 600; font-size: 14px; }
.comment-time { font-size: 12px; color: #94a3b8; }
.comment-text { font-size: 14px; line-height: 1.6; color: #334155; }
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
.comment-action:hover { color: #1a1a2e; }

.replies { margin-top: 12px; padding-left: 8px; }
.reply-item {
  display: flex;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid #f1f5f9;
}
.reply-body { flex: 1; }

.comment-input-area, .reply-input-area {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}
.comment-input-avatar {
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
.comment-input-box { flex: 1; }
.comment-textarea, .reply-textarea {
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}
.comment-textarea:focus, .reply-textarea:focus {
  outline: none;
  border-color: #1a1a2e;
}
.reply-textarea { min-height: 56px; }
.comment-toolbar, .reply-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.comment-hint, .reply-hint { font-size: 12px; color: #94a3b8; }
</style>
