import { supabase } from '../config/supabaseClient.js';

/**
 * Create a notification for a user with multiple actors
 */
export async function createNotification(data) {
    const { userId, type, targetType, targetId, actorIds, milestone } = data;
    const now = new Date().toISOString();
    
    try {
        // Insert notification
        const { data: notification, error: notificationError } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                target_type: targetType,
                target_id: targetId,
                milestone,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (notificationError) throw notificationError;

        // Insert notification actors
        if (actorIds?.length > 0) {
            const actorRecords = actorIds.map(actorId => ({
                notification_id: notification.id,
                user_id: actorId
            }));

            const { error: actorsError } = await supabase
                .from('notification_actors')
                .insert(actorRecords);

            if (actorsError) throw actorsError;
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

// Create a notification and its actors in a transaction
async function createNotificationWithActors(notification, actorId) {
    const now = new Date().toISOString();
    notification.created_at = now;
    notification.updated_at = now;

    const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

    if (error) throw error;

    if (actorId) {
        const { error: actorError } = await supabase
            .from('notification_actors')
            .insert({
                notification_id: data.id,
                user_id: actorId
            });

        if (actorError) throw actorError;
    }

    return data;
}

// Create a notification for post comments
export const createCommentNotification = async (userId, postId, actorId) => {
    try {
        await createNotificationWithActors({
            user_id: userId,
            type: 'comment',
            target_type: 'post',
            target_id: postId
        }, actorId);
    } catch (error) {
        console.error('Error creating comment notification:', error);
    }
};

// Create a notification for comment replies
export const createReplyNotification = async (userId, commentId, actorId) => {
    try {
        // Get the post_id for the comment
        const { data: comment } = await supabase
            .from('comments')
            .select('post_id')
            .eq('id', commentId)
            .single();

        if (comment) {
            await createNotificationWithActors({
                user_id: userId,
                type: 'reply',
                target_type: 'comment',
                target_id: commentId,
                post_id: comment.post_id
            }, actorId);
        }
    } catch (error) {
        console.error('Error creating reply notification:', error);
    }
};

// Create a notification for mentions
export const createMentionNotification = async (userId, contentType, contentId, actorId) => {
    try {
        let postId = contentId;

        // If mention is in a comment, get the post_id
        if (contentType === 'comment') {
            const { data: comment } = await supabase
                .from('comments')
                .select('post_id')
                .eq('id', contentId)
                .single();

            if (comment) {
                postId = comment.post_id;
            } else {
                throw new Error('Comment not found');
            }
        }

        await createNotificationWithActors({
            user_id: userId,
            type: 'mention',
            target_type: contentType,
            target_id: contentId,
            post_id: postId
        }, actorId);
    } catch (error) {
        console.error('Error creating mention notification:', error);
    }
};

// Create a notification for vote milestones (every 10 upvotes)
export const createVoteMilestoneNotification = async (userId, contentType, contentId, upvoteCount) => {
    try {
        let postId = contentId;

        // If milestone is for a comment, get the post_id
        if (contentType === 'comment') {
            const { data: comment } = await supabase
                .from('comments')
                .select('post_id')
                .eq('id', contentId)
                .single();

            if (comment) {
                postId = comment.post_id;
            } else {
                throw new Error('Comment not found');
            }
        }

        await createNotificationWithActors({
            user_id: userId,
            type: 'vote_milestone',
            target_type: contentType,
            target_id: contentId,
            post_id: postId,
            milestone: upvoteCount
        });
    } catch (error) {
        console.error('Error creating vote milestone notification:', error);
    }
};