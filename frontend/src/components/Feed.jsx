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
    MenuItemOption,
    MenuOptionGroup,
    useToast,
    Avatar,
    IconButton,
} from '@chakra-ui/react';
import { BiUpvote, BiDownvote, BiComment, BiSolidUpvote, BiSolidDownvote } from 'react-icons/bi';
import { FaBan } from 'react-icons/fa'; // Add this import
import { feedService } from '../services/feedService';
import { postService } from '../services/postService';
import categoryService from '../services/categoryService';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import CreatePost from './CreatePost';
import useAuthState from '../hooks/useAuthState';
import ReportModal from './ReportModal';

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
                                    <Text fontWeight="bold">@{post.author.username}</Text>
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
                                    {post.body}
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
                            <HStack spacing={2}>
                                <IconButton
                                    icon={<FaBan />}
                                    variant="ghost"
                                    size="sm"
                                    color="gray.500"
                                    aria-label="Forbid"
                                    onClick={(e) => handleReport(e, post.id)}
                                    _hover={{ color: "red.500", bg: "red.50" }}
                                />
                            </HStack>
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