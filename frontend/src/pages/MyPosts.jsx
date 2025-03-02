import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  VStack,
  Heading,
  Button,
  useToast,
  HStack,
  Text,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Spinner,
  Center,
  Portal,
} from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";
import { ArrowBackIcon, EditIcon, CheckIcon, DeleteIcon, HamburgerIcon, ViewOffIcon } from "@chakra-ui/icons";
import { postService } from "../services/postService";
import PropTypes from "prop-types";

function MyPosts() {
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [draftPosts, setDraftPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const toast = useToast();

  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await Promise.allSettled([
        postService.getMyPosts({ status: "published" }),
        postService.getMyPosts({ status: "draft" }),
        postService.getMyPosts({ status: "scheduled" })
      ]);

      // Process results
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          switch (index) {
            case 0:
              setPublishedPosts(result.value.posts || []);
              break;
            case 1:
              setDraftPosts(result.value.posts || []);
              break;
            case 2:
              setScheduledPosts(result.value.posts || []);
              break;
          }
        } else {
          console.error(
            `Failed to load ${
              index === 0 ? "published" : index === 1 ? "draft" : "scheduled"
            } posts:`,
            result.reason
          );
          // Only show toast for authentication errors
          if (result.reason.message.includes("log in")) {
            toast({
              title: "Authentication Required",
              description: "Please log in to view your posts",
              status: "error",
              duration: 5000,
            });
          }
        }
      });
    } catch (error) {
      console.error("Load posts error:", error);
      toast({
        title: "Error loading posts",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDelete = async (postId) => {
    try {
      await postService.deletePost(postId);
      toast({
        title: "Post deleted successfully",
        status: "success",
        duration: 3000,
      });
      loadPosts();
    } catch (error) {
      toast({
        title: "Error deleting post",
        description: error.response?.data?.error || "Failed to delete post",
        status: "error",
        duration: 5000,
      });
    }
  };

  const handlePublish = async (postId) => {
    try {
      await postService.publishPost(postId); // Use publishPost instead of updatePost
      toast({
        title: "Post published successfully",
        status: "success",
        duration: 3000,
      });
      loadPosts();
    } catch (error) {
      toast({
        title: "Error publishing post",
        description: error.response?.data?.error || "Failed to publish post",
        status: "error",
        duration: 5000,
      });
    }
  };

  const handleMoveToDrafts = async (postId) => {
    try {
      await postService.updatePost(postId, { status: "draft" });
      toast({
        title: "Post moved to drafts",
        status: "success",
        duration: 3000,
      });
      loadPosts();
    } catch (error) {
      toast({
        title: "Error moving post to drafts",
        description: error.response?.data?.error || "Failed to move post to drafts",
        status: "error",
        duration: 5000,
      });
    }
  };

  const checkScheduledPosts = useCallback(async () => {
    try {
      const result = await postService.publishScheduledPosts();
      if (result.posts.length > 0) {
        toast({
          title: "Scheduled Posts Published",
          description: `${result.posts.length} posts have been published`,
          status: "success",
          duration: 5000,
        });
        // Reload posts to reflect the changes
        loadPosts();
      }
    } catch (error) {
      console.error("Failed to publish scheduled posts:", error);
      toast({
        title: "Error",
        description: "Failed to publish scheduled posts",
        status: "error",
        duration: 5000,
      });
    }
  }, [toast, loadPosts]);

  useEffect(() => {
    checkScheduledPosts();
  }, [checkScheduledPosts]);

  return (
    <Box minH="100vh" bg="paper.50" py={8}>
      <Container maxW="container.lg">
        <HStack justify="space-between" mb={8}>
          <Button
            as={Link}
            to="/"
            variant="outline"
            leftIcon={<ArrowBackIcon />}
          >
            Back to Home
          </Button>
          <HStack>
            <Button
              onClick={checkScheduledPosts}
              variant="outline"
              colorScheme="blue"
            >
              Check Scheduled Posts
            </Button>
            <Button as={Link} to="/posts/new" variant="solid">
              Create New Post
            </Button>
          </HStack>
        </HStack>

        <Box
          bg="white"
          p={8}
          border="2px solid"
          borderColor="paper.400"
          transform="translate(-4px, -4px)"
          boxShadow="6px 6px 0 black"
        >
          <Heading mb={6}>My Posts</Heading>

          {isLoading ? (
            <Center py={8}>
              <Spinner />
            </Center>
          ) : (
            <Tabs variant="enclosed" index={currentTab} onChange={setCurrentTab}>
              <TabList>
                <Tab>Published ({publishedPosts.length})</Tab>
                <Tab>Drafts ({draftPosts.length})</Tab>
                <Tab>Scheduled ({scheduledPosts.length})</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <PostsList
                    posts={publishedPosts}
                    onDelete={handleDelete}
                    onPublish={handlePublish}
                    onMoveToDrafts={handleMoveToDrafts}
                  />
                </TabPanel>
                <TabPanel>
                  <PostsList
                    posts={draftPosts}
                    onDelete={handleDelete}
                    onPublish={handlePublish}
                    onMoveToDrafts={handleMoveToDrafts}
                  />
                </TabPanel>
                <TabPanel>
                  <PostsList
                    posts={scheduledPosts}
                    onDelete={handleDelete}
                    onPublish={handlePublish}
                    onMoveToDrafts={handleMoveToDrafts}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </Box>
      </Container>
    </Box>
  );
}

const PostsList = ({ posts, onDelete, onPublish, onMoveToDrafts }) => {
  const location = useLocation();
  
  return (
    <VStack spacing={4} align="stretch">
      {posts.map((post) => (
        <Box
          key={post.id}
          p={6}
          border="2px solid"
          borderColor="black"
          bg="white"
          transform="rotate(0.5deg)"
          boxShadow="5px 5px 0 black"
          _hover={{
            transform: "rotate(0.5deg) translate(-3px, -3px)",
            boxShadow: "8px 8px 0 black",
            cursor: "pointer"
          }}
          transition="all 0.2s"
          position="relative"
          onClick={() => window.location.href = `/posts/${post.id}`}
        >
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={3} flex="1">
              <Heading size="md">{post.title}</Heading>
              <HStack wrap="wrap">
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
              <Text noOfLines={3} color="paper.600">
                {post.body}
              </Text>
            </VStack>
            
            <Menu isLazy gutter={4}>
              <MenuButton
                as={IconButton}
                icon={<HamburgerIcon />}
                variant="ghost"
                aria-label="Post options"
                onClick={(e) => e.stopPropagation()}
                position="relative"
                zIndex={2}
              />
              <Portal>
                <MenuList
                  border="2px solid"
                  borderColor="black"
                  borderRadius="0"
                  boxShadow="4px 4px 0 black"
                  onClick={(e) => e.stopPropagation()}
                  bg="white"
                  zIndex={1400}
                  position="relative"
                >
                  <MenuItem 
                    as={Link}
                    to={`/posts/${post.id}/edit`}
                    state={{ from: location.pathname }}
                    icon={<EditIcon />}
                  >
                    Edit
                  </MenuItem>
                  {(post.status === "scheduled" || post.status === "draft") && (
                    <MenuItem 
                      onClick={() => onPublish(post.id)}
                      icon={<CheckIcon />}
                    >
                      Publish Now
                    </MenuItem>
                  )}
                  {post.status === "published" && (
                    <MenuItem 
                      onClick={() => onMoveToDrafts(post.id)}
                      icon={<ViewOffIcon />}
                    >
                      Move to Drafts
                    </MenuItem>
                  )}
                  <MenuItem 
                    color="red.500" 
                    onClick={() => onDelete(post.id)}
                    icon={<DeleteIcon />}
                  >
                    Delete
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

PostsList.propTypes = {
  posts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      status: PropTypes.oneOf(["published", "draft", "scheduled"]).isRequired,
      type: PropTypes.string.isRequired,
      category: PropTypes.shape({
        name: PropTypes.string.isRequired,
      }),
      scheduled_for: PropTypes.string,
    })
  ).isRequired,
  onDelete: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  onMoveToDrafts: PropTypes.func.isRequired,
};

export default MyPosts;
