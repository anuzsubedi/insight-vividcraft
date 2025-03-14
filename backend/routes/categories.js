import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all categories
router.get("/", async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;

        return res.status(200).json({ categories });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch categories" });
    }
});

export default router;