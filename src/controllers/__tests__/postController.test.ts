import { Response } from "express";
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from "../postController";
import Post from "../../models/Post";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";

jest.mock("../../models/Post");

const MockedPost = Post as jest.Mocked<typeof Post>;

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("postController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllPosts", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await getAllPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns paginated posts with default parameters", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: {},
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      const mockPosts = [
        {
          _id: "post-1",
          userId: "user-1",
          accountId: "acc-1",
          platform: "instagram",
          content: "Post 1",
          scheduledTime: new Date(),
          status: "scheduled",
          engagement: { likes: 10, comments: 2, shares: 1 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: "post-2",
          userId: "user-1",
          accountId: "acc-2",
          platform: "facebook",
          content: "Post 2",
          scheduledTime: new Date(),
          status: "draft",
          engagement: { likes: 0, comments: 0, shares: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(2);

      const leanMock = jest.fn().mockResolvedValue(mockPosts);
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

      (MockedPost.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getAllPosts(req, res);

      expect(MockedPost.find).toHaveBeenCalledWith({ userId: "user-1" });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(20);

      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toHaveLength(2);
      expect(callArgs.pagination).toEqual({
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    });

    it("respects custom limit and offset", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: { limit: "10", offset: "5" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(30);

      const leanMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

      (MockedPost.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getAllPosts(req, res);

      expect(skipMock).toHaveBeenCalledWith(5);
      expect(limitMock).toHaveBeenCalledWith(10);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.pagination.hasMore).toBe(true);
    });

    it("enforces limit cap at 100", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        query: { limit: "500" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.countDocuments as jest.Mock).mockResolvedValue(150);

      const leanMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

      (MockedPost.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getAllPosts(req, res);

      expect(limitMock).toHaveBeenCalledWith(100);

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

      await getAllPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error fetching posts",
        }),
      );
    });
  });

  describe("getPostById", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await getPostById(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when post not found", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { id: "post-999" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.findOne as jest.Mock).mockResolvedValue(null);

      await getPostById(req, res);

      expect(MockedPost.findOne).toHaveBeenCalledWith({
        _id: "post-999",
        userId: "user-1",
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Post not found" });
    });

    it("returns post successfully", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { id: "post-1" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      const mockPost = {
        _id: "post-1",
        userId: "user-1",
        accountId: "acc-1",
        platform: "instagram",
        content: "Test post",
        scheduledTime: new Date(),
        status: "scheduled",
        engagement: { likes: 10, comments: 2, shares: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (MockedPost.findOne as jest.Mock).mockResolvedValue(mockPost);

      await getPostById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.id).toBe("post-1");
      expect(callArgs.content).toBe("Test post");
    });
  });

  describe("createPost", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when required fields are missing", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        body: { content: "Test", platform: "instagram" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      await createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("required"),
        }),
      );
    });

    it("returns 400 for invalid platform", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        body: {
          accountId: "acc-1",
          platform: "invalid",
          content: "Test",
          scheduledTime: new Date(),
        },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      await createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid platform"),
        }),
      );
    });

    it("returns 400 for invalid status", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        body: {
          accountId: "acc-1",
          platform: "instagram",
          content: "Test",
          scheduledTime: new Date(),
          status: "invalid",
        },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      await createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid status"),
        }),
      );
    });

    it("creates post successfully", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        body: {
          accountId: "acc-1",
          platform: "instagram",
          content: "Test post",
          scheduledTime: "2025-12-31T00:00:00Z",
          mediaUrls: ["https://example.com/pic.jpg"],
        },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      const saveMock = jest.fn().mockResolvedValue(undefined);
      (MockedPost as any).mockImplementation((data: any) =>
        ({
          ...data,
          _id: "new-post-1",
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          save: saveMock,
        } as any),
      );

      await createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe("Post created successfully");
      expect(callArgs.data.platform).toBe("instagram");
    });
  });

  describe("updatePost", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await updatePost(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when post not found", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { id: "post-999" },
        body: { content: "Updated" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await updatePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Post not found" });
    });

    it("updates post successfully", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { id: "post-1" },
        body: { content: "Updated content" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      const mockPost = {
        _id: "post-1",
        userId: "user-1",
        accountId: "acc-1",
        platform: "instagram",
        content: "Updated content",
        scheduledTime: new Date(),
        status: "scheduled",
        engagement: { likes: 10, comments: 2, shares: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (MockedPost.findOneAndUpdate as jest.Mock).mockResolvedValue(mockPost);

      await updatePost(req, res);

      expect(MockedPost.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "post-1", userId: "user-1" },
        { content: "Updated content" },
        { new: true, runValidators: true },
      );

      expect(res.status).toHaveBeenCalledWith(200);
      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe("Post updated successfully");
    });
  });

  describe("deletePost", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when post not found", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { id: "post-999" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Post not found" });
    });

    it("deletes post successfully", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { id: "post-1" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.findOneAndDelete as jest.Mock).mockResolvedValue({
        _id: "post-1",
      });

      await deletePost(req, res);

      expect(MockedPost.findOneAndDelete).toHaveBeenCalledWith({
        _id: "post-1",
        userId: "user-1",
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Post deleted successfully",
      });
    });

    it("handles error and returns 500", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
        params: { id: "post-1" },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      (MockedPost.findOneAndDelete as jest.Mock).mockImplementation(() => {
        throw new Error("DB Error");
      });

      await deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error deleting post",
        }),
      );
    });
  });
});
