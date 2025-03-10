import { useState, useEffect, useCallback } from 'react';
import { Box, Text, VStack, HStack, Input, Button, Avatar, IconButton, useToast, Divider } from '@chakra-ui/react';
import { FiMoreHorizontal, FiMessageCircle } from 'react-icons/fi';
import { BiUpvote, BiDownvote, BiSolidUpvote, BiSolidDownvote } from 'react-icons/bi';
import { commentService } from '../services/commentService';
import useAuthState from '../hooks/useAuthState';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';

const CommentThread = ({ comment, user, onEdit, onDelete, onReply, level = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [reactions, setReactions] = useState(comment.reactions || { upvotes: 0, downvotes: 0 });
  const [userReaction, setUserReaction] = useState(comment.userReaction);
  const [isAnimating, setIsAnimating] = useState(false);
  const toast = useToast();

  // Synchronize reactions when comment prop changes
  useEffect(() => {
    setReactions(comment.reactions || { upvotes: 0, downvotes: 0 });
    setUserReaction(comment.userReaction);
  }, [comment.reactions, comment.userReaction]);

  const handleReaction = async (type) => {
    if (!user) {
      toast({
        title: 'Please login to react',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // Store previous state for rollback
    const previousReactions = { ...reactions };
    const previousUserReaction = userReaction;

    // Optimistically update UI
    setIsAnimating(true);
    const updatedReactions = { ...reactions };
    if (userReaction === type) {
      // Removing reaction
      updatedReactions[`${type}s`] -= 1;
      setUserReaction(null);
    } else {
      // If there was a previous reaction, remove it
      if (userReaction) {
        updatedReactions[`${userReaction}s`] -= 1;
      }
      // Add new reaction
      updatedReactions[`${type}s`] += 1;
      setUserReaction(type);
    }
    
    setReactions(updatedReactions);

    try {
      const result = await commentService.addReaction(comment.id, type);
      setReactions({
        upvotes: result.upvotes || 0,
        downvotes: result.downvotes || 0
      });
      setUserReaction(result.userReaction);
    } catch (error) {
      // Revert on error
      console.error('Error handling reaction:', error);
      setReactions(previousReactions);
      setUserReaction(previousUserReaction);
      toast({
        title: 'Error updating reaction',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setTimeout(() => setIsAnimating(false), 300); // Animation duration
    }
  };

  const getNetScore = (upvotes, downvotes) => upvotes - downvotes;

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error updating comment',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(comment.id);
    } catch (error) {
      toast({
        title: 'Error deleting comment',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await onReply(replyContent, comment.id);
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      toast({
        title: 'Error creating reply',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Box ml={level * 8}>
      <HStack spacing={4} mb={2} align="start">
        <Avatar
          size="sm"
          name={comment.profiles.username}
          src={`/avatars/${comment.profiles.avatar_name}`}
          border="2px solid black"
        />
        <Box flex={1}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="bold">
              @{comment.profiles.username}
            </Text>
            <HStack>
              <Text fontSize="sm" color="gray.500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </Text>
              {user && user.userId === comment.user_id && (
                <IconButton
                  icon={<FiMoreHorizontal />}
                  variant="ghost"
                  size="sm"
                  color="gray.500"
                  aria-label="More options"
                  onClick={() => setIsEditing(!isEditing)}
                />
              )}
            </HStack>
          </HStack>

          {isEditing ? (
            <Box mb={2}>
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edit your comment..."
                mb={2}
                bg="gray.50"
              />
              <HStack>
                <Button size="sm" onClick={handleEdit}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}>Cancel</Button>
                <Button size="sm" colorScheme="red" variant="ghost" onClick={handleDelete}>Delete</Button>
              </HStack>
            </Box>
          ) : (
            <Text mb={2} whiteSpace="pre-wrap">{comment.content}</Text>
          )}

          <HStack spacing={6} mb={2}>
            <HStack spacing={2}>
              <IconButton
                icon={userReaction === 'upvote' ? <BiSolidUpvote /> : <BiUpvote />}
                variant="ghost"
                size="sm"
                color={userReaction === 'upvote' ? "blue.500" : "gray.600"}
                aria-label="Upvote"
                onClick={() => handleReaction('upvote')}
                transition="transform 0.2s"
                transform={isAnimating && userReaction === 'upvote' ? 'scale(1.2)' : 'scale(1)'}
              />
              <Text 
                color={getNetScore(reactions.upvotes, reactions.downvotes) > 0 ? "blue.500" : 
                      getNetScore(reactions.upvotes, reactions.downvotes) < 0 ? "red.500" : "gray.600"}
                fontWeight="semibold"
                transition="all 0.2s"
                transform={isAnimating ? 'scale(1.02)' : 'scale(1)'}
              >
                {getNetScore(reactions.upvotes, reactions.downvotes)}
              </Text>
              <IconButton
                icon={userReaction === 'downvote' ? <BiSolidDownvote /> : <BiDownvote />}
                variant="ghost"
                size="sm"
                color={userReaction === 'downvote' ? "red.500" : "gray.600"}
                aria-label="Downvote"
                onClick={() => handleReaction('downvote')}
                transition="transform 0.2s"
                transform={isAnimating && userReaction === 'downvote' ? 'scale(1.2)' : 'scale(1)'}
              />
            </HStack>
            <Button
              leftIcon={<FiMessageCircle />}
              variant="ghost"
              size="sm"
              color="gray.600"
              fontWeight="normal"
              onClick={() => setIsReplying(!isReplying)}
            >
              Reply
            </Button>
          </HStack>

          {isReplying && (
            <Box mb={4}>
              <Input
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                mb={2}
                bg="gray.50"
              />
              <HStack>
                <Button size="sm" onClick={handleReply}>Reply</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </HStack>
            </Box>
          )}
        </Box>
      </HStack>
      {comment.replies && comment.replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          user={user}
          onEdit={onEdit}
          onDelete={onDelete}
          onReply={onReply}
          level={level + 1}
        />
      ))}
      {level === 0 && <Divider my={4} />}
    </Box>
  );
};

CommentThread.propTypes = {
  comment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    created_at: PropTypes.string.isRequired,
    user_id: PropTypes.string.isRequired,
    profiles: PropTypes.shape({
      username: PropTypes.string.isRequired,
      display_name: PropTypes.string,
      avatar_name: PropTypes.string
    }).isRequired,
    reactions: PropTypes.shape({
      upvotes: PropTypes.number,
      downvotes: PropTypes.number
    }),
    userReaction: PropTypes.string,
    replies: PropTypes.array
  }).isRequired,
  user: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReply: PropTypes.func.isRequired,
  level: PropTypes.number
};

function Comments({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuthState();
  const toast = useToast();

  const organizeComments = (flatComments) => {
    const rootComments = [];
    const commentMap = new Map();
    
    // First pass: create a map of all comments
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into tree structure
    flatComments.forEach(comment => {
      const processedComment = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(processedComment);
        } else {
          rootComments.push(processedComment);
        }
      } else {
        rootComments.push(processedComment);
      }
    });

    return rootComments;
  };

  const loadComments = useCallback(async () => {
    try {
      const data = await commentService.getComments(postId);
      setComments(organizeComments(data));
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: 'Error loading comments',
        status: 'error',
        duration: 3000,
      });
    }
  }, [postId, toast]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Please login to comment',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      const comment = await commentService.createComment(newComment, postId);
      setComments(prev => organizeComments([...prev.flat(), comment]));
      setNewComment('');
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: 'Error creating comment',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleEdit = async (id, content) => {
    if (!content.trim()) return;
    
    try {
      await commentService.updateComment(id, content);
      const flatComments = comments.flat();
      const updatedComments = flatComments.map(comment => 
        comment.id === id ? { ...comment, content } : comment
      );
      setComments(organizeComments(updatedComments));
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error updating comment',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await commentService.deleteComment(id);
      const flatComments = comments.flat();
      const remainingComments = flatComments.filter(comment => comment.id !== id);
      setComments(organizeComments(remainingComments));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error deleting comment',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleReply = async (content, parentId) => {
    if (!content.trim()) return;
    
    try {
      const comment = await commentService.createComment(content, postId, parentId);
      const flatComments = comments.flat();
      setComments(organizeComments([...flatComments, comment]));
    } catch (error) {
      console.error('Error creating reply:', error);
      toast({
        title: 'Error creating reply',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Box as="form" onSubmit={handleSubmit}>
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Write a comment..." : "Please login to comment"}
          disabled={!user}
          bg="gray.50"
          mb={2}
        />
        {user && (
          <Button type="submit" isDisabled={!newComment.trim()}>
            Comment
          </Button>
        )}
      </Box>
      
      <VStack align="stretch" spacing={4}>
        {comments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            user={user}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={handleReply}
          />
        ))}
      </VStack>
    </VStack>
  );
}

Comments.propTypes = {
  postId: PropTypes.string.isRequired
};

export default Comments;