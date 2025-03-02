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
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { ArrowBackIcon, SettingsIcon } from "@chakra-ui/icons";
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
        postService.getPosts({ author: "me", status: "published" }),
        postService.getPosts({ author: "me", status: "draft" }),
        postService.getPosts({ author: "me", status: "scheduled" }),
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

  const handleDelete = async (slug) => {
    try {
      await postService.deletePost(slug);
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

  const handlePublish = async (slug) => {
    try {
      await postService.updatePost(slug, { status: "published" });
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
                  />
                </TabPanel>
                <TabPanel>
                  <PostsList
                    posts={draftPosts}
                    onDelete={handleDelete}
                    onPublish={handlePublish}
                  />
                </TabPanel>
                <TabPanel>
                  <PostsList
                    posts={scheduledPosts}
                    onDelete={handleDelete}
                    onPublish={handlePublish}
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

const PostsList = ({ posts, onDelete, onPublish }) => {
  if (posts.length === 0) {
    return <Text color="paper.400">No posts found</Text>;
  }

  return (
    <VStack spacing={4} align="stretch">
      {posts.map((post) => (
        <Box key={post.id} p={4} border="2px solid" borderColor="paper.200">
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={2}>
              <Heading size="md">{post.title}</Heading>
              <HStack>
                <Badge>{post.type}</Badge>
                <Badge
                  colorScheme={
                    post.status === "published"
                      ? "green"
                      : post.status === "draft"
                      ? "gray"
                      : "blue"
                  }
                >
                  {post.status}
                </Badge>
                {post.category && (
                  <Badge colorScheme="purple">{post.category.name}</Badge>
                )}
                {post.tags && post.tags.map((tag) => (
                  <Badge key={tag} colorScheme="teal">
                    {tag}
                  </Badge>
                ))}
              </HStack>
              {post.status === "scheduled" && (
                <Text fontSize="sm" color="paper.400">
                  Scheduled for: {new Date(post.scheduled_for).toLocaleString()}
                </Text>
              )}
            </VStack>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<SettingsIcon />}
                variant="ghost"
              />
              <MenuList>
                <MenuItem as={Link} to={`/posts/${post.slug}/edit`}>
                  Edit
                </MenuItem>
                {post.status !== "published" && (
                  <MenuItem onClick={() => onPublish(post.slug)}>
                    Publish Now
                  </MenuItem>
                )}
                <MenuItem color="red.500" onClick={() => onDelete(post.slug)}>
                  Delete
                </MenuItem>
              </MenuList>
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
};

export default MyPosts;
