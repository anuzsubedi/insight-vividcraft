import { Box, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const MentionPill = ({ username, isValid }) => {
  if (!isValid) {
    return (
      <Text as="span" color="gray.400">
        @{username}
      </Text>
    );
  }

  return (
    <Link to={`/user/${username}`} onClick={(e) => e.stopPropagation()}>
      <Box
        as="span"
        display="inline-block"
        px={2}
        py={0.5}
        mx={0.5}
        bg="teal.50"
        color="teal.600"
        borderRadius="md"
        fontWeight="medium"
        _hover={{
          bg: "teal.100",
          color: "teal.700",
        }}
        transition="all 0.2s"
      >
        @{username}
      </Box>
    </Link>
  );
};

MentionPill.propTypes = {
  username: PropTypes.string.isRequired,
  isValid: PropTypes.bool.isRequired,
};

export default MentionPill; 