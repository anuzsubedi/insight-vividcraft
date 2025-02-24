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
} from "@chakra-ui/react";
import { EditIcon, CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { Link } from "react-router-dom";
import { profileService } from "../services/profileService";
import AvatarSelector from "../components/AvatarSelector";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState("");
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchProfile = useCallback(async () => {
    try {
      const response = await profileService.getProfile();
      setProfile(response.profile);
      setEditedBio(response.profile.bio || "");
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
  }, [toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  if (isLoading) {
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
              </Box>
              <Heading size="xl">{profile.displayName}</Heading>
              <Text color="paper.400" fontSize="lg">
                @{profile.username}
              </Text>
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
                  {!isEditing ? (
                    <IconButton
                      size="sm"
                      icon={<EditIcon />}
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                    />
                  ) : (
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
                {isEditing ? (
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
