import { Text } from "@chakra-ui/react";
import PropTypes from "prop-types";

function Logo({ size = "xl" }) {
  return (
    <Text
      fontFamily="monospace"
      fontSize={size}
      fontWeight="bold"
      letterSpacing="tight"
    >
      insight.
    </Text>
  );
}

Logo.propTypes = {
  size: PropTypes.string
};

export default Logo;