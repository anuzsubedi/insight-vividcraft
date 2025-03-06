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
    Icon,
} from '@chakra-ui/react';
import { BiUpvote, BiDownvote, BiComment } from 'react-icons/bi';
import { feedService } from '../services/feedService';
import categoryService from '../services/categoryService';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import CreatePost from './CreatePost';
import {getReactions, addReaction, removeReaction} from '../services/reactionService';
import {userAuth} from '../hooks/userAuth';

const [reactions, setReactions] = useState();
const {token} = userAuth();

// Helper function to format date
const formatPostDate = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

function Feed() {
    const navigate = useNavigate();
    const location = useLocation();
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

            //Fetch reactions for each post
            const reactionsDAta = {};
            await Promise.all(response.posts.map(async (post) => {
                const reactionCounts = await getReactions(post.id);
                reactionsData[post.id] = reactionCounts;
            }));
            
            setReactions((prev) => ({...prev, ...reactionsData}));
            setPosts(prev => page === 1 ? response.posts : [...prev, ...response.posts]);
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

    //Function to Handle Voting Actions
    const handleReaction = async (postId, type) => {
        if (!token) {
            toast({ 
                title: 'Please log in to react',
                description: 'You need to be logged in to react to posts',
                status: 'error',
                duration: 5000,
                isClosable: true
            });
            return;
        }

        try {
            if (reactions[postId]?.userReaction === type) {
                await removeReaction(postId, token);
                setReactions((prev) => ({
                    ...prev,
                    [postId]: {
                        upvote: type === 'upvote' ? prev[postId].upvote - 1 : prev[postId].upvote,
                        downvote: type === 'downvote' ? prev[postId].downvote - 1 : prev[postId].downvote,
                        userReaction: null
                    }
                }));
            } else {
                //Add new reaction
                await addReaction(postId, type, token);
                setReactions((prev) => ({
                    ...prev,
                    [postId]: {
                        upvote: type === 'upvote' ? prev[postId].upvote + 1 : prev[postId].upvote,
                        downvote: type === 'downvote' ? prev[postId].downvote + 1 : prev[postId].downvote,
                        userReaction: type
                    }
                }));  
            }
        }catch (error) {
            console.error('Reaction error:', error);
            toast({
                title: 'Error adding reaction',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true
            });
        }
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
                            cursor: "pointer"
                        }}
                        onClick={() => handlePostClick(post.id)}
                        position="relative"
                    >
                        <Box p={6}>
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

                            <Box pl={16} pr={6}> {/* Increased left padding from 14 to 16 */}
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

                                <HStack spacing={6} color="gray.600">
                                    <HStack spacing={2} onClick={() => handleReaction(post.id, 'upvote')}>
                                        <Icon as={BiUpvote} boxSize={5} color={reactions[post.id]?.userReaction === "upvote" ? "green.500" : "gray.600"} cursor={pointer} />
                                        <Text>{reactions[post.id]?.upvote || 0}</Text>
                                    </HStack>
                                    <HStack spacing={2} onClick={() => handleReaction(post.id, 'downvote')}>
                                        <Icon as={BiDownvote} boxSize={5} color={reactions[post.id]?.userReaction === "downvote" ? "red.500" : "gray.600"} cursor={pointer} />
                                        <Text>{reactions[post.id]?.downvote || 0}</Text>
                                    </HStack>
                                    <HStack spacing={2}>
                                        <Icon as={BiComment} boxSize={5} />
                                        <Text>0</Text>
                                    </HStack>
                                </HStack>
                            </Box>
                        </Box>
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