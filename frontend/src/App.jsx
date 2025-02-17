import { Button, Heading, Text, VStack, Container } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import HealthCheck from "./components/HealthCheck";

function App() {
  return (
    <Container maxW="container.xl">
      <VStack spacing={8} justify="center" minH="100vh">
        <Heading size="2xl">Welcome to VividCraft</Heading>
        <Text fontSize="lg" color="gray.600">
          Your Creative Journey Begins Here
        </Text>

        <VStack spacing={4}>
          <HealthCheck />

          <Button as={Link} to="/login" size="lg" width="200px">
            Login
          </Button>
        </VStack>
      </VStack>
    </Container>
  );
}

export default App;
