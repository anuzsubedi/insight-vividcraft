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
    Icon
} from '@chakra-ui/react';

import { feedService } from '../services/feedService';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';

import { BiUpvote, BiDownvote, BiComment } from 'react-icons/bi';
import { motion } from "framer-motion";

const MotionBox = motion(Box);


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
                case 'network': // Changed from 'extended'
                    response = await feedService.getNetworkFeed(params); // Changed function name
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
        <VStack spacing={6} align="stretch">
            {/* Feed Type Selector */}
            <HStack 
                spacing={4} 
                p={6}
                bg="white"
                border="2px solid black"
                transform="rotate(1deg)"
                boxShadow="6px 6px 0 black"
            >
                <ChakraSelect
                    value={feedType}
                    onChange={(e) => handleFeedTypeChange(e.target.value)}
                    w="200px"
                    border="2px solid black"
                    borderRadius="0"
                    _hover={{
                        transform: "translate(-2px, -2px)",
                        boxShadow: "4px 4px 0 0 #000",
                    }}
                >
                    <option value="following">Following</option>
                    <option value="network">Network</option> {/* Changed from "extended" */}
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
                                transform: "translate(-2px, -2px)",
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
                {posts.map((post, index) => (
                    <MotionBox
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        bg="white"
                        border="2px solid black"
                        transform={index % 2 === 0 ? "rotate(1deg)" : "rotate(-1deg)"}
                        boxShadow="6px 6px 0 black"
                        _hover={{
                            transform: "translate(-2px, -2px)",
                            boxShadow: "8px 8px 0 black",
                        }}
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
                                {post.category && (
                                    <Badge
                                        ml="auto"
                                        px={3}
                                        py={1}
                                        bg="black"
                                        color="white"
                                        borderRadius="0"
                                        transform="rotate(-2deg)"
                                    >
                                        {post.category.name}
                                    </Badge>
                                )}
                            </HStack>

                            <Box pl={12}>
                                <Text fontSize="xl" fontWeight="bold" mb={2}>
                                    {post.title}
                                </Text>
                                <Text color="gray.600" mb={4}>
                                    {post.body}
                                </Text>

                                <HStack spacing={6} color="gray.600">
                                    <HStack spacing={2}>
                                        <Icon as={BiUpvote} boxSize={5} />
                                        <Text>0</Text>
                                    </HStack>
                                    <HStack spacing={2}>
                                        <Icon as={BiDownvote} boxSize={5} />
                                        <Text>0</Text>
                                    </HStack>
                                    <HStack spacing={2}>
                                        <Icon as={BiComment} boxSize={5} />
                                        <Text>0</Text>
                                    </HStack>
                                </HStack>
                            </Box>
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