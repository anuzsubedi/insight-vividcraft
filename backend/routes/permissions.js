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
            const expiryDate = restrictions.postBanExpiresAt;
            const expiryText = expiryDate ? new Date(expiryDate).toLocaleDateString() : 'indefinitely';
            return res.status(403).json({ 
                canPost: false,
                error: "You are currently restricted from creating posts",
                reason: restrictions.postBanReason || "You have been banned from creating posts",
                expiresAt: restrictions.postBanExpiresAt,
                message: `You are banned from making posts until ${expiryText}. Reason: ${restrictions.postBanReason || 'No reason provided'}`
            });
        }

        res.json({ canPost: true });
    } catch (error) {
        console.error('Check post permission error:', error);
        res.status(500).json({ error: "Failed to verify posting permissions" });
    }
});

export default router;