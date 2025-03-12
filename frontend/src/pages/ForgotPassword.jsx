"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  PinInput,
  PinInputField,
  useToast,
  Flex,
  Divider,
  useColorModeValue,
  Badge,
} from "@chakra-ui/react"
import { ArrowForwardIcon } from "@chakra-ui/icons"
import { motion, useAnimation } from "framer-motion"
import { authService } from "../services/authService"
import Logo from "../components/Logo"

const MotionBox = motion(Box)
const MotionFlex = motion(Flex)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionDivider = motion(Divider)
const MotionBadge = motion(Badge)

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resetRequested, setResetRequested] = useState(false)
  const toast = useToast()
  const controls = useAnimation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required")
      return
    }

    setIsLoading(true)
    try {
      await authService.requestPasswordReset(email)
      setResetRequested(true)
      toast({
        title: "Reset code sent",
        description: "Please check your email for the password reset code",
        status: "success",
        duration: 5000,
        position: "top-right",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 5000,
        position: "top-right",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = () => {
    if (code.length === 6) {
      navigate("/reset-password", {
        state: {
          email,
          code,
        },
      })
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
          animate="visible"
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
              Reset Password
            </MotionHeading>
            <MotionText color="gray.600" variants={itemVariants}>
              {!resetRequested
                ? "Enter your email to receive a reset code"
                : "Enter the verification code sent to your email"}
            </MotionText>
          </MotionBox>

          <MotionDivider mb={8} variants={itemVariants} />

          <VStack spacing={6} w="100%" position="relative" zIndex={1}>
            {!resetRequested ? (
              <Box as="form" onSubmit={handleSubmit} width="100%">
                <VStack spacing={6}>
                  <FormControl isInvalid={error} as={motion.div} variants={itemVariants}>
                    <FormLabel fontWeight="medium">Email Address</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    <FormErrorMessage>{error}</FormErrorMessage>
                  </FormControl>

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
                      loadingText="Sending code..."
                      rightIcon={<ArrowForwardIcon />}
                      as={motion.button}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      transition={{ duration: 0.1 }}
                    >
                      Send Reset Code
                    </Button>
                  </MotionBox>
                </VStack>
              </Box>
            ) : (
              <VStack spacing={6} w="100%">
                <MotionBadge
                  colorScheme="teal"
                  fontSize="sm"
                  mb={4}
                  px={3}
                  py={1}
                  borderRadius="full"
                  variants={itemVariants}
                >
                  {email}
                </MotionBadge>

                <HStack justify="center" spacing={4} as={motion.div} variants={itemVariants}>
                  <PinInput size="lg" value={code} onChange={setCode} type="number" otp>
                    {[...Array(6)].map((_, i) => (
                      <PinInputField
                        key={i}
                        bg="gray.50"
                        borderColor="gray.300"
                        _hover={{ borderColor: "teal.300" }}
                        _focus={{
                          borderColor: "teal.400",
                          boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                        }}
                      />
                    ))}
                  </PinInput>
                </HStack>

                {/* Neo-brutalist Button */}
                <MotionBox w="full" variants={itemVariants}>
                  <Button
                    width="full"
                    size="lg"
                    bg="teal.500"
                    color="white"
                    height="56px"
                    fontSize="md"
                    fontWeight="bold"
                    border="2px solid black"
                    boxShadow="4px 4px 0 black"
                    _hover={{}}
                    _active={{}}
                    isDisabled={code.length !== 6}
                    onClick={handleVerifyCode}
                    rightIcon={<ArrowForwardIcon />}
                    as={motion.button}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    transition={{ duration: 0.1 }}
                  >
                    Verify Code
                  </Button>
                </MotionBox>
              </VStack>
            )}

            <HStack w="full" justify="center" spacing={1} as={motion.div} variants={itemVariants}>
              <Text color="gray.600">Remember your password?</Text>
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
        </MotionFlex>
      </Container>
    </Box>
  )
}

export default ForgotPassword
