import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  VStack,
  HStack,
  Avatar,
  Text,
  Button,
  IconButton,
  Box,
  useToast,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { CloseIcon } from "@chakra-ui/icons";
import { socialService } from "../services/socialService";
import PropTypes from 'prop-types';

const UserList = ({ users, type, isLoading, onClose, handleUnfollow, handleRemoveFollower }) => {
  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner />
      </Center>
    );
  }

  if (!users.length) {
    return (
      <Center py={8}>
        <Text color="gray.500">No {type} found</Text>
      </Center>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {users.map((user) => (
        <Box
          key={user.username}
          p={4}
          border="2px solid"
          borderColor="black"
          bg="white"
          boxShadow="3px 3px 0 black"
          _hover={{
            transform: "translate(-2px, -2px)",
            boxShadow: "5px 5px 0 black",
          }}
          transition="all 0.2s"
        >
          <HStack justify="space-between">
            <HStack as={Link} to={`/user/${user.username}`} onClick={onClose}>
              <Avatar 
                size="md" 
                name={user.displayName}
                src={user.avatarName ? `/avatars/${user.avatarName}` : undefined}
              />
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold">{user.displayName}</Text>
                <Text color="gray.500" fontSize="sm">@{user.username}</Text>
              </VStack>
            </HStack>
            <HStack>
              {type === "following" && (
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  onClick={() => handleUnfollow(user.username)}
                  borderWidth="2px"
                  borderColor="black"
                  boxShadow="2px 2px 0 black"
                  _hover={{
                    transform: "translate(-1px, -1px)",
                    boxShadow: "3px 3px 0 black",
                  }}
                >
                  Unfollow
                </Button>
              )}
              {type === "followers" && (
                <IconButton
                  size="sm"
                  icon={<CloseIcon />}
                  aria-label="Remove follower"
                  onClick={() => handleRemoveFollower(user.username)}
                  borderWidth="2px"
                  borderColor="black"
                  boxShadow="2px 2px 0 black"
                  _hover={{
                    transform: "translate(-1px, -1px)",
                    boxShadow: "3px 3px 0 black",
                  }}
                />
              )}
            </HStack>
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

UserList.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    avatarName: PropTypes.string
  })).isRequired,
  type: PropTypes.oneOf(['following', 'followers', 'mutual']).isRequired,
  isLoading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  handleUnfollow: PropTypes.func.isRequired,
  handleRemoveFollower: PropTypes.func.isRequired
};

function Connection({ isOpen, onClose, username, initialTab = "following" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [mutual, setMutual] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [followingData, followersData, mutualData] = await Promise.all([
        socialService.getFollowing(username),
        socialService.getFollowers(username),
        socialService.getMutualFollowers(username)
      ]);

      setFollowing(followingData.users);
      setFollowers(followersData.users);
      setMutual(mutualData.users);
    } catch (error) {
      toast({
        title: "Error fetching users",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [username, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const handleUnfollow = async (targetUsername) => {
    try {
      await socialService.unfollowUser(targetUsername);
      // Update the following list
      setFollowing(prev => prev.filter(user => user.username !== targetUsername));
      // Update mutual list if necessary
      setMutual(prev => prev.filter(user => user.username !== targetUsername));
      
      toast({
        title: "Unfollowed successfully",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Error unfollowing user",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleRemoveFollower = async (targetUsername) => {
    try {
      await socialService.removeFollower(targetUsername);
      // Update the followers list
      setFollowers(prev => prev.filter(user => user.username !== targetUsername));
      // Update mutual list if necessary
      setMutual(prev => prev.filter(user => user.username !== targetUsername));
      
      toast({
        title: "Follower removed successfully",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Error removing follower",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay 
        backdropFilter="blur(8px)"
        backgroundColor="rgba(0, 0, 0, 0.7)" 
      />
      <ModalContent
        border="2px solid"
        borderColor="black"
        borderRadius="0"
        boxShadow="6px 6px 0 black"
      >
        <ModalHeader borderBottom="2px solid black">Connections</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6}>
          <Tabs index={activeTab === "following" ? 0 : activeTab === "followers" ? 1 : 2} onChange={(index) => setActiveTab(index === 0 ? "following" : index === 1 ? "followers" : "mutual")}>
            <TabList mb={4}>
              <Tab>Following ({following.length})</Tab>
              <Tab>Followers ({followers.length})</Tab>
              <Tab>Mutual ({mutual.length})</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <UserList 
                  users={following} 
                  type="following" 
                  isLoading={isLoading}
                  onClose={onClose}
                  handleUnfollow={handleUnfollow}
                  handleRemoveFollower={handleRemoveFollower}
                />
              </TabPanel>
              <TabPanel>
                <UserList 
                  users={followers} 
                  type="followers" 
                  isLoading={isLoading}
                  onClose={onClose}
                  handleUnfollow={handleUnfollow}
                  handleRemoveFollower={handleRemoveFollower}
                />
              </TabPanel>
              <TabPanel>
                <UserList 
                  users={mutual} 
                  type="mutual" 
                  isLoading={isLoading}
                  onClose={onClose}
                  handleUnfollow={handleUnfollow}
                  handleRemoveFollower={handleRemoveFollower}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

Connection.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  username: PropTypes.string.isRequired,
  initialTab: PropTypes.oneOf(['following', 'followers', 'mutual'])
};

export default Connection;