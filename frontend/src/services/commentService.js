import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

const getComments = async (postId) => {
  try {
    console.log('[commentService] Getting comments for post:', postId);
    const response = await api.get(ENDPOINTS.COMMENTS.GET_POST_COMMENTS(postId));
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
    const response = await api.post(ENDPOINTS.COMMENTS.CREATE_COMMENT, { content, postId, parentId });
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
    
    // Handle ban error message
    if (error.response?.status === 403) {
      const expiresAt = error.response.data?.expiresAt;
      if (expiresAt) {
        const expiryDate = new Date(expiresAt).toLocaleDateString();
        throw new Error(`You are banned from commenting until ${expiryDate}`);
      } else {
        throw new Error('You are permanently banned from commenting');
      }
    }
    throw new Error(error.response?.data?.error || 'Failed to create comment');
  }
};

const updateComment = async (id, content) => {
  try {
    console.log('[commentService] Updating comment:', { id, content });
    const response = await api.put(ENDPOINTS.COMMENTS.UPDATE_COMMENT(id), { content });
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
    const response = await api.delete(ENDPOINTS.COMMENTS.DELETE_COMMENT(id));
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
    const response = await api.post(ENDPOINTS.COMMENTS.ADD_REACTION(commentId), { type });
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
    const response = await api.get(ENDPOINTS.COMMENTS.GET_REACTIONS(commentId));
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

const removeComment = async (id) => {
  try {
    console.log('[commentService] Removing comment:', id);
    const response = await api.post(`/api/comments/${id}/remove`);
    console.log('[commentService] Comment removed:', response.data);
    return response.data;
  } catch (error) {
    console.error('[commentService] Error removing comment:', {
      id,
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
  getReactions,
  removeComment
};