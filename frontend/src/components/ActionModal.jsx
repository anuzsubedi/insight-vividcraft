import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  Text,
  Box,
  Divider,
  Alert,
  AlertIcon,
  Switch,
  HStack,
  Badge,
  RadioGroup,
  Radio,
} from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { adminService } from '../services/adminService';
import { formatDistanceToNow } from 'date-fns';

const RESTRICTION_DURATIONS = [
  { value: '1d', label: '1 Day' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '1 Week' },
  { value: '30d', label: '1 Month' },
  { value: 'permanent', label: 'Permanent' }
];

function ActionModal({ isOpen, onClose, onConfirm, report }) {
  const [restrictUser, setRestrictUser] = useState(false);
  const [restrictionType, setRestrictionType] = useState('post_ban');
  const [restrictionDuration, setRestrictionDuration] = useState('1d');
  const [reason, setReason] = useState('');
  const [moderationHistory, setModerationHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [actionType, setActionType] = useState('delete'); // New state for action type

  useEffect(() => {
    const loadModerationHistory = async () => {
      if (report && isOpen) {
        setIsLoadingHistory(true);
        try {
          const { history } = await adminService.getModerationHistory(
            report.target_id,
            report.target_type
          );
          setModerationHistory(history);
        } catch (error) {
          console.error('Error loading moderation history:', error);
        }
        setIsLoadingHistory(false);
      }
    };

    loadModerationHistory();
  }, [report, isOpen]);

  const handleSubmit = () => {
    const details = { reason };
    let action = {
      type: actionType === 'delete' ? `delete_${report.target_type}` : 'dismiss',
      details
    };

    if (actionType === 'delete' && restrictUser) {
      const now = new Date();
      let expiresAt = null;
      
      if (restrictionDuration !== 'permanent') {
        const days = parseInt(restrictionDuration);
        expiresAt = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
      }

      action.restrictUser = {
        type: restrictionType,
        expiresAt,
        reason
      };
    }

    onConfirm(action);
    handleClose(); // Ensure modal closes after submission
  };

  const handleClose = () => {
    setRestrictUser(false);
    setRestrictionType('post_ban');
    setRestrictionDuration('1d');
    setReason('');
    setModerationHistory([]);
    setActionType('delete');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent
        border="2px solid"
        borderColor="black"
        boxShadow="6px 6px 0 black"
      >
        <ModalHeader borderBottom="2px solid" borderColor="gray.200">
          Review Report
        </ModalHeader>

        <ModalBody py={6}>
          {report && (
            <VStack spacing={6} align="stretch">
              <Box>
                <Text fontWeight="bold" fontSize="lg" mb={2}>Report Details:</Text>
                <VStack mt={2} align="start" spacing={2}>
                  <HStack width="100%" justify="space-between">
                    <HStack>
                      <Badge 
                        colorScheme={report.target_type === "post" ? "blue" : "purple"}
                        px={2}
                        py={1}
                        borderRadius="full"
                      >
                        {report.target_type === "post" ? "Post" : "Comment"}
                      </Badge>
                      <Text fontSize="sm" color="gray.500">ID: {report.target_id}</Text>
                    </HStack>
                    <Badge colorScheme="purple">{report.category}</Badge>
                  </HStack>
                  
                  {report.reason && (
                    <Box>
                      <Text fontWeight="medium" mb={1}>Reason:</Text>
                      <Text fontSize="sm" color="gray.700">{report.reason}</Text>
                    </Box>
                  )}

                  <HStack width="100%" justify="space-between">
                    <HStack>
                      <Text fontWeight="medium">Reported by:</Text>
                      <Text fontSize="sm">@{report.reporter?.username || report.user?.username}</Text>
                      {(report.reporter?.display_name || report.user?.display_name) && (
                        <Text fontSize="sm" color="gray.500">
                          ({report.reporter?.display_name || report.user?.display_name})
                        </Text>
                      )}
                    </HStack>
                    <Text fontSize="sm" color="gray.500">
                      {formatDistanceToNow(new Date(report.created_at))} ago
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Moderation History Section */}
              <Box>
                <Text fontWeight="bold" fontSize="lg" mb={2}>Moderation History:</Text>
                {isLoadingHistory ? (
                  <Text fontSize="sm" color="gray.500">Loading history...</Text>
                ) : moderationHistory.length > 0 ? (
                  <VStack align="stretch" spacing={3}>
                    {moderationHistory.map((action) => (
                      <Box
                        key={action.moderation_id}
                        p={3}
                        bg="gray.50"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="gray.200"
                      >
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            {action.action_type === 'remove' ? 'Removed' : 'Deleted'} by @{action.admin_username}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {formatDistanceToNow(new Date(action.created_at))} ago
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Reason: {action.reason}
                        </Text>
                        {action.report_category && (
                          <Text fontSize="xs" color="gray.500">
                            Report category: {action.report_category}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.500">No previous moderation actions</Text>
                )}
              </Box>

              <Box>
                <Text fontWeight="bold" fontSize="lg" mb={3}>Take Action:</Text>
                
                <RadioGroup value={actionType} onChange={setActionType} mb={4}>
                  <VStack align="start" spacing={3}>
                    <Radio value="delete">
                      Delete Content
                    </Radio>
                    <Radio value="dismiss">
                      Dismiss Report
                    </Radio>
                  </VStack>
                </RadioGroup>

                {actionType === 'delete' && (
                  <FormControl>
                    <HStack justify="space-between" mb={4}>
                      <FormLabel fontWeight="medium" mb={0}>
                        Restrict User?
                      </FormLabel>
                      <Switch
                        isChecked={restrictUser}
                        onChange={(e) => setRestrictUser(e.target.checked)}
                      />
                    </HStack>
                  </FormControl>
                )}

                {actionType === 'delete' && restrictUser && (
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Restriction Type</FormLabel>
                      <Select
                        value={restrictionType}
                        onChange={(e) => setRestrictionType(e.target.value)}
                        borderWidth="2px"
                        borderColor="black"
                      >
                        <option value="post_ban">Ban from Posting</option>
                        <option value="comment_ban">Ban from Commenting</option>
                        <option value="ban">Full Account Ban</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Duration</FormLabel>
                      <Select
                        value={restrictionDuration}
                        onChange={(e) => setRestrictionDuration(e.target.value)}
                        borderWidth="2px"
                        borderColor="black"
                      >
                        {RESTRICTION_DURATIONS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </VStack>
                )}

                <FormControl mt={4}>
                  <FormLabel fontWeight="medium">Notes/Reason:</FormLabel>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Add any notes about this action..."
                    borderWidth="2px"
                    borderColor="black"
                    _hover={{ borderColor: "accent.300" }}
                    _focus={{ 
                      borderColor: "accent.500",
                      boxShadow: "3px 3px 0 black"
                    }}
                  />
                </FormControl>

                <Alert status="warning" mt={4}>
                  <AlertIcon />
                  <Text fontSize="sm">
                    {actionType === 'delete' ? (
                      restrictUser ? 
                        'This action will delete the content and restrict the user. This cannot be undone.' :
                        'This action will delete the content. This cannot be undone.'
                    ) : (
                      'This will dismiss the report without taking action on the content.'
                    )}
                  </Text>
                </Alert>
              </Box>
            </VStack>
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
            colorScheme={actionType === 'delete' ? "red" : "gray"}
            onClick={handleSubmit}
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
            {actionType === 'delete' ? 'Delete Content' : 'Dismiss Report'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

ActionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  report: PropTypes.shape({
    id: PropTypes.string.isRequired,
    target_id: PropTypes.string.isRequired,
    target_type: PropTypes.oneOf(['post', 'comment']).isRequired,
    category: PropTypes.string.isRequired,
    reason: PropTypes.string,
    user: PropTypes.shape({
      username: PropTypes.string.isRequired,
      display_name: PropTypes.string.isRequired
    }),
    reporter: PropTypes.shape({
      username: PropTypes.string,
      display_name: PropTypes.string
    }),
    created_at: PropTypes.string.isRequired
  })
};

export default ActionModal;