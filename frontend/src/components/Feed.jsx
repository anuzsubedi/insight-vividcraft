import { useState, useEffect, useCallback } from 'react';
import {
    VStack,
    Box,
    Text,
    Select,
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
    Flex,
    Divider,
    Icon
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { feedService } from '../services/feedService';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { BiUpvote, BiDownvote, BiComment } from 'react-icons/bi';
import { motion } from "framer-motion";

const MotionBox = motion(Box);
const MotionHStack = motion(HStack);

// Helper function to format date
const formatPostDate = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

function Feed() {
    const [feedType, setFeedType] = useState('following');
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const navigate = useNavigate();
    const toast = useToast();
    const { ref, inView } = useInView();

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
                case 'extended':
                    response = await feedService.getExtendedFeed(params);
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

    return (
        <VStack spacing={0} align="stretch" w="100%">
            <HStack 
                spacing={4} 
                p={4} 
                borderBottom="1px" 
                borderColor="gray.200"
                bg="white"
                position="sticky"
                top={0}
                zIndex={1}
            >
                <Select
                    value={feedType}
                    onChange={(e) => handleFeedTypeChange(e.target.value)}
                    maxW="200px"
                    rounded="full"
                    size="sm"
                    border="1px solid"
                    borderColor="gray.300"
                    _hover={{ borderColor: "blue.500" }}
                >
                    <option value="following">Following</option>
                    <option value="extended">Network</option>
                    <option value="explore">Explore</option>
                </Select>

                {feedType === 'explore' && (
                    <Menu closeOnSelect={false}>
                        <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            borderWidth="2px"
                            borderColor="black"
                            boxShadow="3px 3px 0 black"
                            _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                        >
                            Categories
                        </MenuButton>
                        <MenuList
                            borderWidth="2px"
                            borderColor="black"
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

            <VStack spacing={0} align="stretch" divider={<Divider />}>
                {posts.map((post, index) => (
                    <MotionBox
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        px={6}
                        py={4}
                        _hover={{ bg: 'gray.50' }}
                        cursor="pointer"
                        onClick={() => navigate(`/posts/${post.id}`)}
                    >
                        <HStack spacing={3} mb={2}>
                            <MotionBox
                                whileHover={{ scale: 1.1 }}
                                as="img"
                                src={`/avatars/${post.author.avatar_name}`}
                                w="40px"
                                h="40px"
                                rounded="full"
                                border="2px solid"
                                borderColor="gray.200"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/user/${post.author.username}`);
                                }}
                            />
                            <VStack align="start" spacing={0}>
                                <Text 
                                    fontSize="sm"
                                    fontWeight="medium"
                                    color="gray.700"
                                    _hover={{ color: "blue.500" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/user/${post.author.username}`);
                                    }}
                                >
                                    @{post.author.username}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                    {formatPostDate(post.published_at)}
                                </Text>
                            </VStack>
                        </HStack>

                        <Box pl={12}>
                            <Text
                                fontSize="lg"
                                fontWeight="semibold"
                                mb={2}
                                color="gray.800"
                            >
                                {post.title}
                            </Text>
                            <Text 
                                fontSize="sm"
                                color="gray.600"
                                mb={3}
                                noOfLines={2}
                            >
                                {post.body}
                            </Text>

                            <MotionHStack 
                                spacing={8} 
                                color="gray.400"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <HStack 
                                    spacing={1}
                                    _hover={{ color: "blue.500" }}
                                    transition="all 0.2s"
                                >
                                    <Icon as={BiUpvote} />
                                    <Text fontSize="sm">0</Text>
                                </HStack>
                                <HStack
                                    spacing={1}
                                    _hover={{ color: "red.500" }}
                                    transition="all 0.2s"
                                >
                                    <Icon as={BiDownvote} />
                                    <Text fontSize="sm">0</Text>
                                </HStack>
                                <HStack
                                    spacing={1}
                                    _hover={{ color: "purple.500" }}
                                    transition="all 0.2s"
                                >
                                    <Icon as={BiComment} />
                                    <Text fontSize="sm">0</Text>
                                </HStack>
                                
                                {post.category && (
                                    <Badge
                                        ml="auto"
                                        colorScheme="blue"
                                        variant="subtle"
                                        rounded="full"
                                        px={3}
                                        py={1}
                                        fontSize="xs"
                                    >
                                        {post.category.name}
                                    </Badge>
                                )}
                            </MotionHStack>
                        </Box>
                    </MotionBox>
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