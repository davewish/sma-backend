import { Response } from "express";
import Post from "../models/Post";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

/**
 * Get all posts for authenticated user with pagination
 * @route GET /api/posts
 * @access Private
 * @query limit - number (max: 100, default: 20)
 * @query offset - number (default: 0)
 */
export const getAllPosts = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Get total count
    const total = await Post.countDocuments({ userId });

    // Get posts with pagination
    const posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.status(200).json({
      data: posts.map((post) => ({
        id: post._id,
        userId: post.userId,
        accountId: post.accountId,
        platform: post.platform,
        content: post.content,
        scheduledTime: post.scheduledTime,
        publishedTime: post.publishedTime,
        status: post.status,
        engagement: post.engagement,
        mediaUrls: post.mediaUrls,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error });
  }
};

/**
 * Get post by ID
 * @route GET /api/posts/:id
 * @access Private
 */
export const getPostById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const post = await Post.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json({
      id: post._id,
      userId: post.userId,
      accountId: post.accountId,
      platform: post.platform,
      content: post.content,
      scheduledTime: post.scheduledTime,
      publishedTime: post.publishedTime,
      status: post.status,
      engagement: post.engagement,
      mediaUrls: post.mediaUrls,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error });
  }
};

/**
 * Create a new post
 * @route POST /api/posts
 * @access Private
 */
export const createPost = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const {
      accountId,
      platform,
      content,
      scheduledTime,
      status = "draft",
      mediaUrls,
    } = req.body;

    // Validation
    if (!accountId || !platform || !content || !scheduledTime) {
      res.status(400).json({
        message: "accountId, platform, content, and scheduledTime are required",
      });
      return;
    }

    if (!["facebook", "instagram", "tiktok"].includes(platform)) {
      res.status(400).json({
        message: "Invalid platform. Must be: facebook, instagram, or tiktok",
      });
      return;
    }

    if (!["published", "scheduled", "draft"].includes(status)) {
      res.status(400).json({
        message: "Invalid status. Must be: published, scheduled, or draft",
      });
      return;
    }

    const post = new Post({
      userId: req.user.id,
      accountId,
      platform,
      content,
      scheduledTime: new Date(scheduledTime),
      status,
      mediaUrls: mediaUrls || [],
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });

    await post.save();

    res.status(201).json({
      message: "Post created successfully",
      data: {
        id: post._id,
        userId: post.userId,
        accountId: post.accountId,
        platform: post.platform,
        content: post.content,
        scheduledTime: post.scheduledTime,
        status: post.status,
        engagement: post.engagement,
        mediaUrls: post.mediaUrls,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error });
  }
};

/**
 * Update a post
 * @route PUT /api/posts/:id
 * @access Private
 */
export const updatePost = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true },
    );

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json({
      message: "Post updated successfully",
      data: {
        id: post._id,
        userId: post.userId,
        accountId: post.accountId,
        platform: post.platform,
        content: post.content,
        scheduledTime: post.scheduledTime,
        publishedTime: post.publishedTime,
        status: post.status,
        engagement: post.engagement,
        mediaUrls: post.mediaUrls,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating post", error });
  }
};

/**
 * Delete a post
 * @route DELETE /api/posts/:id
 * @access Private
 */
export const deletePost = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting post", error });
  }
};
