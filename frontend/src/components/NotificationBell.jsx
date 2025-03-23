import { useEffect, useRef } from 'react';
import {
    IconButton,
    Box,
    Text,
    VStack,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    PopoverArrow,
    Badge,
    useToast,
    Center,
    Spinner,
    HStack,
    useColorModeValue,
    Tooltip,
    useDisclosure,
    Avatar,
    Portal,
    useBreakpointValue
} from '@chakra-ui/react';
import { Bell, BellOff } from 'lucide-react';
import useAuthState from '../hooks/useAuthState';
import useNotificationState from '../hooks/useNotificationState';
import websocketService from '../services/websocketService';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const { user } = useAuthState();
    const navigate = useNavigate();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const popoverContentRef = useRef(null);
    
    // Use Zustand notification state
    const { 
        unreadCount, 
        notifications, 
        loading, 
        hasFetchedNotifications,
        fetchInitialUnreadCount,
        setUnreadCount,
        incrementUnreadCount,
        fetchNotifications,
        markAsViewed,
        markAsOpened,
        addNotification
    } = useNotificationState();

    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');
    const unreadBg = useColorModeValue('blue.50', 'blue.900');
    const previewBg = useColorModeValue('gray.100', 'gray.800');
    const isMobile = useBreakpointValue({ base: true, md: false });

    // Load initial unread count when component mounts
    useEffect(() => {
        fetchInitialUnreadCount();
        
        // Also set up a listener for when the page becomes visible
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                fetchInitialUnreadCount();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchInitialUnreadCount]);

    // Load notifications when there's a new unread notification
    useEffect(() => {
        if (unreadCount > 0 && !hasFetchedNotifications && !loading) {
            // Fetch notifications in the background when we have unread notifications
            fetchNotifications();
        }
    }, [unreadCount, hasFetchedNotifications, loading, fetchNotifications]);

    // WebSocket connection for real-time notifications (only when logged in)
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found for WebSocket connection');
            return;
        }

        // Connect to WebSocket server
        websocketService.connect(token);

        // Set up WebSocket handlers
        websocketService.on('unread_count', handleUnreadCount);
        websocketService.on('new_notification', handleNewNotification);

        return () => {
            websocketService.off('unread_count');
            websocketService.off('new_notification');
            websocketService.disconnect();
        };
    }, [user]);

    // Fetch notifications when popover is opened
    useEffect(() => {
        if (isOpen && !hasFetchedNotifications) {
            fetchNotifications();
        }
    }, [isOpen, hasFetchedNotifications, fetchNotifications]);

    // Real-time update of unread count when user is logged in
    useEffect(() => {
        let intervalId;
        
        if (user) {
            intervalId = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    fetchInitialUnreadCount();
                }
            }, 30000); // Check every 30 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [user, fetchInitialUnreadCount]);

    // Fix scrolling behavior (remove the old approach that wasn't working well)
    useEffect(() => {
        if (isOpen) {
            // When popover is opened, prevent body scrolling
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scrolling when popover is closed
            document.body.style.overflow = 'auto';
        }
        
        return () => {
            // Cleanup - ensure scrolling is restored when component unmounts
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    const handleUnreadCount = (data) => {
        setUnreadCount(data.count || 0);
    };

    const handleNewNotification = (data) => {
        incrementUnreadCount();
        
        // Show toast notification
        toast({
            title: getNotificationTitle(data.notification),
            description: getNotificationDescription(data.notification),
            status: 'info',
            duration: 5000,
            isClosable: true,
            position: 'top-right'
        });

        // If popover is open, add the new notification to the list
        if (isOpen) {
            addNotification(data.notification);
        }
        
        // If notifications haven't been fetched yet, fetch them now
        if (!hasFetchedNotifications && !loading) {
            fetchNotifications();
        }
    };

    const handleMarkAllAsRead = () => {
        const unreadIds = notifications
            .filter(n => !n.is_viewed)
            .map(n => n.id);
        
        if (unreadIds.length > 0) {
            markAsViewed(unreadIds);
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as opened (navigated to) and viewed (read)
        const notificationPromises = [];
        
        if (!notification.is_opened) {
            notificationPromises.push(markAsOpened(notification.id));
        }
        
        if (!notification.is_viewed) {
            notificationPromises.push(markAsViewed([notification.id]));
        }
        
        // Wait for all operations to complete
        await Promise.all(notificationPromises);

        // Close the popover
        onClose();

        // Handle navigation based on notification type
        switch (notification.type) {
            case 'comment': {
                // Navigate to the post with the comment highlighted
                // If post_id is null, try to use target_id as the post id
                const commentPostId = notification.post_id || notification.target_id;
                if (commentPostId) {
                    navigate(`/posts/${commentPostId}`, { 
                        state: { 
                            scrollToComment: notification.target_id,
                            highlightComment: true
                        }
                    });
                }
                break;
            }
            case 'reply': {
                // Navigate to the post with the reply highlighted
                const replyPostId = notification.post_id || notification.target_id;
                if (replyPostId) {
                    navigate(`/posts/${replyPostId}`, { 
                        state: { 
                            scrollToComment: notification.target_id,
                            highlightComment: true,
                            scrollToParentComment: notification.parent_comment_id 
                        }
                    });
                }
                break;
            }
            case 'vote':
                // Navigate to the post or comment that was voted on
                if (notification.target_type === 'post' && notification.target_id) {
                    navigate(`/posts/${notification.target_id}`);
                } else if (notification.target_type === 'comment' && notification.post_id) {
                    navigate(`/posts/${notification.post_id}`, { 
                        state: { 
                            scrollToComment: notification.target_id,
                            highlightComment: true 
                        }
                    });
                } else if (notification.target_id) {
                    // Fallback, try to use target_id directly
                    navigate(`/posts/${notification.target_id}`);
                }
                break;
            case 'follow':
                // Navigate to the profile of the user who followed
                if (notification.actors?.[0]?.user?.username) {
                    navigate(`/profile/${notification.actors[0].user.username}`);
                } else if (notification.actors?.[0]) {
                    const actor = notification.actors[0];
                    // Try to get username from the actor object itself
                    const username = actor.user?.username || actor.username;
                    if (username) {
                        navigate(`/profile/${username}`);
                    }
                }
                break;
            case 'vote_milestone':
            case 'follow_milestone':
                // For milestones related to posts, navigate to the post
                if (notification.target_type === 'post' && notification.target_id) {
                    navigate(`/posts/${notification.target_id}`);
                } else if (notification.target_type === 'profile') {
                    // For profile milestones, navigate to own profile
                    navigate(`/profile`);
                }
                break;
            default:
                console.log('Unknown notification type:', notification.type);
                break;
        }
    };

    const getNotificationTitle = (notification) => {
        // Get actor info with proper fallbacks
        let actor;
        if (notification.actors && notification.actors.length > 0) {
            // Check if actor is nested under 'user' property
            if (notification.actors[0].user) {
                actor = notification.actors[0].user;
            } else {
                actor = notification.actors[0];
            }
        } else if (notification.actor) {
            actor = notification.actor;
        }

        if (!actor) return 'New Notification';

        // Prefer username over display_name (reversed from before)
        const actorName = actor.username || actor.display_name || 'Unknown User';

        switch (notification.type) {
            case 'comment':
                return `${actorName} commented`;
            case 'reply':
                return `${actorName} replied`;
            case 'vote':
                return `${actorName} ${notification.reaction_type || 'liked'}`;
            case 'follow':
                return `${actorName} followed you`;
            case 'vote_milestone':
                return 'Vote Milestone Reached!';
            case 'follow_milestone':
                return 'Follower Milestone Reached!';
            default:
                return 'New Notification';
        }
    };

    const getNotificationDescription = (notification) => {
        // Get actor info with proper fallbacks
        let actor;
        if (notification.actors && notification.actors.length > 0) {
            // Check if actor is nested under 'user' property
            if (notification.actors[0].user) {
                actor = notification.actors[0].user;
            } else {
                actor = notification.actors[0];
            }
        } else if (notification.actor) {
            actor = notification.actor;
        }

        if (!actor) return 'You have a new notification';

        // Now using username over display_name to match title

        switch (notification.type) {
            case 'comment':
                return `on your post`;
            case 'reply':
                return `to your comment`;
            case 'vote':
                return `your ${notification.target_type || 'post'}`;
            case 'follow':
                return `Started following you`;
            case 'vote_milestone':
                return `Your ${notification.target_type || 'post'} reached ${notification.milestone_value || 'many'} ${notification.reaction_type || 'likes'}!`;
            case 'follow_milestone':
                return `You reached ${notification.milestone_value || 'many'} followers!`;
            default:
                return 'You have a new notification';
        }
    };

    const renderNotificationContent = (notification) => {
        const isUnread = !notification.is_viewed;
        const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
        
        // Get actor info with proper fallbacks
        let actor;
        if (notification.actors && notification.actors.length > 0) {
            // Check if actor is nested under 'user' property
            if (notification.actors[0].user) {
                actor = notification.actors[0].user;
            } else {
                actor = notification.actors[0];
            }
        } else if (notification.actor) {
            actor = notification.actor;
        }
        
        if (!actor) {
            console.warn('Notification missing actor data:', notification);
            return null;
        }

        // Get the user details - prefer username over display_name
        const actorName = actor.username || actor.display_name || 'Unknown User';
        
        // Match the avatar display format used in Header.jsx
        const avatarName = actor.avatar_name || '';
        const avatarUrl = avatarName ? `/avatars/${avatarName}` : undefined;
        
        // Get preview content from notification or truncate if too long
        const previewContent = notification.preview_content || '';
        const truncatedPreview = previewContent.length > 60 
            ? previewContent.substring(0, 60) + '...' 
            : previewContent;

        return (
            <Box
                key={notification.id}
                p={4}
                bg={isUnread ? unreadBg : 'transparent'}
                _hover={{ bg: hoverBg }}
                cursor="pointer"
                onClick={() => handleNotificationClick(notification)}
                transition="all 0.2s"
                borderRadius="md"
                borderBottom="1px"
                borderColor={borderColor}
            >
                <HStack spacing={3} align="start">
                    <Avatar
                        name={actorName}
                        src={avatarUrl}
                        size="sm"
                        border="2px solid black"
                    />
                    <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="medium">
                            {getNotificationTitle(notification)}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            {getNotificationDescription(notification)}
                        </Text>
                        
                        {truncatedPreview && (
                            <Box 
                                p={2} 
                                bg={previewBg} 
                                borderRadius="md" 
                                width="100%"
                                fontSize="sm"
                                fontStyle="italic"
                            >
                                &ldquo;{truncatedPreview}&rdquo;
                            </Box>
                        )}
                        
                        <Text fontSize="xs" color="gray.500">
                            {timeAgo}
                        </Text>
                    </VStack>
                    {isUnread && (
                        <Badge colorScheme="red" variant="solid" borderRadius="full">
                            New
                        </Badge>
                    )}
                </HStack>
            </Box>
        );
    };

    // Remove debug output
    useEffect(() => {
        // Unread count change handler (no logging needed)
    }, [unreadCount]);

    return (
        <Popover
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
            placement="bottom"
            closeOnBlur={true}
            gutter={2}
            modifiers={[
                {
                    name: 'preventOverflow',
                    options: {
                        boundary: 'viewport'
                    }
                }
            ]}
            strategy="fixed"
        >
            <PopoverTrigger>
                <Box position="relative" display="inline-block">
                    <Tooltip label="Notifications">
                        <IconButton
                            icon={<Bell />}
                            aria-label="Notifications"
                            variant="ghost"
                            size="lg"
                            onClick={onOpen}
                        />
                    </Tooltip>
                    {unreadCount > 0 && (
                        <Box
                            position="absolute"
                            top={1}
                            right={1}
                            bg="red.500"
                            color="white"
                            borderRadius="full"
                            minW="18px"
                            h="18px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="xs"
                            fontWeight="bold"
                            zIndex={2}
                            boxShadow="0 0 0 2px white"
                        >
                            {unreadCount}
                        </Box>
                    )}
                </Box>
            </PopoverTrigger>
            <Portal>
                <PopoverContent
                    ref={popoverContentRef}
                    width={isMobile ? '100vw' : '400px'}
                    maxH="80vh"
                    overflowY="auto"
                    position="fixed"
                    zIndex={1400}
                    right="-2"
                    top="5"
                    boxShadow="md"
                    borderRadius="md"
                    border="2px solid black"
                >
                    <PopoverArrow />
                    <PopoverBody p={0}>
                        <VStack spacing={0} align="stretch">
                            <Box p={3} borderBottom="1px" borderColor={borderColor}>
                                <HStack justify="space-between" align="center">
                                    <Text fontWeight="bold" fontSize="lg">
                                        Notifications
                                    </Text>
                                    <HStack spacing={1}>
                                        {unreadCount > 0 && (
                                            <Box
                                                as="button"
                                                p={1}
                                                borderRadius="md"
                                                onClick={handleMarkAllAsRead}
                                                title="Mark all as read"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                bg="transparent"
                                                _hover={{ bg: "gray.100" }}
                                                height="32px"
                                            >
                                                <Text fontSize="xs" fontWeight="medium">Mark all read</Text>
                                            </Box>
                                        )}
                                        <Box 
                                            onClick={onClose}
                                            cursor="pointer"
                                            bg="white"
                                            w="28px"
                                            h="28px"
                                            borderRadius="full"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            border="2px solid black"
                                            _hover={{ bg: "gray.100" }}
                                        >
                                            <Text fontSize="md" fontWeight="bold">×</Text>
                                        </Box>
                                    </HStack>
                                </HStack>
                            </Box>

                            {loading ? (
                                <Center py={8}>
                                    <Spinner />
                                </Center>
                            ) : notifications.length === 0 ? (
                                <Center py={8}>
                                    <VStack spacing={2}>
                                        <BellOff size={24} />
                                        <Text color="gray.500">No notifications yet</Text>
                                    </VStack>
                                </Center>
                            ) : (
                                <VStack spacing={0} align="stretch">
                                    {notifications.map(renderNotificationContent)}
                                </VStack>
                            )}
                        </VStack>
                    </PopoverBody>
                </PopoverContent>
            </Portal>
        </Popover>
    );
};

export default NotificationBell;