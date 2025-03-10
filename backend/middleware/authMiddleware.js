import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabaseClient.js';

export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    // console.log('Auth header:', authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists and is active in database
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, email')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            console.error('User verification error:', error || 'User not found');
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = {
            userId: user.id, // Use the ID from database, not from token
            username: user.username,
            email: user.email
        };

        next();
    } catch (error) {
        console.error('Token verification error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Authentication error' });
    }
};

export const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            username: user.username
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

export default verifyToken;