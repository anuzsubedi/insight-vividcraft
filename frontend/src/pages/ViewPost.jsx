import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast,
  Spinner,
  Box,
  IconButton,
  Center,
  Avatar,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
} from "@chakra-ui/react";
import { ChevronLeftIcon } from "@chakra-ui/icons";
import { BiUpvote, BiDownvote, BiSolidUpvote, BiSolidDownvote } from "react-icons/bi";
import { FiMoreHorizontal } from "react-icons/fi";
import { postService } from "../services/postService";
import Comments from '../components/Comments';
import useAuthState from '../hooks/useAuthState';
import { formatDistanceToNow } from 'date-fns';
import { searchService } from "../services/searchService";
import ReportModal from '../components/ReportModal';

// Helper function to get net score
const getNetScore = (upvotes = 0, downvotes = 0) => upvotes - downvotes;

function ViewPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthState();
  const toast = useToast();
  const [isReactionAnimating, setIsReactionAnimating] = useState(false);
  const [processedText, setProcessedText] = useState([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const data = await postService.getPost(id);
        if (!data || !data.post) {
          navigate('/404');
          return;
        }
        setPost(data.post); // The post response already includes reactions
      } catch (error) {
        console.error('Error loading post:', error);
        toast({
          title: 'Error loading post',
          description: error.message,
          status: 'error',
          duration: 3000,
        });
        navigate('/404');
      } finally {
        setIsLoading(false);
      }
    };
    loadPost();
  }, [id, toast, navigate]);

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
    const previousReactions = { ...post.reactions };
    const previousUserReaction = post.userReaction;

    // Optimistically update UI
    setIsReactionAnimating(true);
    const updatedPost = { ...post };
    
    if (post.userReaction === type) {
      // Removing reaction (toggle off)
      updatedPost.reactions = {
        ...updatedPost.reactions,
        [`${type}s`]: Math.max(0, (updatedPost.reactions[`${type}s`] || 0) - 1)
      };
      updatedPost.userReaction = null;
    } else {
      // If there was a previous reaction, remove it
      if (post.userReaction) {
        updatedPost.reactions = {
          ...updatedPost.reactions,
          [`${post.userReaction}s`]: Math.max(0, (updatedPost.reactions[`${post.userReaction}s`] || 0) - 1)
        };
      }
      
      // Add new reaction
      updatedPost.reactions = {
        ...updatedPost.reactions,
        [`${type}s`]: (updatedPost.reactions[`${type}s`] || 0) + 1
      };
      updatedPost.userReaction = type;
    }

    setPost(updatedPost);

    try {
      const result = await postService.addReaction(id, type);
      // Use the server response to update the state
      setPost(prev => ({
        ...prev,
        reactions: {
          upvotes: result.upvotes || 0,
          downvotes: result.downvotes || 0
        },
        userReaction: result.userReaction
      }));
    } catch (error) {
      // Revert on error
      setPost(prev => ({
        ...prev,
        reactions: previousReactions,
        userReaction: previousUserReaction
      }));
      toast({
        title: 'Error updating reaction',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setTimeout(() => setIsReactionAnimating(false), 300); // Animation duration
    }
  };

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate("/");
    }
  };

  const processMentions = async (text) => {
    const segments = [];
    let lastIndex = 0;
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Process the mention
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

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return segments;
  };

  useEffect(() => {
    if (post?.body) {
      processMentions(post.body).then(setProcessedText);
    }
  }, [post?.body]);

  const handleDelete = async () => {
    try {
      await postService.deletePost(id);
      toast({
        title: "Post deleted",
        status: "success",
        duration: 3000,
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error deleting post",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleReport = () => {
    setIsReportModalOpen(true);
  };

  if (isLoading) {
    return (
      <Container maxW="container.md" py={8}>
        <Center>
          <Spinner size="xl" />
        </Center>
      </Container>
    );
  }

  if (!post) return null;

  return (
    <Container maxW="container.md" py={8}>
      {/* Header */}
      <Button 
        leftIcon={<ChevronLeftIcon />} 
        onClick={handleBack} 
        mb={6}
        variant="ghost"
        color="gray.600"
      >
        Back
      </Button>

      <Box bg="white" rounded="lg" overflow="hidden" shadow="lg">
        {/* Author info and metadata */}
        <Box px={8} pt={6} pb={3}>
          <HStack justify="space-between" mb={6}>
            <HStack spacing={4}>
              <Avatar
                size="md"
                name={post.author.username}
                src={`/avatars/${post.author.avatar_name}`}
                border="2px solid"
                borderColor="gray.200"
              />
              <VStack align="start" spacing={0}>
                <Link
                  to={`/user/${post.author.username}`}
                  style={{ textDecoration: "none" }}
                >
                  <Text fontWeight="bold" color="gray.700">@{post.author.username}</Text>
                </Link>
                <Text fontSize="sm" color="gray.500">
                  {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                </Text>
              </VStack>
            </HStack>
            <Menu isLazy>
              <MenuButton
                as={IconButton}
                icon={<FiMoreHorizontal />}
                variant="ghost"
                size="sm"
                aria-label="More options"
              />
              <Portal>
                <MenuList
                  border="2px solid"
                  borderColor="black"
                  borderRadius="0"
                  boxShadow="4px 4px 0 black"
                  bg="white"
                  zIndex={1400}
                >
                  <MenuItem onClick={handleReport}>
                    Report Post
                  </MenuItem>
                  {user?.isAdmin && (
                    <MenuItem
                      color="red.500"
                      onClick={handleDelete}
                    >
                      Delete Post
                    </MenuItem>
                  )}
                </MenuList>
              </Portal>
            </Menu>
          </HStack>

          {/* Title for articles */}
          {post.type === 'article' && post.title && (
            <Heading size="xl" mb={4} color="gray.800">{post.title}</Heading>
          )}

          {/* Post content */}
          <Text 
            fontSize="lg" 
            color="gray.700" 
            whiteSpace="pre-wrap"
            mb={6}
          >
            {processedText.map((segment, index) => (
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
            ))}
          </Text>

          {/* Tags and metadata */}
          <HStack spacing={3} wrap="wrap" mb={4}>
            <Badge
              px={2}
              py={1}
              rounded="md"
              bg="gray.100"
              color="gray.600"
              textTransform="uppercase"
              fontSize="xs"
              fontWeight="bold"
            >
              {post.type}
            </Badge>
            {post.category && (
              <Badge
                px={2}
                py={1}
                rounded="md"
                bg="green.100"
                color="green.700"
                textTransform="uppercase"
                fontSize="xs"
                fontWeight="bold"
              >
                {post.category.name}
              </Badge>
            )}
            {post.type === 'article' && post.tags?.map(tag => (
              <Badge
                key={tag}
                px={2}
                py={1}
                rounded="md"
                bg="blue.100"
                color="blue.700"
                textTransform="uppercase"
                fontSize="xs"
                fontWeight="bold"
              >
                {tag}
              </Badge>
            ))}
          </HStack>

          {/* Reactions */}
          <HStack spacing={6} pt={2}>
            <HStack spacing={2}>
              <IconButton
                icon={post.userReaction === 'upvote' ? <BiSolidUpvote /> : <BiUpvote />}
                variant="ghost"
                size="sm"
                color={post.userReaction === 'upvote' ? "blue.500" : "gray.600"}
                aria-label="Upvote"
                onClick={() => handleReaction('upvote')}
                transition="transform 0.2s"
                transform={isReactionAnimating && post.userReaction === 'upvote' ? 'scale(1.2)' : 'scale(1)'}
              />
              <Text 
                color={getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) > 0 ? "blue.500" : 
                       getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) < 0 ? "red.500" : "gray.600"}
                fontWeight="semibold"
                transition="all 0.2s"
                transform={isReactionAnimating ? 'scale(1.02)' : 'scale(1)'}
              >
                {getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0)}
              </Text>
              <IconButton
                icon={post.userReaction === 'downvote' ? <BiSolidDownvote /> : <BiDownvote />}
                variant="ghost"
                size="sm"
                color={post.userReaction === 'downvote' ? "red.500" : "gray.600"}
                aria-label="Downvote"
                onClick={() => handleReaction('downvote')}
                transition="transform 0.2s"
                transform={isReactionAnimating && post.userReaction === 'downvote' ? 'scale(1.2)' : 'scale(1)'}
              />
            </HStack>
          </HStack>
        </Box>

        {/* Comments section with subtle separator */}
        <Box px={8} py={6} bg="gray.50" position="relative">
          <Divider mb={6} />
          <Box pl={4}>  {/* Add left padding to accommodate thread lines and chevrons */}
            <Comments postId={post.id} />
          </Box>
        </Box>
      </Box>
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        postId={{ id, type: 'post' }}
      />
    </Container>
  );
}

export default ViewPost;