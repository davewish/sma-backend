import { Response } from "express";
import { getDashboardStats, getUpcomingPosts } from "../dashboardController";
import OAuthAccount from "../../models/OAuthAccount";
import Post from "../../models/Post";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";

jest.mock("../../models/OAuthAccount");
jest.mock("../../models/Post");

const MockedOAuthAccount = OAuthAccount as jest.Mocked<typeof OAuthAccount>;
const MockedPost = Post as jest.Mocked<typeof Post>;

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("dashboardController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns sample stats when no connected accounts", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
      } as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedOAuthAccount.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      await getDashboardStats(req, res);

      expect(MockedOAuthAccount.find).toHaveBeenCalledWith({
        userId: "user-1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.totalFollowers).toBe(19470);
      expect(callArgs.postsThisMonth).toBe(12);
      expect(callArgs.engagementRate).toBe(4.28);
      expect(callArgs.accounts).toHaveLength(3);
      expect(callArgs.upcomingPosts).toHaveLength(3);
    });

    it("returns calculated stats with connected accounts", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
      } as AuthenticatedRequest;
      const res = createMockResponse();

      const mockAccounts = [
        {
          _id: "acc-1",
          userId: "user-1",
          platform: "instagram",
          accountName: "john.doe",
          profileData: { followers: 5000 },
        },
        {
          _id: "acc-2",
          userId: "user-1",
          platform: "facebook",
          accountName: "John Doe",
          profileData: { followers: 2000 },
        },
      ];

      (MockedOAuthAccount.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAccounts),
      });

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(5);

      const mockPosts = [
        {
          engagement: { likes: 100, comments: 20, shares: 5 },
        },
        {
          engagement: { likes: 50, comments: 10, shares: 2 },
        },
      ];

      const selectMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockPosts),
      });

      (MockedPost.find as jest.Mock)
        .mockReturnValueOnce({
          select: selectMock,
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: "post-1",
                  userId: "user-1",
                  accountId: "acc-1",
                  platform: "instagram",
                  content: "Sample post content",
                  scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                  status: "scheduled",
                  engagement: { likes: 50, comments: 10, shares: 5 },
                },
              ]),
            }),
          }),
        });

      await getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.totalFollowers).toBe(7000);
      expect(callArgs.postsThisMonth).toBe(5);
      // Total engagements: (100+20+5) + (50+10+2) = 187, rate: (187/7000)*100 = 2.67
      expect(callArgs.engagementRate).toBe(2.67);
      expect(callArgs.accounts).toHaveLength(2);
      expect(callArgs.accounts[0]).toEqual({
        id: "acc-1",
        platform: "instagram",
        username: "john.doe",
        followers: 5000,
        isConnected: true,
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

      await getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error fetching dashboard stats",
        }),
      );
    });
  });

  describe("getUpcomingPosts", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await getUpcomingPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns sample posts when no upcoming posts exist", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: {},
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(0);

      await getUpcomingPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.posts).toHaveLength(5);
      expect(callArgs.pagination.total).toBe(5);
      expect(callArgs.pagination.hasMore).toBe(false);
    });

    it("returns upcoming posts with pagination", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: { limit: "10", offset: "0" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      const mockPosts = [
        {
          _id: "post-1",
          userId: "user-1",
          accountId: "acc-1",
          platform: "instagram",
          content: "Sample content 1",
          scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: "scheduled",
          engagement: { likes: 100, comments: 20, shares: 5 },
        },
        {
          _id: "post-2",
          userId: "user-1",
          accountId: "acc-2",
          platform: "facebook",
          content: "Sample content 2",
          scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: "draft",
          engagement: { likes: 50, comments: 10, shares: 2 },
        },
      ];

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(2);
      (MockedPost.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockPosts),
            }),
          }),
        }),
      });

      await getUpcomingPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.posts).toHaveLength(2);
      expect(callArgs.posts[0]).toEqual({
        id: "post-1",
        accountId: "acc-1",
        platform: "instagram",
        content: "Sample content 1",
        scheduledTime: expect.any(Date),
        status: "scheduled",
        engagement: { likes: 100, comments: 20, shares: 5 },
      });
      expect(callArgs.pagination).toEqual({
        total: 2,
        limit: 10,
        offset: 0,
        hasMore: false,
      });
    });

    it("filters by platform when provided", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: { limit: "10", offset: "0", platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(1);
      (MockedPost.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: "post-1",
                  userId: "user-1",
                  accountId: "acc-1",
                  platform: "instagram",
                  content: "Instagram post",
                  scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                  status: "scheduled",
                  engagement: { likes: 100, comments: 20, shares: 5 },
                },
              ]),
            }),
          }),
        }),
      });

      await getUpcomingPosts(req, res);

      const findCall = (MockedPost.countDocuments as jest.Mock).mock
        .calls[0]?.[0];
      expect(findCall?.platform).toBe("instagram");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("ignores invalid platform filter", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: { limit: "10", offset: "0", platform: "invalid" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(0);

      await getUpcomingPosts(req, res);

      const findCall = (MockedPost.countDocuments as jest.Mock).mock
        .calls[0]?.[0];
      expect(findCall?.platform).toBeUndefined();
    });

    it("enforces limit cap at 100", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: { limit: "500", offset: "0" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(0);

      await getUpcomingPosts(req, res);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.pagination.limit).toBe(100);
    });

    it("handles error and returns 500", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: {},
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.countDocuments as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });

      await getUpcomingPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error fetching upcoming posts",
        }),
      );
    });
  });
});
