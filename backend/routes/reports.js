import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allowed report categories and target types
const VALID_CATEGORIES = ['Spam', 'Violence and Sex', 'Promotes Bullying', 'Other'];
const VALID_TARGET_TYPES = ['post', 'comment'];

// Rate limiting settings
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const MAX_REPORTS_PER_HOUR = 10;

// Helper to check if a target exists
async function validateTarget(targetId, targetType) {
    const table = targetType === 'post' ? 'posts' : 'comments';
    const userColumn = targetType === 'post' ? 'author_id' : 'user_id';
    
    const { data, error } = await supabase
        .from(table)
        .select(`id, deleted_at, ${userColumn}`)
        .eq('id', targetId)
        .single();

    if (error || !data) {
        return { valid: false, reason: 'Target not found' };
    }

    if (data.deleted_at) {
        return { valid: false, reason: 'Content has already been deleted' };
    }

    return { 
        valid: true, 
        reportedUserId: data[userColumn]
    };
}

// Helper to check rate limits
async function checkRateLimit(userId) {
    const oneHourAgo = new Date(Date.now() - (RATE_LIMIT_WINDOW * 1000)).toISOString();
    
    const { data, error } = await supabase
        .from('reports')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo);

    if (error) throw error;

    return {
        allowed: (data?.length || 0) < MAX_REPORTS_PER_HOUR,
        current: data?.length || 0
    };
}

// Helper to check for duplicate reports
async function checkDuplicateReport(userId, targetId) {
    const { data, error } = await supabase
        .from('reports')
        .select('id, status')
        .eq('user_id', userId)
        .eq('target_id', targetId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;

    if (data?.[0]) {
        if (data[0].status === 'pending') {
            return { isDuplicate: true, reason: 'You have already reported this content. Our moderation team will review it.' };
        }
        return { isDuplicate: true, reason: 'You have previously reported this content and it has been reviewed.' };
    }

    return { isDuplicate: false };
}

// Create a new report
router.post('/', verifyToken, async (req, res) => {
    try {
        const { targetId, targetType, category, reason } = req.body;
        const userId = req.user.userId;

        // Validate required fields
        if (!targetId || !targetType || !category) {
            return res.status(400).json({ error: 'Target ID, target type, and category are required' });
        }

        // Validate category
        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({ 
                error: 'Invalid category',
                validCategories: VALID_CATEGORIES 
            });
        }

        // Validate target type
        if (!VALID_TARGET_TYPES.includes(targetType)) {
            return res.status(400).json({
                error: 'Invalid target type',
                validTypes: VALID_TARGET_TYPES
            });
        }

        // Check rate limit
        const { allowed, current } = await checkRateLimit(userId);
        if (!allowed) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: `You can submit up to ${MAX_REPORTS_PER_HOUR} reports per hour. You have submitted ${current} reports in the last hour.`,
                resetIn: RATE_LIMIT_WINDOW
            });
        }

        // Check for duplicate reports
        const { isDuplicate, reason: duplicateReason } = await checkDuplicateReport(userId, targetId);
        if (isDuplicate) {
            return res.status(400).json({
                error: 'Duplicate report',
                message: duplicateReason
            });
        }

        // Validate target exists and is not deleted
        const { valid, reason: invalidReason, reportedUserId } = await validateTarget(targetId, targetType);
        if (!valid) {
            return res.status(400).json({
                error: 'Invalid target',
                message: invalidReason
            });
        }

        // Insert report into database
        const { data, error } = await supabase
            .from('reports')
            .insert([{
                target_id: targetId,
                target_type: targetType,
                user_id: userId,
                category,
                reason: reason || '',
                reported_user_id: reportedUserId // Add this line
            }])
            .select()
            .single();

        if (error) {
            console.error('Report creation error:', error);
            throw error;
        }

        // Return success response
        res.status(201).json({
            message: 'Report submitted successfully',
            report: data
        });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({
            error: 'Failed to submit report',
            details: error.message
        });
    }
});

// Get report categories endpoint
router.get('/categories', async (_req, res) => {
    res.json({ 
        categories: VALID_CATEGORIES.map(value => ({
            value,
            description: value === 'Other' 
                ? 'Any other concerns not covered above'
                : value === 'Spam'
                ? 'Content that is promotional, repetitive, or unrelated'
                : value === 'Violence and Sex'
                ? 'Content containing explicit violence or sexual material'
                : 'Content that encourages harassment or targets individuals'
        }))
    });
});

export default router;
