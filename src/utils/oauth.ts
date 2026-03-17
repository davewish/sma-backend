import axios from "axios";

interface TokenExchangeResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface SocialProfile {
  id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  username?: string;
  verified?: boolean;
  followers?: number;
  bio?: string;
}

const OAUTH_CONFIG: Record<
  string,
  { tokenEndpoint: string; profileEndpoint: string; fields?: string }
> = {
  facebook: {
    tokenEndpoint: "https://graph.instagram.com/v18.0/oauth/access_token",
    profileEndpoint: "https://graph.instagram.com/me",
    fields: "id,name,email,picture.type(large)",
  },
  instagram: {
    tokenEndpoint: "https://graph.instagram.com/v18.0/oauth/access_token",
    profileEndpoint: "https://graph.instagram.com/me",
    fields:
      "id,username,name,biography,profile_picture_url,followers_count,ig_id",
  },
  tiktok: {
    tokenEndpoint: "https://open.tiktokapis.com/v2/oauth/token/",
    profileEndpoint: "https://open.tiktokapis.com/v2/user/info/",
  },
  google: {
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    profileEndpoint: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  github: {
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    profileEndpoint: "https://api.github.com/user",
  },
};

/**
 * Exchange OAuth authorization code for access token
 */
export const exchangeCodeForToken = async (
  platform: string,
  code: string,
  redirectUri: string,
): Promise<TokenExchangeResponse> => {
  try {
    const config = OAUTH_CONFIG[platform as keyof typeof OAUTH_CONFIG];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      throw new Error(
        `Missing credentials for ${platform}. Set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET`,
      );
    }

    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    };

    // For GitHub, use Accept header
    const headers = platform === "github" ? { Accept: "application/json" } : {};

    const response = await axios.post(config.tokenEndpoint, payload, {
      headers,
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    console.error(`Token exchange error for ${platform}:`, error);
    throw error;
  }
};

/**
 * Fetch user profile from social platform
 */
export const fetchSocialProfile = async (
  platform: string,
  accessToken: string,
): Promise<SocialProfile> => {
  try {
    const config = OAUTH_CONFIG[platform as keyof typeof OAUTH_CONFIG];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    let url = config.profileEndpoint;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Add fields parameter for Instagram/Facebook
    if (platform === "instagram" || platform === "facebook") {
      if (config.fields) {
        url += `?fields=${config.fields}`;
      }
    }

    // For GitHub, set Accept header
    if (platform === "github") {
      headers["Accept"] = "application/vnd.github.v3+json";
    }

    const response = await axios.get(url, { headers });
    const data = response.data;

    // Extract profile data based on platform
    const profile: SocialProfile = {
      id: data.id || data.sub,
      name: data.name || data.username || "User",
      email: data.email,
      username: data.username || data.login,
      verified: data.verified,
      bio: data.biography || data.bio,
    };

    // Platform-specific field mapping
    if (platform === "instagram") {
      profile.profilePicture = data.profile_picture_url;
      profile.followers = data.followers_count;
    } else if (platform === "facebook") {
      profile.profilePicture = data.picture?.data?.url;
    } else if (platform === "tiktok") {
      profile.profilePicture = data.avatar_url;
      profile.followers = data.follower_count;
    } else if (platform === "github") {
      profile.profilePicture = data.avatar_url;
    }

    return profile;
  } catch (error) {
    console.error(`Profile fetch error for ${platform}:`, error);
    throw error;
  }
};

/**
 * Validate token expiration and determine if refresh is needed
 */
export const isTokenExpired = (expiresAt?: Date): boolean => {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
};

/**
 * Build callback redirect URI
 */
export const buildCallbackUri = (platform: string, baseUrl: string): string => {
  return `${baseUrl}/api/auth/callback/${platform}`;
};
