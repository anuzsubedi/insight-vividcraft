import { supabase } from "../config/supabaseClient.js";

// Check if user has active restrictions
async function checkUserRestrictions(userId) {
    const now = new Date().toISOString();
    const { data: restrictions } = await supabase
        .from("user_restrictions")
        .select("restriction_type")
        .eq("user_id", userId)
        .or(`expires_at.gt.${now},expires_at.is.null`);

    return {
        isBanned: restrictions?.some(r => r.restriction_type === 'ban') || false,
        isPostBanned: restrictions?.some(r => r.restriction_type === 'post_ban') || false,
        isCommentBanned: restrictions?.some(r => r.restriction_type === 'comment_ban') || false
    };
}

// Middleware to check if user can post
export const canPost = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const restrictions = await checkUserRestrictions(userId);
        
        if (restrictions.isBanned || restrictions.isPostBanned) {
            return res.status(403).json({ 
                error: "You are currently restricted from creating posts" 
            });
        }

        next();
    } catch (error) {
        console.error('Check post permission error:', error);
        res.status(500).json({ error: "Failed to verify posting permissions" });
    }
};

// Middleware to check if user can comment
export const canComment = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const restrictions = await checkUserRestrictions(userId);
        
        if (restrictions.isBanned || restrictions.isCommentBanned) {
            return res.status(403).json({ 
                error: "You are currently restricted from commenting" 
            });
        }

        next();
    } catch (error) {
        console.error('Check comment permission error:', error);
        res.status(500).json({ error: "Failed to verify commenting permissions" });
    }
};