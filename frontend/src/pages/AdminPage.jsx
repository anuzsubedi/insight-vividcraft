import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  Container,
  VStack,
  HStack,
  Button,
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  useToast,
  Badge,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import useAuthState from "../hooks/useAuthState";
import { adminService } from "../services/adminService";
import Header from "../components/Header";

const AdminPage = () => {
  const { user } = useAuthState();
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const toast = useToast();

  const fetchAdmins = useCallback(async () => {
    try {
      const { admins } = await adminService.getAdmins();
      setAdmins(admins);
    } catch (error) {
      toast({
        title: "Error fetching admins",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const { users } = await adminService.searchUsers(searchQuery);
        setSearchResults(users);
      } catch (error) {
        toast({
          title: "Error searching users",
          description: error.message,
          status: "error",
          duration: 3000,
        });
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, toast]);

  const handleAddAdmin = async (username) => {
    try {
      await adminService.addAdmin(username);
      toast({
        title: "Admin added",
        description: `${username} is now an admin`,
        status: "success",
        duration: 3000,
      });
      fetchAdmins();
      setSearchQuery("");
    } catch (error) {
      toast({
        title: "Error adding admin",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleRemoveAdmin = async (username) => {
    if (username === user.username) {
      toast({
        title: "Cannot remove yourself",
        description: "You cannot remove your own admin privileges",
        status: "error",
        duration: 3000,
      });
      return;
    }

    try {
      await adminService.removeAdmin(username);
      toast({
        title: "Admin removed",
        description: `${username} is no longer an admin`,
        status: "success",
        duration: 3000,
      });
      fetchAdmins();
    } catch (error) {
      toast({
        title: "Error removing admin",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Header user={user} isAdmin={user.isAdmin} />

      {/* Main Content */}
      <Container maxW="5xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box
            bg="white"
            p={6}
            border="2px solid black"
            boxShadow="4px 4px 0 black"
            borderRadius="0"
          >
            <Text fontSize="2xl" fontWeight="bold" mb={6}>
              Admin Management
            </Text>

            {/* Search Section */}
            <Box mb={8}>
              <Text fontSize="lg" fontWeight="semibold" mb={3}>
                Add New Admin
              </Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search users by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  borderWidth="2px"
                  borderColor="black"
                  _hover={{ borderColor: "accent.100" }}
                  _focus={{ borderColor: "accent.100", boxShadow: "4px 4px 0 black" }}
                />
              </InputGroup>

              {/* Search Results */}
              {searchResults.length > 0 && searchQuery && (
                <List mt={2} border="1px solid" borderColor="gray.200" borderRadius="md">
                  {searchResults.map((result) => (
                    <ListItem
                      key={result.username}
                      p={3}
                      _hover={{ bg: "gray.50" }}
                      borderBottom="1px solid"
                      borderColor="gray.200"
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <HStack>
                        <Avatar
                          size="sm"
                          name={result.display_name}
                          src={result.avatar_name ? `/avatars/${result.avatar_name}` : undefined}
                        />
                        <Box>
                          <Text fontWeight="bold">{result.display_name}</Text>
                          <Text fontSize="sm" color="gray.600">
                            @{result.username}
                          </Text>
                        </Box>
                        {result.is_admin && (
                          <Badge colorScheme="green" ml={2}>
                            Admin
                          </Badge>
                        )}
                      </HStack>
                      {!result.is_admin && (
                        <Button
                          size="sm"
                          onClick={() => handleAddAdmin(result.username)}
                          borderWidth="2px"
                          borderColor="black"
                          boxShadow="2px 2px 0 black"
                          _hover={{
                            transform: "translate(-1px, -1px)",
                            boxShadow: "3px 3px 0 black",
                          }}
                        >
                          Make Admin
                        </Button>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Current Admins Section */}
            <Box>
              <Text fontSize="lg" fontWeight="semibold" mb={3}>
                Current Admins
              </Text>
              <List spacing={3}>
                {admins.map((admin) => (
                  <ListItem
                    key={admin.username}
                    p={4}
                    border="2px solid"
                    borderColor="black"
                    bg="white"
                    boxShadow="3px 3px 0 black"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <HStack>
                      <Avatar
                        size="md"
                        name={admin.display_name}
                        src={admin.avatar_name ? `/avatars/${admin.avatar_name}` : undefined}
                      />
                      <Box>
                        <Text fontWeight="bold">{admin.display_name}</Text>
                        <Text color="gray.600">@{admin.username}</Text>
                      </Box>
                    </HStack>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAdmin(admin.username)}
                      isDisabled={admin.username === user.username}
                      borderWidth="2px"
                      borderColor="black"
                      boxShadow="2px 2px 0 black"
                      _hover={{
                        transform: "translate(-1px, -1px)",
                        boxShadow: "3px 3px 0 black",
                      }}
                    >
                      Remove Admin
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default AdminPage;