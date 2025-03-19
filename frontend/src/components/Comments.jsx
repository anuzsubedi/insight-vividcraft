import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, VStack, HStack, Input, Button, Avatar, IconButton, useToast, Divider, Collapse, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { FiMoreHorizontal, FiMessageCircle, FiEdit, FiTrash2, FiFlag } from 'react-icons/fi';
import { BiUpvote, BiDownvote, BiSolidUpvote, BiSolidDownvote } from 'react-icons/bi';
import { ChevronDownIcon, ChevronRightIcon, WarningIcon } from '@chakra-ui/icons';
import { commentService } from '../services/commentService';
import useAuthState from '../hooks/useAuthState';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';
import ReportModal from './ReportModal';
import { mentionService } from '../services/mentionService';
import MentionDropdown from './MentionDropdown';
import { searchService } from "../services/searchService";
import { Link } from 'react-router-dom';

// Helper function to calculate net score
const getNetScore = (upvotes = 0, downvotes = 0) => {
  return parseInt(upvotes) - parseInt(downvotes);
};

// Update the CommentThread props to include processedComments
const CommentThread = ({ comment, user, onEdit, onDelete, onRemove, onReply, level = 0, processedComments }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reportTarget, setReportTarget] = useState(null); // Change variable name
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const toast = useToast();

  const isDeleted = !!comment.deleted_at;
  const isRemoved = !!comment.removed_at;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const hasValidReplies = comment.replies?.some(reply => !reply.deleted_at && !reply.removed_at);
  const showDeletedContent = (isDeleted || isRemoved) && hasValidReplies;
  const isAdmin = user?.isAdmin;
  const isCommentOwner = user && String(user.userId) === String(comment.user_id);

  // Don't render deleted comments without valid replies
  if ((isDeleted || isRemoved) && !hasValidReplies) {
    return null;
  }

  const handleReaction = async (type) => {
    if (!user) {
      toast({
        title: 'Please login to react',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      // First get the reaction update from the server
      const result = await commentService.addReaction(comment.id, type);
      // Then pass the complete reaction data to onEdit
      onEdit(comment.id, comment.content, {
        reactions: {
          upvotes: result.upvotes,
          downvotes: result.downvotes
        },
        userReaction: result.userReaction
      });
    } catch (error) {
      toast({
        title: 'Error updating reaction',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleEdit = () => {
    if (!editContent.trim()) return;
    onEdit(comment.id, editContent);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(comment.id);
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
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Add handleReport function
  const handleReport = () => {
    setReportTarget({ id: comment.id, type: 'comment' });
    setIsReportModalOpen(true);
  };

  // Calculate indentation - max out at 8 levels deep to prevent excessive nesting
  const shouldShowContinuation = level > 8;
  const threadLineOffset = 32; // Base offset for thread lines
  const threadLineLeft = -threadLineOffset;
  const chevronOffset = -40; // Offset for collapse chevron

  return (
    <Box position="relative" ml={level === 0 ? 0 : `${threadLineOffset}px`}>
      {/* Thread line with better visibility and max depth handling */}
      {level > 0 && hasValidReplies && (
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
          {hasReplies && hasValidReplies && (
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
            name={isRemoved ? "moderator" : comment.profiles.username}
            src={isRemoved ? undefined : `/avatars/${comment.profiles.avatar_name}`}
            border="2px solid"
            borderColor="gray.200"
          />
          <Box flex={1}>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="bold">
                @{isRemoved ? "moderator" : comment.profiles.username}
              </Text>
              <HStack>
                <Text fontSize="sm" color="gray.500">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </Text>
                {!isDeleted && !isRemoved && user && (
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreHorizontal />}
                      variant="ghost"
                      size="sm"
                      color="gray.500"
                      aria-label="More options"
                    />
                    <MenuList>
                      {isCommentOwner && (
                        <>
                          <MenuItem icon={<FiEdit />} onClick={() => setIsEditing(!isEditing)}>
                            Edit
                          </MenuItem>
                          <MenuItem icon={<FiTrash2 />} color="red.500" onClick={handleDelete}>
                            Delete
                          </MenuItem>
                        </>
                      )}
                      <MenuItem icon={<FiFlag />} onClick={handleReport}>
                        Report
                      </MenuItem>
                    </MenuList>
                  </Menu>
                )}
                {!isDeleted && !isRemoved && isAdmin && (
                  <IconButton
                    icon={<WarningIcon />}
                    variant="ghost"
                    size="sm"
                    colorScheme="red"
                    aria-label="Remove comment"
                    onClick={() => onRemove(comment.id)}
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
                </HStack>
              </Box>
            ) : (
              <>
                <Text mb={2} whiteSpace="pre-wrap" color={showDeletedContent ? "gray.500" : "inherit"}>
                  {showDeletedContent ? (isRemoved ? '[Comment removed by moderator]' : '[Comment deleted by user]') : processedComments[comment.id]?.map((segment, index) => (
                    segment.type === 'mention' && segment.isValid ? (
                      <Link
                        key={index}
                        to={`/user/${segment.content}`}
                        color="blue.500"
                        fontWeight="medium"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        @{segment.content}
                      </Link>
                    ) : (
                      <Text as="span" key={index}>
                        {segment.type === 'mention' ? `@${segment.content}` : segment.content}
                      </Text>
                    )
                  )) || comment.content}
                </Text>

                {!isDeleted && !isRemoved && (
                  <HStack spacing={3} mb={2}>
                    {/* Reactions */}
                    <HStack spacing={2}>
                      <IconButton
                        icon={comment.userReaction === 'upvote' ? <BiSolidUpvote /> : <BiUpvote />}
                        variant="ghost"
                        size="sm"
                        color={comment.userReaction === 'upvote' ? "blue.500" : "gray.600"}
                        aria-label="Upvote"
                        onClick={() => handleReaction('upvote')}
                      />
                      <Text fontWeight="semibold" color={getNetScore(comment.reactions.upvotes, comment.reactions.downvotes) > 0 ? "blue.500" : "gray.600"}>
                        {getNetScore(comment.reactions.upvotes, comment.reactions.downvotes)}
                      </Text>
                      <IconButton
                        icon={comment.userReaction === 'downvote' ? <BiSolidDownvote /> : <BiDownvote />}
                        variant="ghost"
                        size="sm"
                        color={comment.userReaction === 'downvote' ? "red.500" : "gray.600"}
                        aria-label="Downvote"
                        onClick={() => handleReaction('downvote')}
                      />
                    </HStack>

                    {/* Reply Button */}
                    {user && (
                      <Button
                        leftIcon={<FiMessageCircle />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsReplying(!isReplying)}
                      >
                        Reply
                      </Button>
                    )}
                  </HStack>
                )}
              </>
            )}

            {/* Reply Form */}
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
                onRemove={onRemove}
                onReply={onReply}
                level={level + 1}
                processedComments={processedComments}
              />
            ))}
          </Box>
        </Collapse>
      </Box>
      {level === 0 && <Divider my={4} />}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportTarget(null);
        }}
        postId={reportTarget} // Fix prop name to match the state
      />
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
    replies: PropTypes.array,
    deleted_at: PropTypes.string,
    removed_at: PropTypes.string
  }).isRequired,
  user: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onReply: PropTypes.func.isRequired,
  level: PropTypes.number,
  processedComments: PropTypes.object
};

function Comments({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuthState();
  const toast = useToast();
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const inputRef = useRef(null);
  const [processedComments, setProcessedComments] = useState({});

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
      setComments(currentComments => {
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
        return updateCommentInTree(currentComments);
      });
      return;
    }

    try {
      const updatedComment = await commentService.updateComment(id, content);
      setComments(comments => {
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

        return updateCommentContentInTree(comments);
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
      
      setComments(comments => {
        const updateDeletedStatus = comments => {
          return comments.map(comment => {
            if (comment.id === id) {
              return {
                ...comment,
                deleted_at: new Date().toISOString(),
                content: '[Comment deleted by user]'
              };
            }
            if (comment.replies?.length > 0) {
              return {
                ...comment,
                replies: updateDeletedStatus(comment.replies)
              };
            }
            return comment;
          });
        };
        return updateDeletedStatus(comments);
      });
      
      toast({
        title: 'Comment deleted',
        status: 'success',
        duration: 2000,
      });
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

  const handleRemove = async (id) => {
    try {
      await commentService.removeComment(id);
      // Handle the removal in the UI
      setComments(comments => {
        const updatedComments = comments.map(comment => {
          if (comment.id === id) {
            return {
              ...comment,
              removed_at: new Date().toISOString()
            };
          }
          return comment;
        });
        return organizeComments(updatedComments);
      });
    } catch (error) {
      console.error('Error removing comment:', error);
      toast({
        title: 'Error removing comment',
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
      setComments(currentComments => organizeComments([...flattenComments(currentComments), comment]));
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

  const handleInput = async (e) => {
    const text = e.target.value;
    setNewComment(text);

    // Handle mention detection
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex >= 0 && text.slice(lastAtIndex + 1).indexOf(' ') === -1) {
      const query = text.slice(lastAtIndex + 1);
      setMentionQuery(query);
      const users = await mentionService.searchUsers(query);
      setMentionUsers(users);
    } else {
      setMentionUsers([]);
    }
  };

  const handleMentionSelect = (user) => {
    const text = newComment;
    const lastAtIndex = text.lastIndexOf('@');
    const newText = text.slice(0, lastAtIndex) + `@${user.username} `;
    setNewComment(newText);
    setMentionUsers([]);
    inputRef.current?.focus();
  };

  const processMentions = async (text) => {
    const segments = [];
    let lastIndex = 0;
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      const username = match[1];
      try {
        const response = await searchService.searchUsers(username);
        const userExists = response.users.some(user => user.username === username);
        
        segments.push({
          type: 'mention',
          content: username,
          isValid: userExists
        });
      } catch (error) {
        segments.push({
          type: 'mention',
          content: username,
          isValid: false
        });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return segments;
  };

  // Add this effect to process mentions when comments load or change
  useEffect(() => {
    const processAllComments = async () => {
      const processed = {};
      
      // Helper function to process nested comments
      const processCommentTree = async (commentList) => {
        for (const comment of commentList) {
          processed[comment.id] = await processMentions(comment.content);
          if (comment.replies && comment.replies.length > 0) {
            await processCommentTree(comment.replies);
          }
        }
      };

      if (comments.length > 0) {
        await processCommentTree(comments);
      }
      setProcessedComments(processed);
    };

    processAllComments();
  }, [comments]);

  // Modify the comment rendering part to use processed text
  const renderComment = (comment) => (
    <Box key={comment.id}>
      // ...existing avatar and metadata...
      
      <Text fontSize="md" color="gray.700" mt={2}>
        {processedComments[comment.id]?.map((segment, index) => (
          segment.type === 'mention' && segment.isValid ? (
            <Link
              key={index}
              to={`/user/${segment.content}`}
              color="blue.500"
              fontWeight="medium"
              _hover={{ textDecoration: 'underline' }}
            >
              @{segment.content}
            </Link>
          ) : (
            <Text as="span" key={index}>
              {segment.type === 'mention' ? `@${segment.content}` : segment.content}
            </Text>
          )
        )) || comment.body}
      </Text>
      
      // ...existing comment actions...
    </Box>
  );

  return (
    <VStack align="stretch" spacing={4}>
      <Box as="form" onSubmit={handleSubmit} position="relative">
        <Input
          ref={inputRef}
          value={newComment}
          onChange={handleInput}
          placeholder={user ? "Write a comment..." : "Please login to comment"}
          disabled={!user}
          bg="gray.50"
          mb={2}
        />
        {mentionUsers.length > 0 && (
          <MentionDropdown 
            users={mentionUsers}
            onSelect={handleMentionSelect}
            position={{ top: "calc(100% + 5px)" }}
          />
        )}
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
            onRemove={handleRemove}
            onReply={handleReply}
            processedComments={processedComments}
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