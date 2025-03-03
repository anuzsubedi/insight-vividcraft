import { motion } from "framer-motion";
import {
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Container,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Image,
  Avatar,
  useToast,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDownIcon, AddIcon } from "@chakra-ui/icons";
import useAuthState from "./hooks/useAuthState";
import Logo from "./components/Logo";
import Feed from "./components/Feed";

const MotionBox = motion(Box);
const MotionContainer = motion(Container);

function App() {
  const { user, logout } = useAuthState();
  const navigate = useNavigate();
  const toast = useToast();
  
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const headerBg = useColorModeValue("rgba(255, 255, 255, 0.8)", "rgba(26, 32, 44, 0.8)");

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
      bg={bgColor}
    >
      {/* Header */}
      <Box
        py={4}
        bg={headerBg}
        backdropFilter="blur(10px)"
        borderBottom="1px"
        borderColor="gray.200"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Container maxW="5xl">
          <HStack justify="space-between" align="center">
            <MotionBox
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Logo size="2xl" />
            </MotionBox>

            <HStack spacing={6}>
              <MotionBox whileHover={{ y: -2 }}>
                <Button
                  as={Link}
                  to="/posts/new"
                  colorScheme="blue"
                  leftIcon={<AddIcon />}
                  rounded="full"
                  px={6}
                  shadow="md"
                >
                  New Post
                </Button>
              </MotionBox>

              <Menu>
                <MenuButton
                  as={Button}
                  variant="ghost"
                  rightIcon={<ChevronDownIcon />}
                >
                  <HStack spacing={3}>
                    {user.avatarName ? (
                      <MotionBox
                        as="img"
                        whileHover={{ scale: 1.1 }}
                        src={`/avatars/${user.avatarName}`}
                        alt="Profile"
                        w="32px"
                        h="32px"
                        rounded="full"
                        border="2px solid"
                        borderColor="blue.500"
                      />
                    ) : (
                      <Avatar
                        size="sm"
                        name={user.displayName}
                        bg="accent.100"
                        color="white"
                      />
                    )}
                    <Text>@{user.username}</Text>
                  </HStack>
                </MenuButton>
                <MenuList
                  border="1px solid"
                  borderColor="gray.200"
                  shadow="lg"
                  rounded="md"
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
      <MotionContainer
        maxW="5xl"
        py={8}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Welcome Section */}
        <Box
          bg="white"
          p={8}
          border="2px solid"
          borderColor="black"
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
          <VStack spacing={4} align="start">
            <Heading size="xl">Welcome back, {user.displayName}!</Heading>
            <Text fontSize="lg" color="paper.400">
              Start exploring and sharing your insights with the community.
            </Text>
          </VStack>
        </Box>

        {/* Feed Section */}
        <MotionBox
          bg="white"
          rounded="xl"
          shadow="sm"
          overflow="hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Feed />
        </MotionBox>
      </MotionContainer>
    </MotionBox>
  );
}

export default App;
