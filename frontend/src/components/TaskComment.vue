<template>
  <div>
    <!-- Comments List -->
    <div v-if="comments.length > 0" class="comments-list">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :replying-to="replyingTo"
        :editing-comment="editingComment"
        :current-user-id="currentUserId"
        @reply="startReply"
        @edit="startEdit"
        @delete="deleteComment"
        @submit-reply="handleSubmitReply"
        @cancel-reply="cancelReply"
      />
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
import CommentItem from './CommentItem.vue';

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

function countAllComments(list: any[]): number {
  return list.reduce((sum, c) => sum + 1 + countAllComments(c.replies || []), 0);
}

async function loadComments() {
  loading.value = true;
  try {
    const res = await commentApi.getAll(props.projectId, props.relatedType, props.relatedId);
    comments.value = res.data.comments || [];
    emit('countChange', countAllComments(comments.value));
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
  editingComment.value = null;
}

function cancelReply() {
  replyingTo.value = null;
}

async function handleSubmitReply(data: { content: string; parentId: string }) {
  if (!data.content.trim()) return;
  submitting.value = true;
  try {
    await commentApi.create(props.projectId, {
      content: data.content,
      relatedType: props.relatedType,
      relatedId: props.relatedId,
      parentId: data.parentId,
    });
    replyingTo.value = null;
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
.comment-input-area {
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
.comment-textarea {
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}
.comment-textarea:focus {
  outline: none;
  border-color: #1a1a2e;
}
.comment-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.comment-hint { font-size: 12px; color: #94a3b8; }
</style>
