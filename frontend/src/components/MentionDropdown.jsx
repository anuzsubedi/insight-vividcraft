import { Box, VStack, HStack, Avatar, Text } from "@chakra-ui/react";
import PropTypes from "prop-types";

function MentionDropdown({ users, onSelect, position }) {
    if (!users.length) return null;

    return (
        <Box
            position="absolute"
            left={position?.left || 0}
            top={position?.top || "100%"}
            zIndex={1400}  // Increased z-index
            bg="white"
            boxShadow="lg"
            border="2px solid"
            borderColor="gray.200"
            borderRadius="md"
            maxH="300px"
            overflowY="auto"
            w="300px"
            mt={2}  // Added margin top
        >
            <VStack align="stretch" spacing={0}>
                {users.map(user => (
                    <Box
                        key={user.id}
                        p={3}  // Increased padding
                        _hover={{ bg: "gray.50" }}
                        cursor="pointer"
                        onClick={() => onSelect(user)}
                        transition="all 0.2s"
                    >
                        <HStack spacing={3}>
                            <Avatar
                                size="sm"
                                name={user.display_name || user.username}
                                src={user.avatar_name ? `/avatars/${user.avatar_name}` : undefined}
                            />
                            <Box>
                                <Text fontWeight="bold">@{user.username}</Text>
                                <Text fontSize="sm" color="gray.600">
                                    {user.display_name || user.username}
                                </Text>
                            </Box>
                        </HStack>
                    </Box>
                ))}
            </VStack>
        </Box>
    );
}

MentionDropdown.propTypes = {
    users: PropTypes.array.isRequired,
    onSelect: PropTypes.func.isRequired,
    position: PropTypes.shape({
        top: PropTypes.string,
        left: PropTypes.string
    })
};

export default MentionDropdown;
