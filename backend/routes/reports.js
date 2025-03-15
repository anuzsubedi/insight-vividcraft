import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allowed report categories
const VALID_CATEGORIES = ['Spam', 'Violence and Sex', 'Promotes Bullying', 'Other'];
const VALID_TARGET_TYPES = ['post', 'comment'];

// Create a new report
router.post('/', verifyToken, async (req, res) => {
  try {
    const { targetId, targetType, category, reason } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!targetId || !targetType || !category) {
      return res.status(400).json({ error: 'Target ID, target type, and category are required' });
    }

    // Validate category and target type
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        validCategories: VALID_CATEGORIES 
      });
    }

    if (!VALID_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({
        error: 'Invalid target type',
        validTypes: VALID_TARGET_TYPES
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
