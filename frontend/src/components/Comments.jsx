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
  const [reactions, setReactions] = useState({ upvotes: 0, downvotes: 0 });
  const [userReaction, setUserReaction] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const loadReactions = async () => {
      try {
        const data = await commentService.getReactions(comment.id);
        setReactions(data);
      } catch (error) {
        console.error('Error loading reactions:', error);
      }
    };
    loadReactions();
  }, [comment.id]);

  const getNetScore = (upvotes, downvotes) => upvotes - downvotes;

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

    // Optimistically update the UI
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
      setReactions(result);
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

  const handleEdit = async () => {
    if (isEditing) {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(comment.id, replyContent);
    setReplyContent('');
    setIsReplying(false);
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  return (
    <Box>
      <HStack align="start" spacing={3} position="relative">
        {/* Avatar column with thread line */}
        <Box position="relative">
          <Avatar 
            size="sm" 
            src={comment.profiles?.avatar_name ? `/avatars/${comment.profiles.avatar_name}` : undefined}
            name={comment.profiles?.display_name}
          />
          {(comment.replies?.length > 0 || isReplying) && (
            <Box
              position="absolute"
              left="50%"
              top="32px"
              bottom="-16px"
              width="2px"
              bg="gray.200"
              transform="translateX(-50%)"
            />
          )}
        </Box>

        {/* Content column */}
        <Box flex={1}>
          <HStack justify="space-between" mb={1}>
            <HStack>
              <Text fontWeight="semibold">{comment.profiles?.display_name}</Text>
              <Text fontSize="sm" color="gray.500">· {timeAgo}</Text>
            </HStack>
            {user && (
              <HStack spacing={2}>
                {user.id === comment.user_id && (
                  <IconButton
                    size="sm"
                    icon={<FiMoreHorizontal />}
                    variant="ghost"
                    aria-label="Comment options"
                    onClick={handleEdit}
                  />
                )}
              </HStack>
            )}
          </HStack>

          {isEditing ? (
            <Box mb={2}>
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleEdit}
                autoFocus
                variant="filled"
                bg="gray.50"
              />
            </Box>
          ) : (
            <Text mb={2} whiteSpace="pre-wrap">{comment.content}</Text>
          )}

          <HStack spacing={6} mb={2}>
            <HStack>
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
                transform={isAnimating ? 'scale(1.2)' : 'scale(1)'}
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
              {comment.replies?.length || 0}
            </Button>
          </HStack>

          {isReplying && (
            <Box mb={4}>
              <form onSubmit={handleReplySubmit}>
                <HStack>
                  <Input
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    variant="filled"
                    bg="gray.50"
                  />
                  <Button type="submit" colorScheme="blue" size="md">
                    Reply
                  </Button>
                </HStack>
              </form>
            </Box>
          )}
        </Box>
      </HStack>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <Box pl={12} mt={4}>
          <VStack spacing={6} align="stretch">
            {comment.replies.map(reply => (
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
          </VStack>
        </Box>
      )}
    </Box>
  );
};

CommentThread.propTypes = {
  comment: PropTypes.object.isRequired,
  user: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReply: PropTypes.func.isRequired,
  level: PropTypes.number
};

const Comments = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuthState();
  const toast = useToast();

  // Helper function to organize comments into a tree structure
  const organizeComments = (flatComments) => {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: Create a map of all comments
    flatComments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // Second pass: Organize into tree structure
    flatComments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
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

  const handleReply = async (parentId, content) => {
    if (!user) {
      toast({
        title: 'Please login to reply',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    if (!content.trim()) return;
    
    try {
      const reply = await commentService.createComment(content, postId, parentId);
      const flatComments = comments.flat();
      setComments(organizeComments([...flatComments, reply]));
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
    <Box mt={8}>
      <Text fontSize="lg" fontWeight="semibold" mb={6}>
        Comments {comments.length > 0 && `(${comments.length})`}
      </Text>
      
      {user && (
        <Box mb={8}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={3} align="stretch">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                size="lg"
                variant="filled"
                bg="gray.50"
              />
              <Button 
                type="submit" 
                colorScheme="blue" 
                alignSelf="flex-end"
                isDisabled={!newComment.trim()}
              >
                Post
              </Button>
            </VStack>
          </form>
        </Box>
      )}

      <VStack spacing={8} align="stretch" divider={<Divider />}>
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
    </Box>
  );
};

Comments.propTypes = {
  postId: PropTypes.number.isRequired,
};

export default Comments;