import axios from "axios";
import { ENDPOINTS } from '../api/endpoints';
import { data } from "react-router-dom";

const reactionAxios = axios.create({
    baseURL: "http://localhost:5000", // API server
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
    if(!token) {
        console.error("No token provided to add reaction");
        throw new Error("No token provided to add reaction");
    }

    try {
        const response = await reactionAxios.post(
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
    if(!token) {
        console.error("No token provided to add reaction");
        throw new Error("No token provided to add reaction");
    }

    try {
        const response = await reactionAxios.delete(
            ENDPOINTS.REACTIONS.REMOVE,
                {headers: { Authorization: `Bearer ${token}` },
                 data: { postId }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error removing reaction:", error);
        throw error;
    }
};
