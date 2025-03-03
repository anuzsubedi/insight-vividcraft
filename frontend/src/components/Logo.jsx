import { Text } from "@chakra-ui/react";
import PropTypes from "prop-types";

function Logo({ size = "xl", ...props }) {
  return (
    <Text
      fontFamily="heading"
      fontSize={size}
      fontWeight="bold"
      letterSpacing="-0.02em"
      color="accent.100"
      textTransform="uppercase"
      {...props}
    >
      INSIGHT
    </Text>
  );
}

Logo.propTypes = {
  size: PropTypes.string
};

export default Logo;