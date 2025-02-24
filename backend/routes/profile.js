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

        const { error } = await supabase
            .from("users")
            .update({
                bio: bio || null,
                avatar_name: avatarName || null
            })
            .eq("id", userId);

        if (error) {
            return res.status(500).json({ error: "Failed to update profile" });
        }

        return res.status(200).json({
            message: "Profile updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get user profile by username
router.get("/:username", async (req, res) => {
    try {
        const { username } = req.params;

        const { data: user, error } = await supabase
            .from("users")
            .select("username, display_name, bio, avatar_name")
            .eq("username", username.toLowerCase())
            .single();

        if (error || !user) {
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
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;