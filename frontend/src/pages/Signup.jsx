"use client"

import { useState, useEffect } from "react"
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
  HStack,
  Grid,
  GridItem,
  Divider,
  useColorModeValue,
  Badge,
} from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { ViewIcon, ViewOffIcon, ArrowForwardIcon, } from "@chakra-ui/icons"
import { motion, useAnimation } from "framer-motion"
import { authService } from "../services/authService"
import VerificationForm from "../components/VerificationForm"
import Logo from "../components/Logo"

const MotionBox = motion(Box)
const MotionFlex = motion(Flex)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionDivider = motion(Divider)
const MotionBadge = motion(Badge)

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
  const controls = useAnimation()

  useEffect(() => {
    controls.start("visible")
  }, [controls])

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
        title: "Check your email",
        description: "We've sent you a verification code. Please check your inbox.",
        status: "success",
        duration: 5000,
        position: "top-right",
      })
    } catch (error) {
      console.error("[SIGNUP] Error:", error)
      toast({
        title: "Error creating account",
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
        title: "Success!",
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
        title: "Verification failed",
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.08,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  }

  const buttonVariants = {
    hover: {
      scale: 1.03,
      boxShadow: "6px 6px 0 rgba(0,0,0,0.9)",
      translateY: "-2px",
      translateX: "-2px",
    },
    tap: {
      scale: 0.98,
      boxShadow: "2px 2px 0 rgba(0,0,0,0.9)",
      translateY: "0px",
      translateX: "0px",
    },
  }

  const bgGradient = useColorModeValue(
    "linear(to-br, gray.50, teal.50, blue.50)",
    "linear(to-br, gray.900, teal.900, blue.900)"
  )

  if (verificationSent) {
    return (
      <Box
        minH="100vh"
        bgGradient={bgGradient}
        position="relative"
        overflow="hidden"
        py={{ base: 10, md: 0 }}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {/* Decorative circles */}
        <Box
          position="absolute"
          top="10%"
          left="5%"
          width="200px"
          height="200px"
          borderRadius="full"
          bgGradient="linear(to-r, teal.200, teal.100)"
          opacity="0.4"
          zIndex={0}
        />
        
        <Box
          position="absolute"
          bottom="10%"
          right="5%"
          width="300px"
          height="300px"
          borderRadius="full"
          bgGradient="linear(to-l, blue.100, teal.100)"
          opacity="0.3"
          zIndex={0}
        />

        <Container maxW="md" py={{ base: 10, md: 20 }} position="relative" zIndex={1}>
          <MotionBox
            bg="white"
            p={{ base: 8, md: 12 }}
            rounded="xl"
            boxShadow="2xl"
            borderTop="6px solid"
            borderColor="teal.400"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <VerificationForm email={formData.email} onVerify={handleVerification} isLoading={isLoading} />
          </MotionBox>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      minH="100vh"
      bgGradient={bgGradient}
      position="relative"
      overflow="hidden"
      py={{ base: 10, md: 0 }}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {/* Decorative circles */}
      <Box
        position="absolute"
        top="10%"
        left="5%"
        width="200px"
        height="200px"
        borderRadius="full"
        bgGradient="linear(to-r, teal.200, teal.100)"
        opacity="0.4"
        zIndex={0}
      />
      
      <Box
        position="absolute"
        bottom="10%"
        right="5%"
        width="300px"
        height="300px"
        borderRadius="full"
        bgGradient="linear(to-l, blue.100, teal.100)"
        opacity="0.3"
        zIndex={0}
      />

      <Container maxW="xl" py={{ base: 10, md: 20 }} position="relative" zIndex={1}>
        <MotionFlex
          direction="column"
          bg="white"
          p={{ base: 8, md: 12 }}
          rounded="xl"
          boxShadow="2xl"
          borderTop="6px solid"
          borderColor="teal.400"
          overflow="hidden"
          position="relative"
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          {/* Decorative corner accent */}
          <Box
            position="absolute"
            top="0"
            right="0"
            width="120px"
            height="120px"
            bgGradient="linear(to-br, teal.50, blue.50)"
            transform="translate(60px, -60px) rotate(45deg)"
            zIndex={0}
          />

          <MotionBox textAlign="center" mb={8} zIndex={1} variants={itemVariants}>
            <Logo size="xl" mb={6} />
            <MotionHeading
              as="h1"
              size="xl"
              mb={3}
              bgGradient="linear(to-r, teal.400, teal.600)"
              bgClip="text"
              variants={itemVariants}
            >
              Join our community
            </MotionHeading>
            <MotionText color="gray.600" variants={itemVariants}>
              Create an account to share quick thoughts or deep dives
            </MotionText>
          </MotionBox>

          <MotionDivider mb={8} variants={itemVariants} />

          <VStack as="form" onSubmit={handleSubmit} spacing={8} w="full" position="relative" zIndex={1}>
            <MotionBox w="full" variants={itemVariants}>
              <MotionBadge
                colorScheme="teal"
                fontSize="sm"
                mb={4}
                px={3}
                py={1}
                borderRadius="full"
                variants={itemVariants}
              >
                Account Information
              </MotionBadge>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} w="full">
                <GridItem>
                  <FormControl isInvalid={errors.username}>
                    <FormLabel fontWeight="medium">Username</FormLabel>
                    <Input
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      size="lg"
                      bg="gray.50"
                      borderColor="gray.300"
                      _hover={{ borderColor: "teal.300" }}
                      _focus={{
                        borderColor: "teal.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                      }}
                      pl={4}
                    />
                    <FormErrorMessage>{errors.username}</FormErrorMessage>
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl isInvalid={errors.displayName}>
                    <FormLabel fontWeight="medium">Display Name</FormLabel>
                    <Input
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      size="lg"
                      bg="gray.50"
                      borderColor="gray.300"
                      _hover={{ borderColor: "teal.300" }}
                      _focus={{
                        borderColor: "teal.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                      }}
                      pl={4}
                    />
                    <FormErrorMessage>{errors.displayName}</FormErrorMessage>
                  </FormControl>
                </GridItem>
              </Grid>
            </MotionBox>

            <FormControl isInvalid={errors.email} as={motion.div} variants={itemVariants}>
              <FormLabel fontWeight="medium">Email Address</FormLabel>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                size="lg"
                bg="gray.50"
                borderColor="gray.300"
                _hover={{ borderColor: "teal.300" }}
                _focus={{
                  borderColor: "teal.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                }}
                pl={4}
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <MotionBox w="full" variants={itemVariants}>
              <MotionBadge
                colorScheme="teal"
                fontSize="sm"
                mb={4}
                px={3}
                py={1}
                borderRadius="full"
                variants={itemVariants}
              >
                Security
              </MotionBadge>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} w="full">
                <GridItem>
                  <FormControl isInvalid={errors.password}>
                    <FormLabel fontWeight="medium">Password</FormLabel>
                    <InputGroup size="lg">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        bg="gray.50"
                        borderColor="gray.300"
                        _hover={{ borderColor: "teal.300" }}
                        _focus={{
                          borderColor: "teal.400",
                          boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                        }}
                        pl={4}
                      />
                      <InputRightElement>
                        <Icon
                          as={showPassword ? ViewOffIcon : ViewIcon}
                          cursor="pointer"
                          onClick={() => setShowPassword(!showPassword)}
                          color="gray.500"
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl isInvalid={errors.confirmPassword}>
                    <FormLabel fontWeight="medium">Confirm Password</FormLabel>
                    <InputGroup size="lg">
                      <Input
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        bg="gray.50"
                        borderColor="gray.300"
                        _hover={{ borderColor: "teal.300" }}
                        _focus={{
                          borderColor: "teal.400",
                          boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                        }}
                        pl={4}
                      />
                      <InputRightElement>
                        <Icon
                          as={showPassword ? ViewOffIcon : ViewIcon}
                          cursor="pointer"
                          onClick={() => setShowPassword(!showPassword)}
                          color="gray.500"
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                  </FormControl>
                </GridItem>
              </Grid>
            </MotionBox>

            {/* Neo-brutalist Button */}
            <MotionBox w="full" variants={itemVariants}>
              <Button
                type="submit"
                size="lg"
                width="full"
                bg="teal.500"
                color="white"
                height="56px"
                fontSize="md"
                fontWeight="bold"
                border="2px solid black"
                boxShadow="4px 4px 0 black"
                _hover={{}}
                _active={{}}
                isLoading={isLoading}
                loadingText="Creating account..."
                rightIcon={<ArrowForwardIcon />}
                as={motion.button}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                transition={{ duration: 0.1 }}
              >
                Create account
              </Button>
            </MotionBox>

            <HStack w="full" justify="center" spacing={1} as={motion.div} variants={itemVariants}>
              <Text color="gray.600">Already have an account?</Text>
              <Button
                as={Link}
                to="/login"
                variant="link"
                color="teal.500"
                fontWeight="bold"
                _hover={{ color: "teal.600" }}
              >
                Sign in
              </Button>
            </HStack>
          </VStack>

          <MotionBox mt={10} textAlign="center" variants={itemVariants}>
            <Text fontSize="sm" color="gray.500">
              By creating an account, you agree to our{" "}
              <Button as={Link} to="/terms" variant="link" color="teal.500" size="sm">
                Terms
              </Button>{" "}
              and{" "}
              <Button as={Link} to="/privacy" variant="link" color="teal.500" size="sm">
                Privacy Policy
              </Button>
            </Text>
          </MotionBox>
        </MotionFlex>
      </Container>
    </Box>
  )
}

export default Signup
