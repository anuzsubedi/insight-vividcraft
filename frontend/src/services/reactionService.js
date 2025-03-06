import axios from "axios";
import { ENDPOINTS } from '../api/endpoints';

const reactionAxios = axios.create({
    baseURL: "http://localhost:5000", // Ajusta según tu backend
    //withCredentials: true // si lo necesitas
  });

// Fetch reactions count for a post
export const getReactions = async (postId) => {
    try {
        const response = await reactionAxios.get(ENDPOINTS.REACTIONS.GET(postId));
        return response.data.reactions; // Returns { upvote: X, downvote: Y }
    } catch (error) {
        console.error("Error fetching reactions:", error);
        return { upvote: 0, downvote: 0 }; // Default values if error occurs
    }
};

// Add or update a reaction (upvote/downvote)
export const addReaction = async (postId, type, token) => {
    try {
        const response = await axios.post(
            ENDPOINTS.REACTIONS.ADD,
            { postId, type }, // type can be "upvote" or "downvote"
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error adding reaction:", error);
        throw error;
    }
};

// Remove a reaction
export const removeReaction = async (postId, token) => {
    try {
        const response = await axios.delete(
            ENDPOINTS.REACTIONS.REMOVE,
            {
                data: { postId }, // Send postId in request body
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error removing reaction:", error);
        throw error;
    }
};
