import { useState, useEffect, useCallback } from 'react';
import {
    VStack,
    Box,
    Text,
    Select as ChakraSelect,
    Spinner,
    Center,
    Badge,
    HStack,
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuItemOption,
    MenuOptionGroup,
    useToast,
    Avatar,
    IconButton,
    Portal,
} from '@chakra-ui/react';
import { BiUpvote, BiDownvote, BiComment, BiSolidUpvote, BiSolidDownvote } from 'react-icons/bi';
import { FiMoreHorizontal } from 'react-icons/fi';
import { feedService } from '../services/feedService';
import { postService } from '../services/postService';
import categoryService from '../services/categoryService';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import CreatePost from './CreatePost';
import useAuthState from '../hooks/useAuthState';
import ReportModal from './ReportModal';
import { searchService } from '../services/searchService';
import MentionPill from './MentionPill';

// Helper function to format date
const formatPostDate = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Helper function to get net score
const getNetScore = (upvotes, downvotes) => upvotes - downvotes;

function Feed() {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalPosts, setTotalPosts] = useState(0);
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [feedType, setFeedType] = useState('following');
    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '100px',
    });
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthState();
    const [sortType, setSortType] = useState('recent');
    const [sortPeriod, setSortPeriod] = useState('all');
    const [reportPostId, setReportPostId] = useState({ id: '', type: 'post' });
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [processedPosts, setProcessedPosts] = useState({});
    
    // Helper function to truncate text
    const truncateText = (text, maxLength = 300) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    // Load categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await categoryService.getCategories();
                setCategories(response.categories || []); // Handle nested categories object
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };
        loadCategories();
    }, []);

    // Process mentions in post content
    const processMentions = async (text) => {
        const segments = [];
        let lastIndex = 0;
        const mentionRegex = /@(\w+)/g;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            // Add text before the mention
            if (match.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: text.slice(lastIndex, match.index)
                });
            }

            // Process the mention
            const username = match[1];
            try {
                const response = await searchService.searchUsers(username);
                const userExists = response.users.some(user => user.username === username);
                
                segments.push({
                    type: 'mention',
                    content: username,
                    isValid: userExists
                });
            } catch (err) {
                console.error('Error checking user existence:', err);
                segments.push({
                    type: 'mention',
                    content: username,
                    isValid: false
                });
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex)
            });
        }

        return segments;
    };

    // Process all posts when they change
    useEffect(() => {
        const processAllPosts = async () => {
            const processed = {};
            
            for (const post of posts) {
                if (post.body) {
                    processed[post.id] = await processMentions(post.body);
                }
            }
            
            setProcessedPosts(processed);
        };

        if (posts.length > 0) {
            processAllPosts();
        }
    }, [posts]);

    // Load posts
    const loadPosts = useCallback(async (pageNum = 1) => {
        if (isLoading || (!hasMore && pageNum > 1)) return;
        
        setIsLoading(true);
        
        try {
            let response;
            const params = {
                page: pageNum,
                limit: 10,
                sort: sortType,
                period: sortType === 'top' ? sortPeriod : undefined,
                ...(selectedCategories.length ? { categories: selectedCategories.join(',') } : {})
            };

            switch (feedType) {
                case 'following':
                    response = await feedService.getFollowingFeed(params);
                    break;
                case 'network':
                    response = await feedService.getNetworkFeed(params);
                    break;
                case 'explore':
                    response = await feedService.getExploreFeed(params);
                    break;
                default:
                    throw new Error('Invalid feed type');
            }

            // Update total posts count
            setTotalPosts(response.pagination.total);
            
            // Update posts list
            if (pageNum === 1) {
                setPosts(response.posts);
            } else {
                setPosts(prevPosts => {
                    const existingIds = new Set(prevPosts.map(post => post.id));
                    const newPosts = response.posts.filter(post => !existingIds.has(post.id));
                    return [...prevPosts, ...newPosts];
                });
            }

            setHasMore(response.pagination.hasMore);
            setIsInitialLoad(false);
        } catch (error) {
            console.error('Feed error:', error);
            toast({
                title: 'Error loading feed',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true
            });
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedType, selectedCategories, sortType, sortPeriod, toast]);

    // Reset feed when type or sort changes
    useEffect(() => {
        setPosts([]);
        setPage(1);
        setHasMore(true);
        setTotalPosts(0);
        setIsInitialLoad(true);
        loadPosts(1);
    }, [feedType, selectedCategories, sortType, sortPeriod, loadPosts]);

    // Handle infinite scroll
    useEffect(() => {
        if (inView && !isLoading && hasMore && !isInitialLoad) {
            setPage(prev => prev + 1);
            loadPosts(page + 1);
        }
    }, [inView, isLoading, hasMore, isInitialLoad, page, loadPosts]);

    const handleReaction = async (e, postId, type) => {
        e.stopPropagation(); // Prevent post click event

        if (!user) {
            toast({
                title: 'Please login to react',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        const post = posts.find(p => p.id === postId);
        if (!post) return;

        // Store previous state for rollback
        const previousReactions = { ...post.reactions };
        const previousUserReaction = post.userReaction;

        // Optimistically update UI
        const updatedPost = { ...post };
        if (post.userReaction === type) {
            // Removing reaction
            updatedPost.reactions[`${type}s`] -= 1;
            updatedPost.userReaction = null;
        } else {
            // If there was a previous reaction, remove it
            if (post.userReaction) {
                updatedPost.reactions[`${post.userReaction}s`] -= 1;
            }
            // Add new reaction
            updatedPost.reactions[`${type}s`] += 1;
            updatedPost.userReaction = type;
        }

        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));

        try {
            const result = await postService.addReaction(postId, type);
            // Use the server response to update the state
            setPosts(prev => prev.map(p => p.id === postId ? {
                ...p,
                reactions: {
                    upvotes: result.upvotes || 0,
                    downvotes: result.downvotes || 0
                },
                userReaction: result.userReaction
            } : p));
        } catch (error) {
            // Revert on error
            setPosts(prev => prev.map(p => p.id === postId ? {
                ...p,
                reactions: previousReactions,
                userReaction: previousUserReaction
            } : p));
            toast({
                title: 'Error updating reaction',
                description: error.message,
                status: 'error',
                duration: 3000,
            });
        }
    };

    // Handle feed type change
    const handleFeedTypeChange = (value) => {
        setFeedType(value);
        setSelectedCategories([]);
    };

    // Handle category selection
    const handleCategoryChange = (values) => {
        setSelectedCategories(values);
    };

    // Handle post creation completion
    const handlePostCreated = () => {
        setPosts([]);
        setPage(1);
        setHasMore(true);
    };

    const handlePostClick = (postId) => {
        navigate(`/posts/${postId}`, { state: { from: location.pathname } });
    };

    const handleReport = (e, postId) => {
        e.stopPropagation();
        if (postId) {
            setReportPostId({ id: postId, type: 'post' });
            setIsReportModalOpen(true);
        }
    };

    const handleDelete = async (e, postId) => {
        e.stopPropagation();
        try {
            await postService.deletePost(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({
                title: "Post deleted",
                status: "success",
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: "Error deleting post",
                description: error.message,
                status: "error",
                duration: 3000,
            });
        }
    };

    return (
        <VStack spacing={6} align="stretch">
            {/* Create Post Form */}
            <CreatePost categories={categories} onPostCreated={handlePostCreated} />

            {/* Feed Controls */}
            <Box>
                <HStack spacing={4} wrap="wrap" mb={4}>
                    <ChakraSelect
                        value={feedType}
                        onChange={(e) => handleFeedTypeChange(e.target.value)}
                        w="200px"
                        border="2px solid black"
                        borderRadius="0"
                        _hover={{
                            boxShadow: "4px 4px 0 0 #000",
                        }}
                    >
                        <option value="following">Following</option>
                        <option value="network">Network</option>
                        <option value="explore">Explore</option>
                    </ChakraSelect>

                    <ChakraSelect
                        value={sortType}
                        onChange={(e) => setSortType(e.target.value)}
                        w="150px"
                        border="2px solid black"
                        borderRadius="0"
                        _hover={{
                            boxShadow: "4px 4px 0 0 #000",
                        }}
                    >
                        <option value="recent">Recent</option>
                        <option value="top">Top</option>
                    </ChakraSelect>

                    {sortType === 'top' && (
                        <ChakraSelect
                            value={sortPeriod}
                            onChange={(e) => setSortPeriod(e.target.value)}
                            w="150px"
                            border="2px solid black"
                            borderRadius="0"
                            _hover={{
                                boxShadow: "4px 4px 0 0 #000",
                            }}
                        >
                            <option value="day">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="year">This Year</option>
                            <option value="all">All Time</option>
                        </ChakraSelect>
                    )}

                    {feedType === 'explore' && (
                        <Menu closeOnSelect={false}>
                            <MenuButton
                                as={Button}
                                bg="white"
                                border="2px solid black"
                                borderRadius="0"
                                color="gray.800"
                                _hover={{
                                    boxShadow: "4px 4px 0 0 #000",
                                }}
                            >
                                Categories
                            </MenuButton>
                            <MenuList
                                border="2px solid black"
                                borderRadius="0"
                                boxShadow="4px 4px 0 black"
                            >
                                <MenuOptionGroup
                                    type="checkbox"
                                    value={selectedCategories}
                                    onChange={handleCategoryChange}
                                >
                                    {categories.map(category => (
                                        <MenuItemOption
                                            key={category.id}
                                            value={category.id}
                                            _hover={{ bg: "paper.100" }}
                                        >
                                            {category.name}
                                        </MenuItemOption>
                                    ))}
                                </MenuOptionGroup>
                            </MenuList>
                        </Menu>
                    )}
                </HStack>

                {/* Posts count */}
                <Text color="paper.600" fontSize="md" mb={4}>
                    {totalPosts === 0 ? 'No posts yet' : `${totalPosts} post${totalPosts === 1 ? '' : 's'}`}
                </Text>
            </Box>

            {/* Posts */}
            <VStack spacing={6} align="stretch">
                {/* Initial loading state */}
                {isLoading && posts.length === 0 && (
                    <Center py={8}>
                        <Spinner size="xl" color="accent.500" thickness="4px" />
                    </Center>
                )}

                {/* Posts list */}
                {posts.map((post) => (
                    <Box
                        key={post.id}
                        bg="white"
                        border="2px solid black"
                        boxShadow="6px 6px 0 black"
                        _hover={{
                            transform: "translate(-3px, -3px)",
                            boxShadow: "9px 9px 0 black",
                            cursor: "pointer"
                        }}
                        transition="all 0.2s"
                        position="relative"
                    >
                        <Box p={6} onClick={() => handlePostClick(post.id)} cursor="pointer">
                            <HStack spacing={4} mb={4}>
                                <Avatar
                                    size="md"
                                    name={post.author.username}
                                    src={`/avatars/${post.author.avatar_name}`}
                                    border="2px solid black"
                                />
                                <VStack align="start" spacing={0}>
                                    <Link 
                                        to={`/user/${post.author.username}`}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <Text 
                                            fontWeight="bold"
                                            _hover={{ color: "teal.500" }}
                                            transition="color 0.2s"
                                        >
                                            @{post.author.username}
                                        </Text>
                                    </Link>
                                    <Text fontSize="sm" color="gray.600">
                                        {formatPostDate(post.published_at)}
                                    </Text>
                                </VStack>
                                <HStack spacing={2} ml="auto">
                                    {post.type === 'article' && (
                                        <>
                                            {post.category && (
                                                <Badge
                                                    px={3}
                                                    py={1}
                                                    bg="teal.500"
                                                    color="white"
                                                    borderRadius="0"
                                                >
                                                    {post.category.name}
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                </HStack>
                            </HStack>

                            <Box pl={16} pr={6}>
                                {post.type === 'article' && post.title && (
                                    <Text 
                                        fontWeight="bold"
                                        fontSize="2xl"
                                        mb={3}
                                    >
                                        {post.title}
                                    </Text>
                                )}
                                <Text 
                                    fontSize="lg" 
                                    mb={4}
                                    color="gray.700"
                                    whiteSpace="pre-wrap"
                                >
                                    {processedPosts[post.id] 
                                        ? processedPosts[post.id].map((segment, index) => (
                                            segment.type === 'mention' ? (
                                                <MentionPill
                                                    key={index}
                                                    username={segment.content}
                                                    isValid={segment.isValid}
                                                />
                                            ) : (
                                                <Text as="span" key={index}>
                                                    {truncateText(segment.content)}
                                                </Text>
                                            )
                                        ))
                                        : truncateText(post.body)
                                    }
                                </Text>
                            </Box>
                        </Box>
                        
                        <HStack spacing={6} px={6} pb={4} onClick={e => e.stopPropagation()}>
                            <HStack spacing={2}>
                                <IconButton
                                    icon={post.userReaction === 'upvote' ? <BiSolidUpvote /> : <BiUpvote />}
                                    variant="ghost"
                                    size="sm"
                                    color={post.userReaction === 'upvote' ? "blue.500" : "gray.600"}
                                    aria-label="Upvote"
                                    onClick={(e) => handleReaction(e, post.id, 'upvote')}
                                />
                                <Text 
                                    color={getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) > 0 ? "blue.500" : 
                           getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0) < 0 ? "red.500" : "gray.600"}
                                    fontWeight="semibold"
                                >
                                    {getNetScore(post.reactions?.upvotes || 0, post.reactions?.downvotes || 0)}
                                </Text>
                                <IconButton
                                    icon={post.userReaction === 'downvote' ? <BiSolidDownvote /> : <BiDownvote />}
                                    variant="ghost"
                                    size="sm"
                                    color={post.userReaction === 'downvote' ? "red.500" : "gray.600"}
                                    aria-label="Downvote"
                                    onClick={(e) => handleReaction(e, post.id, 'downvote')}
                                />
                            </HStack>
                            <HStack spacing={2}>
                                <BiComment size={20} />
                                <Text>{post.comment_count || 0}</Text>
                            </HStack>
                            <Menu isLazy>
                                <MenuButton
                                    as={IconButton}
                                    icon={<FiMoreHorizontal />}
                                    variant="ghost"
                                    size="sm"
                                    aria-label="More options"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <Portal>
                                    <MenuList
                                        border="2px solid"
                                        borderColor="black"
                                        borderRadius="0"
                                        boxShadow="4px 4px 0 black"
                                        onClick={(e) => e.stopPropagation()}
                                        bg="white"
                                        zIndex={1400}
                                    >
                                        <MenuItem
                                            onClick={(e) => handleReport(e, post.id)}
                                        >
                                            Report Post
                                        </MenuItem>
                                        {user?.isAdmin && (
                                            <MenuItem
                                                color="red.500"
                                                onClick={(e) => handleDelete(e, post.id)}
                                            >
                                                Delete Post
                                            </MenuItem>
                                        )}
                                    </MenuList>
                                </Portal>
                            </Menu>
                        </HStack>
                    </Box>
                ))}

                {/* Loading more indicator */}
                {isLoading && posts.length > 0 && (
                    <Center py={4}>
                        <Spinner size="md" color="accent.500" thickness="3px" />
                    </Center>
                )}

                {/* No posts message */}
                {!isLoading && posts.length === 0 && (
                    <Box
                        p={6}
                        border="2px dashed"
                        borderColor="paper.300"
                        textAlign="center"
                    >
                        <Text color="paper.400" fontSize="lg">
                            No posts to show
                        </Text>
                    </Box>
                )}

                {/* Intersection observer target */}
                {hasMore && !isLoading && <Box ref={ref} h="20px" />}
            </VStack>

            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => {
                    setIsReportModalOpen(false);
                    setReportPostId({ id: '', type: 'post' });
                }}
                postId={reportPostId}
            />
        </VStack>
    );
}

export default Feed;