import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Follow a user
router.post("/follow/:username", verifyToken, async (req, res) => {
    try {
        const followerId = req.user.userId;
        const usernameToFollow = req.params.username.toLowerCase();

        // Get user to follow
        const { data: userToFollow, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("username", usernameToFollow)
            .single();

        if (userError || !userToFollow) {
            return res.status(404).json({ error: "User not found" });
        }

        if (followerId === userToFollow.id) {
            return res.status(400).json({ error: "Cannot follow yourself" });
        }

        // Create follow relationship
        const { error: followError } = await supabase
            .from("follows")
            .insert([
                { follower_id: followerId, following_id: userToFollow.id }
            ]);

        if (followError?.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Already following this user" });
        }

        if (followError) {
            return res.status(500).json({ error: "Failed to follow user" });
        }

        return res.status(200).json({ message: "Successfully followed user" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Unfollow a user
router.delete("/follow/:username", verifyToken, async (req, res) => {
    try {
        const followerId = req.user.userId;
        const usernameToUnfollow = req.params.username.toLowerCase();

        // Get user to unfollow
        const { data: userToUnfollow, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("username", usernameToUnfollow)
            .single();

        if (userError || !userToUnfollow) {
            return res.status(404).json({ error: "User not found" });
        }

        // Remove follow relationship
        const { error: unfollowError } = await supabase
            .from("follows")
            .delete()
            .eq("follower_id", followerId)
            .eq("following_id", userToUnfollow.id);

        if (unfollowError) {
            return res.status(500).json({ error: "Failed to unfollow user" });
        }

        return res.status(200).json({ message: "Successfully unfollowed user" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Mute a user
router.post("/mute/:username", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const usernameToMute = req.params.username.toLowerCase();

        // Get user to mute
        const { data: userToMute, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("username", usernameToMute)
            .single();

        if (userError || !userToMute) {
            return res.status(404).json({ error: "User not found" });
        }

        if (userId === userToMute.id) {
            return res.status(400).json({ error: "Cannot mute yourself" });
        }

        // Create mute relationship
        const { error: muteError } = await supabase
            .from("mutes")
            .insert([
                { user_id: userId, muted_id: userToMute.id }
            ]);

        if (muteError?.code === '23505') { // Unique violation
            return res.status(400).json({ error: "User is already muted" });
        }

        if (muteError) {
            return res.status(500).json({ error: "Failed to mute user" });
        }

        return res.status(200).json({ message: "Successfully muted user" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Unmute a user
router.delete("/mute/:username", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const usernameToUnmute = req.params.username.toLowerCase();

        // Get user to unmute
        const { data: userToUnmute, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("username", usernameToUnmute)
            .single();

        if (userError || !userToUnmute) {
            return res.status(404).json({ error: "User not found" });
        }

        // Remove mute relationship
        const { error: unmuteError } = await supabase
            .from("mutes")
            .delete()
            .eq("user_id", userId)
            .eq("muted_id", userToUnmute.id);

        if (unmuteError) {
            return res.status(500).json({ error: "Failed to unmute user" });
        }

        return res.status(200).json({ message: "Successfully unmuted user" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get follow/mute status for a user
router.get("/status/:username", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const username = req.params.username.toLowerCase();

        // Get target user
        const { data: targetUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("username", username)
            .single();

        if (userError || !targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get follow status
        const { data: followData } = await supabase
            .from("follows")
            .select()
            .eq("follower_id", userId)
            .eq("following_id", targetUser.id)
            .single();

        // Get mute status
        const { data: muteData } = await supabase
            .from("mutes")
            .select()
            .eq("user_id", userId)
            .eq("muted_id", targetUser.id)
            .single();

        return res.status(200).json({
            isFollowing: !!followData,
            isMuted: !!muteData
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;