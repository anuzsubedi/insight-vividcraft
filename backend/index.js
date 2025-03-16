import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import socialRoutes from "./routes/social.js";
import postRoutes from "./routes/posts.js";
import categoriesRoutes from "./routes/categories.js";
import feedRoutes from "./routes/feed.js";
import commentsRouter from "./routes/comments.js";
import searchRoutes from "./routes/search.js";
import reportsRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply middleware
app.use(cors({
    origin: 'http://localhost:5173', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/comments", commentsRouter);
app.use("/api/search", searchRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (_req, res) => {
    res.status(200).json({
        status: "success",
        message: "Backend is running..."
    });
});

// Health check endpoint
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR]', {
        method: req.method,
        url: req.url,
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name
        }
    });
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
