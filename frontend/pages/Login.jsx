import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Text,
  VStack,
  Container,
  useToast,
  InputGroup,
  InputRightElement,
  Icon,
  Divider,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { authService } from "../services/authService";
import useAuthState from "../hooks/useAuthState";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const setUser = useAuthState((state) => state.setUser);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email or username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authService.login(formData);

      // Set the user in global state
      setUser(response.user);

      toast({
        title: "LOGIN SUCCESSFUL!",
        description: `WELCOME BACK, ${response.user.displayName}!`,
        variant: "solid",
        status: "success",
        duration: 3000,
        position: "top-right",
        containerStyle: {
          maxWidth: "none",
        },
      });

      navigate("/"); // Navigate to home page after login
    } catch (error) {
      toast({
        title: "LOGIN FAILED!",
        description:
          error.response?.data?.error || "PLEASE CHECK YOUR CREDENTIALS",
        variant: "solid",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  return (
    <Box bg="paper.50" minH="100vh" py={12}>
      <Container maxW="md" bg="white" p={8} {...containerStyles}>
        <VStack spacing={8} align="stretch">
          <VStack spacing={3} align="center">
            <Heading
              fontSize="4xl"
              fontWeight="bold"
              color="paper.500"
              textAlign="center"
            >
              WELCOME BACK
            </Heading>
            <Text
              color="paper.400"
              fontSize="lg"
              textAlign="center"
              fontFamily="heading"
            >
              Continue Your Journey
            </Text>
          </VStack>

          <Box as="form" onSubmit={handleSubmit}>
            <VStack spacing={6}>
              <FormControl isInvalid={errors.email}>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Email or Username
                </FormLabel>
                <Input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com or username"
                  size="lg"
                  bg="paper.50"
                  borderColor="paper.200"
                  _hover={{ borderColor: "accent.100" }}
                  _focus={{
                    borderColor: "accent.100",
                    boxShadow: "3px 3px 0 black",
                  }}
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.password}>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Password
                </FormLabel>
                <InputGroup size="lg">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    bg="paper.50"
                    borderColor="paper.200"
                    _hover={{ borderColor: "accent.100" }}
                    _focus={{
                      borderColor: "accent.100",
                      boxShadow: "3px 3px 0 black",
                    }}
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon as={showPassword ? ViewOffIcon : ViewIcon} />
                    </Button>
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{errors.password}</FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                width="full"
                size="lg"
                variant="solid"
                isLoading={isLoading}
                loadingText="SIGNING IN..."
                fontSize="md"
                py={7}
              >
                SIGN IN
              </Button>
              <Button
                as={Link}
                to="/forgot-password"
                variant="link"
                color="accent.100"
                size="sm"
                mt={2}
              >
                Forgot Password?
              </Button>
            </VStack>
          </Box>

          <VStack pt={6} spacing={4}>
            <Divider borderColor="paper.400" borderWidth="1px" />
            <Text color="paper.400" fontSize="sm" fontFamily="heading">
              DON&apos;T HAVE AN ACCOUNT?{" "}
              <Button
                as={Link}
                to="/signup"
                variant="link"
                color="accent.100"
                fontWeight="bold"
                _hover={{ color: "accent.200" }}
              >
                SIGN UP
              </Button>
            </Text>
          </VStack>
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

export default Login;
