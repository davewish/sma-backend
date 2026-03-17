import mongoose, { Document, Schema } from "mongoose";

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  accountId: string;
  platform: "facebook" | "instagram" | "tiktok";
  content: string;
  scheduledTime: Date;
  publishedTime?: Date;
  status: "published" | "scheduled" | "draft";
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  mediaUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["facebook", "instagram", "tiktok"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    publishedTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["published", "scheduled", "draft"],
      default: "draft",
    },
    engagement: {
      likes: {
        type: Number,
        default: 0,
      },
      comments: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
    },
    mediaUrls: {
      type: [String],
    },
  },
  { timestamps: true },
);

// Compound index for user posts
postSchema.index({ userId: 1, status: 1, scheduledTime: -1 });
postSchema.index({ userId: 1, platform: 1 });

export default mongoose.model<IPost>("Post", postSchema);
