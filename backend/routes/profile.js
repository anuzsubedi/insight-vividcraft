import express from "express";
import { supabase } from "../config/supabaseClient.js";
// Fix import to use verifyToken
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Update user profile
router.put("/update", verifyToken, async (req, res) => {
    try {
        const { bio, avatarName, username, displayName } = req.body;
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
            .select("bio, avatar_name, username, display_name")
            .eq("id", userId)
            .single();

        if (getCurrentError) {
            console.error("Get Current User Error:", getCurrentError);
            if (getCurrentError.code === 'PGRST116') { // No rows found
                return res.status(404).json({ error: "Profile not found" });
            }
            return res.status(500).json({ error: "Failed to get current user data" });
        }

        // If username is being updated, check if it's already taken
        if (username && username !== currentUser.username) {
            const { data: existingUser, error: usernameError } = await supabase
                .from("users")
                .select("id")
                .eq("username", username.toLowerCase())
                .single();

            if (existingUser) {
                return res.status(400).json({ error: "Username is already taken" });
            }

            if (usernameError && usernameError.code !== 'PGRST116') { // PGRST116 means no rows returned, which is good
                console.error("Username Check Error:", usernameError);
                return res.status(500).json({ error: "Failed to validate username" });
            }
        }

        // Update with new values or keep existing ones
        const { error: updateError, data: updatedUser } = await supabase
            .from("users")
            .update({
                bio: bio !== undefined ? bio : currentUser.bio,
                avatar_name: avatarName !== undefined ? avatarName : currentUser.avatar_name,
                username: username !== undefined ? username.toLowerCase() : currentUser.username,
                display_name: displayName !== undefined ? displayName : currentUser.display_name
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

// Helper function to get follower and following counts
const getFollowCounts = async (userId) => {
    try {
        const { count: followerCount, error: followerError } = await supabase
            .from("follows")
            .select("follower_id", { count: 'exact', head: true })
            .eq("following_id", userId);

        const { count: followingCount, error: followingError } = await supabase
            .from("follows")
            .select("following_id", { count: 'exact', head: true })
            .eq("follower_id", userId);

        if (followerError || followingError) {
            throw new Error("Failed to get follow counts");
        }

        return {
            followerCount: followerCount || 0,
            followingCount: followingCount || 0
        };
    } catch (error) {
        console.error("Count Error:", error);
        return {
            followerCount: 0,
            followingCount: 0
        };
    }
};

// Helper function to get reaction counts and user reaction
async function getPostReactions(postId, userId) {
    try {
        console.log(`[profile/getPostReactions] START - postId=${postId}, userId=${userId}, type=${typeof userId}`);
        
        // Get both counts and user reaction in a single query
        const { data, error } = await supabase
            .from('post_reactions')
            .select(`
                reaction_type,
                post_id,
                user_id
            `)
            .match({ post_id: postId });

        if (error) throw error;

        console.log(`[profile/getPostReactions] Found ${data.length} reactions for post ${postId}`);
        
        // Log all user IDs from reactions to see what we're comparing against
        if (data.length > 0) {
            console.log('[profile/getPostReactions] Reaction user IDs:');
            data.forEach(r => {
                console.log(`  - user_id=${r.user_id} (${typeof r.user_id}), reaction=${r.reaction_type}`);
            });
        }

        // Calculate counts
        const upvotes = data.filter(r => r.reaction_type === 'upvote').length;
        const downvotes = data.filter(r => r.reaction_type === 'downvote').length;
        
        // Get user's reaction if they are logged in
        let userReaction = null;
        if (userId) {
            // Find the user's reaction with detailed logging
            const stringUserId = String(userId);
            console.log(`[profile/getPostReactions] Looking for reaction with stringUserId=${stringUserId}`);
            
            const userReactionObj = data.find(r => {
                const stringReactionUserId = String(r.user_id);
                const matches = stringReactionUserId === stringUserId;
                console.log(`  Comparing: reaction_user_id=${stringReactionUserId} === current_user_id=${stringUserId} => ${matches}`);
                return matches;
            });
            
            userReaction = userReactionObj ? userReactionObj.reaction_type : null;
        }

        console.log(`[profile/getPostReactions] RESULT - postId=${postId}, userId=${userId}, userReaction=${userReaction}`);
        
        return {
            upvotes,
            downvotes,
            userReaction
        };
    } catch (error) {
        console.error('Error getting post reactions:', error);
        return { upvotes: 0, downvotes: 0, userReaction: null };
    }
}

// Helper function to add reactions to posts
async function addReactionsToPosts(posts, userId) {
    return Promise.all(posts.map(async (post) => {
        try {
            const reactions = await getPostReactions(post.id, userId);
            return {
                ...post,
                reactions: {
                    upvotes: reactions.upvotes,
                    downvotes: reactions.downvotes
                },
                userReaction: reactions.userReaction
            };
        } catch (error) {
            console.error('Error getting reactions for post:', post.id, error);
            return {
                ...post,
                reactions: { upvotes: 0, downvotes: 0 },
                userReaction: null
            };
        }
    }));
}

// Get user profile by username
router.get("/:username", verifyToken, async (req, res) => {
    try {
        const { username } = req.params;
        const requesterId = req.user?.userId;

        // Get basic user data
        const { data: user, error } = await supabase
            .from("users")
            .select("id, username, display_name, bio, avatar_name")
            .eq("username", username.toLowerCase())
            .single();

        if (error || !user) {
            if (error?.code === 'PGRST116') { // No rows found
                return res.status(404).json({ error: "User not found" });
            }
            return res.status(500).json({ error: "Failed to fetch user" });
        }

        // Get follow counts
        const counts = await getFollowCounts(user.id);

        // Get social status for authenticated users
        let isFollowing = false;
        let isMuted = false;

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

            isFollowing = !!followStatus.data;
            isMuted = !!muteStatus.data;
        }

        return res.status(200).json({
            profile: {
                username: user.username,
                displayName: user.display_name,
                bio: user.bio || "",
                avatarName: user.avatar_name || "",
                followerCount: counts.followerCount,
                followingCount: counts.followingCount,
                isFollowing,
                isMuted
            }
        });
    } catch (error) {
        console.error("Profile Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get own profile
router.get("/", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: user, error } = await supabase
            .from("users")
            .select("username, display_name, bio, avatar_name")
            .eq("id", userId)
            .single();

        if (error || !user) {
            if (error?.code === 'PGRST116') { // No rows found
                return res.status(404).json({ error: "Profile not found" });
            }
            return res.status(500).json({ error: "Failed to fetch profile" });
        }

        // Get follow counts
        const counts = await getFollowCounts(userId);

        return res.status(200).json({
            profile: {
                username: user.username,
                displayName: user.display_name,
                bio: user.bio || "",
                avatarName: user.avatar_name || "",
                followerCount: counts.followerCount,
                followingCount: counts.followingCount
            }
        });
    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;