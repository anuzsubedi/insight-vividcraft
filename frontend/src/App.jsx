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
  Switch,
  Textarea,
  Select as ChakraSelect,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDownIcon, AddIcon } from "@chakra-ui/icons";
import { FiClock, FiSend } from 'react-icons/fi';
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
              <Button
                as={Link}
                to="/posts/new"
                bg="black"
                color="white"
                border="2px solid black"
                px={6}
                h="45px"
                _hover={{
                  transform: "translate(-2px, -2px)",
                  boxShadow: "4px 4px 0 0 #000",
                }}
                _active={{
                  transform: "translate(0px, 0px)",
                  boxShadow: "none",
                }}
              >
                New Post
              </Button>

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
        {/* New Post Box */}
        <MotionBox
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          mb={8}
          bg="white"
          border="2px solid black"
          transform="rotate(-1deg)"
          boxShadow="6px 6px 0 black"
        >
          <Box p={6}>
            <HStack mb={4} justify="space-between">
              <HStack>
                <Text fontWeight="bold">Post Type:</Text>
                <Switch size="lg" />
                <Text color="gray.600">Article</Text>
              </HStack>
              <ChakraSelect
                w="200px"
                placeholder="Select category"
                border="2px solid black"
                borderRadius="0"
                _hover={{
                  transform: "translate(-2px, -2px)",
                  boxShadow: "4px 4px 0 0 #000",
                }}
              >
                <option value="tech">Technology</option>
                <option value="design">Design</option>
                <option value="ideas">Ideas</option>
              </ChakraSelect>
            </HStack>
            
            <Textarea
              placeholder="What's on your mind?"
              minH="120px"
              mb={4}
              border="2px solid black"
              borderRadius="0"
              _hover={{
                transform: "translate(-2px, -2px)",
                boxShadow: "4px 4px 0 0 #000",
              }}
              _focus={{
                transform: "translate(-2px, -2px)",
                boxShadow: "4px 4px 0 0 #000",
                borderColor: "black",
              }}
            />
            
            <HStack justify="flex-end" spacing={4}>
              <Popover placement="top">
                <PopoverTrigger>
                  <IconButton
                    icon={<FiClock />}
                    variant="outline"
                    border="2px solid black"
                    borderRadius="0"
                    _hover={{
                      transform: "translate(-2px, -2px)",
                      boxShadow: "4px 4px 0 0 #000",
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent
                  border="2px solid black"
                  borderRadius="0"
                  boxShadow="4px 4px 0 black"
                  w="auto"
                >
                  <PopoverBody>
                    <VStack align="stretch" spacing={2}>
                      <Button variant="ghost">Schedule</Button>
                      <Button variant="ghost">Save as Draft</Button>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
              
              <Button
                rightIcon={<FiSend />}
                bg="black"
                color="white"
                border="2px solid black"
                borderRadius="0"
                px={8}
                _hover={{
                  transform: "translate(-2px, -2px)",
                  boxShadow: "4px 4px 0 0 #000",
                }}
                _active={{
                  transform: "translate(0px, 0px)",
                  boxShadow: "none",
                }}
              >
                Send
              </Button>
            </HStack>
          </Box>
        </MotionBox>

        {/* Feed */}
        <Feed />
      </Container>
    </MotionBox>
  );
}

export default App;
