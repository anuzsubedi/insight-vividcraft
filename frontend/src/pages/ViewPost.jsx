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
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { BiUpvote, BiDownvote, BiSolidUpvote, BiSolidDownvote } from "react-icons/bi";
import { postService } from "../services/postService";
import Comments from '../components/Comments';
import useAuthState from '../hooks/useAuthState';

// Helper function to get net score
const getNetScore = (upvotes, downvotes) => upvotes - downvotes;

function ViewPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuthState();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await postService.getPost(id);
        if (!response.post) {
          navigate('/not-found', { replace: true });
          return;
        }
        
        // Load reaction information
        try {
          const reactions = await postService.getReactions(id);
          setPost({
            ...response.post,
            reactions: {
              upvotes: reactions.upvotes,
              downvotes: reactions.downvotes
            },
            userReaction: reactions.userReaction
          });
        } catch (error) {
          console.error('Error loading reactions:', error);
          setPost({
            ...response.post,
            reactions: { upvotes: 0, downvotes: 0 },
            userReaction: null
          });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          navigate('/not-found', { replace: true });
        } else {
          toast({
            title: "Error loading post",
            description: error.response?.data?.error || error.message,
            status: "error",
            duration: 5000,
          });
          navigate("/");
        }
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
    const updatedPost = { ...post };
    if (post.userReaction === type) {
      // Removing reaction
      updatedPost.reactions[`${type}s`] -= 1;
      updatedPost.userReaction = null;
    } else {
      // If there was a previous reaction, remove it
      if (post.userReaction) {
        updatedPost.reactions[`${post.userReaction}s`] -= 1;
      }
      // Add new reaction
      updatedPost.reactions[`${type}s`] += 1;
      updatedPost.userReaction = type;
    }

    setPost(updatedPost);

    try {
      const result = await postService.addReaction(id, type);
      setPost(prev => ({
        ...prev,
        reactions: result,
        userReaction: result.userReaction
      }));
    } catch (error) {
      // Revert on error
      console.error('Error handling reaction:', error);
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
    }
  };

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.lg" py={8}>
        <Spinner size="xl" />
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={8}>
      <Button
        onClick={handleBack}
        variant="outline"
        mb={8}
        leftIcon={<ChevronDownIcon transform="rotate(90deg)" />}
        borderWidth="2px"
        borderColor="black"
        boxShadow="3px 3px 0 black"
        _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
        _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
      >
        {location.state?.from ? "Back" : (
          <Text fontFamily="monospace" fontSize="sm">
            insight
          </Text>
        )}
      </Button>

      <Box
        bg="white"
        p={8}
        border="2px solid"
        borderColor="black"
        boxShadow="6px 6px 0 black"
      >
        <VStack align="stretch" spacing={6}>
          <Heading size="xl">{post.title}</Heading>
          
          <HStack wrap="wrap" spacing={4}>
            <Badge
              px={2}
              py={1}
              bg="paper.100"
              color="paper.800"
              fontWeight="bold"
              textTransform="uppercase"
              border="1px solid"
              borderColor="paper.300"
            >
              {post.type}
            </Badge>
            {post.category && (
              <Badge
                px={2}
                py={1}
                bg="green.100"
                color="green.800"
                fontWeight="bold"
                textTransform="uppercase"
                border="1px solid"
                borderColor="green.300"
              >
                {post.category.name}
              </Badge>
            )}
            {post.tags && post.tags.map((tag) => (
              <Badge
                key={tag}
                px={2}
                py={1}
                bg="teal.100"
                color="teal.800"
                fontWeight="bold"
                textTransform="uppercase"
                border="1px solid"
                borderColor="teal.300"
              >
                {tag}
              </Badge>
            ))}
          </HStack>

          <Text color="paper.600" whiteSpace="pre-wrap">
            {post.body}
          </Text>

          <HStack justify="space-between" pt={4}>
            <Text color="paper.400">
              By{" "}
              <Link
                to={`/user/${post.author.username}`}
                style={{ textDecoration: "underline" }}
              >
                {post.author.display_name}
              </Link>
            </Text>
            <Text color="paper.400">
              {new Date(post.published_at).toLocaleDateString()}
            </Text>
          </HStack>

          <HStack spacing={6}>
            <HStack spacing={2}>
              <IconButton
                icon={post.userReaction === 'upvote' ? <BiSolidUpvote /> : <BiUpvote />}
                variant="ghost"
                size="sm"
                color={post.userReaction === 'upvote' ? "blue.500" : "gray.600"}
                aria-label="Upvote"
                onClick={() => handleReaction('upvote')}
              />
              <Text 
                color={getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) > 0 ? "blue.500" : 
                       getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) < 0 ? "red.500" : "gray.600"}
                fontWeight="semibold"
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
              />
            </HStack>
          </HStack>

          <Box mt={4}>
            <Comments postId={post.id} />
          </Box>
        </VStack>
      </Box>
    </Container>
  );
}

export default ViewPost;