import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { authService } from "../services/authService";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setResetRequested(true);
      toast({
        title: "RESET CODE SENT!",
        description: "CHECK YOUR EMAIL FOR THE PASSWORD RESET CODE",
        variant: "solid",
        status: "success",
        duration: 5000,
        position: "top-right",
      });
    } catch (error) {
      toast({
        title: "ERROR",
        description: error.response?.data?.error || "SOMETHING WENT WRONG",
        variant: "solid",
        status: "error",
        duration: 5000,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg="paper.50" minH="100vh" py={12}>
      <Container maxW="md" bg="white" p={8} borderRadius="md" boxShadow="sm">
        <VStack spacing={8}>
          <Heading color="paper.500">Reset Password</Heading>
          {!resetRequested ? (
            <Box as="form" onSubmit={handleSubmit} width="100%">
              <VStack spacing={6}>
                <FormControl isInvalid={error}>
                  <FormLabel>Email Address</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    size="lg"
                    bg="paper.50"
                  />
                  <FormErrorMessage>{error}</FormErrorMessage>
                </FormControl>
                <Button
                  type="submit"
                  width="full"
                  isLoading={isLoading}
                  loadingText="Sending..."
                >
                  Send Reset Code
                </Button>
              </VStack>
            </Box>
          ) : (
            <VStack spacing={4}>
              <Text textAlign="center">
                Reset code has been sent to your email.
              </Text>
              <Button as={Link} to="/reset-password" width="full">
                Enter Reset Code
              </Button>
            </VStack>
          )}
          <Button as={Link} to="/login" variant="link" color="accent.100">
            Back to Login
          </Button>
        </VStack>
      </Container>
    </Box>
  );
}

export default ForgotPassword;
