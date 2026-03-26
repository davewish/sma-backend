import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "passport";
import connectDB from "./config/database";
import "./config/passport";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import socialRoutes from "./routes/socialRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import postRoutes from "./routes/postRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Database connection
connectDB();

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Social routes
app.use("/api/social", socialRoutes);

// Dashboard routes
app.use("/api/dashboard", dashboardRoutes);

// Post routes
app.use("/api/posts", postRoutes);

// User routes
app.use("/api/users", userRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
