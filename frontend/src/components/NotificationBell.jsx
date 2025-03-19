import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Button,
    useToast,
    Center,
    Spinner,
} from '@chakra-ui/react';
import { BiBell } from 'react-icons/bi';
import notificationService from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';

function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const toast = useToast();
    const navigate = useNavigate();
    const isFirstRender = useRef(true);

    // Fetch unread count on mount and every 30 seconds
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const count = await notificationService.getUnreadCount();
                setUnreadCount(count);
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);

        return () => clearInterval(interval);
    }, []);

    // Memoize loadNotifications to prevent infinite effect loop
    const loadNotifications = useCallback(async (isLoadMore = false) => {
        try {
            setIsLoading(true);
            const pageToLoad = isLoadMore ? page + 1 : 1;
            
            const { notifications: newNotifications, pagination } = 
                await notificationService.getNotifications(pageToLoad);
            
            setNotifications(prev => 
                isLoadMore ? [...prev, ...newNotifications] : newNotifications
            );
            setHasMore(pagination.hasMore);
            setPage(pageToLoad);

            if (!isLoadMore) {
                // Mark as viewed when opening for the first time
                await notificationService.markAsViewed();
                setUnreadCount(0);
            }
        } catch (error) {
            toast({
                title: 'Error loading notifications',
                description: error.message,
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    }, [page, toast]);

    // Fetch notifications when popover opens
    useEffect(() => {
        if (isOpen && isFirstRender.current) {
            loadNotifications();
            isFirstRender.current = false;
        }
    }, [isOpen, loadNotifications]);

    const handleNotificationClick = async (notification) => {
        try {
            // Mark as opened
            await notificationService.markAsOpened(notification.id);

            // Navigate based on notification type
            switch (notification.type) {
                case 'comment':
                    navigate(`/posts/${notification.post_id}#comment-${notification.comment_id}`);
                    break;
                case 'reply':
                    navigate(`/posts/${notification.post_id}#comment-${notification.comment_id}`);
                    break;
                case 'mention':
                    if (notification.comment_id) {
                        navigate(`/posts/${notification.post_id}#comment-${notification.comment_id}`);
                    } else {
                        navigate(`/posts/${notification.post_id}`);
                    }
                    break;
                case 'vote_milestone':
                    navigate(`/posts/${notification.post_id}`);
                    break;
                default:
                    navigate(`/posts/${notification.post_id}`);
            }

            setIsOpen(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 3000,
            });
        }
    };

    const getNotificationText = (notification) => {
        const actorName = notification.actor?.display_name || notification.actor?.username || 'Someone';
        
        switch (notification.type) {
            case 'comment':
                return `${actorName} commented on your post`;
            case 'reply':
                return `${actorName} replied to your comment`;
            case 'mention':
                return `${actorName} mentioned you in a ${notification.comment_id ? 'comment' : 'post'}`;
            case 'vote_milestone':
                return `Your ${notification.content_type} reached ${notification.milestone} upvotes!`;
            default:
                return 'New notification';
        }
    };

    return (
        <Popover
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onOpen={() => setIsOpen(true)}
            closeOnBlur={true}
            placement="bottom-end"
        >
            <PopoverTrigger>
                <Box position="relative">
                    <IconButton
                        aria-label="Notifications"
                        icon={<BiBell />}
                        variant="ghost"
                        fontSize="24px"
                    />
                    {unreadCount > 0 && (
                        <Badge
                            position="absolute"
                            top="-1"
                            right="-1"
                            colorScheme="red"
                            borderRadius="full"
                            fontSize="xs"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Box>
            </PopoverTrigger>

            <PopoverContent
                maxH="400px"
                overflowY="auto"
                w="350px"
                border="2px solid"
                borderColor="black"
                borderRadius="0"
                boxShadow="4px 4px 0 black"
            >
                <PopoverArrow />
                <PopoverBody p={0}>
                    <VStack spacing={0} align="stretch">
                        {notifications.map((notification) => (
                            <Box
                                key={notification.id}
                                p={3}
                                cursor="pointer"
                                borderBottom="1px solid"
                                borderColor="gray.200"
                                bg={notification.opened_at ? 'white' : 'blue.50'}
                                _hover={{ bg: 'gray.50' }}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <Text fontSize="sm" fontWeight="medium">
                                    {getNotificationText(notification)}
                                </Text>
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </Text>
                            </Box>
                        ))}

                        {notifications.length === 0 && !isLoading && (
                            <Center py={8}>
                                <Text color="gray.500">No notifications</Text>
                            </Center>
                        )}

                        {isLoading && (
                            <Center py={4}>
                                <Spinner size="sm" />
                            </Center>
                        )}

                        {hasMore && !isLoading && notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadNotifications(true)}
                                isLoading={isLoading}
                            >
                                Load More
                            </Button>
                        )}
                    </VStack>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
}

export default NotificationBell;