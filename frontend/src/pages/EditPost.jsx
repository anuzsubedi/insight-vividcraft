import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Heading,
  useToast,
  Spinner,
  Center,
} from "@chakra-ui/react";
import PostForm from "../components/PostForm";
import { postService } from "../services/postService";

function EditPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await postService.getPost(slug);
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
  }, [slug, toast, navigate]);

  const handleSubmit = async (postData) => {
    try {
      await postService.updatePost(slug, postData);
      toast({
        title: "Post updated successfully",
        status: "success",
        duration: 3000,
      });
      navigate("/my-posts");
    } catch (error) {
      toast({
        title: "Error updating post",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    }
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
      )}
    </Container>
  );
}

export default EditPost;
