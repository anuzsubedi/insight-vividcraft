import PropTypes from "prop-types";
import {
  VStack,
  HStack,
  PinInput,
  PinInputField,
  Button,
  Text,
  Heading,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";

function VerificationForm({ email, onVerify, isLoading }) {
  const [code, setCode] = useState("");
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        status: "error",
        duration: 3000,
        position: "top-right",
      });
      return;
    }
    await onVerify(code);
  };

  return (
    <VStack spacing={8} align="stretch">
      <VStack spacing={3} align="center">
        <Heading
          fontSize="4xl"
          fontWeight="bold"
          color="paper.500"
          textAlign="center"
        >
          VERIFY YOUR EMAIL
        </Heading>
        <Text
          color="paper.400"
          fontSize="lg"
          textAlign="center"
          fontFamily="heading"
        >
          Enter the 6-digit code sent to:
        </Text>
        <Text
          color="accent.100"
          fontSize="lg"
          fontWeight="bold"
          textAlign="center"
          fontFamily="heading"
        >
          {email}
        </Text>
      </VStack>

      <form onSubmit={handleSubmit}>
        <VStack spacing={6}>
          <HStack justifyContent="center" spacing={4}>
            <PinInput
              size="lg"
              value={code}
              onChange={setCode}
              type="number"
              otp
            >
              {[...Array(6)].map((_, i) => (
                <PinInputField
                  key={i}
                  borderColor="paper.200"
                  bg="paper.50"
                  _hover={{ borderColor: "accent.100" }}
                  _focus={{
                    borderColor: "accent.100",
                    boxShadow: "3px 3px 0 black",
                  }}
                />
              ))}
            </PinInput>
          </HStack>

          <Button
            type="submit"
            width="full"
            size="lg"
            variant="solid"
            isLoading={isLoading}
            loadingText="VERIFYING..."
            isDisabled={code.length !== 6}
          >
            VERIFY EMAIL
          </Button>
        </VStack>
      </form>
    </VStack>
  );
}

VerificationForm.propTypes = {
  email: PropTypes.string.isRequired,
  onVerify: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

export default VerificationForm;
