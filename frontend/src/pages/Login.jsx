import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  Flex,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { authService } from "../services/authService";
import useAuthState from "../hooks/useAuthState";
import Logo from "../components/Logo";

const MotionBox = motion(Box);

const MotionText = motion(Text);
const MotionHeading = motion(Heading);

function Login() {
  const location = useLocation();
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
      setUser(response.user);
      // Navigate to the original location or home
      const from = location.state?.from || "/";
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        title: "LOGIN FAILED!",
        description: error.response?.data?.error || "PLEASE CHECK YOUR CREDENTIALS",
        variant: "solid",
        status: "error",
        duration: 3000,
        position: "top-right",
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
    <MotionBox
      minH="100vh"
      bg="paper.50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      position="relative"
      overflow="hidden"
    >
      {/* Background pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgImage="repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.02) 20px, rgba(0,0,0,0.02) 40px)"
        zIndex={0}
      />
      
      {/* Decorative elements */}
      <MotionBox
        position="absolute"
        top="5%"
        right="10%"
        width="120px"
        height="120px"
        borderRadius="50%"
        bg="accent.100"
        opacity={0.1}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      
      <MotionBox
        position="absolute"
        bottom="15%"
        left="5%"
        width="200px"
        height="200px"
        borderRadius="50%"
        bg="accent.100"
        opacity={0.1}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />

      <Container maxW="container.lg" py={{ base: 8, md: 16 }} position="relative" zIndex={1}>
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
          gap={0}
          bg="white"
          border="4px solid black"
          boxShadow="12px 12px 0 black"
          overflow="hidden"
          transform="rotate(-1deg)"
          as={motion.div}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Left Column - Branding */}
          <GridItem 
            bg="accent.100" 
            p={{ base: 8, md: 12 }}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            textAlign="center"
            position="relative"
            overflow="hidden"
          >
            {/* Decorative elements */}
            <Box 
              position="absolute" 
              top="20px" 
              left="20px" 
              width="40px" 
              height="40px" 
              border="3px solid white" 
            />
            
            <Box 
              position="absolute" 
              bottom="20px" 
              right="20px" 
              width="40px" 
              height="40px" 
              border="3px solid white" 
            />
            
            <MotionBox
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              mb={8}
            >
              <Logo size="4xl" color="white" />
            </MotionBox>
            
            <MotionHeading
              color="white"
              size="2xl"
              fontWeight="black"
              textTransform="uppercase"
              letterSpacing="wider"
              mb={6}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Welcome Back
            </MotionHeading>
            
            <MotionText
              color="whiteAlpha.900"
              fontSize="xl"
              maxW="md"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Sign in to continue your creative journey
            </MotionText>
            
            {/* Decorative zigzag */}
            <Flex justify="center" mt={12}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box
                  key={i}
                  as={motion.div}
                  height="6px"
                  width="30px"
                  bg="white"
                  mx={1}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: 0.7 + (i * 0.1) }}
                />
              ))}
            </Flex>
          </GridItem>

          {/* Right Column - Form */}
          <GridItem p={{ base: 6, md: 12 }}>
            <VStack spacing={8} align="stretch">
              <MotionBox
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Heading 
                  as="h2" 
                  size="xl" 
                  color="paper.500"
                  fontWeight="black"
                  mb={2}
                >
                  SIGN IN
                </Heading>
                <Text color="paper.400">Enter your credentials to access your account</Text>
              </MotionBox>

              <MotionBox
                as="form"
                onSubmit={handleSubmit}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <VStack spacing={6} align="stretch">
                  <FormControl isInvalid={errors.email}>
                    <FormLabel fontWeight="bold">Email or Username</FormLabel>
                    <Input
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      size="lg"
                      bg="paper.50"
                      border="3px solid"
                      borderColor="paper.400"
                      borderRadius="md"
                      _focus={{
                        borderColor: "accent.100",
                        boxShadow: "5px 5px 0 black",
                      }}
                      _hover={{
                        borderColor: "paper.500",
                      }}
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={errors.password}>
                    <FormLabel fontWeight="bold">Password</FormLabel>
                    <InputGroup size="lg">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        bg="paper.50"
                        border="3px solid"
                        borderColor="paper.400"
                        borderRadius="md"
                        _focus={{
                          borderColor: "accent.100",
                          boxShadow: "5px 5px 0 black",
                        }}
                        _hover={{
                          borderColor: "paper.500",
                        }}
                      />
                      <InputRightElement>
                        <Icon
                          as={showPassword ? ViewOffIcon : ViewIcon}
                          cursor="pointer"
                          onClick={() => setShowPassword(!showPassword)}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  </FormControl>

                  <Button
                    type="submit"
                    size="lg"
                    height="65px"
                    bg="accent.100"
                    color="white"
                    fontWeight="black"
                    fontSize="lg"
                    textTransform="uppercase"
                    border="3px solid black"
                    borderRadius="md"
                    boxShadow="6px 6px 0 black"
                    _hover={{
                      bg: "accent.200",
                      transform: "translate(-3px, -3px)",
                      boxShadow: "9px 9px 0 black",
                    }}
                    _active={{
                      bg: "accent.300",
                      transform: "translate(0px, 0px)",
                      boxShadow: "0px 0px 0 black",
                    }}
                    rightIcon={<ArrowForwardIcon />}
                    isLoading={isLoading}
                    loadingText="SIGNING IN..."
                    transition="all 0.2s"
                  >
                    Sign In
                  </Button>

                  <Flex 
                    justify="space-between" 
                    align="center" 
                    mt={4}
                    direction={{ base: "column", sm: "row" }}
                    gap={4}
                  >
                    <Button
                      as={Link}
                      to="/forgot-password"
                      variant="link"
                      color="accent.100"
                      fontWeight="bold"
                      _hover={{ textDecoration: "none", color: "accent.200" }}
                    >
                      Forgot Password?
                    </Button>
                    
                    <Button
                      as={Link}
                      to="/signup"
                      variant="outline"
                      color="accent.100"
                      borderColor="accent.100"
                      fontWeight="bold"
                      _hover={{ 
                        bg: "accent.50",
                        transform: "translateY(-2px)",
                      }}
                    >
                      Create Account
                    </Button>
                  </Flex>
                </VStack>
              </MotionBox>
            </VStack>
          </GridItem>
        </Grid>
      </Container>
    </MotionBox>
  );
}

export default Login;
