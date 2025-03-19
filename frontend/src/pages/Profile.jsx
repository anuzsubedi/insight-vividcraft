import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Avatar,
  Skeleton,
  Button,
  useToast,
  Textarea,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  useDisclosure,
  Image,
  Spinner,
  Badge,
  Flex,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
  Tabs,
  TabList,
  Tab,
  Select,
  Center,
} from "@chakra-ui/react";
import { 
  ChevronDownIcon, 
  EditIcon, 
  BellIcon, 
  NotAllowedIcon, 
  DeleteIcon, 
  ViewOffIcon,
  CheckIcon 
} from "@chakra-ui/icons";
import { BiUpvote, BiDownvote, BiComment, BiSolidUpvote, BiSolidDownvote } from 'react-icons/bi';
import { FiMoreHorizontal } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { profileService } from "../services/profileService";
import { postService } from "../services/postService";
import { socialService } from "../services/socialService";
import AvatarSelector from "../components/AvatarSelector";
import useAuthState from "../hooks/useAuthState";
import { useInView } from 'react-intersection-observer';
import CreatePost from "../components/CreatePost";
import Connection from "../components/Connection";

// Helper function to get net score
const getNetScore = (upvotes = 0, downvotes = 0) => upvotes - downvotes;

function Profile() {
  const { username } = useParams();
  const { user } = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [editedBio, setEditedBio] = useState("");
  const [editedDisplayName, setEditedDisplayName] = useState("");
  const [editedUsername, setEditedUsername] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showConnections, setShowConnections] = useState(false);
  const [activeConnectionTab, setActiveConnectionTab] = useState("following");
  
  // Posts state
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postType, setPostType] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent"); 
  const [sortPeriod, setSortPeriod] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [editMode, setEditMode] = useState(null);
  const [showEditButtons, setShowEditButtons] = useState(false);
  
  // Intersection observer for infinite scrolling
  const { ref, inView } = useInView({
    threshold: 0,
  });

  // Function to load more posts
  const loadMorePosts = useCallback(async () => {
    if (!username || !hasMore || isLoadingPosts) return;
    
    try {
      setIsLoadingPosts(true);
      const response = await postService.getUserPosts(username, {
        page,
        limit: 10,
        type: postType,
        sortBy: sortOrder,
        period: sortPeriod
      });
      
      if (!response || !response.posts) {
        setHasMore(false);
        if (page === 1) {
          setPosts([]);
        }
        return;
      }

      // Update pagination state
      const { pagination } = response;
      setHasMore(pagination.hasMore);
      setTotalPosts(pagination.total);
      
      // Update posts list
      setPosts(prevPosts => 
        page === 1 ? response.posts : [...prevPosts, ...response.posts]
      );
      
    } catch (error) {
      console.error("Error loading posts:", error);
      if (!error.message.includes('timeout')) {
        toast({
          title: "Error loading posts",
          description: error.message,
          status: "error",
          duration: 3000,
        });
      }
      setHasMore(false);
      if (page === 1) {
        setPosts([]);
      }
    } finally {
      setIsLoadingPosts(false);
    }
  }, [username, page, postType, sortOrder, sortPeriod, hasMore, isLoadingPosts, toast]);

  // Reset and reload posts when filters change
  useEffect(() => {
    if (!username) return;
    setPosts([]);
    setPage(1);
    setHasMore(true);
  }, [username, postType, sortOrder, sortPeriod]);

  // Load posts when page is reset or changed
  useEffect(() => {
    if (username && hasMore) {
      loadMorePosts();
    }
  }, [username, page, loadMorePosts, hasMore]);

  // Reset period when changing sort order
  useEffect(() => {
    if (sortOrder === 'top') {
      setSortPeriod('all');
    }
  }, [sortOrder]);

  // Load more posts when scrolling to bottom
  useEffect(() => {
    if (inView && !isLoadingPosts && hasMore && posts.length > 0) {
      setPage(prev => prev + 1);
    }
  }, [inView, isLoadingPosts, hasMore, posts.length]);

  // Update filtered posts when posts change
  useEffect(() => {
    setFilteredPosts(posts);
  }, [posts]);

  // Initial profile fetch
  const fetchProfile = useCallback(async () => {
    try {
      if (!username) return;
      
      const response = await profileService.getProfileByUsername(username);
      setProfile(response.profile);
      setEditedBio(response.profile.bio || "");
      setEditedDisplayName(response.profile.displayName || "");
      setEditedUsername(response.profile.username || "");
      setIsOwnProfile(user?.username === username);
      
      if (response.profile.isFollowing !== undefined) {
        setIsFollowing(response.profile.isFollowing);
      }
      if (response.profile.isMuted !== undefined) {
        setIsMuted(response.profile.isMuted);
      }
    } catch (error) {
      if (error.message === "User not found" || error.response?.status === 404) {
        navigate('/user-not-found', { replace: true });
        return;
      }
      // Only show toast for non-404 errors
      toast({
        title: "Error loading profile",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [username, user, navigate, toast]);

  useEffect(() => {
    if (username) {
      fetchProfile();
      // Reset posts when username changes
      setPosts([]);
      setFilteredPosts([]);
      setPage(1);
      setHasMore(true);
      // Initial load will happen through the filter effect
    }
  }, [username, fetchProfile]);

  const handleUpdateProfile = async () => {
    try {
      setIsLoading(true);
      const updateData = {};
      
      if (editMode === 'bio') {
        updateData.bio = editedBio;
      } else if (editMode === 'name') {
        updateData.displayName = editedDisplayName;
      } else if (editMode === 'username') {
        updateData.username = editedUsername;
      }
      
      const response = await profileService.updateProfile(updateData);
      
      // Update local state with the response data
      setProfile(prev => ({ 
        ...prev,
        bio: response.profile.bio,
        displayName: response.profile.displayName,
        username: response.profile.username
      }));
      
      // Only navigate if the update was successful and username was changed
      if (editMode === 'username' && response.profile.username !== username) {
        toast({
          title: "Username Updated!",
          description: "Redirecting to new profile...",
          status: "success",
          duration: 3000,
        });
        // Add a small delay before navigation to allow backend changes to propagate
        await new Promise(resolve => setTimeout(resolve, 1500));
        navigate(`/user/${response.profile.username}`, { replace: true });
      } else {
        toast({
          title: "Profile Updated!",
          status: "success",
          duration: 3000,
        });
      }
      
      setEditMode(null);
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error.response?.data?.error || error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpdate = async (avatarName) => {
    try {
      await profileService.updateProfile({ avatarName });
      setProfile((prev) => ({ ...prev, avatarName }));
      toast({
        title: "Avatar Updated!",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error updating avatar",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await socialService.unfollowUser(username);
        setIsFollowing(false);
        toast({
          title: `Unfollowed ${profile.displayName}`,
          status: "success",
          duration: 3000,
        });
      } else {
        await socialService.followUser(username);
        setIsFollowing(true);
        toast({
          title: `Following ${profile.displayName}`,
          status: "success",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleMute = async () => {
    try {
      if (isMuted) {
        await socialService.unmuteUser(username);
        setIsMuted(false);
        toast({
          title: `Unmuted ${profile.displayName}`,
          status: "success",
          duration: 3000,
        });
      } else {
        await socialService.muteUser(username);
        setIsMuted(true);
        toast({
          title: `Muted ${profile.displayName}`,
          status: "success",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const cancelEdit = () => {
    if (editMode === 'bio') {
      setEditedBio(profile.bio || "");
    } else if (editMode === 'name') {
      setEditedDisplayName(profile.displayName || "");
    } else if (editMode === 'username') {
      setEditedUsername(profile.username || "");
    }
    setEditMode(null);
  };

  const handleDeletePost = async (postId) => {
    try {
      // Wait for deletion to complete
      await postService.deletePost(postId);
      // Only remove from state if deletion was successful
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      toast({
        title: "Post deleted successfully",
        status: "success",
        duration: 3000,
      });
      // Refetch posts to ensure state is in sync
      loadMorePosts();
    } catch (error) {
      toast({
        title: "Error deleting post",
        description: error.response?.data?.error || "Failed to delete post",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleUnpublishPost = async (postId) => {
    try {
      await postService.updatePost(postId, { status: "draft" });
      setPosts(posts.filter(post => post.id !== postId));
      toast({
        title: "Post moved to drafts",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error unpublishing post",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleReaction = async (e, postId, type) => {
    e.stopPropagation(); // Prevent post click event

    if (!user) {
      toast({
        title: 'Please login to react',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Store previous state for rollback
    const previousReactions = { ...post.reactions };
    const previousUserReaction = post.userReaction;

    // Optimistically update UI
    const updatedPost = { ...post };
    if (post.userReaction === type) {
      // Removing reaction
      updatedPost.reactions[`${type}s`] -= 1;
      updatedPost.userReaction = null;
    } else {
      // If there was a previous reaction, remove it
      if (post.userReaction) {
        updatedPost.reactions[`${post.userReaction}s`] -= 1;
      }
      // Add new reaction
      updatedPost.reactions[`${type}s`] += 1;
      updatedPost.userReaction = type;
    }

    setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));

    try {
      const result = await postService.addReaction(postId, type);
      // Use the server response to update the state
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        reactions: {
          upvotes: result.upvotes || 0,
          downvotes: result.downvotes || 0
        },
        userReaction: result.userReaction
      } : p));
    } catch (error) {
      // Revert on error
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        reactions: previousReactions,
        userReaction: previousUserReaction
      } : p));
      toast({
        title: 'Error updating reaction',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (isLoading || !profile) {
    return (
      <Box minH="100vh" bg="paper.50" py={8}>
        <Container maxW="container.lg">
          <VStack spacing={8}>
            <Skeleton height="40px" width="200px" />
            <Skeleton height="300px" borderRadius="md" width="100%" />
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="paper.50" py={8}>
      <Container maxW="container.lg">
        <Button
          as={Link}
          to="/"
          variant="outline"
          mb={8}
          leftIcon={<ChevronDownIcon transform="rotate(90deg)" />}
          borderWidth="2px"
          borderColor="black"
          boxShadow="3px 3px 0 black"
          _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
          _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
        >
          Back to Dashboard
        </Button>

        {/* Profile Header - New Layout */}
        <Flex 
          direction={{ base: "column", md: "row" }} 
          gap={8} 
          mb={8}
          align={{ base: "center", md: "start" }}
          bg="white"
          p={8}
          border="2px solid"
          borderColor="black"
          boxShadow="6px 6px 0 black"
          position="relative"
        >
          {isOwnProfile && (
            <IconButton
              icon={showEditButtons ? <CheckIcon /> : <EditIcon />} // Change icon based on showEditButtons state
              position="absolute"
              top={4}
              right={4}
              onClick={() => setShowEditButtons(!showEditButtons)}
              aria-label="Toggle edit mode"
              variant="solid"
              borderWidth="2px"
              borderColor="black"
              boxShadow="3px 3px 0 black"
              _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
              _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
            />
          )}

          {/* Left Side - Avatar */}
          <Box position="relative" minW={{ base: "150px", md: "200px" }}>
            {profile.avatarName ? (
              <Image
                src={`/avatars/${profile.avatarName}`}
                alt="Profile Avatar"
                boxSize={{ base: "150px", md: "200px" }}
                borderRadius="0"
                border="2px solid"
                borderColor="black"
                bg="white"
                transform="rotate(-2deg)"
                boxShadow="5px 5px 0 black"
              />
            ) : (
              <Avatar
                size="2xl"
                name={profile.displayName}
                bg="accent.100"
                color="white"
                borderRadius="0"
                border="2px solid"
                borderColor="black"
                transform="rotate(-2deg)"
                boxShadow="5px 5px 0 black"
              />
            )}
            {isOwnProfile && showEditButtons && (
              <IconButton
                icon={<EditIcon />}
                position="absolute"
                bottom={0}
                right={0}
                onClick={onOpen}
                aria-label="Change avatar"
                borderWidth="2px"
                borderColor="black"
                boxShadow="3px 3px 0 black"
                _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
              />
            )}
          </Box>

          {/* Right Side - User Info */}
          <VStack align="start" spacing={4} flex="1">
            {/* Display Name */}
            {editMode === 'name' ? (
              <FormControl>
                <FormLabel fontWeight="bold">Display Name</FormLabel>
                <Input 
                  value={editedDisplayName}
                  onChange={(e) => setEditedDisplayName(e.target.value)}
                  borderWidth="2px"
                  borderColor="black"
                  _focus={{ borderColor: "accent.100", boxShadow: "none" }}
                />
                <HStack mt={2}>
                  <Button 
                    size="sm" 
                    onClick={handleUpdateProfile}
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="2px 2px 0 black"
                    _hover={{ transform: "translate(-1px, -1px)", boxShadow: "3px 3px 0 black" }}
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={cancelEdit}
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="2px 2px 0 black"
                    _hover={{ transform: "translate(-1px, -1px)", boxShadow: "3px 3px 0 black" }}
                  >
                    Cancel
                  </Button>
                </HStack>
              </FormControl>
            ) : (
              <Flex width="100%" align="center">
                <Heading size="2xl" mb={1}>{profile.displayName}</Heading>
                {isOwnProfile && showEditButtons && (
                  <IconButton
                    icon={<EditIcon />}
                    size="sm"
                    ml={2}
                    onClick={() => setEditMode('name')}
                    aria-label="Edit display name"
                    variant="ghost"
                  />
                )}
              </Flex>
            )}
            
            {/* Username */}
            {editMode === 'username' ? (
              <FormControl>
                <FormLabel fontWeight="bold">Username</FormLabel>
                <Input 
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  borderWidth="2px"
                  borderColor="black"
                  _focus={{ borderColor: "accent.100", boxShadow: "none" }}
                />
                <HStack mt={2}>
                  <Button 
                    size="sm" 
                    onClick={handleUpdateProfile}
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="2px 2px 0 black"
                    _hover={{ transform: "translate(-1px, -1px)", boxShadow: "3px 3px 0 black" }}
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={cancelEdit}
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="2px 2px 0 black"
                    _hover={{ transform: "translate(-1px, -1px)", boxShadow: "3px 3px 0 black" }}
                  >
                    Cancel
                  </Button>
                </HStack>
              </FormControl>
            ) : (
              <Flex width="100%" align="center">
                <Text color="paper.400" fontSize="xl" fontWeight="bold">
                  @{profile.username}
                </Text>
                {isOwnProfile && showEditButtons && (
                  <IconButton
                    icon={<EditIcon />}
                    size="sm"
                    ml={2}
                    onClick={() => setEditMode('username')}
                    aria-label="Edit username"
                    variant="ghost"
                  />
                )}
              </Flex>
            )}

            {/* Bio */}
            {editMode === 'bio' ? (
              <FormControl mt={4} width="100%">
                <FormLabel fontWeight="bold">Bio</FormLabel>
                <Textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  size="md"
                  rows={4}
                  borderWidth="2px"
                  borderColor="black"
                  _focus={{ borderColor: "accent.100", boxShadow: "none" }}
                />
                <HStack mt={2}>
                  <Button 
                    size="sm" 
                    onClick={handleUpdateProfile}
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="2px 2px 0 black"
                    _hover={{ transform: "translate(-1px, -1px)", boxShadow: "3px 3px 0 black" }}
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={cancelEdit}
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="2px 2px 0 black"
                    _hover={{ transform: "translate(-1px, -1px)", boxShadow: "3px 3px 0 black" }}
                  >
                    Cancel
                  </Button>
                </HStack>
              </FormControl>
            ) : (
              <Flex width="100%" align="start">
                <Text color="paper.600" fontSize="lg" maxW="600px">
                  {profile.bio || "No bio yet..."}
                </Text>
                {isOwnProfile && showEditButtons && (
                  <IconButton
                    icon={<EditIcon />}
                    size="sm"
                    ml={2}
                    onClick={() => setEditMode('bio')}
                    aria-label="Edit bio"
                    variant="ghost"
                  />
                )}
              </Flex>
            )}

            <HStack spacing={8} mt={2}>
              <VStack 
                align="start" 
                spacing={0} 
                cursor={isOwnProfile ? "pointer" : "default"}
                onClick={() => {
                  if (isOwnProfile) {
                    setActiveConnectionTab("following");
                    setShowConnections(true);
                  }
                }}
                _hover={isOwnProfile ? { opacity: 0.8 } : undefined}
              >
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.followingCount || 0}
                </Text>
                <Text color="paper.400">Following</Text>
              </VStack>
              <VStack 
                align="start" 
                spacing={0}
                cursor={isOwnProfile ? "pointer" : "default"}
                onClick={() => {
                  if (isOwnProfile) {
                    setActiveConnectionTab("followers");
                    setShowConnections(true);
                  }
                }}
                _hover={isOwnProfile ? { opacity: 0.8 } : undefined}
              >
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.followerCount || 0}
                </Text>
                <Text color="paper.400">Followers</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="2xl" fontWeight="bold">
                  {posts.length}
                </Text>
                <Text color="paper.400">Posts</Text>
              </VStack>
            </HStack>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <HStack spacing={4} mt={2}>
                <Button
                  onClick={handleFollow}
                  colorScheme={isFollowing ? "red" : "teal"}
                  variant="solid"
                  borderWidth="2px"
                  borderColor="black"
                  boxShadow="3px 3px 0 black"
                  _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                  _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
                <Button
                  onClick={handleMute}
                  variant="outline"
                  leftIcon={isMuted ? <NotAllowedIcon /> : <BellIcon />}
                  borderWidth="2px"
                  borderColor="black"
                  boxShadow="3px 3px 0 black"
                  _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                  _active={{ transform: "translate(0px, 0px)", boxShadow: "1px 1px 0 black" }}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </Button>
              </HStack>
            )}
          </VStack>
        </Flex>

        {/* Posts Section */}
        <Box
          bg="white"
          p={8}
          border="2px solid"
          borderColor="black"
          boxShadow="6px 6px 0 black"
          mt={8}
        >
          <VStack spacing={6} w="100%" align="stretch">
            {/* Add CreatePost only for own profile */}
            {isOwnProfile && (
              <CreatePost onPostCreated={() => {
                setPosts([]);
                setPage(1);
                setHasMore(true);
              }} />
            )}

            {/* Filters and Tabs */}
            <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
              <Tabs flex={1} variant="enclosed">
                <TabList>
                  <Tab onClick={() => setPostType("all")}>All</Tab>
                  <Tab onClick={() => setPostType("post")}>Posts</Tab>
                  <Tab onClick={() => setPostType("article")}>Articles</Tab>
                </TabList>
              </Tabs>
              
              <HStack spacing={4}>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  borderWidth="2px"
                  borderColor="black"
                  _focus={{ borderColor: "accent.100", boxShadow: "none" }}
                >
                  <option value="recent">Recent</option>
                  <option value="top">Top</option>
                </Select>

                {sortOrder === 'top' && (
                  <Select
                    value={sortPeriod}
                    onChange={(e) => setSortPeriod(e.target.value)}
                    borderWidth="2px"
                    borderColor="black"
                    _focus={{ borderColor: "accent.100", boxShadow: "none" }}
                  >
                    <option value="all">All Time</option>
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">Past Year</option>
                  </Select>
                )}
              </HStack>
            </Flex>

            {/* Posts stats */}
            <Text color="paper.600" fontSize="md">
              {totalPosts === 0 ? 'No posts yet' : `${totalPosts} post${totalPosts === 1 ? '' : 's'}`}
            </Text>

            {filteredPosts.map((post) => (
              <Box
                key={post.id}
                bg="white"
                borderBottom="2px solid"
                borderColor="gray.200"
                _hover={{
                  bg: "gray.50",
                  cursor: "pointer"
                }}
                transition="all 0.2s"
                position="relative"
                onClick={() => navigate(`/posts/${post.id}`, { state: { from: location.pathname } })}
              >
                <Box p={6}>
                  {/* Top section with avatar, username, date, and menu */}
                  <HStack spacing={4} mb={4} position="relative">
                    <HStack flex={1}>
                      <Avatar
                        size="md"
                        name={profile.displayName}
                        src={profile.avatarName ? `/avatars/${profile.avatarName}` : undefined}
                      />
                      <VStack align="start" spacing={0}>
                        <HStack spacing={2}>
                          <Text fontWeight="bold">@{profile.username}</Text>
                          {post.type === 'article' && post.category && (
                            <Badge px={3} py={1} colorScheme="teal">
                              {post.category.name}
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                        </Text>
                      </VStack>
                    </HStack>

                    {/* Move menu to top right and update icon */}
                    {isOwnProfile && (
                      <Menu isLazy>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreHorizontal />}
                          variant="ghost"
                          size="sm"
                          position="absolute"
                          top={2}
                          right={2}
                          aria-label="Post options"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Portal>
                          <MenuList
                            border="1px solid"
                            borderColor="gray.200"
                            onClick={(e) => e.stopPropagation()}
                            bg="white"
                            zIndex={1400}
                          >
                            <MenuItem 
                              as={Link}
                              to={`/posts/${post.id}/edit`}
                              state={{ from: location.pathname }}
                              icon={<EditIcon />}
                            >
                              Edit
                            </MenuItem>
                            <MenuItem 
                              icon={<ViewOffIcon />} 
                              onClick={() => handleUnpublishPost(post.id)}
                            >
                              Move to Drafts
                            </MenuItem>
                            <MenuItem 
                              icon={<DeleteIcon />} 
                              color="red.500"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              Delete Post
                            </MenuItem>
                          </MenuList>
                        </Portal>
                      </Menu>
                    )}

                    <HStack spacing={2} ml="auto">
                      {post.type === 'article' && post.category && (
                        <Badge
                          px={3}
                          py={1}
                          colorScheme="teal"
                        >
                          {post.category.name}
                        </Badge>
                      )}
                    </HStack>
                  </HStack>

                  {/* Post content */}
                  <Box pl={14}> {/* Align content with username */}
                    {post.type === 'article' && post.title && (
                      <Text 
                        fontWeight="bold"
                        fontSize="2xl"
                        mb={3}
                      >
                        {post.title}
                      </Text>
                    )}
                    <Text 
                      fontSize="lg" 
                      mb={4}
                      color="gray.700"
                      whiteSpace="pre-wrap"
                    >
                      {post.body}
                    </Text>
                  </Box>
                </Box>
                
                {/* Post reactions UI */}
                <HStack spacing={6} px={6} pb={4} onClick={e => e.stopPropagation()}>
                  <HStack spacing={2}>
                    <IconButton
                      icon={post.userReaction === 'upvote' ? <BiSolidUpvote /> : <BiUpvote />}
                      variant="ghost"
                      size="sm"
                      color={post.userReaction === 'upvote' ? "blue.500" : "gray.600"}
                      aria-label="Upvote"
                      onClick={(e) => handleReaction(e, post.id, 'upvote')}
                    />
                    <Text 
                      color={getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) > 0 ? "blue.500" : 
                             getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) < 0 ? "red.500" : "gray.600"}
                      fontWeight="semibold"
                    >
                      {getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0)}
                    </Text>
                    <IconButton
                      icon={post.userReaction === 'downvote' ? <BiSolidDownvote /> : <BiDownvote />}
                      variant="ghost"
                      size="sm"
                      color={post.userReaction === 'downvote' ? "red.500" : "gray.600"}
                      aria-label="Downvote"
                      onClick={(e) => handleReaction(e, post.id, 'downvote')}
                    />
                  </HStack>
                  <HStack spacing={2}>
                    <BiComment size={20} />
                    <Text>{post.comment_count || 0}</Text>
                  </HStack>
                </HStack>
              </Box>
            ))}
            
            {/* Loading indicator - Only show on initial load */}
            {isLoadingPosts && page === 1 && filteredPosts.length === 0 && (
              <Center py={4}>
                <Spinner size="lg" />
              </Center>
            )}
            
            {/* Loading more indicator */}
            {isLoadingPosts && page > 1 && (
              <Center py={4}>
                <Spinner size="sm" />
              </Center>
            )}
            
            {/* Intersection observer target - Only show if we have more posts to load */}
            {hasMore && !isLoadingPosts && <Box ref={ref} h="20px" />}
            
            {/* No posts message - Only show when not loading and no posts */}
            {!isLoadingPosts && filteredPosts.length === 0 && (
              <Box p={6} border="2px dashed" borderColor="paper.300" textAlign="center">
                <Text color="paper.400" fontSize="lg">
                  No posts published yet
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      </Container>
      <AvatarSelector
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleAvatarUpdate}
        currentAvatar={profile?.avatarName}
      />
      <Connection
        isOpen={showConnections}
        onClose={() => setShowConnections(false)}
        username={username}
        initialTab={activeConnectionTab}
      />
    </Box>
  );
}

export default Profile;
