import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new report
router.post('/', verifyToken, async (req, res) => {
  try {
    const { postId, category, reason } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!postId || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert report into database
    const { data, error } = await supabase
      .from('reports')
      .insert([{
        post_id: postId,
        user_id: userId,
        category,
        reason: reason || '',
        status: 'pending', // Default status
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

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

export default router;
