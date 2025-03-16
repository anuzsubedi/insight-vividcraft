import { Box, Text, Container } from "@chakra-ui/react";

const AdminPage = () => {
  return (
    <Container maxW="5xl" py={8}>
      <Box 
        bg="white" 
        p={6} 
        border="2px solid black"
        boxShadow="4px 4px 0 black"
        borderRadius="0"
      >
        <Text fontSize="2xl" fontWeight="bold">
          This is an Admin Page
        </Text>
      </Box>
    </Container>
  );
};

export default AdminPage;