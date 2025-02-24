import { useState } from "react";
import PropTypes from "prop-types";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  SimpleGrid,
  Box,
  Image,
  Button,
} from "@chakra-ui/react";

const TOTAL_AVATARS = 27;

function AvatarSelector({ isOpen, onClose, onSelect, currentAvatar }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

  const handleSelect = () => {
    onSelect(selectedAvatar);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay />
      <ModalContent
        border="2px solid"
        borderColor="paper.400"
        borderRadius="0"
        boxShadow="6px 6px 0 black"
        transform="translate(-4px, -4px)"
        bg="white"
      >
        <ModalHeader
          borderBottom="2px solid"
          borderColor="paper.200"
          fontFamily="heading"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Choose Your Avatar
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6}>
          <SimpleGrid columns={5} spacing={4} mb={6}>
            {[...Array(TOTAL_AVATARS)].map((_, index) => {
              const avatarName = `vibrent_${index + 1}.png`;
              const isSelected = selectedAvatar === avatarName;
              return (
                <Box
                  key={avatarName}
                  cursor="pointer"
                  border="2px solid"
                  borderColor={isSelected ? "accent.100" : "paper.200"}
                  p={2}
                  bg="white"
                  transform={isSelected ? "translate(-2px, -2px)" : "none"}
                  boxShadow={isSelected ? "3px 3px 0 black" : "none"}
                  transition="all 0.2s"
                  _hover={{
                    transform: "translate(-2px, -2px)",
                    boxShadow: "3px 3px 0 black",
                  }}
                  onClick={() => setSelectedAvatar(avatarName)}
                >
                  <Image
                    src={`/avatars/${avatarName}`}
                    alt={`Avatar ${index + 1}`}
                    w="100%"
                    h="auto"
                  />
                </Box>
              );
            })}
          </SimpleGrid>
          <Button
            variant="solid"
            width="full"
            onClick={handleSelect}
            isDisabled={!selectedAvatar}
            size="lg"
          >
            Select Avatar
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

AvatarSelector.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  currentAvatar: PropTypes.string,
};

AvatarSelector.defaultProps = {
  currentAvatar: null,
};

export default AvatarSelector;
