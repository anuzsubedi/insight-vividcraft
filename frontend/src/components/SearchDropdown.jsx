import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Input,
    VStack,
    Text,
    Avatar,
    HStack,
    Button,
    Spinner,
    InputGroup,
    InputLeftElement,
    Portal,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { Link, useNavigate } from 'react-router-dom';
import { searchService } from '../services/searchService';
import { formatDistanceToNow } from 'date-fns';

function SearchDropdown() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState({ users: [], posts: [] });
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchTimeout = setTimeout(async () => {
            if (query.trim()) {
                setIsLoading(true);
                try {
                    const [usersResponse, postsResponse] = await Promise.all([
                        searchService.searchUsers(query, 3),
                        searchService.searchPosts(query, 'all', 3)
                    ]);
                    setResults({
                        users: usersResponse.users,
                        posts: postsResponse.posts
                    });
                    setIsOpen(true);
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query]);

    const handleViewAll = () => {
        navigate(`/search?q=${encodeURIComponent(query)}`);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <Box position="relative" width="300px">
            <InputGroup>
                <InputLeftElement pointerEvents="none">
                    {isLoading ? <Spinner size="sm" /> : <SearchIcon color="gray.500" />}
                </InputLeftElement>
                <Input
                    ref={inputRef}
                    placeholder="Search users, posts, articles..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    borderWidth="2px"
                    borderColor="black"
                    _hover={{ borderColor: "accent.100" }}
                    _focus={{ borderColor: "accent.100", boxShadow: "4px 4px 0 black" }}
                />
            </InputGroup>

            {isOpen && (results.users.length > 0 || results.posts.length > 0) && (
                <Portal>
                    <Box
                        ref={dropdownRef}
                        position="absolute"
                        top="calc(100% + 4px)"
                        left="0"
                        width="400px"
                        bg="white"
                        boxShadow="6px 6px 0 black"
                        border="2px solid black"
                        zIndex={1400}
                        p={4}
                    >
                        <VStack align="stretch" spacing={4}>
                            {results.users.length > 0 && (
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Users</Text>
                                    <VStack align="stretch">
                                        {results.users.map(user => (
                                            <HStack
                                                key={user.username}
                                                as={Link}
                                                to={`/user/${user.username}`}
                                                p={2}
                                                _hover={{ bg: "paper.100" }}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setQuery('');
                                                }}
                                            >
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
                                        ))}
                                    </VStack>
                                </Box>
                            )}

                            {results.posts.length > 0 && (
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Posts & Articles</Text>
                                    <VStack align="stretch">
                                        {results.posts.map(post => (
                                            <Box
                                                key={post.id}
                                                as={Link}
                                                to={`/posts/${post.id}`}
                                                p={2}
                                                _hover={{ bg: "paper.100" }}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setQuery('');
                                                }}
                                            >
                                                <Text fontWeight="bold" noOfLines={1}>{post.title}</Text>
                                                <HStack fontSize="sm" color="gray.500" spacing={2}>
                                                    <Text>by @{post.author.username}</Text>
                                                    <Text>•</Text>
                                                    <Text>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</Text>
                                                </HStack>
                                            </Box>
                                        ))}
                                    </VStack>
                                </Box>
                            )}

                            <Button
                                onClick={handleViewAll}
                                variant="outline"
                                size="sm"
                                borderWidth="2px"
                                borderColor="black"
                                _hover={{
                                    transform: "translate(-2px, -2px)",
                                    boxShadow: "4px 4px 0 black"
                                }}
                            >
                                View all results
                            </Button>
                        </VStack>
                    </Box>
                </Portal>
            )}
        </Box>
    );
}

export default SearchDropdown;