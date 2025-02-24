import { Container, Heading } from "@chakra-ui/react";
import PostForm from "../components/PostForm";
import { postService } from "../services/postService";
import { useNavigate } from "react-router-dom";

function NewPost() {
  const navigate = useNavigate();

  const handleSubmit = async (postData) => {
    await postService.createPost(postData);
    navigate("/"); //TODO: Redirect to the new post page
  };

  return (
    <Container maxW="container.md" py={8}>
      <Heading mb={6}>Create New Post</Heading>
      <PostForm onSubmit={handleSubmit} />
    </Container>
  );
}

export default NewPost;
