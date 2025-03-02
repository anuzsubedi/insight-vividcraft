import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Image,
  useToast,
  Skeleton,
  SkeletonCircle,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { profileService } from "../services/profileService";
import { socialService } from "../services/socialService";
import useAuthState from "../hooks/useAuthState";

export default function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfileByUsername(username);
      setProfile(data.profile);
    } catch (err) {
      if (err.message === "User not found" || err.response?.status === 404) {
        navigate('/user-not-found', { replace: true });
        return;
      }
      // Only show toast for non-404 errors
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to load profile",
        status: "error",
        duration: 5000,
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  }, [username, navigate, toast]);

  useEffect(() => {
    loadProfile();
  }, [username, loadProfile]);

  const handleFollow = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await (profile.isFollowing
        ? socialService.unfollowUser(username)
        : socialService.followUser(username));
      loadProfile();
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Action failed",
        status: "error",
        duration: 5000,
        position: "top-right",
      });
    }
  };

  const handleMute = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await (profile.isMuted
        ? socialService.unmuteUser(username)
        : socialService.muteUser(username));
      loadProfile();
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Action failed",
        status: "error",
        duration: 5000,
        position: "top-right",
      });
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="paper.50" py={8}>
        <Container maxW="container.md">
          <VStack spacing={8}>
            <SkeletonCircle size="150px" />
            <Skeleton height="40px" width="200px" />
            <Skeleton height="20px" width="150px" />
          </VStack>
        </Container>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box minH="100vh" bg="paper.50" py={8}>
        <Container maxW="container.md">
          <VStack spacing={8}>
            <Heading>User not found</Heading>
            <Button as={Link} to="/" leftIcon={<ArrowBackIcon />}>
              Back to Home
            </Button>
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
          leftIcon={<ArrowBackIcon />}
        >
          Back to Home
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
                <Box
                  boxSize="150px"
                  borderRadius="full"
                  bg="accent.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid"
                  borderColor="paper.400"
                >
                  <Text fontSize="4xl" color="white">
                    {profile.displayName[0]}
                  </Text>
                </Box>
              )}
              <Heading size="xl">{profile.displayName}</Heading>
              <Text color="paper.400" fontSize="lg">
                @{profile.username}
              </Text>
            </VStack>

            {/* Only show follow/mute buttons if:
                1. User is authenticated (user exists)
                2. User is viewing someone else's profile (not their own)
            */}
            {user && user.username !== profile.username && (
              <HStack spacing={4}>
                <Button
                  onClick={handleFollow}
                  variant={profile.isFollowing ? "outline" : "solid"}
                >
                  {profile.isFollowing ? "Unfollow" : "Follow"}
                </Button>
                <Button
                  onClick={handleMute}
                  variant="outline"
                  colorScheme={profile.isMuted ? "red" : "gray"}
                >
                  {profile.isMuted ? "Unmute" : "Mute"}
                </Button>
              </HStack>
            )}

            {/* Always show follower/following counts */}
            <HStack spacing={8}>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.followerCount}
                </Text>
                <Text color="paper.400">Followers</Text>
              </VStack>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.followingCount}
                </Text>
                <Text color="paper.400">Following</Text>
              </VStack>
            </HStack>

            <Box w="100%">
              <Text
                fontSize="sm"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="wide"
                mb={2}
              >
                Bio
              </Text>
              <Text color="paper.400" fontSize="lg">
                {profile.bio || "No bio available"}
              </Text>
            </Box>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
