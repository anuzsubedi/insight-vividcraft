import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const { data: user } = await supabase
            .from("users")
            .select("is_admin")
            .eq("id", req.user.userId)
            .single();

        if (!user?.is_admin) {
            return res.status(403).json({ error: "Unauthorized. Admin access required." });
        }

        next();
    } catch (error) {
        return res.status(500).json({ error: "Failed to verify admin status" });
    }
};

// Get all admins
router.get("/admins", verifyToken, isAdmin, async (req, res) => {
    try {
        const { data: admins, error } = await supabase
            .from("users")
            .select("id, username, display_name, avatar_name")
            .eq("is_admin", true);

        if (error) throw error;

        res.json({ admins });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch admins" });
    }
});

// Add admin
router.post("/admins", verifyToken, isAdmin, async (req, res) => {
    try {
        const { username } = req.body;

        // Get user by username
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, is_admin")
            .eq("username", username.toLowerCase())
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.is_admin) {
            return res.status(400).json({ error: "User is already an admin" });
        }

        // Update user to admin
        const { error: updateError } = await supabase
            .from("users")
            .update({ is_admin: true })
            .eq("id", user.id);

        if (updateError) throw updateError;

        res.json({ message: "Admin added successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to add admin" });
    }
});

// Remove admin
router.delete("/admins/:username", verifyToken, isAdmin, async (req, res) => {
    try {
        const { username } = req.params;

        // Get user by username
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, is_admin")
            .eq("username", username.toLowerCase())
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.is_admin) {
            return res.status(400).json({ error: "User is not an admin" });
        }

        // Update user to remove admin status
        const { error: updateError } = await supabase
            .from("users")
            .update({ is_admin: false })
            .eq("id", user.id);

        if (updateError) throw updateError;

        res.json({ message: "Admin removed successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove admin" });
    }
});

// Search users for admin assignment
router.get("/search-users", verifyToken, isAdmin, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json({ users: [] });

        const { data: users, error } = await supabase
            .from("users")
            .select("username, display_name, avatar_name, is_admin")
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(5);

        if (error) throw error;

        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: "Failed to search users" });
    }
});

export default router;