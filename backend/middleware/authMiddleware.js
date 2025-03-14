import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabaseClient.js';

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
            userId: user.id,
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

        // Verify user exists and is active in database
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, email')
            .eq('id', decoded.userId)
            .single();

        if (!error && user) {
            req.user = {
                userId: user.id,
                username: user.username,
                email: user.email
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