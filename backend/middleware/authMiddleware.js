import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token.' });
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