import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Box,
    Input,
    List,
    ListItem,
    Avatar,
    Text,
    Portal,
    VStack,
    HStack,
} from '@chakra-ui/react';
import { debounce } from 'lodash';
import { searchService } from '../services/searchService';

const MentionInput = ({ value, onChange, placeholder }) => {
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [mentionQuery, setMentionQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef(null);
    const suggestionRef = useRef(null);

    const getSuggestions = useCallback(
        debounce(async (query) => {
            if (query.length < 1) {
                setSuggestions([]);
                return;
            }
            try {
                const response = await searchService.getMentionSuggestions(query);
                setSuggestions(response.users);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
                setSuggestions([]);
            }
        }, 200),
        []
    );

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        const position = e.target.selectionStart;
        setCursorPosition(position);

        // Find if we're in a mention context
        const beforeCursor = newValue.slice(0, position);
        const mentionMatch = beforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setMentionQuery(mentionMatch[1]);
            setSuggestionsOpen(true);
            getSuggestions(mentionMatch[1]);
        } else {
            setSuggestionsOpen(false);
        }

        onChange(newValue);
    };

    const insertMention = (username) => {
        const beforeMention = value.slice(0, cursorPosition).replace(/@\w*$/, '');
        const afterMention = value.slice(cursorPosition);
        const newValue = `${beforeMention}@${username} ${afterMention}`;
        onChange(newValue);
        setSuggestionsOpen(false);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setSuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <Box position="relative">
            <Input
                ref={inputRef}
                value={value}
                onChange={handleInputChange}
                placeholder={placeholder}
                onKeyDown={e => {
                    if (e.key === 'Escape') setSuggestionsOpen(false);
                }}
            />
            
            {suggestionsOpen && suggestions.length > 0 && (
                <Portal>
                    <Box
                        ref={suggestionRef}
                        position="absolute"
                        top={inputRef.current?.getBoundingClientRect().bottom + window.scrollY + 4}
                        left={inputRef.current?.getBoundingClientRect().left + window.scrollX}
                        zIndex={1400}
                        bg="white"
                        boxShadow="lg"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                        width="300px"
                        maxH="300px"
                        overflowY="auto"
                    >
                        <List>
                            {suggestions.map((user) => (
                                <ListItem
                                    key={user.username}
                                    onClick={() => insertMention(user.username)}
                                    _hover={{ bg: 'gray.50' }}
                                    cursor="pointer"
                                    p={2}
                                >
                                    <HStack>
                                        <Avatar
                                            size="sm"
                                            name={user.displayName}
                                            src={user.avatarName ? `/avatars/${user.avatarName}` : undefined}
                                        />
                                        <VStack align="start" spacing={0}>
                                            <Text fontWeight="medium">{user.displayName}</Text>
                                            <Text fontSize="sm" color="gray.500">@{user.username}</Text>
                                        </VStack>
                                    </HStack>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Portal>
            )}
        </Box>
    );
};

export default MentionInput;
