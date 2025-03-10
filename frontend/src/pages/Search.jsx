import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Input,
    VStack,
    Text,
    Avatar,
    HStack,
    Spinner,
    InputGroup,
    InputLeftElement,
    useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { searchService } from '../services/searchService';
import { formatDistanceToNow } from 'date-fns';

function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [results, setResults] = useState({
        users: [],
        posts: [],
        articles: []
    });
    const toast = useToast();

    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) return;

            setIsLoading(true);
            try {
                const [usersResponse, postsResponse, articlesResponse] = await Promise.all([
                    searchService.searchUsers(query, 20),
                    searchService.searchPosts(query, 'post', 20),
                    searchService.searchPosts(query, 'article', 20)
                ]);

                setResults({
                    users: usersResponse.users,
                    posts: postsResponse.posts,
                    articles: articlesResponse.posts
                });
            } catch (error) {
                toast({
                    title: 'Search failed',
                    description: error.message,
                    status: 'error',
                    duration: 3000,
                });
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [query, toast]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchParams({ q: query });
    };

    return (
        <Box minH="100vh" bg="paper.50" py={8}>
            <Container maxW="container.lg">
                <VStack spacing={8} align="stretch">
                    <Box as="form" onSubmit={handleSearch}>
                        <InputGroup size="lg">
                            <InputLeftElement pointerEvents="none">
                                {isLoading ? <Spinner size="sm" /> : <SearchIcon color="gray.500" />}
                            </InputLeftElement>
                            <Input
                                placeholder="Search users, posts, articles..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                size="lg"
                                borderWidth="2px"
                                borderColor="black"
                                _hover={{ borderColor: "accent.100" }}
                                _focus={{ borderColor: "accent.100", boxShadow: "4px 4px 0 black" }}
                            />
                        </InputGroup>
                    </Box>

                    <Box
                        bg="white"
                        p={6}
                        border="2px solid"
                        borderColor="black"
                        boxShadow="6px 6px 0 black"
                    >
                        <Tabs 
                            index={activeTab} 
                            onChange={setActiveTab}
                            variant="enclosed"
                        >
                            <TabList mb={4}>
                                <Tab>Users ({results.users.length})</Tab>
                                <Tab>Posts ({results.posts.length})</Tab>
                                <Tab>Articles ({results.articles.length})</Tab>
                            </TabList>

                            <TabPanels>
                                <TabPanel>
                                    <VStack align="stretch" spacing={4}>
                                        {results.users.map(user => (
                                            <HStack
                                                key={user.username}
                                                as={Link}
                                                to={`/user/${user.username}`}
                                                p={4}
                                                border="1px solid"
                                                borderColor="paper.200"
                                                _hover={{ 
                                                    bg: "paper.50",
                                                    transform: "translate(-2px, -2px)",
                                                    boxShadow: "4px 4px 0 black"
                                                }}
                                                transition="all 0.2s"
                                            >
                                                <Avatar
                                                    size="md"
                                                    name={user.display_name}
                                                    src={user.avatar_name ? `/avatars/${user.avatar_name}` : undefined}
                                                />
                                                <VStack align="start" spacing={0}>
                                                    <Text fontWeight="bold">{user.display_name}</Text>
                                                    <Text color="gray.500">@{user.username}</Text>
                                                </VStack>
                                            </HStack>
                                        ))}
                                        {results.users.length === 0 && !isLoading && (
                                            <Text color="gray.500" textAlign="center">No users found</Text>
                                        )}
                                    </VStack>
                                </TabPanel>

                                <TabPanel>
                                    <VStack align="stretch" spacing={4}>
                                        {results.posts.map(post => (
                                            <Box
                                                key={post.id}
                                                as={Link}
                                                to={`/posts/${post.id}`}
                                                p={4}
                                                border="1px solid"
                                                borderColor="paper.200"
                                                _hover={{ 
                                                    bg: "paper.50",
                                                    transform: "translate(-2px, -2px)",
                                                    boxShadow: "4px 4px 0 black"
                                                }}
                                                transition="all 0.2s"
                                            >
                                                <Text fontWeight="bold" fontSize="lg" mb={2}>{post.title || 'Untitled Post'}</Text>
                                                <Text noOfLines={2} color="gray.600" mb={2}>{post.body}</Text>
                                                <HStack fontSize="sm" color="gray.500" spacing={2}>
                                                    <Text>by @{post.author.username}</Text>
                                                    <Text>•</Text>
                                                    <Text>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</Text>
                                                </HStack>
                                            </Box>
                                        ))}
                                        {results.posts.length === 0 && !isLoading && (
                                            <Text color="gray.500" textAlign="center">No posts found</Text>
                                        )}
                                    </VStack>
                                </TabPanel>

                                <TabPanel>
                                    <VStack align="stretch" spacing={4}>
                                        {results.articles.map(article => (
                                            <Box
                                                key={article.id}
                                                as={Link}
                                                to={`/posts/${article.id}`}
                                                p={4}
                                                border="1px solid"
                                                borderColor="paper.200"
                                                _hover={{ 
                                                    bg: "paper.50",
                                                    transform: "translate(-2px, -2px)",
                                                    boxShadow: "4px 4px 0 black"
                                                }}
                                                transition="all 0.2s"
                                            >
                                                <Text fontWeight="bold" fontSize="lg" mb={2}>{article.title}</Text>
                                                <Text noOfLines={2} color="gray.600" mb={2}>{article.body}</Text>
                                                <HStack fontSize="sm" color="gray.500" spacing={2}>
                                                    <Text>by @{article.author.username}</Text>
                                                    <Text>•</Text>
                                                    <Text>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</Text>
                                                    {article.category && (
                                                        <>
                                                            <Text>•</Text>
                                                            <Text>{article.category.name}</Text>
                                                        </>
                                                    )}
                                                </HStack>
                                            </Box>
                                        ))}
                                        {results.articles.length === 0 && !isLoading && (
                                            <Text color="gray.500" textAlign="center">No articles found</Text>
                                        )}
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </Box>
                </VStack>
            </Container>
        </Box>
    );
}

export default Search;