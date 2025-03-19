import { supabase } from "../config/supabaseClient.js";

// Check if user has active restrictions
export async function checkUserRestrictions(userId) {
    const now = new Date().toISOString();
   
    const { data: restrictions } = await supabase
        .from("user_restrictions")
        .select("restriction_type, expires_at, reason")
        .eq("user_id", userId)
        .or(`expires_at.gt.${now},expires_at.is.null`);

    const getRestrictionInfo = (type) => {
        const restriction = restrictions?.find(r => r.restriction_type === type);
        return restriction ? {
            restricted: true,
            expiresAt: restriction.expires_at,
            reason: restriction.reason
        } : {
            restricted: false,
            expiresAt: null,
            reason: null
        };
    };

    const banInfo = getRestrictionInfo('ban');
    const postBanInfo = getRestrictionInfo('post_ban');
    const commentBanInfo = getRestrictionInfo('comment_ban');

    return {
        isBanned: banInfo.restricted,
        isPostBanned: postBanInfo.restricted || banInfo.restricted,
        isCommentBanned: commentBanInfo.restricted || banInfo.restricted,
        postBanExpiresAt: postBanInfo.expiresAt || banInfo.expiresAt,
        postBanReason: postBanInfo.reason || banInfo.reason,
        commentBanExpiresAt: commentBanInfo.expiresAt || banInfo.expiresAt,
        commentBanReason: commentBanInfo.reason || banInfo.reason
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
                error: "You are currently restricted from creating posts",
                expiresAt: restrictions.postBanExpiresAt,
                reason: restrictions.postBanReason
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
                error: "You are currently restricted from commenting",
                expiresAt: restrictions.commentBanExpiresAt,
                reason: restrictions.commentBanReason
            });
        }

        next();
    } catch (error) {
        console.error('Check comment permission error:', error);
        res.status(500).json({ error: "Failed to verify commenting permissions" });
    }
};