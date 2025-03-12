"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Text,
  VStack,
  Container,
  useToast,
  InputGroup,
  InputRightElement,
  Icon,
  Flex,
  Grid,
  GridItem,
} from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { ViewIcon, ViewOffIcon, CheckIcon } from "@chakra-ui/icons"
import { motion } from "framer-motion"
import { authService } from "../services/authService"
import VerificationForm from "../components/VerificationForm"
import Logo from "../components/Logo"

const MotionBox = motion(Box)
const MotionText = motion(Text)
const MotionHeading = motion(Heading)

function Signup() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const toast = useToast()

  const validateForm = () => {
    const newErrors = {}
    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const userData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName,
      }

      const response = await authService.signup(userData)
      console.log("[SIGNUP] Success:", response)

      setVerificationSent(true)
      toast({
        title: "CHECK YOUR EMAIL!",
        description: "We've sent you a verification code. Please check your inbox.",
        status: "success",
        duration: 5000,
        position: "top-right",
      })
    } catch (error) {
      console.error("[SIGNUP] Error:", error)
      toast({
        title: "ERROR CREATING ACCOUNT",
        description: error.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 5000,
        position: "top-right",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (code) => {
    setIsLoading(true)
    try {
      await authService.verifyEmail(formData.email, code)
      toast({
        title: "SUCCESS!",
        description: "Your account has been created successfully!",
        status: "success",
        duration: 3000,
        position: "top-right",
      })
      // Redirect to login after successful verification
      navigate("/login")
    } catch (error) {
      console.error("[VERIFY] Error:", error)
      toast({
        title: "VERIFICATION FAILED",
        description: error.response?.data?.error || "Please try again",
        status: "error",
        duration: 5000,
        position: "top-right",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  if (verificationSent) {
    return (
      <MotionBox
        minH="100vh"
        bg="paper.50"
        py={{ base: 8, md: 16 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        position="relative"
        overflow="hidden"
      >
        <Container maxW="md">
          <MotionBox
            bg="white"
            p={8}
            border="4px solid black"
            boxShadow="12px 12px 0 black"
            borderRadius="md"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <VerificationForm email={formData.email} onVerify={handleVerification} isLoading={isLoading} />
          </MotionBox>
        </Container>
      </MotionBox>
    )
  }

  return (
    <MotionBox
      minH="100vh"
      bg="paper.50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      position="relative"
      overflow="hidden"
    >
      {/* Background pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgImage="repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.02) 20px, rgba(0,0,0,0.02) 40px)"
        zIndex={0}
      />

      {/* Decorative elements */}
      <MotionBox
        position="absolute"
        top="15%"
        left="5%"
        width="150px"
        height="150px"
        borderRadius="50%"
        bg="accent.100"
        opacity={0.1}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />

      <MotionBox
        position="absolute"
        bottom="10%"
        right="5%"
        width="200px"
        height="200px"
        borderRadius="50%"
        bg="accent.100"
        opacity={0.1}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />

      <Container maxW="container.xl" py={{ base: 8, md: 16 }} position="relative" zIndex={1}>
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
          gap={0}
          bg="white"
          border="4px solid black"
          boxShadow="12px 12px 0 black"
          overflow="hidden"
          transform="rotate(1deg)"
          as={motion.div}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Left Column - Branding */}
          <GridItem
            bg="accent.100"
            p={{ base: 8, md: 12 }}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            textAlign="center"
            position="relative"
            overflow="hidden"
          >
            {/* Decorative elements */}
            <Box position="absolute" top="20px" right="20px" width="40px" height="40px" border="3px solid white" />

            <Box position="absolute" bottom="20px" left="20px" width="40px" height="40px" border="3px solid white" />

            <MotionBox
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              mb={8}
            >
              <Logo size="4xl" color="white" />
            </MotionBox>

            <MotionHeading
              color="white"
              size="2xl"
              fontWeight="black"
              textTransform="uppercase"
              letterSpacing="wider"
              mb={6}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Join The Community
            </MotionHeading>

            <MotionText
              color="whiteAlpha.900"
              fontSize="xl"
              maxW="md"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Start your creative journey today
            </MotionText>

            {/* Decorative zigzag */}
            <Flex justify="center" mt={12}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box
                  key={i}
                  as={motion.div}
                  height="6px"
                  width="30px"
                  bg="white"
                  mx={1}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
                />
              ))}
            </Flex>
          </GridItem>

          {/* Right Column - Form */}
          <GridItem p={{ base: 6, md: 10 }} overflowY="auto" maxH={{ base: "auto", lg: "700px" }}>
            <VStack spacing={6} align="stretch">
              <MotionBox
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Heading as="h2" size="xl" color="paper.500" fontWeight="black" mb={2}>
                  CREATE ACCOUNT
                </Heading>
                <Text color="paper.400">Fill in your details to get started</Text>
              </MotionBox>

              <MotionBox
                as="form"
                onSubmit={handleSubmit}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <VStack spacing={5} align="stretch">
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5}>
                    <GridItem>
                      <FormControl isInvalid={errors.username}>
                        <FormLabel fontWeight="bold">Username</FormLabel>
                        <Input
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          size="lg"
                          bg="paper.50"
                          border="3px solid"
                          borderColor="paper.400"
                          borderRadius="md"
                          _focus={{
                            borderColor: "accent.100",
                            boxShadow: "5px 5px 0 black",
                          }}
                          _hover={{
                            borderColor: "paper.500",
                          }}
                        />
                        <FormErrorMessage>{errors.username}</FormErrorMessage>
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl isInvalid={errors.displayName}>
                        <FormLabel fontWeight="bold">Display Name</FormLabel>
                        <Input
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleChange}
                          size="lg"
                          bg="paper.50"
                          border="3px solid"
                          borderColor="paper.400"
                          borderRadius="md"
                          _focus={{
                            borderColor: "accent.100",
                            boxShadow: "5px 5px 0 black",
                          }}
                          _hover={{
                            borderColor: "paper.500",
                          }}
                        />
                        <FormErrorMessage>{errors.displayName}</FormErrorMessage>
                      </FormControl>
                    </GridItem>
                  </Grid>

                  <FormControl isInvalid={errors.email}>
                    <FormLabel fontWeight="bold">Email Address</FormLabel>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      size="lg"
                      bg="paper.50"
                      border="3px solid"
                      borderColor="paper.400"
                      borderRadius="md"
                      _focus={{
                        borderColor: "accent.100",
                        boxShadow: "5px 5px 0 black",
                      }}
                      _hover={{
                        borderColor: "paper.500",
                      }}
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={errors.password}>
                    <FormLabel fontWeight="bold">Password</FormLabel>
                    <InputGroup size="lg">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        bg="paper.50"
                        border="3px solid"
                        borderColor="paper.400"
                        borderRadius="md"
                        _focus={{
                          borderColor: "accent.100",
                          boxShadow: "5px 5px 0 black",
                        }}
                        _hover={{
                          borderColor: "paper.500",
                        }}
                      />
                      <InputRightElement>
                        <Icon
                          as={showPassword ? ViewOffIcon : ViewIcon}
                          cursor="pointer"
                          onClick={() => setShowPassword(!showPassword)}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={errors.confirmPassword}>
                    <FormLabel fontWeight="bold">Confirm Password</FormLabel>
                    <InputGroup size="lg">
                      <Input
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        bg="paper.50"
                        border="3px solid"
                        borderColor="paper.400"
                        borderRadius="md"
                        _focus={{
                          borderColor: "accent.100",
                          boxShadow: "5px 5px 0 black",
                        }}
                        _hover={{
                          borderColor: "paper.500",
                        }}
                      />
                      <InputRightElement>
                        <Icon
                          as={showPassword ? ViewOffIcon : ViewIcon}
                          cursor="pointer"
                          onClick={() => setShowPassword(!showPassword)}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                  </FormControl>

                  <Button
                    type="submit"
                    size="lg"
                    height="65px"
                    bg="accent.100"
                    color="white"
                    fontWeight="black"
                    fontSize="lg"
                    textTransform="uppercase"
                    border="3px solid black"
                    borderRadius="md"
                    boxShadow="6px 6px 0 black"
                    _hover={{
                      bg: "accent.200",
                      transform: "translate(-3px, -3px)",
                      boxShadow: "9px 9px 0 black",
                    }}
                    _active={{
                      bg: "accent.300",
                      transform: "translate(0px, 0px)",
                      boxShadow: "0px 0px 0 black",
                    }}
                    rightIcon={<CheckIcon />}
                    isLoading={isLoading}
                    loadingText="CREATING ACCOUNT..."
                    transition="all 0.2s"
                    mt={2}
                  >
                    Create Account
                  </Button>

                  <Flex justify="center" align="center" mt={4}>
                    <Text color="paper.400">
                      Already have an account?{" "}
                      <Button
                        as={Link}
                        to="/login"
                        variant="link"
                        color="accent.100"
                        fontWeight="bold"
                        _hover={{ textDecoration: "none", color: "accent.200" }}
                      >
                        Sign In
                      </Button>
                    </Text>
                  </Flex>
                </VStack>
              </MotionBox>
            </VStack>
          </GridItem>
        </Grid>
      </Container>
    </MotionBox>
  )
}

export default Signup

