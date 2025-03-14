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
} from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { reportService } from '../services/reportService';

const REPORT_CATEGORIES = [
  'Spam',
  'Violence and Sex',
  'Promotes Bullying',
  'Other'
];

function ReportModal({ isOpen, onClose, postId }) {
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!category) {
      toast({
        title: 'Please select a reason',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (category === 'Other' && !reason.trim()) {
      toast({
        title: 'Please provide details',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await reportService.createReport({
        postId,
        category,
        reason: category === 'Other' ? reason : ''
      });

      toast({
        title: 'Report submitted',
        status: 'success',
        duration: 3000,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error submitting report',
        description: error.message,
        status: 'error',
        duration: 3000,
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent
        border="2px solid"
        borderColor="black"
        boxShadow="6px 6px 0 black"
      >
        <ModalHeader>Report Post</ModalHeader>
        <ModalBody>
          <RadioGroup value={category} onChange={setCategory}>
            <VStack align="start" spacing={3}>
              {REPORT_CATEGORIES.map((option) => (
                <Radio key={option} value={option}>
                  {option}
                </Radio>
              ))}
            </VStack>
          </RadioGroup>

          {category === 'Other' && (
            <Textarea
              mt={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide details..."
              borderWidth="2px"
              borderColor="black"
              _hover={{ borderColor: "accent.100" }}
              _focus={{ 
                borderColor: "accent.100",
                boxShadow: "3px 3px 0 black"
              }}
            />
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="red" 
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Report
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  postId: PropTypes.string.isRequired
};

export default ReportModal;
