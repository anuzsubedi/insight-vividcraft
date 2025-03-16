import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  Button,
  Text,
  Box,
  Container,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import useAuthState from "./hooks/useAuthState";
import Logo from "./components/Logo";
import Feed from "./components/Feed";
import Header from "./components/Header";
import api from "./api/axios";

const MotionBox = motion(Box);

function App() {
  const { user } = useAuthState();
  const bgColor = useColorModeValue("gray.50", "gray.900");

  // Add axios interceptor to handle API requests
  useEffect(() => {
    api.interceptors.request.use((config) => {
      // Add the base URL
      if (!config.url.startsWith('http')) {
        config.baseURL = import.meta.env.VITE_API_URL;
      }
      // Add auth token if available
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }, []);

  if (!user) {
    return (
      <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        minH="100vh"
        bg={bgColor}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <MotionBox
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          textAlign="center"
        >
          <Logo size="6xl" />
          <Text fontSize="xl" mt={6} mb={8} color="gray.500">
            Join the community of creative minds
          </Text>
          <Button
            as={Link}
            to="/login"
            size="lg"
            colorScheme="blue"
            px={12}
            rounded="full"
            shadow="lg"
            _hover={{ transform: "translateY(-2px)", shadow: "xl" }}
            transition="all 0.2s"
          >
            Get Started
          </Button>
        </MotionBox>
      </MotionBox>
    );
  }

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      minH="100vh"
      bg="gray.50"
    >
      <Header user={user} isAdmin={user.isAdmin} />
      
      {/* Main Content */}
      <Container maxW="5xl" py={8}>
        <Feed />
      </Container>
    </MotionBox>
  );
}

export default App;
