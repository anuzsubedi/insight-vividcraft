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
import requestLogger from "./middleware/requestLogger.js";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);  // Add request logging before routes

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/comments", commentsRouter);
app.use("/api/search", searchRoutes);

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
        params: req.params,
        query: req.query,
        body: req.body,
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
