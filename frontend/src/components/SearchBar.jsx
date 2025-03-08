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

    // Debounced search function
    const debouncedSearch = useRef(
        debounce(async (searchQuery) => {
            if (!searchQuery.trim()) {
                setResults(null);
                return;
            }

            setIsLoading(true);
            try {
                const searchResults = await searchBarService.searchContent(searchQuery, token);
                setResults(searchResults);
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
        }, 300)
    ).current;

    useEffect(() => {
        debouncedSearch(query);
    }, [query, debouncedSearch]);

    // Handle clicks outside of search results
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

            {showResults && results && (
                <Box
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    bg="white"
                    border="2px solid black"
                    boxShadow="6px 6px 0 black"
                    zIndex="dropdown"
                    maxH="400px"
                    overflowY="auto"
                    mt={2}
                >
                    <VStack align="stretch" spacing={0}>
                        {results.type === 'users' ? (
                            results.results.map(user => (
                                <Box
                                    key={user.username}
                                    p={3}
                                    _hover={{ bg: 'gray.50' }}
                                    cursor="pointer"
                                    onClick={() => {
                                        navigate(`/user/${user.username}`);
                                        setShowResults(false);
                                        setQuery('');
                                    }}
                                    borderBottom="1px solid"
                                    borderColor="gray.200"
                                >
                                    <HStack>
                                        <Avatar size="sm" name={user.displayName} src={user.avatarUrl} />
                                        <VStack align="start" spacing={0}>
                                            <Text fontWeight="bold">{user.displayName}</Text>
                                            <Text fontSize="sm" color="gray.500">@{user.username}</Text>
                                        </VStack>
                                    </HStack>
                                </Box>
                            ))
                        ) : (
                            <>
                                {results.results.posts.map(post => (
                                    <Box
                                        key={post.id}
                                        p={3}
                                        _hover={{ bg: 'gray.50' }}
                                        cursor="pointer"
                                        onClick={() => {
                                            navigate(`/posts/${post.id}`);
                                            setShowResults(false);
                                            setQuery('');
                                        }}
                                        borderBottom="1px solid"
                                        borderColor="gray.200"
                                    >
                                        <Text fontSize="sm" color="gray.500">Post</Text>
                                        <Text noOfLines={2}>{post.body}</Text>
                                    </Box>
                                ))}
                                {results.results.articles.map(article => (
                                    <Box
                                        key={article.id}
                                        p={3}
                                        _hover={{ bg: 'gray.50' }}
                                        cursor="pointer"
                                        onClick={() => {
                                            navigate(`/posts/${article.id}`);
                                            setShowResults(false);
                                            setQuery('');
                                        }}
                                        borderBottom="1px solid"
                                        borderColor="gray.200"
                                    >
                                        <Text fontSize="sm" color="gray.500">Article</Text>
                                        <Text fontWeight="bold">{article.title}</Text>
                                    </Box>
                                ))}
                            </>
                        )}
                    </VStack>
                </Box>
            )}
        </Box>
    );
}

export default SearchBar;