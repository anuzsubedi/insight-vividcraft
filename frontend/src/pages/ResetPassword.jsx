"use client"

import { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
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
  useToast,
  Flex,
  Divider,
  useColorModeValue,
  InputGroup,
  InputRightElement,
  Icon,
  List,
  ListItem,
  ListIcon,
  HStack,
} from "@chakra-ui/react"
import { ViewIcon, ViewOffIcon, ArrowForwardIcon, CheckCircleIcon, WarningIcon } from "@chakra-ui/icons"
import { motion } from "framer-motion"
import { authService } from "../services/authService"
import Logo from "../components/Logo"

const MotionBox = motion(Box)
const MotionFlex = motion(Flex)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionDivider = motion(Divider)

function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  // Get email and code from location state
  const { email, code } = location.state || {}
  if (!email || !code) {
    navigate("/forgot-password")
    return null
  }

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({})

  // Password validation rules
  const passwordRules = [
    { id: 1, text: "At least 8 characters long", test: (p) => p.length >= 8 },
    { id: 2, text: "Contains at least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { id: 3, text: "Contains at least one lowercase letter", test: (p) => /[a-z]/.test(p) },
    { id: 4, text: "Contains at least one number", test: (p) => /\d/.test(p) },
    { id: 5, text: "Passwords match", test: (p) => p === formData.confirmPassword },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      await authService.resetPassword(email, code, formData.password)
      toast({
        title: "Password reset successful",
        description: "You can now login with your new password",
        status: "success",
        duration: 5000,
        position: "top-right",
      })
      navigate("/login")
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

  const validateForm = () => {
    const newErrors = {}
    const allRulesPassed = passwordRules.every(rule => rule.test(formData.password))
    
    if (!allRulesPassed) {
      newErrors.password = "Please meet all password requirements"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
              Create New Password
            </MotionHeading>
            <MotionText color="gray.600" variants={itemVariants}>
              Please choose a strong password for your account
            </MotionText>
          </MotionBox>

          <MotionDivider mb={8} variants={itemVariants} />

          <VStack as="form" onSubmit={handleSubmit} spacing={6} position="relative" zIndex={1}>
            <FormControl isInvalid={errors.password} as={motion.div} variants={itemVariants}>
              <FormLabel fontWeight="medium">New Password</FormLabel>
              <InputGroup>
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  size="lg"
                  bg="gray.50"
                  borderColor="gray.300"
                  _hover={{ borderColor: "teal.300" }}
                  _focus={{
                    borderColor: "teal.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                  }}
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

            <FormControl isInvalid={errors.confirmPassword} as={motion.div} variants={itemVariants}>
              <FormLabel fontWeight="medium">Confirm Password</FormLabel>
              <InputGroup>
                <Input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  size="lg"
                  bg="gray.50"
                  borderColor="gray.300"
                  _hover={{ borderColor: "teal.300" }}
                  _focus={{
                    borderColor: "teal.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)",
                  }}
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

            <Box w="full" bg="gray.50" p={4} borderRadius="md" as={motion.div} variants={itemVariants}>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Password Requirements:
              </Text>
              <List spacing={2}>
                {passwordRules.map(rule => (
                  <ListItem
                    key={rule.id}
                    fontSize="sm"
                    color={rule.test(formData.password) ? "green.500" : "gray.500"}
                    display="flex"
                    alignItems="center"
                  >
                    <ListIcon
                      as={rule.test(formData.password) ? CheckCircleIcon : WarningIcon}
                      color={rule.test(formData.password) ? "green.500" : "gray.400"}
                    />
                    {rule.text}
                  </ListItem>
                ))}
              </List>
            </Box>

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
                loadingText="Resetting password..."
                rightIcon={<ArrowForwardIcon />}
                as={motion.button}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                transition={{ duration: 0.1 }}
              >
                Reset Password
              </Button>
            </MotionBox>

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

export default ResetPassword
