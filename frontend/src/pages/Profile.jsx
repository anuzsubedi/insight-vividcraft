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
} from "@chakra-ui/react";
import { EditIcon, CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { Link, useParams, useNavigate } from "react-router-dom";
import { profileService } from "../services/profileService";
import { postService } from "../services/postService";
import AvatarSelector from "../components/AvatarSelector";
import useAuthState from "../hooks/useAuthState";

function Profile() {
  const { username } = useParams();
  const { user } = useAuthState();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Redirect to /user/:username if accessed via /profile
  useEffect(() => {
    if (!username && user) {
      navigate(`/user/${user.username}`);
    }
  }, [username, user, navigate]);

  const fetchProfile = useCallback(async () => {
    try {
      if (!username) return;
      
      const response = await profileService.getProfileByUsername(username);
      setProfile(response.profile);
      setEditedBio(response.profile.bio || "");
      setIsOwnProfile(user?.username === username);
      setIsLoading(false);
    } catch (error) {
      toast({
        title: "Error loading profile",
        description: error.message,
        status: "error",
        duration: 3000,
      });
      setIsLoading(false);
    }
  }, [username, user, toast]);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await postService.getPosts({
        author: username,
        status: "published",
      });
      setPosts(response.posts || []);
    } catch (error) {
      toast({
        title: "Error loading posts",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoadingPosts(false);
    }
  }, [username, toast]);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username, fetchProfile]);

  useEffect(() => {
    if (username) {
      fetchPosts();
    }
  }, [username, fetchPosts]);

  const handleUpdateProfile = async () => {
    try {
      await profileService.updateProfile({ bio: editedBio });
      setProfile((prev) => ({ ...prev, bio: editedBio }));
      setIsEditing(false);
      toast({
        title: "Profile Updated!",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        status: "error",
        duration: 3000,
      });
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

  if (isLoading || !profile) {
    return (
      <Box minH="100vh" bg="paper.50" py={8}>
        <Container maxW="container.md">
          <VStack spacing={8}>
            <Skeleton height="40px" width="200px" />
            <Skeleton height="300px" borderRadius="md" />
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="paper.50" py={8}>
      <Container maxW="container.md">
        <Button
          as={Link}
          to="/"
          variant="outline"
          mb={8}
          leftIcon={<CloseIcon />}
        >
          Back to Dashboard
        </Button>

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
          <VStack spacing={8}>
            <VStack spacing={4}>
              <Box position="relative">
                {profile.avatarName ? (
                  <Image
                    src={`/avatars/${profile.avatarName}`}
                    alt="Profile Avatar"
                    boxSize="150px"
                    borderRadius="full"
                    border="2px solid"
                    borderColor="paper.400"
                    bg="white"
                  />
                ) : (
                  <Avatar
                    size="2xl"
                    name={profile.displayName}
                    bg="accent.100"
                    color="white"
                  />
                )}
                {isOwnProfile && (
                  <IconButton
                    icon={<EditIcon />}
                    size="sm"
                    position="absolute"
                    bottom={0}
                    right={0}
                    onClick={onOpen}
                    colorScheme="teal"
                    borderRadius="full"
                    aria-label="Change avatar"
                  />
                )}
              </Box>
              <Heading size="xl">{profile.displayName}</Heading>
              <Text color="paper.400" fontSize="lg">
                @{profile.username}
              </Text>
              <HStack spacing={8} justify="center" w="100%">
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {profile.followerCount || 0}
                  </Text>
                  <Text color="paper.400">Followers</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {profile.followingCount || 0}
                  </Text>
                  <Text color="paper.400">Following</Text>
                </VStack>
              </HStack>
            </VStack>

            <Box w="100%">
              <FormControl>
                <HStack justify="space-between" mb={2}>
                  <FormLabel
                    fontSize="sm"
                    fontWeight="bold"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Bio
                  </FormLabel>
                  {isOwnProfile && !isEditing && (
                    <IconButton
                      size="sm"
                      icon={<EditIcon />}
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                    />
                  )}
                  {isOwnProfile && isEditing && (
                    <HStack>
                      <IconButton
                        size="sm"
                        icon={<CheckIcon />}
                        onClick={handleUpdateProfile}
                        colorScheme="green"
                      />
                      <IconButton
                        size="sm"
                        icon={<CloseIcon />}
                        onClick={() => {
                          setIsEditing(false);
                          setEditedBio(profile.bio);
                        }}
                        colorScheme="red"
                      />
                    </HStack>
                  )}
                </HStack>
                {isEditing && isOwnProfile ? (
                  <Textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    size="lg"
                    rows={6}
                  />
                ) : (
                  <Text color="paper.400" fontSize="lg">
                    {profile.bio || "No bio yet..."}
                  </Text>
                )}
              </FormControl>
            </Box>

            <VStack spacing={4} w="100%" mt={8}>
              <Heading size="md" alignSelf="start">
                Published Posts
              </Heading>
              {isLoadingPosts ? (
                <Spinner />
              ) : posts.length === 0 ? (
                <Text color="paper.400">No posts yet</Text>
              ) : (
                posts.map((post) => (
                  <Box
                    key={post.id}
                    w="100%"
                    p={4}
                    border="2px solid"
                    borderColor="paper.200"
                    _hover={{
                      borderColor: "accent.100",
                      transform: "translate(-2px, -2px)",
                      boxShadow: "3px 3px 0 black",
                    }}
                    transition="all 0.2s"
                  >
                    <VStack align="start" spacing={2}>
                      <Heading size="sm">{post.title}</Heading>
                      <HStack>
                        <Badge>{post.type}</Badge>
                        {post.category && (
                          <Badge colorScheme="green">
                            {post.category.name}
                          </Badge>
                        )}
                        {post.tags && post.tags.map((tag) => (
                          <Badge key={tag} colorScheme="teal">
                            {tag}
                          </Badge>
                        ))}
                      </HStack>
                      <Text noOfLines={2} color="paper.400">
                        {post.body}
                      </Text>
                    </VStack>
                  </Box>
                ))
              )}
            </VStack>
          </VStack>
        </Box>
      </Container>
      <AvatarSelector
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleAvatarUpdate}
        currentAvatar={profile?.avatarName}
      />
    </Box>
  );
}

export default Profile;
