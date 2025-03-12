import { useState, useEffect, useCallback } from 'react';
import { Box, Text, VStack, HStack, Input, Button, Avatar, IconButton, useToast, Divider, Collapse } from '@chakra-ui/react';
import { FiMoreHorizontal, FiMessageCircle } from 'react-icons/fi';
import { BiUpvote, BiDownvote, BiSolidUpvote, BiSolidDownvote } from 'react-icons/bi';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { commentService } from '../services/commentService';
import useAuthState from '../hooks/useAuthState';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';

const CommentThread = ({ comment, user, onEdit, onDelete, onReply, level = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toast = useToast();
  const hasReplies = comment.replies && comment.replies.length > 0;

  // No local state for reactions, use the comment prop directly
  const getNetScore = (upvotes, downvotes) => {
    // Ensure values are numbers with defaults
    const up = parseInt(upvotes) || 0;
    const down = parseInt(downvotes) || 0;
    return up - down;
  };

  const handleReaction = async (type) => {
    if (!user) {
      toast({
        title: 'Please login to react',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // Store previous state for rollback in case of error
    const previousReactions = { 
      upvotes: parseInt(comment.reactions.upvotes) || 0,
      downvotes: parseInt(comment.reactions.downvotes) || 0
    };
    const previousUserReaction = comment.userReaction;

    // Start animation
    setIsAnimating(true);

    try {
      // Create updated comment state
      const updatedComment = { ...comment };
      if (comment.userReaction === type) {
        // Removing reaction (toggle off)
        updatedComment.reactions = {
          ...updatedComment.reactions,
          [`${type}s`]: Math.max(0, (parseInt(updatedComment.reactions[`${type}s`]) || 0) - 1)
        };
        updatedComment.userReaction = null;
      } else {
        // If there was a previous reaction, remove it
        if (updatedComment.userReaction) {
          updatedComment.reactions = {
            ...updatedComment.reactions,
            [`${updatedComment.userReaction}s`]: Math.max(0, (parseInt(updatedComment.reactions[`${updatedComment.userReaction}s`]) || 0) - 1)
          };
        }
        // Add new reaction
        updatedComment.reactions = {
          ...updatedComment.reactions,
          [`${type}s`]: (parseInt(updatedComment.reactions[`${type}s`]) || 0) + 1
        };
        updatedComment.userReaction = type;
      }

      // Update UI immediately (optimistic update)
      onEdit(comment.id, comment.content, updatedComment);

      // Send API request
      const result = await commentService.addReaction(comment.id, type);

      // Update with server response while preserving reply structure
      const serverUpdatedComment = {
        ...comment,
        reactions: {
          upvotes: parseInt(result.upvotes) || 0,
          downvotes: parseInt(result.downvotes) || 0
        },
        userReaction: result.userReaction
      };
      onEdit(comment.id, comment.content, serverUpdatedComment);
      
    } catch (error) {
      // Revert on error
      console.error('Error handling reaction:', error);
      onEdit(comment.id, comment.content, {
        ...comment,
        reactions: previousReactions,
        userReaction: previousUserReaction
      });

      toast({
        title: 'Error updating reaction',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

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

  // Calculate indentation - max out at 8 levels deep to prevent excessive nesting
  const effectiveLevel = Math.min(level, 8);
  const shouldShowContinuation = level > 8;
  const threadLineOffset = 32; // Base offset for thread lines
  const threadLineLeft = -threadLineOffset;
  const chevronOffset = -40; // Offset for collapse chevron

  return (
    <Box position="relative" ml={level === 0 ? 0 : `${threadLineOffset}px`}>
      {/* Thread line with better visibility and max depth handling */}
      {level > 0 && (
        <Box
          position="absolute"
          left={threadLineLeft}
          top="0"
          bottom={hasReplies ? "0" : "50%"}
          width="2px"
          bg="gray.300"
          _hover={{ bg: "blue.300", width: "3px" }}
          transition="all 0.2s"
          cursor="pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
      )}
      
      <Box position="relative">
        {/* Horizontal thread connector with hover effect sync */}
        {level > 0 && (
          <Box
            position="absolute"
            left={threadLineLeft}
            top="20px"
            width={`${threadLineOffset - 8}px`}
            height="2px"
            bg="gray.300"
            _groupHover={{ bg: "blue.300" }}
            transition="all 0.2s"
          />
        )}

        {/* Show continuation indicator for deep threads */}
        {shouldShowContinuation && (
          <Box
            position="absolute"
            left={`${threadLineLeft - 8}px`}
            top="10px"
            fontSize="sm"
            color="blue.500"
            transform="rotate(-90deg)"
          >
            •••
          </Box>
        )}

        <HStack spacing={4} mb={2} align="start" position="relative" role="group">
          {/* Collapse button with better hover interaction */}
          {hasReplies && (
            <IconButton
              icon={isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
              variant="ghost"
              size="xs"
              color="gray.600"
              aria-label={isCollapsed ? "Expand thread" : "Collapse thread"}
              onClick={() => setIsCollapsed(!isCollapsed)}
              position="absolute"
              left={`${chevronOffset}px`}
              top="12px"
              zIndex={1}
              _hover={{ bg: "blue.100", color: "blue.600" }}
              _groupHover={{ color: "blue.500" }}
              borderRadius="full"
              transition="all 0.2s"
            />
          )}
          
          <Avatar
            size="sm"
            name={comment.profiles.username}
            src={`/avatars/${comment.profiles.avatar_name}`}
            border="2px solid"
            borderColor="gray.200"
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
                  icon={comment.userReaction === 'upvote' ? <BiSolidUpvote /> : <BiUpvote />}
                  variant="ghost"
                  size="sm"
                  color={comment.userReaction === 'upvote' ? "blue.500" : "gray.600"}
                  aria-label="Upvote"
                  onClick={() => handleReaction('upvote')}
                  transition="transform 0.2s"
                  transform={isAnimating && comment.userReaction === 'upvote' ? 'scale(1.2)' : 'scale(1)'}
                />
                <Text 
                  color={getNetScore(comment.reactions.upvotes, comment.reactions.downvotes) > 0 ? "blue.500" : 
                        getNetScore(comment.reactions.upvotes, comment.reactions.downvotes) < 0 ? "red.500" : "gray.600"}
                  fontWeight="semibold"
                  transition="all 0.2s"
                  transform={isAnimating ? 'scale(1.02)' : 'scale(1)'}
                >
                  {getNetScore(comment.reactions.upvotes, comment.reactions.downvotes)}
                </Text>
                <IconButton
                  icon={comment.userReaction === 'downvote' ? <BiSolidDownvote /> : <BiDownvote />}
                  variant="ghost"
                  size="sm"
                  color={comment.userReaction === 'downvote' ? "red.500" : "gray.600"}
                  aria-label="Downvote"
                  onClick={() => handleReaction('downvote')}
                  transition="transform 0.2s"
                  transform={isAnimating && comment.userReaction === 'downvote' ? 'scale(1.2)' : 'scale(1)'}
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
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  color="gray.600"
                  fontWeight="normal"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                >
                  {isCollapsed 
                    ? `Show ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                    : `Hide ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                  }
                </Button>
              )}
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

        {/* Nested replies with improved collapse animation */}
        <Collapse in={!isCollapsed} animateOpacity>
          <Box position="relative" pt={2}>
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
          </Box>
        </Collapse>
      </Box>
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
    const orphanedReplies = new Map();
    
    // First pass: create a map of all comments and collect orphaned replies
    flatComments.forEach(comment => {
      const commentWithReplies = { ...comment, replies: [] };
      commentMap.set(comment.id, commentWithReplies);
      
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          // Parent already exists, add this as a reply
          parent.replies.push(commentWithReplies);
        } else {
          // Parent doesn't exist yet, store as orphaned
          if (!orphanedReplies.has(comment.parent_id)) {
            orphanedReplies.set(comment.parent_id, []);
          }
          orphanedReplies.get(comment.parent_id).push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
      
      // Check if this comment has any orphaned replies waiting
      const waitingReplies = orphanedReplies.get(comment.id);
      if (waitingReplies) {
        commentWithReplies.replies.push(...waitingReplies);
        orphanedReplies.delete(comment.id);
      }
    });

    // Sort replies by creation date
    const sortReplies = (comments) => {
      comments.forEach(comment => {
        if (comment.replies?.length > 0) {
          comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          sortReplies(comment.replies);
        }
      });
    };

    // Sort root comments and all reply chains
    rootComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    sortReplies(rootComments);

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

  // Helper function to flatten comment tree
  const flattenComments = (comments) => {
    let flat = [];
    comments.forEach(comment => {
      flat.push(comment);
      if (comment.replies?.length > 0) {
        flat = flat.concat(flattenComments(comment.replies));
      }
    });
    return flat;
  };

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
      setComments(prev => organizeComments([...flattenComments(prev), comment]));
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

  const handleEdit = async (id, content, reactionUpdate) => {
    if (reactionUpdate) {
      // Handle reaction update while preserving the comment tree structure
      setComments(prevComments => {
        // Helper function to update a comment in the tree
        const updateCommentInTree = (comments) => {
          return comments.map(comment => {
            if (comment.id === id) {
              // Update the current comment while preserving its replies
              return {
                ...comment,
                reactions: {
                  upvotes: parseInt(reactionUpdate.reactions.upvotes) || 0,
                  downvotes: parseInt(reactionUpdate.reactions.downvotes) || 0
                },
                userReaction: reactionUpdate.userReaction,
                replies: comment.replies // Preserve the replies array
              };
            }
            // Recursively update replies if they exist
            if (comment.replies?.length > 0) {
              return {
                ...comment,
                replies: updateCommentInTree(comment.replies)
              };
            }
            return comment;
          });
        };

        // Update the entire comment tree
        return updateCommentInTree(prevComments);
      });
      return;
    }

    // Handle content edit
    try {
      const updatedComment = await commentService.updateComment(id, content);
      setComments(prevComments => {
        // Helper function to update comment content in the tree
        const updateCommentContentInTree = (comments) => {
          return comments.map(comment => {
            if (comment.id === id) {
              // Update content while preserving reactions and replies
              return {
                ...updatedComment,
                reactions: comment.reactions,
                userReaction: comment.userReaction,
                replies: comment.replies
              };
            }
            // Recursively update replies if they exist
            if (comment.replies?.length > 0) {
              return {
                ...comment,
                replies: updateCommentContentInTree(comment.replies)
              };
            }
            return comment;
          });
        };

        return updateCommentContentInTree(prevComments);
      });
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
      const flatComments = flattenComments(comments);
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
      const flatComments = flattenComments(comments);
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