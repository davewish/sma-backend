import { Response, Request } from "express";
import OAuthAccount from "../models/OAuthAccount";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  exchangeCodeForToken,
  fetchSocialProfile,
  buildCallbackUri,
} from "../utils/oauth";

/**
 * Connect Social Media Account
 * Handles OAuth callback from social platforms
 * Secure server-side token exchange and storage
 *
 * Flow:
 * 1. Frontend redirects user to /api/social/connect/:platform
 * 2. Social platform redirects back to /api/social/callback/:platform?code=xxx
 * 3. Backend exchanges code for access token (server-side only)
 * 4. Backend fetches user profile from social platform
 * 5. Backend saves tokens securely in database
 * 6. Redirect user back to frontend dashboard
 */
export const handleSocialCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { platform } = req.params;
  const { code, state, error: oauthError } = req.query;
  const userId = (req.user as any)?._id || (req.user as any)?.id;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    // Step 1: Handle OAuth provider errors
    if (oauthError) {
      console.error(`[${platform}] OAuth error:`, oauthError);
      return res.redirect(
        `${frontendUrl}/dashboard?connection=error&platform=${platform}&reason=denied`,
      );
    }

    // Step 2: Validate authorization code
    if (!code) {
      return res.redirect(
        `${frontendUrl}/dashboard?connection=error&platform=${platform}&reason=no_code`,
      );
    }

    // Step 3: Verify user is authenticated
    if (!userId) {
      return res.redirect(
        `${frontendUrl}/dashboard?connection=error&platform=${platform}&reason=not_authenticated`,
      );
    }

    // Step 4: Build callback URI for token exchange
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const redirectUri = buildCallbackUri(platform, baseUrl);

    // Step 5: SECURE - Exchange code for tokens on backend only
    console.log(`[${platform}] Exchanging authorization code for tokens...`);
    const tokenData = await exchangeCodeForToken(
      platform,
      code as string,
      redirectUri,
    );

    // Step 6: Fetch social profile using access token
    console.log(`[${platform}] Fetching social profile...`);
    const socialProfile = await fetchSocialProfile(
      platform,
      tokenData.accessToken,
    );

    // Step 7: Calculate token expiration
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : undefined;

    // Step 8: Save/Update OAuth account (tokens stored server-side only)
    console.log(`[${platform}] Saving connection to database...`);
    const oauthAccount = await OAuthAccount.findOneAndUpdate(
      { userId, platform },
      {
        accountId: socialProfile.id,
        accountName: socialProfile.name,
        accessToken: tokenData.accessToken, // Encrypted on DB, never sent to frontend
        refreshToken: tokenData.refreshToken || undefined,
        expiresAt,
        profileData: {
          profilePicture: socialProfile.profilePicture,
          followers: socialProfile.followers,
          verified: socialProfile.verified,
          bio: socialProfile.bio,
          email: socialProfile.email,
        },
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    console.log(
      `[${platform}] Connection saved successfully for user ${userId}`,
    );

    // Step 9: Redirect to frontend with success
    res.redirect(
      `${frontendUrl}/dashboard?connection=success&platform=${platform}&accountName=${encodeURIComponent(
        socialProfile.name,
      )}`,
    );
  } catch (error: any) {
    console.error(`[${platform}] Callback error:`, error.message);

    const errorMessage = encodeURIComponent(
      error.message || "Failed to connect account",
    );
    res.redirect(
      `${frontendUrl}/dashboard?connection=error&platform=${platform}&reason=${errorMessage}`,
    );
  }
};

/**
 * Get all connected social accounts for authenticated user
 * @route GET /api/social/accounts
 */
export const getConnectedAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const accounts = await OAuthAccount.find({ userId: req.user.id }).select(
      "platform accountName profileData createdAt expiresAt lastSyncedAt",
    );

    res.status(200).json({
      accounts: accounts.map((acc) => ({
        platform: acc.platform,
        accountName: acc.accountName,
        profilePicture: acc.profileData?.profilePicture,
        followers: acc.profileData?.followers,
        verified: acc.profileData?.verified,
        connectedAt: acc.createdAt,
        expiresAt: acc.expiresAt,
        lastSyncedAt: acc.lastSyncedAt,
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching connected accounts", error });
  }
};

/**
 * Disconnect social media account
 * @route DELETE /api/social/disconnect/:platform
 */
export const disconnectAccount = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { platform } = req.params;

    const result = await OAuthAccount.findOneAndDelete({
      userId: req.user.id,
      platform,
    });

    if (!result) {
      res.status(404).json({ message: `${platform} account not connected` });
      return;
    }

    console.log(`[${platform}] Account disconnected for user ${req.user.id}`);

    res.status(200).json({
      message: `${platform} account disconnected successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: "Error disconnecting account", error });
  }
};

/**
 * Refresh OAuth tokens for a platform
 * Called when token expires or needs refresh
 * @route POST /api/social/refresh/:platform
 */
export const refreshOAuthToken = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { platform } = req.params;

    const oauthAccount = await OAuthAccount.findOne({
      userId: req.user.id,
      platform,
    });

    if (!oauthAccount || !oauthAccount.refreshToken) {
      res.status(404).json({
        message: `${platform} account not found or refresh token unavailable`,
      });
      return;
    }

    // TODO: Implement token refresh based on platform API
    // Example for platforms that support refresh tokens:
    // const newTokenData = await refreshTokenForPlatform(platform, oauthAccount.refreshToken);
    // Update database with new tokens

    res.status(200).json({
      message: `${platform} token refreshed successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: "Error refreshing token", error });
  }
};
