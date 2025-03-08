import { useState, useRef, useEffect } from 'react';
import {
    InputGroup,
    Input,
    InputRightElement,
    Icon,
    Box,
    VStack,
    Text,
    Avatar,
    HStack,
    useToast,
    Spinner,
    Divider,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { searchBarService } from '../services/searchBarService';
import { useAuth } from '../context/AuthContext';
import debounce from 'lodash/debounce';

function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const { token } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const searchRef = useRef();

    const debouncedSearch = useRef(
        debounce(async (searchQuery) => {
            if (!searchQuery.trim() || !token) {
                setResults(null);
                return;
            }

            setIsLoading(true);
            try {
                const searchResults = await searchBarService.searchContent(searchQuery, token);
                console.log('Search results:', searchResults); // Debug log
                setResults(searchResults);
            } catch (error) {
                console.error('Search error:', error);
                toast({
                    title: 'Search failed',
                    description: error.message,
                    status: 'error',
                    duration: 3000,
                });
                setResults(null);
            } finally {
                setIsLoading(false);
            }
        }, 300)
    ).current;

    useEffect(() => {
        debouncedSearch(query);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (type, item) => {
        switch (type) {
            case 'user':
                navigate(`/user/${item.username}`);
                break;
            case 'post':
            case 'article':
                navigate(`/posts/${item.id}`);
                break;
        }
        setQuery('');
        setShowResults(false);
    };

    return (
        <Box position="relative" width="100%" maxW="600px" ref={searchRef}>
            <InputGroup>
                <Input
                    placeholder="Search posts, articles or @users..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowResults(true);
                    }}
                    border="2px solid black"
                    borderRadius="0"
                    _hover={{
                        boxShadow: "4px 4px 0 black"
                    }}
                    _focus={{
                        boxShadow: "4px 4px 0 black",
                        borderColor: "black"
                    }}
                />
                <InputRightElement>
                    {isLoading ? <Spinner size="sm" /> : <Icon as={SearchIcon} />}
                </InputRightElement>
            </InputGroup>

            {showResults && query.trim() !== '' && (
                <Box
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    bg="white"
                    border="2px solid black"
                    boxShadow="6px 6px 0 black"
                    zIndex={1000}
                    maxH="400px"
                    overflowY="auto"
                    mt={2}
                >
                    <VStack align="stretch" spacing={0}>
                        {/* Users Section */}
                        {results?.users?.length > 0 && (
                            <>
                                <Box p={2} bg="gray.50">
                                    <Text fontWeight="bold" fontSize="sm">Users</Text>
                                </Box>
                                {results.users.map(user => (
                                    <Box
                                        key={user.username}
                                        p={3}
                                        _hover={{ bg: 'gray.50' }}
                                        cursor="pointer"
                                        onClick={() => handleItemClick('user', user)}
                                    >
                                        <HStack>
                                            <Avatar
                                                size="sm"
                                                name={user.display_name}
                                                src={user.avatar_name ? `/avatars/${user.avatar_name}` : undefined}
                                            />
                                            <VStack align="start" spacing={0}>
                                                <Text fontWeight="bold">{user.display_name}</Text>
                                                <Text fontSize="sm" color="gray.500">@{user.username}</Text>
                                            </VStack>
                                        </HStack>
                                    </Box>
                                ))}
                                {(results?.posts?.length > 0 || results?.articles?.length > 0) && <Divider />}
                            </>
                        )}

                        {/* Posts Section */}
                        {results?.posts?.length > 0 && (
                            <>
                                <Box p={2} bg="gray.50">
                                    <Text fontWeight="bold" fontSize="sm">Posts</Text>
                                </Box>
                                {results.posts.map(post => (
                                    <Box
                                        key={post.id}
                                        p={3}
                                        _hover={{ bg: 'gray.50' }}
                                        cursor="pointer"
                                        onClick={() => handleItemClick('post', post)}
                                    >
                                        <Text fontSize="sm" color="gray.500">@{post.author.username}</Text>
                                        <Text noOfLines={2}>{post.body}</Text>
                                    </Box>
                                ))}
                                {results?.articles?.length > 0 && <Divider />}
                            </>
                        )}

                        {/* Articles Section */}
                        {results?.articles?.length > 0 && (
                            <>
                                <Box p={2} bg="gray.50">
                                    <Text fontWeight="bold" fontSize="sm">Articles</Text>
                                </Box>
                                {results.articles.map(article => (
                                    <Box
                                        key={article.id}
                                        p={3}
                                        _hover={{ bg: 'gray.50' }}
                                        cursor="pointer"
                                        onClick={() => handleItemClick('article', article)}
                                    >
                                        <Text fontSize="sm" color="gray.500">@{article.author.username}</Text>
                                        <Text fontWeight="bold">{article.title}</Text>
                                    </Box>
                                ))}
                            </>
                        )}

                        {/* No Results Message */}
                        {!isLoading && (!results || (
                            !results.users?.length &&
                            !results.posts?.length &&
                            !results.articles?.length
                        )) && (
                            <Box p={4} textAlign="center">
                                <Text color="gray.500">No results found</Text>
                            </Box>
                        )}
                    </VStack>
                </Box>
            )}
        </Box>
    );
}

export default SearchBar;