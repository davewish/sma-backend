export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  githubId?: string;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuthRequest {
  email: string;
  password?: string;
  name?: string;
}

export interface IJwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface ISocialProfile {
  id: string;
  name: string;
  email?: string;
  username?: string;
  profilePicture?: string;
  verified?: boolean;
  followers?: number;
  bio?: string;
}

export interface IOAuthAccount {
  _id?: string;
  userId: string;
  platform: "facebook" | "instagram" | "tiktok" | "twitter" | "linkedin";
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  profileData?: ISocialProfile;
  lastSyncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IConnectSocialRequest {
  code: string;
  state?: string;
}

export interface ISocialResponse {
  message: string;
  account?: IOAuthAccount;
  accounts?: IOAuthAccount[];
}

export interface IPost {
  _id?: string;
  userId: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDashboardStats {
  totalFollowers: number;
  postsThisMonth: number;
  engagementRate: number;
  accounts: Array<{
    id: string;
    platform: "facebook" | "instagram" | "tiktok";
    username: string;
    followers: number;
    isConnected: boolean;
  }>;
  upcomingPosts: Array<{
    id: string;
    accountId: string;
    platform: "facebook" | "instagram" | "tiktok";
    content: string;
    scheduledTime: Date;
    status: "published" | "scheduled" | "draft";
    engagement: {
      likes: number;
      comments: number;
      shares: number;
    };
  }>;
}

export interface IUpcomingPostsResponse {
  posts: Array<{
    id: string;
    accountId: string;
    platform: "facebook" | "instagram" | "tiktok";
    content: string;
    scheduledTime: Date;
    status: "published" | "scheduled" | "draft";
    engagement: {
      likes: number;
      comments: number;
      shares: number;
    };
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
