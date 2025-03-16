import {
  Box,
  Container,
  HStack,
  Button,
  Text,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "./Logo";
import SearchDropdown from "./SearchDropdown";
import PropTypes from 'prop-types';

const MotionBox = motion(Box);

const Header = ({ user, isAdmin }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear auth token from localStorage
    localStorage.removeItem('token');
    // Navigate to login page
    navigate('/login');
  };

  return (
    <Box
      py={4}
      bg="white"
      borderBottom="3px solid black"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Container maxW="5xl">
        <HStack justify="space-between" align="center">
          <MotionBox
            whileHover={{ rotate: -2 }}
            transition={{ duration: 0.2 }}
            as={Link}
            to="/"
          >
            <Logo size="2xl" />
          </MotionBox>

          <HStack spacing={6}>
            <SearchDropdown />
            <Menu>
              <MenuButton
                as={Button}
                bg="white"
                border="2px solid black"
                _hover={{
                  transform: "translate(-2px, -2px)",
                  boxShadow: "4px 4px 0 0 #000",
                }}
                _active={{
                  transform: "translate(0px, 0px)",
                  boxShadow: "none",
                }}
              >
                <HStack spacing={3}>
                  <Avatar
                    size="sm"
                    name={user.displayName}
                    src={user.avatarName ? `/avatars/${user.avatarName}` : undefined}
                    border="2px solid black"
                  />
                  <Text fontWeight="bold">@{user.username}</Text>
                </HStack>
              </MenuButton>
              <MenuList
                bg="white"
                border="2px solid black"
                boxShadow="4px 4px 0 black"
                borderRadius="0"
                p={0}
                overflow="hidden"
              >
                <MenuItem
                  as={Link}
                  to={`/user/${user.username}`}
                  borderRadius="0"
                  _hover={{ bg: "paper.100" }}
                >
                  My Profile
                </MenuItem>
                <MenuItem
                  as={Link}
                  to="/my-posts"
                  borderRadius="0"
                  _hover={{ bg: "paper.100" }}
                >
                  My Posts
                </MenuItem>
                <MenuItem
                  as={Link}
                  to="/settings"
                  borderRadius="0"
                  _hover={{ bg: "paper.100" }}
                >
                  Settings
                </MenuItem>
                {isAdmin && (
                  <MenuItem
                    as={Link}
                    to="/admin"
                    borderRadius="0"
                    _hover={{ bg: "paper.100" }}
                  >
                    Admin Dashboard
                  </MenuItem>
                )}
                <Divider my={2} borderColor="paper.200" />
                <MenuItem
                  onClick={handleLogout}
                  borderRadius="0"
                  _hover={{ bg: "red.50", color: "red.600" }}
                >
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
};

Header.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    avatarName: PropTypes.string,
  }).isRequired,
  isAdmin: PropTypes.bool,
};

export default Header;