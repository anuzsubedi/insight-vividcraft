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

// Get reports with filters
router.get("/reports", verifyToken, isAdmin, async (req, res) => {
    try {
        const { status = "pending", sortBy = "recent", adminId } = req.query;
        
        let query = supabase
            .from("reports")
            .select(`
                *,
                reporter:users!reports_user_id_fkey (
                    id,
                    username,
                    display_name,
                    avatar_name
                ),
                reviewer:users!reports_reviewed_by_fkey (
                    id,
                    username,
                    display_name
                ),
                actions:report_actions (
                    id,
                    action_type,
                    created_at,
                    admin:users (
                        username,
                        display_name
                    )
                )
            `);

        // Apply filters
        if (status !== "all") {
            query = query.eq("status", status);
        }
        if (adminId) {
            query = query.eq("reviewed_by", adminId);
        }

        // Apply sorting
        if (sortBy === "recent") {
            query = query.order("created_at", { ascending: false });
        } else if (sortBy === "most_reported") {
            const { data: targetCounts } = await supabase
                .from("reports")
                .select("target_id, target_type")
                .eq("status", status === "all" ? undefined : status)
                .count()
                .group("target_id, target_type");

            if (targetCounts?.length) {
                // Sort by count and get target IDs
                const sortedTargets = targetCounts.sort((a, b) => b.count - a.count);
                query = query.in("target_id", sortedTargets.map(t => t.target_id));
            }
        }

        const { data: reports, error } = await query;

        if (error) {
            console.error("Reports query error:", error);
            throw error;
        }

        // Group reports by target type to fetch content in batches
        const postReports = reports.filter(r => r.target_type === 'post');
        const commentReports = reports.filter(r => r.target_type === 'comment');

        // Fetch posts content
        const { data: posts } = postReports.length > 0 ? await supabase
            .from('posts')
            .select(`
                id,
                title,
                body,
                author:users (
                    id,
                    username,
                    display_name,
                    avatar_name
                )
            `)
            .in('id', postReports.map(r => parseInt(r.target_id)))
            : { data: [] };

        // Fetch comments content
        const { data: comments } = commentReports.length > 0 ? await supabase
            .from('comments')
            .select(`
                id,
                content,
                user_id,
                author:users (
                    id,
                    username,
                    display_name,
                    avatar_name
                )
            `)
            .in('id', commentReports.map(r => r.target_id))
            : { data: [] };

        // Create lookup maps for faster access
        const postsMap = Array.isArray(posts) ? posts.reduce((acc, post) => {
            acc[post.id] = post;
            return acc;
        }, {}) : {};

        const commentsMap = Array.isArray(comments) ? comments.reduce((acc, comment) => {
            acc[comment.id] = comment;
            return acc;
        }, {}) : {};

        // Transform the reports to include content snippets
        const transformedReports = (reports || []).map(report => {
            const targetContent = report.target_type === 'post' 
                ? postsMap[parseInt(report.target_id)]
                : commentsMap[report.target_id];
            
            return {
                ...report,
                content: report.target_type === 'post' ? targetContent?.body : targetContent?.content,
                title: report.target_type === 'post' ? targetContent?.title : null,
                contentAuthor: targetContent?.author
            };
        });

        res.json({ reports: transformedReports });
    } catch (error) {
        console.error("Get reports error:", error);
        res.status(500).json({ 
            error: "Failed to fetch reports",
            details: error.message 
        });
    }
});

