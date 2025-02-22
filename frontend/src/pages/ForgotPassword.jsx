import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  HStack,
  PinInput,
  PinInputField,
  useToast,
} from "@chakra-ui/react";
import { authService } from "../services/authService";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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

  const handleVerifyCode = () => {
    if (code.length === 6) {
      navigate("/reset-password", {
        state: {
          email,
          code,
        },
      });
    }
  };

  return (
    <Box bg="paper.50" minH="100vh" py={12}>
      <Container maxW="md" bg="white" p={8} {...containerStyles}>
        <VStack spacing={8}>
          <Heading color="paper.500">Reset Password</Heading>
          {!resetRequested ? (
            <Box as="form" onSubmit={handleSubmit} width="100%">
              <VStack spacing={6}>
                <FormControl isInvalid={error}>
                  <FormLabel
                    fontSize="sm"
                    fontWeight="bold"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Email Address
                  </FormLabel>
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
                  size="lg"
                  isLoading={isLoading}
                  loadingText="SENDING..."
                  variant="solid"
                >
                  SEND RESET CODE
                </Button>
              </VStack>
            </Box>
          ) : (
            <VStack spacing={6} w="100%">
              <Text
                fontSize="lg"
                color="paper.400"
                textAlign="center"
                fontFamily="heading"
              >
                Enter the 6-digit code sent to:
              </Text>
              <Text
                color="accent.100"
                fontSize="lg"
                fontWeight="bold"
                textAlign="center"
                fontFamily="heading"
              >
                {email}
              </Text>
              <HStack justify="center" spacing={4}>
                <PinInput
                  size="lg"
                  value={code}
                  onChange={setCode}
                  type="number"
                  otp
                >
                  {[...Array(6)].map((_, i) => (
                    <PinInputField
                      key={i}
                      bg="paper.50"
                      borderColor="paper.200"
                      _hover={{ borderColor: "accent.100" }}
                      _focus={{
                        borderColor: "accent.100",
                        boxShadow: "3px 3px 0 black",
                      }}
                    />
                  ))}
                </PinInput>
              </HStack>
              <Button
                width="full"
                size="lg"
                variant="solid"
                isDisabled={code.length !== 6}
                onClick={handleVerifyCode}
              >
                VERIFY CODE
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

const containerStyles = {
  border: "2px solid",
  borderColor: "paper.400",
  transform: "translate(-4px, -4px)",
  boxShadow: "6px 6px 0 black",
  position: "relative",
  _before: {
    content: '""',
    position: "absolute",
    top: "15px",
    left: "15px",
    right: "-15px",
    bottom: "-15px",
    border: "2px solid black",
    zIndex: -1,
  },
};

export default ForgotPassword;
