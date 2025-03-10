import api from '../api/axios';

const getComments = async (postId) => {
  try {
    console.log('[commentService] Getting comments for post:', postId);
    const response = await api.get(`/api/comments/post/${postId}`);
    console.log('[commentService] Received comments:', response.data);
    return response.data;
  } catch (error) {
    console.error('[commentService] Error getting comments:', {
      postId,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

const createComment = async (content, postId, parentId = null) => {
  try {
    console.log('[commentService] Creating comment:', { content, postId, parentId });
    const response = await api.post('/api/comments', { content, postId, parentId });
    console.log('[commentService] Comment created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[commentService] Error creating comment:', {
      content,
      postId,
      parentId,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

const updateComment = async (id, content) => {
  try {
    console.log('[commentService] Updating comment:', { id, content });
    const response = await api.put(`/api/comments/${id}`, { content });
    console.log('[commentService] Comment updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('[commentService] Error updating comment:', {
      id,
      content,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

const deleteComment = async (id) => {
  try {
    console.log('[commentService] Deleting comment:', id);
    const response = await api.delete(`/api/comments/${id}`);
    console.log('[commentService] Comment deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('[commentService] Error deleting comment:', {
      id,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

const addReaction = async (commentId, type) => {
  try {
    console.log('[commentService] Adding reaction:', { commentId, type });
    const response = await api.post(`/api/comments/${commentId}/reactions`, { type });
    console.log('[commentService] Reaction added:', response.data);
    return response.data;
  } catch (error) {
    console.error('[commentService] Error adding reaction:', {
      commentId,
      type,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

const getReactions = async (commentId) => {
  try {
    console.log('[commentService] Getting reactions:', commentId);
    const response = await api.get(`/api/comments/${commentId}/reactions`);
    console.log('[commentService] Reactions retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('[commentService] Error getting reactions:', {
      commentId,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const commentService = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  addReaction,
  getReactions
};