// Review a report and take action
router.post("/reports/:reportId/review", verifyToken, isAdmin, async (req, res) => {
    try {
        const { reportId } = req.params;
        const { action, details } = req.body;
        const adminId = req.user.userId;

        // Get report details
        const { data: report, error: reportError } = await supabase
            .from('reports')
            .select('target_id, target_type, user_id, reported_user_id')
            .eq('id', reportId)
            .single();

        if (reportError || !report) {
            throw new Error('Report not found');
        }

        // Start transaction by updating report status
        const { error: statusError } = await supabase
            .from('reports')
            .update({
                status: 'reviewed',
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', reportId);

        if (statusError) throw statusError;

        // Create action record
        const { error: actionError } = await supabase
            .from('report_actions')
            .insert({
                report_id: reportId,
                admin_id: adminId,
                action_type: action,
                details,
                expires_at: details.expiresAt
            });

        if (actionError) throw actionError;

        // If action involves user restrictions, apply them to the reported user
        if (action.includes('ban') || action.includes('restrict')) {
            const { error: restrictionError } = await supabase
                .from("user_restrictions")
                .insert({
                    user_id: report.reported_user_id, // Using reported_user_id for restrictions
                    restriction_type: action,
                    expires_at: details.expiresAt,
                    created_by: adminId,
                    reason: details.reason,
                    report_id: reportId
                });

            if (restrictionError) throw restrictionError;
        }

        // Handle content deletion/removal
        if (action === 'delete_post' && report.target_type === 'post') {
            // Get post details first to properly log the action
            const { data: post } = await supabase
                .from('posts')
                .select('*')
                .eq('id', report.target_id)
                .single();

            // Delete associated reactions first
            await supabase
                .from('post_reactions')
                .delete()
                .eq('post_id', report.target_id);
                
            // Get associated comments to delete their reactions
            const { data: comments } = await supabase
                .from('comments')
                .select('id')
                .eq('post_id', report.target_id);
                
            if (comments?.length > 0) {
                const commentIds = comments.map(c => c.id);
                
                // Delete comment reactions
                await supabase
                    .from('comment_reactions')
                    .delete()
                    .in('comment_id', commentIds);
                    
                // Delete comments
                await supabase
                    .from('comments')
                    .delete()
                    .eq('post_id', report.target_id);
            }
            
            // Actually delete the post completely
            await supabase
                .from('posts')
                .delete()
                .eq('id', report.target_id);    

            // Log the moderation action
            await supabase
                .from('content_moderation')
                .insert({
                    target_id: report.target_id,
                    target_type: 'post',
                    action_type: 'delete',
                    admin_id: adminId,
                    report_id: reportId,
                    details: {
                        reason: details.reason,
                        category: (await supabase
                            .from('reports')
                            .select('category')
                            .eq('id', reportId)
                            .single()).data?.category
                    }
                });
        } else if (action === 'delete_comment' && report.target_type === 'comment') {
            // Soft delete the comment by setting removed_at timestamp
            await supabase
                .from('comments')
                .update({ 
                    removed_at: new Date().toISOString() 
                })
                .eq('id', report.target_id);

            // Log the moderation action
            await supabase
                .from('content_moderation')
                .insert({
                    target_id: report.target_id,
                    target_type: 'comment',
                    action_type: 'delete',
                    admin_id: adminId,
                    report_id: reportId,
                    details: {
                        reason: details.reason,
                        category: (await supabase
                            .from('reports')
                            .select('category')
                            .eq('id', reportId)
                            .single()).data?.category
                    }
                });
        } else if (action === 'dismiss') {
            // For dismiss action, we only need to update the report status
            // We've already updated the report status to 'reviewed' above
            // and created an action record, so we're done here
        }

        res.json({ message: "Report reviewed successfully" });
    } catch (error) {
        console.error("Review report error:", error);
        // Send a more specific error message to help with debugging
        res.status(500).json({ 
            error: "Failed to review report",
            details: error.message 
        });
    }
});

// Apply restrictions to a user
router.post("/users/:userId/restrict", verifyToken, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { type, expiresAt, reason, reportId } = req.body;
        const adminId = req.user.userId;

        const { error } = await supabase
            .from("user_restrictions")
            .insert({
                user_id: userId,
                restriction_type: type,
                expires_at: expiresAt,
                created_by: adminId,
                reason,
                report_id: reportId
            });

        if (error) throw error;

        res.json({ message: "User restriction applied successfully" });
    } catch (error) {
        console.error("Restrict user error:", error);
        res.status(500).json({ error: "Failed to restrict user" });
    }
});

// Get user restrictions
router.get("/users/:userId/restrictions", verifyToken, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: restrictions, error } = await supabase
            .from("user_restrictions")
            .select(`
                *,
                admin:users!user_restrictions_created_by_fkey (
                    username,
                    display_name
                ),
                report:reports (id, category, reason)
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ restrictions });
    } catch (error) {
        console.error("Get restrictions error:", error);
        res.status(500).json({ error: "Failed to fetch user restrictions" });
    }
});

// Get admin actions
router.get("/actions", verifyToken, isAdmin, async (req, res) => {
    try {
        const { data: actions, error } = await supabase
            .from("report_actions")
            .select(`
                *,
                admin:users!report_actions_admin_id_fkey (
                    username,
                    display_name
                ),
                report:reports (
                    id,
                    category,
                    reason,
                    target_id,
                    target_type
                )
            `)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ actions });
    } catch (error) {
        console.error("Get admin actions error:", error);
        res.status(500).json({ error: "Failed to fetch admin actions" });
    }
});

// Get moderation history for content
router.get('/moderation/history', verifyToken, async (req, res) => {
    try {
        const { targetId, targetType } = req.query;
        const userId = req.user.userId;

        // Verify user is an admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (userError || !user || !user.is_admin) {
            return res.status(403).json({ error: "Unauthorized. Admin access required." });
        }

        if (!targetId || !targetType) {
            return res.status(400).json({ error: "Target ID and type are required" });
        }

        // Use the get_content_moderation_history function
        const { data, error } = await supabase
            .rpc('get_content_moderation_history', {
                p_target_id: targetId,
                p_target_type: targetType
            });

        if (error) throw error;

        res.json({
            history: data
        });
    } catch (error) {
        console.error('Get moderation history error:', error);
        res.status(500).json({
            error: 'Failed to fetch moderation history',
            details: error.message
        });
    }
});

export default router;