"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
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
  Divider,
  useColorModeValue,
} from "@chakra-ui/react"
import { ViewIcon, ViewOffIcon, ArrowForwardIcon } from "@chakra-ui/icons"
import { motion, useAnimation } from "framer-motion"
import { authService } from "../services/authService"
import useAuthState from "../hooks/useAuthState"
import Logo from "../components/Logo"

const MotionBox = motion(Box)
const MotionFlex = motion(Flex)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionDivider = motion(Divider)


function Login() {
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const setUser = useAuthState((state) => state.setUser)
  const controls = useAnimation()

  useEffect(() => {
    controls.start("visible")
  }, [controls])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email.trim()) {
      newErrors.email = "Email or username is required"
    }
    if (!formData.password) {
      newErrors.password = "Password is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.nativeEvent.stopImmediatePropagation()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await authService.login(formData)
      setUser(response.user)
      // Navigate to the original location or home
      const from = location.state?.from || "/"
      navigate(from, { replace: true })
    } catch (error) {
      toast({
        title: "Login failed",
        description: error.response?.data?.error || "Please check your credentials",
        status: "error",
        duration: 3000,
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

  const floatingVariants = {
    hidden: { y: 0 },
    visible: {
      y: [0, -10, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      },
    },
  }

  const bgGradient = useColorModeValue(
    "linear(to-br, gray.50, teal.50, blue.50)",
    "linear(to-br, gray.900, teal.900, blue.900)"
  )

  return (
    <Box
      minH="100vh"
      bgGradient={bgGradient}
      position="relative"
      overflow="hidden"
      py={{ base: 10, md: 0 }}
    >
      {/* Background decorative elements */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgImage="url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iLjAyIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00bTAtMTZjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00bTE2IDE2YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDQtMS44IDQtNCA0LTQtMS44LTQtNG0wLTE2YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDQtMS44IDQtNCA0LTQtMS44LTQtNG0tMzIgMzJjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00bTAtMTZjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00bTE2IDE2YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDQtMS44IDQtNCA0LTQtMS44LTQtNG0wLTE2YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDQtMS44IDQtNCA0LTQtMS44LTQtNG0tMTYtMTZjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00bTE2IDBjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00bTE2IDBjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00bS00OCAxNmMwLTIuMiAxLjgtNCA0LTRzNCAxLjggNCA0LTEuOCA0LTQgNC00LTEuOC00LTRtMCAxNmMwLTIuMiAxLjgtNCA0LTRzNCAxLjggNCA0LTEuOCA0LTQgNC00LTEuOC00LTQiLz48L2c+PC9nPjwvc3ZnPg==')"
        opacity="0.4"
        zIndex={0}
      />

      {/* Decorative floating elements */}
      <MotionBox
        position="absolute"
        top="15%"
        left="10%"
        width="120px"
        height="120px"
        borderRadius="full"
        bgGradient="linear(to-br, teal.300, teal.100)"
        opacity="0.2"
        zIndex={0}
        variants={floatingVariants}
        initial="hidden"
        animate="visible"
      />

      <MotionBox
        position="absolute"
        bottom="15%"
        right="10%"
        width="150px"
        height="150px"
        borderRadius="full"
        bgGradient="linear(to-tr, blue.200, teal.200)"
        opacity="0.2"
        zIndex={0}
        variants={{
          ...floatingVariants,
          visible: {
            ...floatingVariants.visible,
            transition: {
              ...floatingVariants.visible.transition,
              delay: 1,
            },
          },
        }}
        initial="hidden"
        animate="visible"
      />

      <Container maxW="lg" py={{ base: 10, md: 20 }} position="relative" zIndex={1}>
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

          <MotionBox textAlign="center" mb={10} zIndex={1} variants={itemVariants}>
            <Logo size="xl" mb={6} />
            <MotionHeading
              as="h1"
              size="xl"
              mb={3}
              bgGradient="linear(to-r, teal.400, teal.600)"
              bgClip="text"
              variants={itemVariants}
            >
              Welcome back
            </MotionHeading>
            <MotionText color="gray.600" variants={itemVariants}>
              Sign in to share your thoughts, big or small
            </MotionText>
          </MotionBox>

          <MotionDivider mb={8} variants={itemVariants} />

          <VStack as="form" spacing={6} w="full" position="relative" zIndex={1}>
            <FormControl isInvalid={errors.email} as={motion.div} variants={itemVariants}>
              <FormLabel fontWeight="medium">Email or Username</FormLabel>
              <InputGroup>
                <Input
                  name="email"
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
              </InputGroup>
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.password} as={motion.div} variants={itemVariants}>
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

            <Flex w="full" justify="flex-end" as={motion.div} variants={itemVariants}>
              <Button
                as={Link}
                to="/forgot-password"
                variant="link"
                color="teal.500"
                fontWeight="medium"
                size="sm"
                _hover={{ color: "teal.600", textDecoration: "none" }}
              >
                Forgot password?
              </Button>
            </Flex>

            {/* Neo-brutalist Button */}
            <MotionBox w="full" variants={itemVariants}>
              <Button
                onClick={handleSubmit}
                size="lg"
                w="full"
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
                loadingText="Signing in..."
                rightIcon={<ArrowForwardIcon />}
                as={motion.button}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                transition={{ duration: 0.1 }}
              >
                Sign in
              </Button>
            </MotionBox>

            <HStack w="full" justify="center" spacing={1} as={motion.div} variants={itemVariants}>
              <Text color="gray.600">Don&apos;t have an account?</Text>
              <Button
                as={Link}
                to="/signup"
                variant="link"
                color="teal.500"
                fontWeight="bold"
                _hover={{ color: "teal.600" }}
              >
                Sign up
              </Button>
            </HStack>
          </VStack>

          <MotionBox mt={10} textAlign="center" variants={itemVariants}>
            <Text fontSize="sm" color="gray.500">
              By signing in, you agree to our{" "}
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

export default Login
