import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { checkUserRestrictions } from "../middleware/permissions.js";

const router = express.Router();

// Check if user can post
router.get("/can-post", verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const restrictions = await checkUserRestrictions(userId);
        
        if (restrictions.isBanned || restrictions.isPostBanned) {
            return res.status(403).json({ 
                error: "You are currently restricted from creating posts",
                canPost: false 
            });
        }

        res.json({ canPost: true });
    } catch (error) {
        console.error('Check post permission error:', error);
        res.status(500).json({ error: "Failed to verify posting permissions" });
    }
});

export default router;