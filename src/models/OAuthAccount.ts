import mongoose, { Schema, Document, Types } from "mongoose";

interface IProfileData {
  profilePicture?: string;
  followers?: number;
  verified?: boolean;
  bio?: string;
  email?: string;
  [key: string]: any;
}

interface IOAuthAccount extends Document {
  userId: Types.ObjectId;
  platform: "google" | "github" | "facebook" | "instagram" | "tiktok";
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  profileData?: IProfileData;
  connectedAt?: Date;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const profileDataSchema = new Schema<IProfileData>(
  {
    profilePicture: String,
    followers: Number,
    verified: Boolean,
    bio: String,
    email: String,
  },
  { strict: false },
);

const oauthAccountSchema = new Schema<IOAuthAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      enum: ["google", "github", "facebook", "instagram", "tiktok"],
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
      select: false, // Don't return token by default for security
    },
    refreshToken: {
      type: String,
      select: false,
    },
    expiresAt: {
      type: Date,
    },
    profileData: profileDataSchema,
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Create unique index for userId + platform combination
oauthAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });

const OAuthAccount = mongoose.model<IOAuthAccount>(
  "OAuthAccount",
  oauthAccountSchema,
);

export default OAuthAccount;
