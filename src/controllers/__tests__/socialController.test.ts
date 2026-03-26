import { Response, Request } from "express";
import {
  handleSocialCallback,
  getConnectedAccounts,
  disconnectAccount,
  refreshOAuthToken,
} from "../socialController";
import OAuthAccount from "../../models/OAuthAccount";
import * as oauthUtils from "../../utils/oauth";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";

jest.mock("../../models/OAuthAccount");
jest.mock("../../utils/oauth");

const MockedOAuthAccount = OAuthAccount as jest.Mocked<typeof OAuthAccount>;

const createMockRequest = (overrides = {}): Request => {
  return {
    params: {},
    query: {},
    user: null,
    protocol: "http",
    get: jest.fn().mockReturnValue("localhost:3000"),
    ...overrides,
  } as unknown as Request;
};

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

describe("socialController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleSocialCallback", () => {
    it("redirects with error when OAuth provider returns error", async () => {
      const req = createMockRequest({
        params: { platform: "instagram" },
        query: { error: "access_denied" },
      });
      const res = createMockResponse();

      await handleSocialCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("connection=error"),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("reason=denied"),
      );
    });

    it("redirects with error when no authorization code provided", async () => {
      const req = createMockRequest({
        params: { platform: "instagram" },
        query: {},
      });
      const res = createMockResponse();

      await handleSocialCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("connection=error"),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("reason=no_code"),
      );
    });

    it("redirects with error when user is not authenticated", async () => {
      const req = createMockRequest({
        params: { platform: "instagram" },
        query: { code: "auth_code_123" },
        user: null,
      });
      const res = createMockResponse();

      await handleSocialCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("connection=error"),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("reason=not_authenticated"),
      );
    });

    it("successfully connects social account", async () => {
      const req = createMockRequest({
        params: { platform: "instagram" },
        query: { code: "auth_code_123" },
        user: { id: "user-1" },
      });
      const res = createMockResponse();

      (oauthUtils.buildCallbackUri as jest.Mock).mockReturnValue(
        "http://localhost:3000/api/social/callback/instagram",
      );

      (oauthUtils.exchangeCodeForToken as jest.Mock).mockResolvedValue({
        accessToken: "access_token_123",
        refreshToken: "refresh_token_456",
        expiresIn: 3600,
      });

      (oauthUtils.fetchSocialProfile as jest.Mock).mockResolvedValue({
        id: "insta_user_789",
        name: "John Doe",
        profilePicture: "https://example.com/pic.jpg",
        followers: 5000,
        verified: true,
        bio: "Test bio",
        email: "john@example.com",
      });

      (MockedOAuthAccount.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: "oauth_acc_1",
        userId: "user-1",
        platform: "instagram",
        accountId: "insta_user_789",
        accountName: "John Doe",
        accessToken: "access_token_123",
      });

      await handleSocialCallback(req, res);

      expect(oauthUtils.exchangeCodeForToken).toHaveBeenCalledWith(
        "instagram",
        "auth_code_123",
        "http://localhost:3000/api/social/callback/instagram",
      );

      expect(oauthUtils.fetchSocialProfile).toHaveBeenCalledWith(
        "instagram",
        "access_token_123",
      );

      expect(MockedOAuthAccount.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-1", platform: "instagram" },
        expect.objectContaining({
          accountId: "insta_user_789",
          accountName: "John Doe",
        }),
        { upsert: true, new: true },
      );

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("connection=success"),
      );
    });

    it("handles error during callback", async () => {
      const req = createMockRequest({
        params: { platform: "instagram" },
        query: { code: "auth_code_123" },
        user: { id: "user-1" },
      });
      const res = createMockResponse();

      (oauthUtils.buildCallbackUri as jest.Mock).mockReturnValue(
        "http://localhost:3000/api/social/callback/instagram",
      );

      (oauthUtils.exchangeCodeForToken as jest.Mock).mockRejectedValue(
        new Error("Invalid authorization code"),
      );

      await handleSocialCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("connection=error"),
      );
    });
  });

  describe("getConnectedAccounts", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await getConnectedAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns connected accounts for authenticated user", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
      } as AuthenticatedRequest;
      const res = createMockResponse();

      const mockAccounts = [
        {
          _id: "acc-1",
          platform: "instagram",
          accountName: "john.doe",
          profileData: {
            profilePicture: "https://example.com/pic.jpg",
            followers: 5000,
            verified: true,
          },
          createdAt: new Date("2025-01-01"),
          expiresAt: new Date("2025-12-31"),
          lastSyncedAt: new Date("2025-01-15"),
        },
        {
          _id: "acc-2",
          platform: "facebook",
          accountName: "John Doe",
          profileData: {
            profilePicture: "https://example.com/pic2.jpg",
            followers: 2000,
            verified: false,
          },
          createdAt: new Date("2025-01-02"),
          expiresAt: null,
          lastSyncedAt: new Date("2025-01-16"),
        },
      ];

      const selectMock = jest.fn().mockResolvedValue(mockAccounts);
      (MockedOAuthAccount.find as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      await getConnectedAccounts(req, res);

      expect(MockedOAuthAccount.find).toHaveBeenCalledWith({
        userId: "user-1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.accounts).toHaveLength(2);
      expect(callArgs.accounts[0]).toEqual({
        platform: "instagram",
        accountName: "john.doe",
        profilePicture: "https://example.com/pic.jpg",
        followers: 5000,
        verified: true,
        connectedAt: expect.any(Date),
        expiresAt: expect.any(Date),
        lastSyncedAt: expect.any(Date),
      });
    });

    it("handles error and returns 500", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
      } as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.find as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });

      await getConnectedAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error fetching connected accounts",
        }),
      );
    });
  });

  describe("disconnectAccount", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await disconnectAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns 404 when account not found", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.findOneAndDelete as jest.Mock).mockResolvedValue(
        null,
      );

      await disconnectAccount(req, res);

      expect(MockedOAuthAccount.findOneAndDelete).toHaveBeenCalledWith({
        userId: "user-1",
        platform: "instagram",
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "instagram account not connected",
      });
    });

    it("successfully disconnects account", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.findOneAndDelete as jest.Mock).mockResolvedValue({
        _id: "acc-1",
        platform: "instagram",
      });

      await disconnectAccount(req, res);

      expect(MockedOAuthAccount.findOneAndDelete).toHaveBeenCalledWith({
        userId: "user-1",
        platform: "instagram",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "instagram account disconnected successfully",
      });
    });

    it("handles error and returns 500", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.findOneAndDelete as jest.Mock).mockImplementation(
        () => {
          throw new Error("DB Error");
        },
      );

      await disconnectAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error disconnecting account",
        }),
      );
    });
  });

  describe("refreshOAuthToken", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await refreshOAuthToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns 404 when account not found", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.findOne as jest.Mock).mockResolvedValue(null);

      await refreshOAuthToken(req, res);

      expect(MockedOAuthAccount.findOne).toHaveBeenCalledWith({
        userId: "user-1",
        platform: "instagram",
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("not found"),
        }),
      );
    });

    it("returns 404 when refresh token is unavailable", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.findOne as jest.Mock).mockResolvedValue({
        _id: "acc-1",
        platform: "instagram",
        refreshToken: null,
      });

      await refreshOAuthToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("refresh token unavailable"),
        }),
      );
    });

    it("refreshes token successfully", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.findOne as jest.Mock).mockResolvedValue({
        _id: "acc-1",
        platform: "instagram",
        refreshToken: "refresh_token_456",
      });

      await refreshOAuthToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "instagram token refreshed successfully",
      });
    });

    it("handles error and returns 500", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.findOne as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });

      await refreshOAuthToken(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error refreshing token",
        }),
      );
    });
  });
});
