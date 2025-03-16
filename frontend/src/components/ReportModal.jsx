import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  RadioGroup,
  Radio,
  VStack,
  Textarea,
  useToast,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { reportService } from '../services/reportService';

const REPORT_CATEGORIES = [
  { value: 'Spam', description: 'Content that is promotional, repetitive, or unrelated' },
  { value: 'Violence and Sex', description: 'Content containing explicit violence or sexual material' },
  { value: 'Promotes Bullying', description: 'Content that encourages harassment or targets individuals' },
  { value: 'Other', description: 'Any other concerns not covered above' }
];

function ReportModal({ isOpen, onClose, postId }) {
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!postId?.id || !category) return;

    setIsSubmitting(true);
    try {
      await reportService.createReport({
        targetId: postId.id,
        targetType: postId.type,
        category,
        reason: category === 'Other' ? reason : undefined
      });

      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe.',
        status: 'success',
        duration: 3000,
        position: 'top-right'
      });
      handleClose();
    } catch (error) {
      toast({
        title: 'Error submitting report',
        description: error.message,
        status: 'error',
        duration: 3000,
        position: 'top-right'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCategory('');
    setReason('');
    onClose();
  };

  // Return null if no valid postId is provided
  if (!postId?.id || !postId?.type) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent
        border="2px solid"
        borderColor="black"
        boxShadow="6px 6px 0 black"
      >
        <ModalHeader borderBottom="2px solid" borderColor="gray.200">
          Report {postId.type === 'post' ? 'Post' : 'Comment'}
        </ModalHeader>

        <ModalBody py={6}>
          <Alert status="info" mb={4} borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              Your report will be reviewed by our moderation team. Please select the most appropriate reason.
            </Text>
          </Alert>

          <RadioGroup value={category} onChange={setCategory}>
            <VStack align="start" spacing={4}>
              {REPORT_CATEGORIES.map(({ value, description }) => (
                <VStack key={value} align="start" spacing={1} width="100%">
                  <Radio 
                    value={value}
                    borderColor="black"
                    _checked={{
                      borderColor: 'accent.500',
                      '& > span:first-of-type': {
                        bg: 'accent.500'
                      }
                    }}
                  >
                    <Text fontWeight="medium">{value}</Text>
                  </Radio>
                  <Text fontSize="sm" color="gray.600" ml={6}>
                    {description}
                  </Text>
                </VStack>
              ))}
            </VStack>
          </RadioGroup>

          {category === 'Other' && (
            <Textarea
              mt={6}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide specific details about your concern..."
              borderWidth="2px"
              borderColor="black"
              _hover={{ borderColor: "accent.300" }}
              _focus={{ 
                borderColor: "accent.500",
                boxShadow: "3px 3px 0 black"
              }}
              minH="100px"
            />
          )}
        </ModalBody>

        <ModalFooter borderTop="2px solid" borderColor="gray.200">
          <Button
            variant="outline"
            mr={3}
            onClick={handleClose}
            borderWidth="2px"
            borderColor="black"
            _hover={{
              transform: 'translate(-1px, -1px)',
              boxShadow: '2px 2px 0 black'
            }}
          >
            Cancel
          </Button>
          <Button
            bg="accent.500"
            color="white"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Submitting..."
            borderWidth="2px"
            borderColor="black"
            boxShadow="4px 4px 0 black"
            _hover={{
              bg: 'accent.600',
              transform: 'translate(-1px, -1px)',
              boxShadow: '5px 5px 0 black'
            }}
            _active={{
              bg: 'accent.700',
              transform: 'translate(0, 0)',
              boxShadow: '2px 2px 0 black'
            }}
          >
            Submit Report
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  postId: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['post', 'comment']).isRequired
  })
};

export default ReportModal;
