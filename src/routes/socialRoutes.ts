import express from "express";
import passport from "passport";
import {
  handleSocialCallback,
  getConnectedAccounts,
  disconnectAccount,
  refreshOAuthToken,
} from "../controllers/socialController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = express.Router();

// All social routes require authentication
router.use(authenticateJWT as any);

/**
 * Get all connected social accounts
 * GET /api/social/accounts
 */
router.get("/accounts", getConnectedAccounts as any);

/**
 * Disconnect a social account
 * DELETE /api/social/disconnect/:platform
 */
router.delete("/disconnect/:platform", disconnectAccount as any);

/**
 * Refresh OAuth token
 * POST /api/social/refresh/:platform
 */
router.post("/refresh/:platform", refreshOAuthToken as any);

/**
 * Connect Facebook account
 * User clicks "Connect Facebook" → redirects to Facebook OAuth
 * GET /api/social/connect/facebook
 */
router.get(
  "/connect/facebook",
  passport.authenticate("facebook", {
    scope: ["email", "public_profile"],
    session: false,
  }),
);

/**
 * Facebook OAuth callback
 * Facebook redirects back here with code
 * GET /api/social/callback/facebook?code=xxx
 */
router.get(
  "/callback/facebook",
  passport.authenticate("facebook", { session: false }),
  handleSocialCallback as any,
);

/**
 * Connect Instagram account
 * GET /api/social/connect/instagram
 */
router.get(
  "/connect/instagram",
  passport.authenticate("instagram", {
    scope: ["user_profile", "user_media"],
    session: false,
  }),
);

/**
 * Instagram OAuth callback
 * GET /api/social/callback/instagram?code=xxx
 */
router.get(
  "/callback/instagram",
  passport.authenticate("instagram", { session: false }),
  handleSocialCallback as any,
);

/**
 * Connect TikTok account
 * GET /api/social/connect/tiktok
 */
router.get(
  "/connect/tiktok",
  passport.authenticate("tiktok", {
    scope: ["user.info.basic"],
    session: false,
  }),
);

/**
 * TikTok OAuth callback
 * GET /api/social/callback/tiktok?code=xxx
 */
router.get(
  "/callback/tiktok",
  passport.authenticate("tiktok", { session: false }),
  handleSocialCallback as any,
);

export default router;
