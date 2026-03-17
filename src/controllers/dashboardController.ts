import { Response } from "express";
import OAuthAccount from "../models/OAuthAccount";
import Post from "../models/Post";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

/**
 * Get dashboard statistics
 * @route GET /api/dashboard/stats
 * @access Private
 */
export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const userId = req.user.id;

    // Get all connected accounts
    const connectedAccounts = await OAuthAccount.find({ userId }).lean();

    // Return sample data if no accounts connected
    if (connectedAccounts.length === 0) {
      const sampleStats = {
        totalFollowers: 19470,
        postsThisMonth: 12,
        engagementRate: 4.28,
        accounts: [
          {
            id: "sample_1",
            platform: "facebook" as const,
            username: "John Doe Facebook",
            followers: 1250,
            isConnected: true,
          },
          {
            id: "sample_2",
            platform: "instagram" as const,
            username: "john.doe.insta",
            followers: 5420,
            isConnected: true,
          },
          {
            id: "sample_3",
            platform: "tiktok" as const,
            username: "johndoe_tiktok",
            followers: 12800,
            isConnected: true,
          },
        ],
        upcomingPosts: [
          {
            id: "post_1",
            accountId: "sample_1",
            platform: "instagram" as const,
            content:
              "Check out our latest product launch! 🚀 Excited to share this with everyone.",
            scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            status: "scheduled" as const,
            engagement: {
              likes: 245,
              comments: 32,
              shares: 18,
            },
          },
          {
            id: "post_2",
            accountId: "sample_2",
            platform: "facebook" as const,
            content:
              "Join us for an exclusive webinar next week. Limited spots available!",
            scheduledTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            status: "scheduled" as const,
            engagement: {
              likes: 128,
              comments: 24,
              shares: 12,
            },
          },
          {
            id: "post_3",
            accountId: "sample_3",
            platform: "tiktok" as const,
            content: "Behind the scenes content coming tomorrow! Stay tuned 👀",
            scheduledTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            status: "draft" as const,
            engagement: {
              likes: 0,
              comments: 0,
              shares: 0,
            },
          },
        ],
      };
      res.status(200).json(sampleStats);
      return;
    }

    // Calculate total followers across all accounts
    const totalFollowers = connectedAccounts.reduce(
      (sum, acc) => sum + (acc.profileData?.followers || 0),
      0,
    );

    // Get posts from this month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const postsThisMonth = await Post.countDocuments({
      userId,
      publishedTime: {
        $gte: currentMonth,
        $lt: nextMonth,
      },
      status: "published",
    });

    // Calculate engagement rate (total engagements / total followers * 100)
    const allPosts = await Post.find({
      userId,
      status: "published",
      publishedTime: {
        $gte: currentMonth,
        $lt: nextMonth,
      },
    })
      .select("engagement")
      .lean();

    const totalEngagements = allPosts.reduce((sum, post) => {
      const engagement = post.engagement as any;
      return (
        sum +
        (engagement.likes || 0) +
        (engagement.comments || 0) +
        (engagement.shares || 0)
      );
    }, 0);

    const engagementRate =
      totalFollowers > 0
        ? ((totalEngagements / totalFollowers) * 100).toFixed(2)
        : "0.00";

    // Get upcoming posts (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    let upcomingPosts = await Post.find({
      userId,
      status: { $in: ["scheduled", "draft"] },
      scheduledTime: {
        $gte: new Date(),
        $lte: nextWeek,
      },
    })
      .sort({ scheduledTime: 1 })
      .limit(5)
      .lean();

    // If no upcoming posts exist, use sample data
    if (upcomingPosts.length === 0) {
      upcomingPosts = [
        {
          _id: "post_sample_1",
          userId: userId,
          accountId: connectedAccounts[0]?._id?.toString() || "sample_1",
          platform: "instagram",
          content: "Check out our latest product launch! 🚀 Excited to share this with everyone.",
          scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: "scheduled",
          engagement: {
            likes: 245,
            comments: 32,
            shares: 18,
          },
        },
        {
          _id: "post_sample_2",
          userId: userId,
          accountId: connectedAccounts[1]?._id?.toString() || "sample_2",
          platform: "facebook",
          content: "Join us for an exclusive webinar next week. Limited spots available!",
          scheduledTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          status: "scheduled",
          engagement: {
            likes: 128,
            comments: 24,
            shares: 12,
          },
        },
        {
          _id: "post_sample_3",
          userId: userId,
          accountId: connectedAccounts[2]?._id?.toString() || "sample_3",
          platform: "tiktok",
          content: "Behind the scenes content coming tomorrow! Stay tuned 👀",
          scheduledTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          status: "draft",
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
          },
        },
      ] as any;
    }

    res.status(200).json({
      totalFollowers,
      postsThisMonth,
      engagementRate: parseFloat(engagementRate),
      accounts: connectedAccounts.map((acc) => ({
        id: acc._id,
        platform: acc.platform,
        username: acc.accountName,
        followers: acc.profileData?.followers || 0,
        isConnected: true,
      })),
      upcomingPosts: upcomingPosts.map((post) => ({
        id: post._id,
        accountId: post.accountId,
        platform: post.platform,
        content:
          post.content.substring(0, 100) +
          (post.content.length > 100 ? "..." : ""),
        scheduledTime: post.scheduledTime,
        status: post.status,
        engagement: post.engagement,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard stats", error });
  }
};

/**
 * Get upcoming posts with pagination and filtering
 * @route GET /api/dashboard/posts/upcoming
 * @access Private
 * @query limit - Number of posts to return (default: 10)
 * @query offset - Number of posts to skip (default: 0)
 * @query platform - Filter by platform (facebook, instagram, tiktok)
 */
export const getUpcomingPosts = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const platform = req.query.platform as string | undefined;

    // Build query
    const query: any = {
      userId,
      scheduledTime: { $gte: new Date() },
      status: { $in: ["scheduled", "draft"] },
    };

    if (platform && ["facebook", "instagram", "tiktok"].includes(platform)) {
      query.platform = platform;
    }

    // Get total count
    const total = await Post.countDocuments(query);

    // Return sample data if no posts exist
    if (total === 0) {
      const samplePosts = [
        {
          id: "post_1",
          accountId: "account_fb_123",
          platform: "instagram" as const,
          content: "Check out our latest product launch! 🚀 Excited to share this with everyone.",
          scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: "scheduled" as const,
          engagement: {
            likes: 245,
            comments: 32,
            shares: 18,
          },
        },
        {
          id: "post_2",
          accountId: "account_fb_456",
          platform: "facebook" as const,
          content: "Join us for an exclusive webinar next week. Limited spots available!",
          scheduledTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          status: "scheduled" as const,
          engagement: {
            likes: 128,
            comments: 24,
            shares: 12,
          },
        },
        {
          id: "post_3",
          accountId: "account_tiktok_789",
          platform: "tiktok" as const,
          content: "Behind the scenes content coming tomorrow! Stay tuned 👀",
          scheduledTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          status: "draft" as const,
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
          },
        },
        {
          id: "post_4",
          accountId: "account_ig_101",
          platform: "instagram" as const,
          content: "Summer collection is now live! Discover the new designs 🌞",
          scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: "scheduled" as const,
          engagement: {
            likes: 512,
            comments: 48,
            shares: 35,
          },
        },
        {
          id: "post_5",
          accountId: "account_tiktok_202",
          platform: "tiktok" as const,
          content: "How we made this viral sound 🎵 #BTS",
          scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: "draft" as const,
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
          },
        },
      ];

      res.status(200).json({
        posts: samplePosts,
        pagination: {
          total: samplePosts.length,
          limit,
          offset,
          hasMore: false,
        },
      });
      return;
    }

    // Get posts
    const posts = await Post.find(query)
      .sort({ scheduledTime: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.status(200).json({
      posts: posts.map((post) => ({
        id: post._id,
        accountId: post.accountId,
        platform: post.platform,
        content: post.content,
        scheduledTime: post.scheduledTime,
        status: post.status,
        engagement: post.engagement,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching upcoming posts:", error);
    res.status(500).json({ message: "Error fetching upcoming posts", error });
  }
};
