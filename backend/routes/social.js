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

// Get users that a user is following
router.get('/:username/following', verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // First get the user's ID
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the following relationships with user details
        const { data: following, error } = await supabase
            .from('follows')
            .select(`
                following_id,
                following:users!follows_following_id_fkey (
                    username,
                    display_name,
                    avatar_name
                )
            `)
            .eq('follower_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the data structure
        const users = following.map(f => ({
            username: f.following.username,
            displayName: f.following.display_name,
            avatarName: f.following.avatar_name
        }));

        res.json({ users });
    } catch (error) {
        console.error('Error getting following:', error);
        res.status(500).json({ error: 'Failed to get following users' });
    }
});

// Get users who follow a user
router.get('/:username/followers', verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // First get the user's ID
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the follower relationships with user details
        const { data: followers, error } = await supabase
            .from('follows')
            .select(`
                follower_id,
                follower:users!follows_follower_id_fkey (
                    username,
                    display_name,
                    avatar_name
                )
            `)
            .eq('following_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the data structure
        const users = followers.map(f => ({
            username: f.follower.username,
            displayName: f.follower.display_name,
            avatarName: f.follower.avatar_name
        }));

        res.json({ users });
    } catch (error) {
        console.error('Error getting followers:', error);
        res.status(500).json({ error: 'Failed to get followers' });
    }
});

// Get mutual followers (users who follow each other)
router.get('/:username/mutual', verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // First get the user's ID
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get mutual followers using a self-join
        const { data: mutuals, error } = await supabase
            .rpc('get_mutual_followers', { user_id: user.id });

        if (error) throw error;

        // Transform the data structure
        const users = mutuals.map(m => ({
            username: m.username,
            displayName: m.display_name,
            avatarName: m.avatar_name
        }));

        res.json({ users });
    } catch (error) {
        console.error('Error getting mutual followers:', error);
        res.status(500).json({ error: 'Failed to get mutual followers' });
    }
});

// Remove a follower
router.delete('/remove-follower/:username', verifyToken, async (req, res) => {
    try {
        const currentUser = req.user;
        const { username } = req.params;

        // Get the follower to remove
        const { data: followerToRemove } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (!followerToRemove) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete follow relationship
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', followerToRemove.id)
            .eq('following_id', currentUser.userId);

        if (error) throw error;

        res.json({ message: 'Successfully removed follower' });
    } catch (error) {
        console.error('Error removing follower:', error);
        res.status(500).json({ error: 'Failed to remove follower' });
    }
});

export default router;