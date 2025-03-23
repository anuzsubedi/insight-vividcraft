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
import mentionsRoutes from "./routes/mentions.js";
import notificationsRoutes from "./routes/notifications.js";
import permissionsRoutes from "./routes/permissions.js";
import usersRoutes from "./routes/users.js";
import { createServer } from 'http';
import NotificationWebSocketServer from './websocket/notificationServer.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = createServer(app);

// Initialize WebSocket server
const notificationServer = new NotificationWebSocketServer(server);

// Apply middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
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
app.use("/api/mentions", mentionsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/users", usersRoutes);

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
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
