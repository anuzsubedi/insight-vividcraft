import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allowed report categories
const VALID_CATEGORIES = ['Spam', 'Violence and Sex', 'Promotes Bullying', 'Other'];

// Create a new report
router.post('/', verifyToken, async (req, res) => {
  try {
    const { postId, category, reason } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!postId || !category) {
      return res.status(400).json({ error: 'Post ID and category are required' });
    }

    // Validate category is one of the allowed values
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        validCategories: VALID_CATEGORIES 
      });
    }

    // Insert report into database
    const { data, error } = await supabase
      .from('reports')
      .insert([{
        post_id: postId,
        user_id: userId,
        category,
        reason: reason || '', // Ensure reason has a default empty string
        // created_at will be set automatically by Supabase default value
      }])
      .select()
      .single();

    if (error) {
      console.error('Report creation error:', error);
      throw error;
    }

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
