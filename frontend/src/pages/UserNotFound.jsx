import { Box, VStack, Text, Button, Container } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { ChevronDownIcon } from "@chakra-ui/icons";
import Logo from "../components/Logo";

function UserNotFound() {
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

        <VStack
          spacing={8}
          bg="white"
          p={12}
          border="2px solid"
          borderColor="black"
          boxShadow="6px 6px 0 black"
          align="center"
          justify="center"
        >
          <Logo size="6xl" />
          <Text fontSize="2xl" fontWeight="bold">
            User not found
          </Text>
          <Text color="paper.600" textAlign="center">
            The user you&apos;re looking for doesn&apos;t exist or may have been deleted.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}

export default UserNotFound;