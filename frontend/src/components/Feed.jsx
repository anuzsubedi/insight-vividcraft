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
import { feedService } from '../services/feedService';
import { postService } from '../services/postService';
import categoryService from '../services/categoryService';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import CreatePost from './CreatePost';
import useAuthState from '../hooks/useAuthState';

// Helper function to format date
const formatPostDate = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Helper function to get net score
const getNetScore = (upvotes, downvotes) => upvotes - downvotes;

function Feed() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthState();
    const [feedType, setFeedType] = useState('following');
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const toast = useToast();
    const { ref, inView } = useInView();

    // Load categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await categoryService.getCategories();
                setCategories(response.categories || []);
            } catch (error) {
                toast({
                    title: 'Error loading categories',
                    description: error.message,
                    status: 'error',
                    duration: 3000,
                });
            }
        };
        fetchCategories();
    }, [toast]);

    // Load feed posts
    const loadPosts = useCallback(async () => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);
        try {
            let response;
            const params = { page, limit: 10 };
            switch (feedType) {
                case 'following':
                    response = await feedService.getFollowingFeed(params);
                    break;
                case 'network':
                    response = await feedService.getNetworkFeed(params);
                    break;
                case 'explore':
                    if (selectedCategories.length > 0) {
                        params.categories = selectedCategories.join(',');
                    }
                    response = await feedService.getExploreFeed(params);
                    if (response.categories) {
                        setCategories(response.categories);
                    }
                    break;
                default:
                    return;
            }
            if (!response || !response.posts) {
                throw new Error('Invalid response format');
            }

            // Load reactions for each post
            const postsWithReactions = await Promise.all(response.posts.map(async (post) => {
                try {
                    const reactions = await postService.getReactions(post.id);
                    return {
                        ...post,
                        reactions: reactions,
                        userReaction: reactions.userReaction
                    };
                } catch (error) {
                    console.error('Error loading reactions for post:', post.id, error);
                    return {
                        ...post,
                        reactions: { upvotes: 0, downvotes: 0 },
                        userReaction: null
                    };
                }
            }));

            setPosts(prev => page === 1 ? postsWithReactions : [...prev, ...postsWithReactions]);
            setHasMore(response.pagination.hasMore);
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
    }, [feedType, page, selectedCategories, isLoading, hasMore, toast]);

    // Reset feed when type changes
    useEffect(() => {
        setPosts([]);
        setPage(1);
        setHasMore(true);
    }, [feedType, selectedCategories]);

    // Load more posts when scrolling to bottom
    useEffect(() => {
        if (inView && !isLoading && hasMore) {
            setPage(prev => prev + 1);
        }
    }, [inView, isLoading, hasMore]);

    // Initial load and pagination
    useEffect(() => {
        loadPosts();
    }, [loadPosts, page]);

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
            setPosts(prev => prev.map(p => p.id === postId ? {
                ...p,
                reactions: result,
                userReaction: result.userReaction
            } : p));
        } catch (error) {
            // Revert on error
            console.error('Error handling reaction:', error);
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

    return (
        <VStack spacing={6} align="stretch">
            {/* Create Post Form */}
            <CreatePost categories={categories} onPostCreated={handlePostCreated} />

            {/* Feed Type Selector */}
            <HStack spacing={4}>
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
                {feedType === 'explore' && (
                    <Menu closeOnSelect={false}>
                        <MenuButton
                            as={Button}
                            bg="white"
                            border="2px solid black"
                            borderRadius="0"
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

            {/* Posts */}
            <VStack spacing={6} align="stretch">
                {posts.map((post) => (
                    <Box
                        key={post.id}
                        bg="white"
                        border="2px solid black"
                        boxShadow="6px 6px 0 black"
                        _hover={{
                            boxShadow: "8px 8px 0 black",
                        }}
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
                        </HStack>
                    </Box>
                ))}

                {isLoading && (
                    <Center py={4}>
                        <Spinner size="lg" />
                    </Center>
                )}

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

                {hasMore && !isLoading && <Box ref={ref} h="20px" />}
            </VStack>
        </VStack>
    );
}

export default Feed;