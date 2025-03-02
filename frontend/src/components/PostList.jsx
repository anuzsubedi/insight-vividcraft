import {
  Box,
  VStack,
  Text,
  Button,
  HStack,
  Badge,
  useToast,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { postService } from "../services/postService";

function PostList() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const loadPosts = async () => {
    try {
      const response = await postService.getPosts();
      setPosts(response.posts);
    } catch (error) {
      toast({
        title: "Error loading posts",
        description: error.response?.data?.error || "Failed to load posts",
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (postId) => {
    try {
      await postService.deletePost(postId);
      toast({
        title: "Post deleted",
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

  if (isLoading) {
    return <Text>Loading posts...</Text>;
  }

  return (
    <VStack spacing={4} align="stretch">
      {posts.map((post) => (
        <Box key={post.id} p={4} border="2px solid" borderColor="paper.200">
          <VStack align="stretch" spacing={3}>
            <Text fontSize="xl" fontWeight="bold">
              {post.title}
            </Text>
            <HStack>
              <Badge>{post.type}</Badge>
              <Badge
                colorScheme={
                  post.status === "published"
                    ? "green"
                    : post.status === "scheduled"
                    ? "blue"
                    : "gray"
                }
              >
                {post.status}
              </Badge>
              {post.tags && post.tags.map((tag) => (
                <Badge key={tag} colorScheme="teal">
                  {tag}
                </Badge>
              ))}
            </HStack>
            <Text noOfLines={2}>{post.body}</Text>
            <HStack>
              <Button size="sm" onClick={() => handleDelete(post.id)}>
                Delete
              </Button>
              {post.status === "scheduled" && (
                <Button
                  size="sm"
                  onClick={() => postService.publishPost(post.id)}
                >
                  Publish Now
                </Button>
              )}
            </HStack>
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

export default PostList;
