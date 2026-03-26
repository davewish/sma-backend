import express from "express";
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/postController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = express.Router();

// All post routes require authentication
router.use(authenticateJWT as any);

/**
 * Get all posts for authenticated user with pagination
 * @route GET /api/posts
 * @query limit - number (max: 100, default: 20)
 * @query offset - number (default: 0)
 */
router.get("/", getAllPosts as any);

/**
 * Get post by ID
 * @route GET /api/posts/:id
 */
router.get("/:id", getPostById as any);

/**
 * Create a new post
 * @route POST /api/posts
 * @body accountId - string (required)
 * @body platform - string (facebook|instagram|tiktok, required)
 * @body content - string (required)
 * @body scheduledTime - date (required)
 * @body status - string (published|scheduled|draft, default: draft)
 * @body mediaUrls - array of strings (optional)
 */
router.post("/", createPost as any);

/**
 * Update a post
 * @route PUT /api/posts/:id
 */
router.put("/:id", updatePost as any);

/**
 * Delete a post
 * @route DELETE /api/posts/:id
 */
router.delete("/:id", deletePost as any);

export default router;
