import { Box, Container, VStack, Heading, Text, Button, Image } from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDownIcon } from "@chakra-ui/icons";

export default function NotFound() {
  const location = useLocation();
  const isUserProfile = location.pathname.startsWith("/user/");

  return (
    <Box minH="100vh" bg="paper.50" py={12}>
      <Container maxW="container.md">
        <VStack
          spacing={8}
          bg="white"
          p={8}
          border="3px solid"
          borderColor="black"
          boxShadow="8px 8px 0 black"
          position="relative"
          transform="rotate(-1deg)"
        >
          <Box
            position="absolute"
            top="-20px"
            right="-15px"
            bg="accent.100"
            color="white"
            px={4}
            py={2}
            border="2px solid"
            borderColor="black"
            boxShadow="4px 4px 0 black"
            transform="rotate(3deg)"
          >
            <Text fontWeight="bold" fontSize="xl">404</Text>
          </Box>

          <Image
            src="/public/vite.svg"
            alt="404"
            w="150px"
            h="150px"
            opacity="0.8"
            transform="rotate(10deg)"
          />

          <VStack spacing={4} textAlign="center">
            <Heading size="2xl" color="paper.800">
              {isUserProfile ? "User Not Found" : "Page Not Found"}
            </Heading>
            <Text fontSize="xl" color="paper.600" maxW="400px">
              {isUserProfile
                ? "The user you're looking for doesn't exist or may have changed their username."
                : "The page you're looking for doesn't exist or may have been moved."}
            </Text>
          </VStack>

          <Button
            as={Link}
            to="/"
            size="lg"
            variant="solid"
            leftIcon={<ChevronDownIcon transform="rotate(90deg)" />}
            borderWidth="2px"
            borderColor="black"
            boxShadow="4px 4px 0 black"
            _hover={{
              transform: "translate(-2px, -2px)",
              boxShadow: "6px 6px 0 black",
            }}
            _active={{
              transform: "translate(0px, 0px)",
              boxShadow: "2px 2px 0 black",
            }}
          >
            Back to Home
          </Button>
        </VStack>
      </Container>
    </Box>
  );
}