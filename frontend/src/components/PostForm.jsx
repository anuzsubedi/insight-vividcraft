import { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  useToast,
  FormErrorMessage,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Input as TagInput,
} from "@chakra-ui/react";
import PropTypes from "prop-types";
import categoryService from "../services/categoryService";

function PostForm({ onSubmit, initialData, isEditing = false }) {
  const [formData, setFormData] = useState(
    initialData || {
      title: "",
      body: "",
      type: "post",
      categoryId: "",
      tags: [],
      status: "draft",
      scheduledFor: "",
      scheduledDate: "",
      scheduledTime: "00:00", // Default to 12:00 AM
    }
  );
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getCategories();
        setCategories(response.categories || []);
      } catch (error) {
        toast({
          title: "Error loading categories",
          description: error.message,
          status: "error",
          duration: 3000,
        });
        // Fallback to default categories if API fails
        setCategories([
          { id: 1, name: "Technology" },
          { id: 2, name: "Travel" },
          { id: 3, name: "Lifestyle" },
        ]);
      }
    };

    fetchCategories();
  }, [toast]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.body.trim()) {
      newErrors.body = "Content is required";
    }
    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }
    if (formData.status === "scheduled" && !formData.scheduledFor) {
      newErrors.scheduledFor = "Schedule time is required for scheduled posts";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Create a copy of formData to sanitize
      const submitData = {
        ...formData,
        // Only include scheduledFor if status is scheduled and there's a date
        scheduledFor:
          formData.status === "scheduled"
            ? formData.scheduledFor || null
            : null,
        // Ensure tags is an array
        tags: formData.tags || []
      };

      // In the POST and PUT routes, add this validation before processing
      if (submitData.status === "scheduled" && !submitData.scheduledFor) {
        throw new Error("Scheduled posts must have a scheduled_for date");
      }

      if (
        submitData.status === "scheduled" &&
        new Date(submitData.scheduledFor) <= new Date()
      ) {
        throw new Error("Scheduled date must be in the future");
      }

      await onSubmit(submitData);
      // Clear any existing errors after successful submission
      setErrors({});
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "scheduledDate" || name === "scheduledTime") {
      // Combine date and time when either is changed
      const date = name === "scheduledDate" ? value : formData.scheduledDate;
      const time = name === "scheduledTime" ? value : formData.scheduledTime;
      
      if (date) {
        const combinedDateTime = `${date}T${time || "00:00"}`;
        setFormData(prev => ({
          ...prev,
          [name]: value,
          scheduledFor: combinedDateTime
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          scheduledFor: ""
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={6}>
        <FormControl isRequired isInvalid={!!errors.title}>
          <FormLabel>Title</FormLabel>
          <Input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter post title"
          />
          <FormErrorMessage>{errors.title}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={!!errors.body}>
          <FormLabel>Content</FormLabel>
          <Textarea
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder="Write your post content..."
            minH="200px"
          />
          <FormErrorMessage>{errors.body}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={!!errors.categoryId}>
          <FormLabel>Category</FormLabel>
          <Select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            placeholder="Select a category"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <FormErrorMessage>{errors.categoryId}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Type</FormLabel>
          <Select name="type" value={formData.type} onChange={handleChange}>
            <option value="post">Post</option>
            <option value="article">Article</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Tags</FormLabel>
          <TagInput
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Type and press enter to add tags"
            mb={2}
          />
          <HStack spacing={2} wrap="wrap">
            {formData.tags.map((tag) => (
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

        <FormControl isRequired>
          <FormLabel>Status</FormLabel>
          <Select name="status" value={formData.status} onChange={handleChange}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </Select>
        </FormControl>

        {formData.status === "scheduled" && (
          <FormControl isInvalid={!!errors.scheduledFor}>
            <FormLabel>Schedule Publication</FormLabel>
            <VStack spacing={3} align="stretch">
              <Box>
                <FormLabel fontSize="sm">Date</FormLabel>
                <Input
                  name="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  borderWidth="2px"
                  borderColor="black"
                  _hover={{ borderColor: "accent.100" }}
                  _focus={{ 
                    borderColor: "accent.100",
                    boxShadow: "3px 3px 0 black"
                  }}
                />
              </Box>
              <Box>
                <FormLabel fontSize="sm">Time (optional - defaults to 12:00 AM)</FormLabel>
                <Input
                  name="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={handleChange}
                  borderWidth="2px"
                  borderColor="black"
                  _hover={{ borderColor: "accent.100" }}
                  _focus={{ 
                    borderColor: "accent.100",
                    boxShadow: "3px 3px 0 black"
                  }}
                />
              </Box>
            </VStack>
            <FormErrorMessage>{errors.scheduledFor}</FormErrorMessage>
          </FormControl>
        )}

        <Button
          type="submit"
          width="full"
          isLoading={isLoading}
          loadingText={isEditing ? "Updating..." : "Creating..."}
        >
          {isEditing ? "Update Post" : "Create Post"}
        </Button>
      </VStack>
    </Box>
  );
}

PostForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
};

export default PostForm;
