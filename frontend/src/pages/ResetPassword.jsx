import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  VStack,
  useToast,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { authService } from "../services/authService";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (location.state?.email && location.state?.code) {
      setFormData((prev) => ({
        ...prev,
        email: location.state.email,
      }));
    } else {
      navigate("/forgot-password");
    }
  }, [location.state, navigate]);

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    if (formData.newPassword !== formData.confirmPassword) {
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
      await authService.resetPassword(
        formData.email,
        location.state.code,
        formData.newPassword
      );

      toast({
        title: "Success!",
        description: "Your password has been reset successfully",
        status: "success",
        duration: 5000,
        position: "top-right",
      });

      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Something went wrong",
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
      <Container maxW="md" bg="white" p={8} {...containerStyles}>
        <VStack spacing={8}>
          <Heading color="paper.500">Set New Password</Heading>
          <Box as="form" onSubmit={handleSubmit} width="100%">
            <VStack spacing={6}>
              <FormControl>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Email
                </FormLabel>
                <Input
                  value={formData.email}
                  isReadOnly
                  bg="paper.100"
                  size="lg"
                />
              </FormControl>

              <FormControl isInvalid={errors.newPassword}>
                <FormLabel
                  fontSize="sm"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  New Password
                </FormLabel>
                <InputGroup size="lg">
                  <Input
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    bg="paper.50"
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{errors.newPassword}</FormErrorMessage>
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
                <Input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  size="lg"
                  bg="paper.50"
                />
                <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                width="full"
                size="lg"
                variant="solid"
                isLoading={isLoading}
                loadingText="UPDATING PASSWORD..."
              >
                RESET PASSWORD
              </Button>
            </VStack>
          </Box>
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

export default ResetPassword;
