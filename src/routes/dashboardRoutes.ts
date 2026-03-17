import express from "express";
import {
  getDashboardStats,
  getUpcomingPosts,
} from "../controllers/dashboardController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateJWT as any);

/**
 * Get dashboard statistics
 * @route GET /api/dashboard/stats
 */
router.get("/stats", getDashboardStats as any);

/**
 * Get upcoming posts with pagination
 * @route GET /api/dashboard/posts/upcoming
 * @query limit - number (default: 10)
 * @query offset - number (default: 0)
 * @query platform - string (facebook|instagram|tiktok)
 */
router.get("/posts/upcoming", getUpcomingPosts as any);

export default router;
