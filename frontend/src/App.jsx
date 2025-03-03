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
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDownIcon, AddIcon } from "@chakra-ui/icons";
import useAuthState from "./hooks/useAuthState";
import Logo from "./components/Logo";
import Feed from "./components/Feed";

function App() {
  const { user, logout } = useAuthState();
  const navigate = useNavigate();
  const toast = useToast();

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
      <VStack spacing={8} justify="center" minH="100vh" bg="paper.50">
        <Logo size="6xl" />
        <Text fontSize="lg" color="paper.400">
          Please sign in to continue
        </Text>
        <Button as={Link} to="/login" variant="solid">
          Sign In to Continue
        </Button>
      </VStack>
    );
  }

  return (
    <Box minH="100vh" bg="paper.50">
      {/* Header */}
      <Box
        py={4}
        bg="white"
        borderBottom="2px"
        borderColor="paper.200"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Container maxW="container.xl">
          <HStack justify="space-between" align="center">
            <Logo size="2xl" />

            <HStack spacing={4}>
              <Button
                as={Link}
                to="/posts/new"
                variant="solid"
                leftIcon={<AddIcon />}
                borderWidth="2px"
                borderColor="black"
                boxShadow="3px 3px 0 black"
                _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
              >
                Create Post
              </Button>

              <Menu>
                <MenuButton
                  as={Button}
                  variant="outline"
                  rightIcon={<ChevronDownIcon />}
                  borderWidth="2px"
                  borderColor="black"
                  boxShadow="3px 3px 0 black"
                  _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                  _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
                >
                  <HStack spacing={3}>
                    {user.avatarName ? (
                      <Image
                        src={`/avatars/${user.avatarName}`}
                        alt="Profile Avatar"
                        boxSize="32px"
                        borderRadius="full"
                        border="2px solid"
                        borderColor="paper.400"
                        bg="white"
                      />
                    ) : (
                      <Avatar
                        size="sm"
                        name={user.displayName}
                        bg="accent.100"
                        color="white"
                      />
                    )}
                    <Text>{user.displayName}</Text>
                  </HStack>
                </MenuButton>
                <MenuList
                  border="2px solid"
                  borderColor="black"
                  borderRadius="0"
                  boxShadow="4px 4px 0 black"
                  p={2}
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
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
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
          <Box
            bg="white"
            p={8}
            border="2px solid"
            borderColor="black"
            boxShadow="6px 6px 0 black"
            transform="translate(-4px, -4px)"
          >
            <Feed />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default App;
