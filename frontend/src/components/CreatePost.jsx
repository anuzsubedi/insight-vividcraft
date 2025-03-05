import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from "framer-motion";
import {
    Box,
    VStack,
    HStack,
    Text,
    Switch,
    Textarea,
    Button,
    Select as ChakraSelect,
    IconButton,
    useToast,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Input,
    Tag,
    TagLabel,
    TagCloseButton,
    FormControl,
} from '@chakra-ui/react';
import { FiClock, FiChevronDown } from 'react-icons/fi';
import { postService } from '../services/postService';
import categoryService from '../services/categoryService';

const MotionBox = motion(Box);

function CreatePost({ onPostCreated }) {
    const [isArticle, setIsArticle] = useState(false);
    const [categories, setCategories] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const toast = useToast();

    const [newPost, setNewPost] = useState({
        title: '',
        body: '',
        type: 'post',  // Set default type to 'post'
        categoryId: '',
        tags: [],
        status: 'published',
        scheduledFor: '',
        scheduledDate: '',
        scheduledTime: '00:00',
    });

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

    const handlePostSubmit = async (status = 'published') => {
        if (!newPost.body.trim()) {
            toast({
                title: 'Error',
                description: 'Content is required',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        // Only validate category and title for articles
        if (isArticle) {
            if (!newPost.categoryId) {
                toast({
                    title: 'Error',
                    description: 'Category is required for articles',
                    status: 'error',
                    duration: 3000,
                });
                return;
            }

            if (!newPost.title.trim()) {
                toast({
                    title: 'Error',
                    description: 'Title is required for articles',
                    status: 'error',
                    duration: 3000,
                });
                return;
            }
        }

        setIsCreatingPost(true);
        try {
            const postData = {
                ...newPost,
                type: isArticle ? 'article' : 'post',
                status,
                // Only include title and category for articles
                title: isArticle ? newPost.title.trim() : '',
                categoryId: isArticle ? newPost.categoryId : null,
                // Only include tags for articles
                tags: isArticle ? newPost.tags : []
            };

            console.log('Attempting to create post with data:', postData);

            if (status === 'scheduled') {
                const scheduledDateTime = new Date(
                    `${newPost.scheduledDate}T${newPost.scheduledTime}`
                ).toISOString();
                postData.scheduledFor = scheduledDateTime;
            }

            const response = await postService.createPost(postData);
            console.log('Post creation response:', response);

            // Reset form
            setNewPost({
                title: '',
                body: '',
                type: 'post',
                categoryId: '',
                tags: [],
                status: 'published',
                scheduledFor: '',
                scheduledDate: '',
                scheduledTime: '00:00',
            });
            setTagInput('');
            setIsArticle(false);
            setIsScheduling(false);
            
            if (onPostCreated) {
                onPostCreated();
            }
            
            toast({
                title: 'Success',
                description: status === 'draft' 
                    ? 'Post saved as draft' 
                    : status === 'scheduled' 
                        ? 'Post scheduled successfully'
                        : 'Post created successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            console.error('Error creating post:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to create post';
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsCreatingPost(false);
        }
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (!newPost.tags.includes(newTag)) {
                setNewPost((prev) => ({
                    ...prev,
                    tags: [...prev.tags, newTag],
                }));
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setNewPost((prev) => ({
            ...prev,
            tags: prev.tags.filter((tag) => tag !== tagToRemove),
        }));
    };

    const handleSchedule = () => {
        if (!newPost.scheduledDate || !newPost.scheduledTime) {
            toast({
                title: 'Error',
                description: 'Please select both date and time for scheduling',
                status: 'error',
                duration: 3000,
            });
            return;
        }
        handlePostSubmit('scheduled');
    };

    return (
        <MotionBox
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            mb={8}
            bg="white"
            border="2px solid black"
            boxShadow="6px 6px 0 black"
        >
            <Box p={6}>
                <HStack mb={4} justify="space-between">
                    <HStack>
                        <Text fontWeight="bold">Type:</Text>
                        <HStack spacing={2} align="center">
                            <Switch 
                                size="lg" 
                                isChecked={isArticle}
                                onChange={(e) => {
                                    setIsArticle(e.target.checked);
                                    // Reset category and tags when switching to quick post
                                    if (!e.target.checked) {
                                        setNewPost(prev => ({
                                            ...prev,
                                            categoryId: '',
                                            tags: []
                                        }));
                                    }
                                }}
                            />
                            <Box 
                                px={3} 
                                py={1} 
                                bg={isArticle ? "gray.100" : "white"}
                                border="2px solid"
                                borderColor="black"
                                transform={isArticle ? "rotate(1deg)" : "none"}
                            >
                                <Text 
                                    fontWeight="bold"
                                    fontSize="sm"
                                    letterSpacing="wider"
                                >
                                    {isArticle ? "LONG-FORM ARTICLE" : "QUICK POST"}
                                </Text>
                            </Box>
                        </HStack>
                    </HStack>
                    {isArticle && (
                        <ChakraSelect
                            value={newPost.categoryId}
                            onChange={(e) => setNewPost(prev => ({ ...prev, categoryId: e.target.value }))}
                            w="200px"
                            placeholder="Select category"
                            border="2px solid black"
                            borderRadius="0"
                            _hover={{
                                transform: "translate(-2px, -2px)",
                                boxShadow: "4px 4px 0 0 #000",
                            }}
                        >
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </ChakraSelect>
                    )}
                </HStack>

                {isArticle && (
                    <FormControl mb={4}>
                        <Input
                            value={newPost.title}
                            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter article title"
                            border="2px solid black"
                            borderRadius="0"
                            _hover={{
                                transform: "translate(-2px, -2px)",
                                boxShadow: "4px 4px 0 0 #000",
                            }}
                            _focus={{
                                transform: "translate(-2px, -2px)",
                                boxShadow: "4px 4px 0 0 #000",
                                borderColor: "black",
                            }}
                        />
                    </FormControl>
                )}
                
                <Textarea
                    value={newPost.body}
                    onChange={(e) => setNewPost(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="What's on your mind?"
                    minH="120px"
                    mb={4}
                    border="2px solid black"
                    borderRadius="0"
                    _hover={{
                        transform: "translate(-2px, -2px)",
                        boxShadow: "4px 4px 0 0 #000",
                    }}
                    _focus={{
                        transform: "translate(-2px, -2px)",
                        boxShadow: "4px 4px 0 0 #000",
                        borderColor: "black",
                    }}
                />

                {isArticle && (
                    <FormControl mb={4}>
                        <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            placeholder="Add tags (press Enter)"
                            border="2px solid black"
                            borderRadius="0"
                            _hover={{
                                transform: "translate(-2px, -2px)",
                                boxShadow: "4px 4px 0 0 #000",
                            }}
                            _focus={{
                                transform: "translate(-2px, -2px)",
                                boxShadow: "4px 4px 0 0 #000",
                                borderColor: "black",
                            }}
                        />
                        <HStack spacing={2} mt={2} wrap="wrap">
                            {newPost.tags.map((tag) => (
                                <Tag
                                    key={tag}
                                    size="md"
                                    borderRadius="full"
                                    variant="solid"
                                    colorScheme="teal"
                                >
                                    <TagLabel>{tag}</TagLabel>
                                    <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                                </Tag>
                            ))}
                        </HStack>
                    </FormControl>
                )}
                
                <HStack justify="flex-end" spacing={4}>
                    <Popover 
                        placement="top" 
                        isOpen={isScheduling}
                        onClose={() => setIsScheduling(false)}
                    >
                        <PopoverTrigger>
                            <IconButton
                                icon={<FiClock />}
                                variant="outline"
                                border="2px solid black"
                                borderRadius="0"
                                onClick={() => setIsScheduling(!isScheduling)}
                                _hover={{
                                    transform: "translate(-2px, -2px)",
                                    boxShadow: "4px 4px 0 0 #000",
                                }}
                            />
                        </PopoverTrigger>
                        <PopoverContent
                            border="2px solid black"
                            borderRadius="0"
                            boxShadow="4px 4px 0 black"
                            w="auto"
                            p={4}
                        >
                            <PopoverBody>
                                <VStack align="stretch" spacing={4}>
                                    <Input
                                        type="date"
                                        value={newPost.scheduledDate}
                                        onChange={(e) => setNewPost(prev => ({
                                            ...prev,
                                            scheduledDate: e.target.value
                                        }))}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <Input
                                        type="time"
                                        value={newPost.scheduledTime}
                                        onChange={(e) => setNewPost(prev => ({
                                            ...prev,
                                            scheduledTime: e.target.value
                                        }))}
                                    />
                                    <Button 
                                        onClick={handleSchedule}
                                        isLoading={isCreatingPost}
                                    >
                                        Schedule Post
                                    </Button>
                                </VStack>
                            </PopoverBody>
                        </PopoverContent>
                    </Popover>
                    
                    <Menu>
                        <MenuButton
                            as={Button}
                            rightIcon={<FiChevronDown />}
                            bg="teal.500"
                            color="white"
                            border="2px solid black"
                            borderRadius="0"
                            px={8}
                            isLoading={isCreatingPost}
                            _hover={{
                                transform: "translate(-2px, -2px)",
                                boxShadow: "4px 4px 0 0 #000",
                                bg: "teal.600"
                            }}
                            _active={{
                                transform: "translate(0px, 0px)",
                                boxShadow: "none",
                                bg: "teal.700"
                            }}
                        >
                            Send
                        </MenuButton>
                        <MenuList
                            border="2px solid black"
                            borderRadius="0"
                            boxShadow="4px 4px 0 black"
                        >
                            <MenuItem onClick={() => handlePostSubmit('published')}>
                                Publish Now
                            </MenuItem>
                            <MenuItem onClick={() => handlePostSubmit('draft')}>
                                Save as Draft
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </HStack>
            </Box>
        </MotionBox>
    );
}

CreatePost.propTypes = {
    onPostCreated: PropTypes.func,
};

export default CreatePost;