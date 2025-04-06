import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  HStack,
  Avatar,
  Badge,
} from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';

function ContentViewModal({ isOpen, onClose, content }) {
  if (!content) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent
        border="2px solid"
        borderColor="black"
        boxShadow="6px 6px 0 black"
      >
        <ModalHeader borderBottom="2px solid" borderColor="gray.200">
          <HStack>
            <Badge colorScheme={content?.type === 'post' ? 'blue' : 'purple'}>
              {content?.type === 'post' ? 'Post' : 'Comment'}
            </Badge>
            <Text>ID: {content?.id}</Text>
          </HStack>
        </ModalHeader>

        <ModalBody py={6}>
          {content.author && (
            <HStack mb={4} spacing={3}>
              <Avatar
                size="md"
                name={content.author.display_name || content.author.username}
                src={content.author.avatar_name ? `/avatars/${content.author.avatar_name}` : undefined}
              />
              <Box>
                <Text fontWeight="bold">@{content.author.username}</Text>
                {content.author.display_name && (
                  <Text fontSize="sm" color="gray.500">{content.author.display_name}</Text>
                )}
              </Box>
              {content.created_at && (
                <Text fontSize="sm" color="gray.500" ml="auto">
                  {formatDistanceToNow(new Date(content.created_at))} ago
                </Text>
              )}
            </HStack>
          )}

          {content.title && (
            <Text fontSize="2xl" fontWeight="bold" mb={4}>
              {content.title}
            </Text>
          )}

          <Box
            p={4}
            bg="gray.50"
            borderRadius="md"
            borderWidth="2px"
            borderColor="gray.200"
            maxHeight="60vh"
            overflowY="auto"
          >
            <Text fontSize="md" whiteSpace="pre-wrap">
              {content.content || content.body || 'No content available'}
            </Text>
          </Box>

          {content.category && (
            <HStack mt={4}>
              <Text fontWeight="medium">Category:</Text>
              <Badge colorScheme="green">{content.category}</Badge>
            </HStack>
          )}
        </ModalBody>

        <ModalFooter borderTop="2px solid" borderColor="gray.200">
          <Button
            onClick={onClose}
            borderWidth="2px"
            borderColor="black"
            boxShadow="4px 4px 0 black"
            _hover={{
              transform: 'translate(-1px, -1px)',
              boxShadow: '5px 5px 0 black'
            }}
            _active={{
              transform: 'translate(0, 0)',
              boxShadow: '2px 2px 0 black'
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

ContentViewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  content: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.oneOf(['post', 'comment']),
    title: PropTypes.string,
    content: PropTypes.string,
    body: PropTypes.string,
    category: PropTypes.string,
    created_at: PropTypes.string,
    author: PropTypes.shape({
      username: PropTypes.string,
      display_name: PropTypes.string,
      avatar_name: PropTypes.string
    })
  })
};

export default ContentViewModal;