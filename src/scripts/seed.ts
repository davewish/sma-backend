import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";
import OAuthAccount from "../models/OAuthAccount";
import Post from "../models/Post";

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/sma-backend";
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await OAuthAccount.deleteMany({});
    await Post.deleteMany({});
    console.log("Cleared existing data");

    // Create sample user
    const user = await User.create({
      name: "Admin User",
      email: "admin@demo.com",
      password: "admin123",
      isVerified: true,
    });
    console.log("Created sample user:", user._id);

    // Create sample OAuth accounts
    const facebookAccount = await OAuthAccount.create({
      userId: user._id,
      platform: "facebook",
      accountId: "facebook-123456",
      accountName: "John Doe Facebook",
      accessToken: "fb_access_token_sample_12345",
      refreshToken: "fb_refresh_token_sample_12345",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      profileData: {
        profilePicture: "https://via.placeholder.com/150?text=Facebook",
        followers: 1250,
        verified: true,
        email: "john@facebook.com",
      },
      lastSyncedAt: new Date(),
    });
    console.log("Created Facebook account:", facebookAccount._id);

    const instagramAccount = await OAuthAccount.create({
      userId: user._id,
      platform: "instagram",
      accountId: "instagram-789012",
      accountName: "john.doe.insta",
      accessToken: "ig_access_token_sample_789",
      refreshToken: "ig_refresh_token_sample_789",
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      profileData: {
        profilePicture: "https://via.placeholder.com/150?text=Instagram",
        followers: 5420,
        verified: true,
        bio: "Social media enthusiast 📸",
      },
      lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });
    console.log("Created Instagram account:", instagramAccount._id);

    const tiktokAccount = await OAuthAccount.create({
      userId: user._id,
      platform: "tiktok",
      accountId: "tiktok-345678",
      accountName: "johndoe_tiktok",
      accessToken: "tt_access_token_sample_345",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      profileData: {
        profilePicture: "https://via.placeholder.com/150?text=TikTok",
        followers: 12800,
        verified: false,
        bio: "Content creator 🎥",
      },
      lastSyncedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    });
    console.log("Created TikTok account:", tiktokAccount._id);

    // Create sample posts
    const post1 = await Post.create({
      userId: user._id,
      accountId: facebookAccount._id.toString(),
      platform: "facebook",
      content:
        "Check out our latest product launch! 🚀 Excited to share this with everyone.",
      scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "scheduled",
      engagement: {
        likes: 245,
        comments: 32,
        shares: 18,
      },
    });
    console.log("Created Post 1:", post1._id);

    const post2 = await Post.create({
      userId: user._id,
      accountId: instagramAccount._id.toString(),
      platform: "instagram",
      content: "Summer collection is now live! Discover the new designs 🌞",
      scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      publishedTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "published",
      engagement: {
        likes: 512,
        comments: 48,
        shares: 35,
      },
    });
    console.log("Created Post 2:", post2._id);

    const post3 = await Post.create({
      userId: user._id,
      accountId: tiktokAccount._id.toString(),
      platform: "tiktok",
      content: "Behind the scenes content coming tomorrow! Stay tuned 👀",
      scheduledTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: "draft",
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });
    console.log("Created Post 3:", post3._id);

    const post4 = await Post.create({
      userId: user._id,
      accountId: instagramAccount._id.toString(),
      platform: "instagram",
      content:
        "Join us for an exclusive webinar next week. Limited spots available! 📚",
      scheduledTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: "scheduled",
      engagement: {
        likes: 128,
        comments: 24,
        shares: 12,
      },
    });
    console.log("Created Post 4:", post4._id);

    const post5 = await Post.create({
      userId: user._id,
      accountId: tiktokAccount._id.toString(),
      platform: "tiktok",
      content: "How we made this viral sound 🎵 #BTS",
      scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      publishedTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: "published",
      engagement: {
        likes: 1250,
        comments: 156,
        shares: 89,
      },
    });
    console.log("Created Post 5:", post5._id);

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\nSample User Credentials:");
    console.log("Email: admin@demo.com");
    console.log("Password: admin123");
    console.log("\nConnected Accounts:");
    console.log("- Facebook: John Doe Facebook (1,250 followers)");
    console.log("- Instagram: john.doe.insta (5,420 followers)");
    console.log("- TikTok: johndoe_tiktok (12,800 followers)");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
