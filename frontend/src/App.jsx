import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Button,
  Text,
  HStack,
  Box,
  Container,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Avatar,
  useToast,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import useAuthState from "./hooks/useAuthState";
import Logo from "./components/Logo";
import Feed from "./components/Feed";
import SearchDropdown from "./components/SearchDropdown";
import api from "./api/axios";

const MotionBox = motion(Box);

function App() {
  const { user, logout } = useAuthState();
  const navigate = useNavigate();
  const toast = useToast();
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

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    toast({
      title: "LOGGED OUT SUCCESSFULLY",
      variant: "solid",
    });
    navigate("/login");
  };

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
      {/* Header */}
      <Box
        py={4}
        bg="white"
        borderBottom="3px solid black"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Container maxW="5xl">
          <HStack justify="space-between" align="center">
            <MotionBox
              whileHover={{ rotate: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Logo size="2xl" />
            </MotionBox>

            <HStack spacing={6}>
              <SearchDropdown />

              <Menu>
                <MenuButton
                  as={Button}
                  bg="white"
                  border="2px solid black"
                  _hover={{
                    transform: "translate(-2px, -2px)",
                    boxShadow: "4px 4px 0 0 #000",
                  }}
                  _active={{
                    transform: "translate(0px, 0px)",
                    boxShadow: "none",
                  }}
                >
                  <HStack spacing={3}>
                    <Avatar
                      size="sm"
                      name={user.displayName}
                      src={user.avatarName ? `/avatars/${user.avatarName}` : undefined}
                      border="2px solid black"
                    />
                    <Text fontWeight="bold">@{user.username}</Text>
                  </HStack>
                </MenuButton>
                <MenuList
                  bg="white"
                  border="2px solid black"
                  boxShadow="4px 4px 0 black"
                  borderRadius="0"
                  p={0}
                  overflow="hidden"
                >
                  <MenuItem
                    as={Link}
                    to={`/user/${user.username}`}
                    borderRadius="0"
                    _hover={{ bg: "paper.100" }}
                  >
                    My Profile
                  </MenuItem>
                  <MenuItem
                    as={Link}
                    to="/my-posts"
                    borderRadius="0"
                    _hover={{ bg: "paper.100" }}
                  >
                    My Posts
                  </MenuItem>
                  <MenuItem
                    as={Link}
                    to="/settings"
                    borderRadius="0"
                    _hover={{ bg: "paper.100" }}
                  >
                    Settings
                  </MenuItem>
                  <MenuItem
                    as={Link}
                    to="/posts/new"
                    borderRadius="0"
                    _hover={{ bg: "paper.100" }}
                  >
                    Create New Post
                  </MenuItem>
                  <Divider my={2} borderColor="paper.200" />
                  <MenuItem
                    borderRadius="0"
                    color="red.500"
                    _hover={{ bg: "red.50" }}
                    onClick={handleLogout}
                  >
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </HStack>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxW="5xl" py={8}>
        <Feed />
      </Container>
    </MotionBox>
  );
}

export default App;
