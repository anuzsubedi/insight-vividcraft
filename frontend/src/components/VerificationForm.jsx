"use client"

import PropTypes from "prop-types"
import {
  VStack,
  HStack,
  PinInput,
  PinInputField,
  Button,
  Text,
  Heading,
  useToast,
  Box,
  Flex,
  Icon,
  Divider,
  Badge,
} from "@chakra-ui/react"
import { useState, useEffect } from "react"
import { motion, useAnimation } from "framer-motion"
import { EmailIcon, ArrowForwardIcon } from "@chakra-ui/icons"

const MotionBox = motion(Box)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionDivider = motion(Divider)
const MotionBadge = motion(Badge)

function VerificationForm({ email, onVerify, isLoading }) {
  const [code, setCode] = useState("")
  const toast = useToast()
  const controls = useAnimation()

  useEffect(() => {
    controls.start("visible")
  }, [controls])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        status: "error",
        duration: 3000,
        position: "top-right",
      })
      return
    }
    try {
      await onVerify(code)
    } catch (error) {
      // The parent component will handle error toasts and loading state
      console.error("Verification error:", error)
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

  const pulseVariants = {
    hidden: { scale: 1 },
    visible: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      },
    },
  }

  return (
    <VStack
      spacing={8}
      align="stretch"
      as={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate={controls}
    >
      <MotionBox textAlign="center" variants={itemVariants}>
        <Flex justify="center" mb={6}>
          <MotionBox
            bg="teal.50"
            color="teal.500"
            p={4}
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="md"
            variants={pulseVariants}
            animate="visible"
          >
            <Icon as={EmailIcon} boxSize={6} />
          </MotionBox>
        </Flex>

        <MotionHeading
          as="h2"
          size="xl"
          mb={3}
          bgGradient="linear(to-r, teal.400, teal.600)"
          bgClip="text"
          variants={itemVariants}
        >
          Verify your email
        </MotionHeading>

        <MotionText color="gray.600" mb={2} variants={itemVariants}>
          Enter the 6-digit code sent to:
        </MotionText>

        <MotionText fontWeight="bold" color="teal.500" mb={6} variants={itemVariants}>
          {email}
        </MotionText>
      </MotionBox>

      <MotionDivider variants={itemVariants} />

      <form onSubmit={handleSubmit}>
        <VStack spacing={8}>
          <MotionBox w="full" variants={itemVariants}>
            <MotionBadge
              colorScheme="teal"
              fontSize="sm"
              mb={4}
              px={3}
              py={1}
              borderRadius="full"
              mx="auto"
              display="block"
              textAlign="center"
              width="fit-content"
              variants={itemVariants}
            >
              Verification Code
            </MotionBadge>
            <HStack justify="center" spacing={{ base: 2, md: 3 }}>
              <PinInput
                size="lg"
                value={code}
                onChange={setCode}
                type="number"
                otp
                isDisabled={isLoading}
                focusBorderColor="teal.400"
              >
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
                    fontSize="xl"
                    width={{ base: "40px", md: "50px" }}
                    height={{ base: "50px", md: "60px" }}
                  />
                ))}
              </PinInput>
            </HStack>
          </MotionBox>

          {/* Neo-brutalist Button */}
          <MotionBox w="full" variants={itemVariants}>
            <Button
              type="submit"
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
              loadingText="Verifying..."
              isDisabled={code.length !== 6 || isLoading}
              rightIcon={<ArrowForwardIcon />}
              as={motion.button}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              transition={{ duration: 0.1 }}
            >
              Verify email
            </Button>
          </MotionBox>

          <MotionBox textAlign="center" variants={itemVariants}>
            <Text fontSize="sm" color="gray.600">
              Didn&apos;t receive a code?{" "}
              <Button
                variant="link"
                color="teal.500"
                fontWeight="bold"
                size="sm"
                _hover={{ color: "teal.600", textDecoration: "none" }}
              >
                Resend
              </Button>
            </Text>
          </MotionBox>
        </VStack>
      </form>

      <MotionBox mt={6} textAlign="center" variants={itemVariants}>
        <Text fontSize="sm" color="gray.500">
          Having trouble? Contact{" "}
          <Button as="a" href="mailto:support@example.com" variant="link" color="teal.500" size="sm">
            support@example.com
          </Button>
        </Text>
      </MotionBox>
    </VStack>
  )
}

VerificationForm.propTypes = {
  email: PropTypes.string.isRequired,
  onVerify: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}

export default VerificationForm
