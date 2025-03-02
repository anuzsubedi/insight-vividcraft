import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Heading,
  useToast,
  Spinner,
  Center,
  Button,
  HStack,
} from "@chakra-ui/react";
import PostForm from "../components/PostForm";
import { postService } from "../services/postService";

function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await postService.getPost(id);
        setPost(response.post);
      } catch (error) {
        toast({
          title: "Error loading post",
          description: error.message,
          status: "error",
          duration: 5000,
        });
        navigate("/my-posts");
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [id, toast, navigate]);

  const handleSubmit = async (postData) => {
    try {
      await postService.updatePost(id, {
        ...postData,
        tags: postData.tags || [] // Ensure tags are always sent as an array
      });
      
      // Navigate first, then show the toast
      const previousPath = location.state?.from || "/my-posts";
      navigate(previousPath);
      
      // Show success toast after navigation is initiated
      toast({
        title: "Post updated successfully",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      // Show error toast without navigating
      toast({
        title: "Error updating post",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    }
  };

  const handleCancel = () => {
    const previousPath = location.state?.from || "/my-posts";
    navigate(previousPath);
  };

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner />
      </Center>
    );
  }

  return (
    <Container maxW="container.md" py={8}>
      <Heading mb={6}>Edit Post</Heading>
      {post && (
        <>
          <PostForm
            initialData={{
              title: post.title,
              body: post.body,
              type: post.type,
              categoryId: post.category?.id,
              tags: post.tags || [],
              status: post.status,
              scheduledFor: post.scheduled_for,
            }}
            isEditing={true}
            onSubmit={handleSubmit}
          />
          <HStack mt={4} justify="flex-end">
            <Button
              onClick={handleCancel}
              variant="outline"
              borderWidth="2px"
              borderColor="black"
              boxShadow="3px 3px 0 black"
              _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
              _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
            >
              Cancel
            </Button>
          </HStack>
        </>
      )}
    </Container>
  );
}

export default EditPost;
