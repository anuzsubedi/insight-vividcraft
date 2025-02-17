import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Link } from "react-router-dom";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { authService } from "../services/authService";
import VerificationForm from "../components/VerificationForm";

function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const toast = useToast();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName,
      };

      const response = await authService.signup(userData);
      console.log("[SIGNUP] Success:", response);

      setVerificationSent(true);
      toast({
        title: "CHECK YOUR EMAIL!",
        description:
          "We've sent you a verification code. Please check your inbox.",
        status: "success",
        duration: 5000,
        position: "top-right",
      });
    } catch (error) {
      console.error("[SIGNUP] Error:", error);
      toast({
        title: "ERROR CREATING ACCOUNT",
        description: error.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 5000,
        position: "top-right",
        containerStyle: {
          maxWidth: "none",
          border: "2px solid",
          borderColor: "red.500",
          background: "white",
          boxShadow: "4px 4px 0 black",
          borderRadius: "0",
          transform: "translate(-2px, -2px)",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (code) => {
    setIsLoading(true);
    try {
      await authService.verifyEmail(formData.email, code);
      toast({
        title: "SUCCESS!",
        description: "Your account has been created successfully!",
        status: "success",
        duration: 3000,
        position: "top-right",
      });
      // Redirect to login after successful verification
      navigate("/login");
    } catch (error) {
      console.error("[VERIFY] Error:", error);
      toast({
        title: "VERIFICATION FAILED",
        description: error.response?.data?.error || "Please try again",
        status: "error",
        duration: 5000,
        position: "top-right",
        containerStyle: {
          maxWidth: "none",
          border: "2px solid",
          borderColor: "red.500",
          background: "white",
          boxShadow: "4px 4px 0 black",
          borderRadius: "0",
          transform: "translate(-2px, -2px)",
        },
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
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  if (verificationSent) {
    return (
      <Box bg="paper.50" minH="100vh" py={12}>
        <Container maxW="md" bg="white" p={8} {...containerStyles}>
          <VerificationForm
            email={formData.email}
            onVerify={handleVerification}
            isLoading={isLoading}
          />
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="paper.50" minH="100vh" py={12}>
      <Container
        maxW="md"
        bg="white"
        p={8}
        border="2px solid"
        borderColor="paper.400"
        transform="translate(-4px, -4px)"
        boxShadow="6px 6px 0 black"
        position="relative"
        _before={{
          content: '""',
          position: "absolute",
          top: "15px",
          left: "15px",
          right: "-15px",
          bottom: "-15px",
          border: "2px solid black",
          zIndex: -1,
        }}
      >
        <VStack spacing={8} align="stretch">
          <VStack spacing={3} align="center">
            <Heading
              fontSize="4xl"
              fontWeight="bold"
              color="paper.500"
              textAlign="center"
            >
              JOIN INSIGHT
            </Heading>
            <Text
              color="paper.400"
              fontSize="lg"
              textAlign="center"
              fontFamily="heading"
            >
              Write. Share. Connect.
            </Text>
          </VStack>

          <Box as="form" onSubmit={handleSubmit}>
            <VStack spacing={6}>
              <FormControl isInvalid={errors.username}>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Username
                </FormLabel>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  size="lg"
                />
                <FormErrorMessage fontWeight="medium" color="accent.100">
                  {errors.username}
                </FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.displayName}>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Display Name
                </FormLabel>
                <Input
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  size="lg"
                  bg="paper.50"
                  borderColor="paper.200"
                  _hover={{ borderColor: "accent.100" }}
                  _focus={{
                    borderColor: "accent.100",
                    boxShadow: "0 0 0 1px var(--chakra-colors-accent-100)",
                  }}
                />
                <FormErrorMessage>{errors.displayName}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.email}>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Email Address
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  size="lg"
                  bg="paper.50"
                  borderColor="paper.200"
                  _hover={{ borderColor: "accent.100" }}
                  _focus={{
                    borderColor: "accent.100",
                    boxShadow: "0 0 0 1px var(--chakra-colors-accent-100)",
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
                      boxShadow: "0 0 0 1px var(--chakra-colors-accent-100)",
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

              <FormControl isInvalid={errors.confirmPassword}>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Confirm Password
                </FormLabel>
                <InputGroup size="lg">
                  <Input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    bg="paper.50"
                    borderColor="paper.200"
                    _hover={{ borderColor: "accent.100" }}
                    _focus={{
                      borderColor: "accent.100",
                      boxShadow: "0 0 0 1px var(--chakra-colors-accent-100)",
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
                <FormErrorMessage fontWeight="medium" color="accent.100">
                  {errors.confirmPassword}
                </FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                width="full"
                size="lg"
                variant="solid"
                isLoading={isLoading}
                loadingText="CREATING ACCOUNT..."
                fontSize="md"
                py={7}
              >
                CREATE ACCOUNT
              </Button>
            </VStack>
          </Box>

          <VStack pt={6} spacing={4}>
            <Divider borderColor="paper.400" borderWidth="1px" />
            <Text color="paper.400" fontSize="sm" fontFamily="heading">
              ALREADY HAVE AN ACCOUNT?{" "}
              <Button
                as={Link}
                to="/login"
                variant="link"
                color="accent.100"
                fontWeight="bold"
                _hover={{ color: "accent.200" }}
              >
                SIGN IN
              </Button>
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
}

// Extract container styles to avoid repetition
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

export default Signup;
