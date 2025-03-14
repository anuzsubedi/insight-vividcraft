import { supabase } from "../config/supabaseClient.js";

// Helper function to get reaction counts and user reaction
async function getPostReactions(postId, userId) {
    const { data: counts, error: countsError } = await supabase
        .rpc('get_post_reaction_counts', { post_id: postId });

    if (countsError) throw countsError;

    // Get user's reaction if user is logged in
    let userReaction = null;
    if (userId) {
        const { data: reaction } = await supabase
            .from('post_reactions')
            .select('reaction_type')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        if (reaction) {
            userReaction = reaction.reaction_type;
        }
    }

    return {
        upvotes: counts?.[0]?.upvotes || 0,
        downvotes: counts?.[0]?.downvotes || 0,
        userReaction
    };
}

// Helper function to add reactions to posts
export async function addReactionsToPosts(posts, userId) {
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