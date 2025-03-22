import { useEffect, useState } from 'react';
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
    Button,
    Avatar,
    Portal,
    useBreakpointValue
} from '@chakra-ui/react';
import { Bell, BellOff } from 'lucide-react';
import useAuthState from '../hooks/useAuthState';
import websocketService from '../services/websocketService';
import { notificationService } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const { user } = useAuthState();
    const navigate = useNavigate();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasFetchedNotifications, setHasFetchedNotifications] = useState(false);

    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');
    const isMobile = useBreakpointValue({ base: true, md: false });

    // WebSocket connection for real-time notifications
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

        // Request initial unread count
        notificationService.getUnreadCount().then(count => {
            setUnreadCount(count);
        });

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
    }, [isOpen, hasFetchedNotifications]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationService.getNotifications();
            setNotifications(data.notifications || []);
            setHasFetchedNotifications(true);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast({
                title: 'Error',
                description: 'Failed to load notifications',
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top-right'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUnreadCount = (data) => {
        console.log('Received unread count:', data);
        setUnreadCount(data.count || 0);
    };

    const handleNewNotification = (data) => {
        setUnreadCount(prev => prev + 1);
        
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
            setNotifications(prev => [data.notification, ...prev]);
        }
    };

    const handleMarkAsViewed = async (notificationIds) => {
        if (!notificationIds || notificationIds.length === 0) {
            console.log('No notifications to mark as viewed');
            return;
        }

        try {
            await notificationService.markAsViewed(notificationIds);
            setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
            
            // Update local notifications state
            setNotifications(prev => 
                prev.map(notification => 
                    notificationIds.includes(notification.id)
                        ? { ...notification, is_viewed: true }
                        : notification
                )
            );
        } catch (error) {
            console.error('Error marking notifications as viewed:', error);
            toast({
                title: 'Error',
                description: 'Failed to mark notifications as read',
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top-right'
            });
        }
    };

    const handleMarkAsOpened = async (notificationId) => {
        if (!notificationId) {
            console.log('No notification ID to mark as opened');
            return;
        }

        try {
            await notificationService.markAsOpened(notificationId);
            
            // Update local notifications state
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId
                        ? { ...notification, is_opened: true }
                        : notification
                )
            );
        } catch (error) {
            console.error('Error marking notification as opened:', error);
            toast({
                title: 'Error',
                description: 'Failed to mark notification as opened',
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top-right'
            });
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.is_opened) {
            await handleMarkAsOpened(notification.id);
        }

        // Handle navigation based on notification type
        switch (notification.type) {
            case 'comment':
            case 'reply':
                if (notification.post_id) {
                    navigate(`/posts/${notification.post_id}`, { 
                        state: { scrollToComment: notification.target_id }
                    });
                }
                break;
            case 'vote':
                if (notification.post_id) {
                    navigate(`/posts/${notification.post_id}`);
                }
                break;
            case 'follow':
                if (notification.target_id) {
                    navigate(`/profile/${notification.target_id}`);
                }
                break;
            default:
                break;
        }
    };

    const getNotificationTitle = (notification) => {
        const actor = notification.actors?.[0];
        if (!actor) return 'New Notification';

        // Get the user's display name or username
        const actorName = actor.display_name || actor.username || 'Unknown User';

        switch (notification.type) {
            case 'comment':
                return `${actorName} commented`;
            case 'reply':
                return `${actorName} replied`;
            case 'vote':
                return `${actorName} ${notification.reaction_type}d`;
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
        const actor = notification.actors?.[0];
        if (!actor) return 'You have a new notification';

        switch (notification.type) {
            case 'comment':
                return `on your post`;
            case 'reply':
                return `to your comment`;
            case 'vote':
                return `your ${notification.target_type}`;
            case 'follow':
                return `Started following you`;
            case 'vote_milestone':
                return `Your ${notification.target_type} reached ${notification.milestone_value} ${notification.reaction_type}s!`;
            case 'follow_milestone':
                return `You reached ${notification.milestone_value} followers!`;
            default:
                return 'You have a new notification';
        }
    };

    const renderNotificationContent = (notification) => {
        const isUnread = !notification.is_viewed;
        const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
        const actor = notification.actors?.[0];
        
        if (!actor) {
            console.warn('Notification missing actor data:', notification);
            return null;
        }

        const actorName = actor.display_name || actor.username || 'Unknown User';
        const actorAvatar = actor.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(actorName)}&background=random`;

        return (
            <Box
                key={notification.id}
                p={4}
                bg={isUnread ? 'blue.50' : 'transparent'}
                _hover={{ bg: hoverBg }}
                cursor="pointer"
                onClick={() => handleNotificationClick(notification)}
                transition="all 0.2s"
                borderRadius="md"
            >
                <HStack spacing={3} align="start">
                    <Avatar
                        name={actorName}
                        src={actorAvatar}
                        size="sm"
                        showBorder
                    />
                    <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="medium">
                            {getNotificationTitle(notification)}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            {getNotificationDescription(notification)}
                        </Text>
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

    return (
        <Popover
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
            placement="bottom-end"
            closeOnBlur={false}
        >
            <PopoverTrigger>
                <Tooltip label="Notifications">
                    <IconButton
                        icon={<Bell />}
                        aria-label="Notifications"
                        variant="ghost"
                        position="relative"
                        size="lg"
                        onClick={onOpen}
                    >
                        {unreadCount > 0 && (
                            <Box
                                position="absolute"
                                top={2}
                                right={2}
                                bg="red.500"
                                color="white"
                                borderRadius="full"
                                minW="20px"
                                h="20px"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                fontSize="xs"
                                fontWeight="bold"
                                zIndex={1}
                                boxShadow="0 0 0 2px white"
                            >
                                {unreadCount}
                            </Box>
                        )}
                    </IconButton>
                </Tooltip>
            </PopoverTrigger>
            <Portal>
                <PopoverContent
                    width={isMobile ? '100vw' : '400px'}
                    maxH="80vh"
                    overflowY="auto"
                >
                    <PopoverArrow />
                    <PopoverBody p={0}>
                        <VStack spacing={0} align="stretch">
                            <Box p={4} borderBottom="1px" borderColor={borderColor}>
                                <HStack justify="space-between">
                                    <Text fontWeight="bold" fontSize="lg">
                                        Notifications
                                    </Text>
                                    {unreadCount > 0 && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                const unreadIds = notifications
                                                    .filter(n => !n.is_viewed)
                                                    .map(n => n.id);
                                                if (unreadIds.length > 0) {
                                                    handleMarkAsViewed(unreadIds);
                                                }
                                            }}
                                        >
                                            Mark all as read
                                        </Button>
                                    )}
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