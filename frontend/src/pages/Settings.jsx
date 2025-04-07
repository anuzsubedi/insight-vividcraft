import { useState } from "react";
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Textarea,
  HStack,
  Image,
  IconButton,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { ChevronDownIcon, ViewIcon, ViewOffIcon, EditIcon } from "@chakra-ui/icons";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import useAuthState from "../hooks/useAuthState";
import AvatarSelector from "../components/AvatarSelector";
import VerificationForm from "../components/VerificationForm";

function Settings() {
  const { user } = useAuthState();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailAttempts, setEmailAttempts] = useState(0);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    username: user?.username || "",
    bio: user?.bio || "",
    email: user?.email || "",
    newEmail: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const toast = useToast();

  const handleProfileUpdate = async () => {
    try {
      setIsLoading(true);
      const response = await profileService.updateProfile({
        displayName: formData.displayName,
        username: formData.username,
        bio: formData.bio,
      });
      
      // Update the form data with the response
      setFormData(prev => ({
        ...prev,
        displayName: response.profile.displayName,
        username: response.profile.username,
        bio: response.profile.bio,
      }));

      toast({
        title: "Profile Updated!",
        status: "success",
        duration: 3000,
      });
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
      setIsLoading(true);
      await profileService.updateProfile({ avatarName });
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
    } finally {
      setIsLoading(false);
      setAvatarSelectorOpen(false);
    }
  };

  const handleEmailUpdate = async () => {
    try {
      setIsLoading(true);
      await authService.requestEmailChange(formData.newEmail);
      setEmailVerificationSent(true);
      toast({
        title: "Verification Code Sent!",
        description: "Please check your new email for the verification code.",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error sending verification code",
        description: error.response?.data?.error || error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = async (code) => {
    try {
      setIsLoading(true);
      await authService.verifyEmailChange(formData.newEmail, code);
      setEmailVerificationSent(false);
      setEmailAttempts(0);
      toast({
        title: "Email Updated!",
        description: "Your email has been successfully changed.",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error verifying email",
        description: error.response?.data?.error || error.message,
        status: "error",
        duration: 3000,
      });
      // Increment attempts counter
      setEmailAttempts(prev => prev + 1);
      if (emailAttempts >= 4) {
        setEmailVerificationSent(false);
        setEmailAttempts(0);
        toast({
          title: "Too many attempts",
          description: "Please try again with a new email or keep your current one.",
          status: "warning",
          duration: 5000,
        });
      } else {
        toast({
          title: "Invalid Code",
          description: "Please try again.",
          status: "error",
          duration: 3000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        status: "error",
        duration: 3000,
      });
      return;
    }

    try {
      setIsLoading(true);
      await authService.updatePassword(formData.oldPassword, formData.newPassword);
      setFormData(prev => ({
        ...prev,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully changed.",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error updating password",
        description: error.response?.data?.error || "Failed to update password",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

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

        <Box
          bg="white"
          p={8}
          border="2px solid"
          borderColor="black"
          boxShadow="6px 6px 0 black"
        >
          <Heading mb={6}>Account Settings</Heading>
          <Tabs variant="enclosed">
            <TabList>
              <Tab>Profile</Tab>
              <Tab>Email</Tab>
              <Tab>Password</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <VStack spacing={6} align="start">
                  <HStack spacing={8} width="100%">
                    <Box position="relative">
                      {user?.avatarName ? (
                        <Image
                          src={`/avatars/${user.avatarName}`}
                          alt="Profile Avatar"
                          boxSize="150px"
                          borderRadius="0"
                          border="2px solid"
                          borderColor="black"
                          bg="white"
                          transform="rotate(-2deg)"
                          boxShadow="5px 5px 0 black"
                        />
                      ) : (
                        <Box
                          boxSize="150px"
                          borderRadius="0"
                          border="2px solid"
                          borderColor="black"
                          bg="accent.100"
                          transform="rotate(-2deg)"
                          boxShadow="5px 5px 0 black"
                        />
                      )}
                      <IconButton
                        icon={<EditIcon />}
                        position="absolute"
                        bottom={0}
                        right={0}
                        onClick={() => setAvatarSelectorOpen(true)}
                        aria-label="Change avatar"
                        borderWidth="2px"
                        borderColor="black"
                        boxShadow="3px 3px 0 black"
                        _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                      />
                    </Box>
                    <VStack spacing={4} flex={1}>
                      <FormControl>
                        <FormLabel>Display Name</FormLabel>
                        <Input
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleChange}
                          borderWidth="2px"
                          borderColor="black"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Username</FormLabel>
                        <Input
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          borderWidth="2px"
                          borderColor="black"
                        />
                      </FormControl>
                    </VStack>
                  </HStack>
                  
                  <FormControl>
                    <FormLabel>Bio</FormLabel>
                    <Textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      borderWidth="2px"
                      borderColor="black"
                    />
                  </FormControl>

                  <Button
                    onClick={handleProfileUpdate}
                    isLoading={isLoading}
                    loadingText="Updating..."
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="3px 3px 0 black"
                    _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                  >
                    Save Changes
                  </Button>
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={6} align="start" width="100%">
                  <FormControl>
                    <FormLabel>Current Email</FormLabel>
                    <Input
                      value={formData.email}
                      isReadOnly
                      bg="paper.100"
                      borderWidth="2px"
                      borderColor="black"
                    />
                  </FormControl>

                  {emailVerificationSent ? (
                    <Box width="100%">
                      <Text mb={4}>
                        Enter the verification code sent to {formData.newEmail}
                      </Text>
                      <VerificationForm
                        email={formData.newEmail}
                        onVerify={handleEmailVerification}
                        isLoading={isLoading}
                      />
                      <Button
                        mt={4}
                        variant="ghost"
                        onClick={() => setEmailVerificationSent(false)}
                      >
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <FormControl>
                        <FormLabel>New Email</FormLabel>
                        <Input
                          name="newEmail"
                          value={formData.newEmail}
                          onChange={handleChange}
                          type="email"
                          borderWidth="2px"
                          borderColor="black"
                        />
                      </FormControl>

                      <Button
                        onClick={handleEmailUpdate}
                        isLoading={isLoading}
                        loadingText="Sending..."
                        borderWidth="2px"
                        borderColor="black"
                        boxShadow="3px 3px 0 black"
                        _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                      >
                        Update Email
                      </Button>
                    </>
                  )}
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={6} align="start" width="100%">
                  <FormControl>
                    <FormLabel>Current Password</FormLabel>
                    <InputGroup>
                      <Input
                        name="oldPassword"
                        type={showOldPassword ? "text" : "password"}
                        value={formData.oldPassword}
                        onChange={handleChange}
                        borderWidth="2px"
                        borderColor="black"
                      />
                      <InputRightElement>
                        <IconButton
                          icon={showOldPassword ? <ViewOffIcon /> : <ViewIcon />}
                          variant="ghost"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          aria-label={showOldPassword ? "Hide password" : "Show password"}
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <FormControl>
                    <FormLabel>New Password</FormLabel>
                    <InputGroup>
                      <Input
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={handleChange}
                        borderWidth="2px"
                        borderColor="black"
                      />
                      <InputRightElement>
                        <IconButton
                          icon={showNewPassword ? <ViewOffIcon /> : <ViewIcon />}
                          variant="ghost"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Confirm New Password</FormLabel>
                    <InputGroup>
                      <Input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        borderWidth="2px"
                        borderColor="black"
                      />
                      <InputRightElement>
                        <IconButton
                          icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                          variant="ghost"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <Button
                    onClick={handlePasswordUpdate}
                    isLoading={isLoading}
                    loadingText="Updating..."
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="3px 3px 0 black"
                    _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                  >
                    Update Password
                  </Button>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Container>

      <AvatarSelector
        isOpen={avatarSelectorOpen}
        onClose={() => setAvatarSelectorOpen(false)}
        onSelect={handleAvatarUpdate}
        currentAvatar={user?.avatarName}
      />
    </Box>
  );
}

export default Settings;