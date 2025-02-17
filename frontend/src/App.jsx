import {
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Container,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  useToast,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDownIcon } from "@chakra-ui/icons";
import HealthCheck from "./components/HealthCheck";
import useAuthState from "./hooks/useAuthState";

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
      <VStack spacing={8} justify="center" minH="100vh">
        <Heading size="2xl">Welcome to Insight</Heading>
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
            <Heading size="lg" color="accent.100">
              INSIGHT
            </Heading>

            <Menu>
              <MenuButton
                as={Button}
                variant="outline"
                rightIcon={<ChevronDownIcon />}
              >
                <HStack spacing={3}>
                  <Avatar
                    size="sm"
                    name={user.displayName}
                    bg="accent.100"
                    color="white"
                  />
                  <Text>{user.displayName}</Text>
                </HStack>
              </MenuButton>
              <MenuList
                border="2px solid"
                borderColor="paper.400"
                borderRadius="0"
                boxShadow="6px 6px 0 black"
                p={2}
              >
                <MenuItem borderRadius="0" _hover={{ bg: "paper.100" }}>
                  Profile Settings
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
            <VStack spacing={4} align="start">
              <Heading size="xl">Welcome back, {user.displayName}!</Heading>
              <Text fontSize="lg" color="paper.400">
                Start exploring and sharing your insights with the community.
              </Text>
            </VStack>
          </Box>

          {/* Feed Section - Placeholder */}
          <Box
            bg="white"
            p={8}
            border="2px solid"
            borderColor="paper.400"
            transform="translate(-4px, -4px)"
            boxShadow="6px 6px 0 black"
          >
            <VStack spacing={4} align="stretch">
              <Heading size="lg">Your Feed</Heading>
              <Text color="paper.400">
                This is where your personalized feed will appear.
              </Text>
              <HealthCheck />
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default App;
