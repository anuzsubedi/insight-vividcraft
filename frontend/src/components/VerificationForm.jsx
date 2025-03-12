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
} from "@chakra-ui/react"
import { useState } from "react"
import { motion } from "framer-motion"
import { CheckIcon, EmailIcon } from "@chakra-ui/icons"

const MotionBox = motion(Box)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionFlex = motion(Flex)

function VerificationForm({ email, onVerify, isLoading }) {
  const [code, setCode] = useState("")
  const toast = useToast()

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

  return (
    <VStack spacing={8} align="stretch">
      <MotionFlex
        direction="column"
        align="center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <MotionBox
          bg="accent.100"
          color="white"
          p={3}
          borderRadius="full"
          mb={4}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        >
          <Icon as={EmailIcon} boxSize={8} />
        </MotionBox>

        <MotionHeading
          fontSize="4xl"
          fontWeight="black"
          color="paper.500"
          textAlign="center"
          textTransform="uppercase"
          letterSpacing="wide"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          Verify Your Email
        </MotionHeading>

        <MotionText
          color="paper.400"
          fontSize="lg"
          textAlign="center"
          fontFamily="heading"
          mt={2}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Enter the 6-digit code sent to:
        </MotionText>

        <MotionText
          color="accent.100"
          fontSize="lg"
          fontWeight="bold"
          textAlign="center"
          fontFamily="heading"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {email}
        </MotionText>
      </MotionFlex>

      <form onSubmit={handleSubmit}>
        <VStack spacing={8}>
          <MotionBox
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            width="100%"
          >
            <HStack justifyContent="center" spacing={{ base: 2, md: 4 }}>
              <PinInput size="lg" value={code} onChange={setCode} type="number" otp isDisabled={isLoading}>
                {[...Array(6)].map((_, i) => (
                  <PinInputField
                    key={i}
                    bg="paper.50"
                    border="3px solid"
                    borderColor="paper.400"
                    borderRadius="md"
                    fontSize="xl"
                    _hover={{ borderColor: "accent.100" }}
                    _focus={{
                      borderColor: "accent.100",
                      boxShadow: "5px 5px 0 black",
                    }}
                    width={{ base: "40px", md: "50px" }}
                    height={{ base: "50px", md: "60px" }}
                  />
                ))}
              </PinInput>
            </HStack>
          </MotionBox>

          <MotionBox
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            width="100%"
          >
            <Button
              type="submit"
              width="full"
              size="lg"
              height="65px"
              bg="accent.100"
              color="white"
              fontSize="lg"
              fontWeight="black"
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
              loadingText="VERIFYING..."
              isDisabled={code.length !== 6 || isLoading}
              textTransform="uppercase"
              transition="all 0.2s"
            >
              Verify Email
            </Button>
          </MotionBox>

          <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }}>
            <Text fontSize="sm" color="paper.400" textAlign="center">
              Didn&apos;t receive a code?{" "}
              <Button variant="link" color="accent.100" fontWeight="bold" _hover={{ color: "accent.200" }}>
                Resend
              </Button>
            </Text>
          </MotionBox>
        </VStack>
      </form>
    </VStack>
  )
}

VerificationForm.propTypes = {
  email: PropTypes.string.isRequired,
  onVerify: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}

export default VerificationForm

