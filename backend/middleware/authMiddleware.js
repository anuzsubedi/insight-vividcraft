import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabaseClient.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const verifyUserInDb = async (userId, retries = 0) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, email, is_admin')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        return { user, error: null };
    } catch (error) {
        if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return verifyUserInDb(userId, retries + 1);
        }
        return { user: null, error };
    }
};

export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists and is active in database with retries
        const { user, error } = await verifyUserInDb(decoded.userId);
        
        if (error || !user) {
            console.error('User verification error:', error || 'User not found');
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = {
            userId: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.is_admin || false
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

// Optional authentication middleware - sets user if token present but doesn't reject if not
export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // If no auth header, just continue without setting user
    if (!authHeader?.startsWith('Bearer ')) {
        return next();
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists with retries
        const { user, error } = await verifyUserInDb(decoded.userId);
        
        if (!error && user) {
            req.user = {
                userId: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin || false
            };
        }
        next();
    } catch (error) {
        // For optional auth, just continue without setting user on error
        next();
    }
};

export const generateToken = (user) => {
    return jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

export default verifyToken;