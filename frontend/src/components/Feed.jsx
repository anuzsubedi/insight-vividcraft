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
    useToast
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { feedService } from '../services/feedService';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';

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
        <VStack spacing={6} align="stretch" w="100%">
            <HStack spacing={4} justify="space-between">
                <Select
                    value={feedType}
                    onChange={(e) => handleFeedTypeChange(e.target.value)}
                    maxW="200px"
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="3px 3px 0 black"
                    _hover={{ transform: "translate(-2px, -2px)", boxShadow: "5px 5px 0 black" }}
                    _focus={{ borderColor: "accent.100" }}
                >
                    <option value="following">Following</option>
                    <option value="extended">Extended Network</option>
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

            {/* Posts */}
            <VStack spacing={4} align="stretch">
                {posts.map((post) => (
                    <Box
                        key={post.id}
                        p={6}
                        border="2px solid"
                        borderColor="black"
                        bg="white"
                        transform="rotate(0.5deg)"
                        boxShadow="5px 5px 0 black"
                        _hover={{
                            transform: "rotate(0.5deg) translate(-3px, -3px)",
                            boxShadow: "8px 8px 0 black",
                            cursor: "pointer"
                        }}
                        transition="all 0.2s"
                        onClick={() => navigate(`/posts/${post.id}`)}
                    >
                        <VStack align="start" spacing={3}>
                            <Text
                                fontSize="2xl"
                                fontWeight="bold"
                                color="paper.500"
                            >
                                {post.title}
                            </Text>
                            <HStack wrap="wrap" spacing={2}>
                                <Badge
                                    px={2}
                                    py={1}
                                    bg="paper.100"
                                    color="paper.800"
                                    fontWeight="bold"
                                    textTransform="uppercase"
                                    border="1px solid"
                                    borderColor="paper.300"
                                >
                                    {post.type}
                                </Badge>
                                {post.category && (
                                    <Badge
                                        px={2}
                                        py={1}
                                        bg="green.100"
                                        color="green.800"
                                        fontWeight="bold"
                                        textTransform="uppercase"
                                        border="1px solid"
                                        borderColor="green.300"
                                    >
                                        {post.category.name}
                                    </Badge>
                                )}
                            </HStack>
                            <Text noOfLines={3} color="paper.600">
                                {post.body}
                            </Text>
                            <Text fontSize="sm" color="paper.400">
                                By {post.author.display_name} • {new Date(post.published_at).toLocaleDateString()}
                            </Text>
                        </VStack>
                    </Box>
                ))}

                {/* Loading states */}
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

                {/* Intersection observer target */}
                {hasMore && !isLoading && <Box ref={ref} h="20px" />}
            </VStack>
        </VStack>
    );
}

export default Feed;