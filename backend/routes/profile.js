import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Update user profile (bio and avatar)
router.put("/update", verifyToken, async (req, res) => {
    try {
        const { bio, avatarName } = req.body;
        const userId = req.user.userId;

        // Validate avatar name format if provided
        if (avatarName && !avatarName.match(/^vibrent_([1-9]|[1-2][0-9])\.png$/)) {
            return res.status(400).json({
                error: "Invalid avatar name format. Must be vibrent_1.png through vibrent_27.png"
            });
        }

        // Get current user data
        const { data: currentUser, error: getCurrentError } = await supabase
            .from("users")
            .select("bio, avatar_name")
            .eq("id", userId)
            .single();

        if (getCurrentError) {
            console.error("Get Current User Error:", getCurrentError);
            return res.status(500).json({ error: "Failed to get current user data" });
        }

        // Update with new values or keep existing ones
        const { error: updateError, data: updatedUser } = await supabase
            .from("users")
            .update({
                bio: bio !== undefined ? bio : currentUser.bio,
                avatar_name: avatarName !== undefined ? avatarName : currentUser.avatar_name
            })
            .eq("id", userId)
            .select()
            .single();

        if (updateError) {
            console.error("Update Error:", updateError);
            return res.status(500).json({ error: "Failed to update profile" });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            profile: {
                username: updatedUser.username,
                displayName: updatedUser.display_name,
                bio: updatedUser.bio || "",
                avatarName: updatedUser.avatar_name || ""
            }
        });
    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get user profile by username
router.get("/:username", verifyToken, async (req, res) => {
    try {
        const { username } = req.params;
        const requesterId = req.user?.userId; // Optional: will be undefined for non-authenticated requests

        // Get basic user data
        const { data: user, error } = await supabase
            .from("users")
            .select("id, username, display_name, bio, avatar_name")
            .eq("username", username.toLowerCase())
            .single();

        if (error || !user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Initialize social status
        let socialStatus = {
            isFollowing: false,
            isMuted: false,
            followerCount: 0,
            followingCount: 0
        };

        // Get follower and following counts
        const [followerCount, followingCount] = await Promise.all([
            supabase
                .from("follows")
                .select("*", { count: true })
                .eq("following_id", user.id),
            supabase
                .from("follows")
                .select("*", { count: true })
                .eq("follower_id", user.id)
        ]);

        socialStatus.followerCount = followerCount.count || 0;
        socialStatus.followingCount = followingCount.count || 0;

        // If request is authenticated, get following and muting status
        if (requesterId) {
            const [followStatus, muteStatus] = await Promise.all([
                supabase
                    .from("follows")
                    .select("*")
                    .eq("follower_id", requesterId)
                    .eq("following_id", user.id)
                    .single(),
                supabase
                    .from("mutes")
                    .select("*")
                    .eq("user_id", requesterId)
                    .eq("muted_id", user.id)
                    .single()
            ]);

            socialStatus.isFollowing = !!followStatus.data;
            socialStatus.isMuted = !!muteStatus.data;
        }

        return res.status(200).json({
            profile: {
                username: user.username,
                displayName: user.display_name,
                bio: user.bio || "",
                avatarName: user.avatar_name || "",
                ...socialStatus
            }
        });
    } catch (error) {
        console.error("Profile Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get own profile (requires auth)
router.get("/", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: user, error } = await supabase
            .from("users")
            .select("username, display_name, bio, avatar_name")
            .eq("id", userId)
            .single();

        if (error || !user) {
            console.error("Get Profile Error:", error);
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({
            profile: {
                username: user.username,
                displayName: user.display_name,
                bio: user.bio || "",
                avatarName: user.avatar_name || ""
            }
        });
    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;