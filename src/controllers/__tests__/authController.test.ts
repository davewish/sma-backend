import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  register,
  login,
  googleCallback,
  githubCallback,
  getProfile,
  logout,
} from "../authController";
import User from "../../models/User";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("../../models/User", () => {
  const UserConstructor = jest.fn();
  return {
    __esModule: true,
    default: Object.assign(UserConstructor, {
      findOne: jest.fn(),
      findById: jest.fn(),
    }),
  };
});

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authController", () => {
  const mockedJwtSign = jwt.sign as jest.Mock;
  const MockedUser = User as unknown as jest.Mock & {
    findOne: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedJwtSign.mockReturnValue("mock-token");
  });

  describe("register", () => {
    it("returns 400 when required fields are missing", async () => {
      const req = {
        body: { email: "test@example.com", password: "secret123" },
      } as Request;
      const res = createMockResponse();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "All fields are required",
      });
    });

    it("returns 409 when user already exists", async () => {
      const req = {
        body: {
          name: "Test User",
          email: "TEST@EXAMPLE.COM",
          password: "secret123",
          confirmPassword: "secret123",
        },
      } as Request;
      const res = createMockResponse();

      MockedUser.findOne.mockResolvedValue({ _id: "existing" });

      await register(req, res);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
    });

    it("registers user and returns token", async () => {
      const req = {
        body: {
          name: "Test User",
          email: "TEST@EXAMPLE.COM",
          password: "secret123",
          confirmPassword: "secret123",
        },
      } as Request;
      const res = createMockResponse();

      MockedUser.findOne.mockResolvedValue(null);

      const save = jest.fn().mockResolvedValue(undefined);
      MockedUser.mockImplementation(
        ({ name, email, password, isVerified }) => ({
          _id: "user-1",
          name,
          email,
          password,
          isVerified,
          save,
        }),
      );

      await register(req, res);

      expect(MockedUser).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        password: "secret123",
        isVerified: true,
      });
      expect(save).toHaveBeenCalledTimes(1);
      expect(mockedJwtSign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User registered successfully",
        token: "mock-token",
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
        },
      });
    });
  });

  describe("login", () => {
    it("returns 400 when email or password missing", async () => {
      const req = { body: { email: "test@example.com" } } as Request;
      const res = createMockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email and password are required",
      });
    });

    it("returns 401 for invalid credentials when user not found", async () => {
      const req = {
        body: { email: "TEST@EXAMPLE.COM", password: "secret123" },
      } as Request;
      const res = createMockResponse();

      const select = jest.fn().mockResolvedValue(null);
      MockedUser.findOne.mockReturnValue({ select });

      await login(req, res);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(select).toHaveBeenCalledWith("+password");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("logs in user and returns token", async () => {
      const req = {
        body: { email: "TEST@EXAMPLE.COM", password: "secret123" },
      } as Request;
      const res = createMockResponse();

      const dbUser = {
        _id: "user-1",
        name: "Test User",
        email: "test@example.com",
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      const select = jest.fn().mockResolvedValue(dbUser);
      MockedUser.findOne.mockReturnValue({ select });

      await login(req, res);

      expect(dbUser.comparePassword).toHaveBeenCalledWith("secret123");
      expect(mockedJwtSign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Login successful",
        token: "mock-token",
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
        },
      });
    });
  });

  describe("oauth callbacks", () => {
    it("returns Google login response", () => {
      const req = {
        user: {
          _id: "oauth-user-1",
          name: "OAuth User",
          email: "oauth@example.com",
        },
      } as unknown as Request;
      const res = createMockResponse();

      googleCallback(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "Google login successful",
        token: "mock-token",
        user: {
          id: "oauth-user-1",
          name: "OAuth User",
          email: "oauth@example.com",
        },
      });
    });

    it("returns GitHub login response", () => {
      const req = {
        user: {
          _id: "oauth-user-2",
          name: "GitHub User",
          email: "github@example.com",
        },
      } as unknown as Request;
      const res = createMockResponse();

      githubCallback(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "GitHub login successful",
        token: "mock-token",
        user: {
          id: "oauth-user-2",
          name: "GitHub User",
          email: "github@example.com",
        },
      });
    });
  });

  describe("getProfile", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns profile for authenticated user", async () => {
      const req = {
        user: { id: "user-1", email: "test@example.com" },
      } as AuthenticatedRequest;
      const res = createMockResponse();

      MockedUser.findById.mockResolvedValue({
        _id: "user-1",
        name: "Test User",
        email: "test@example.com",
        isVerified: true,
      });

      await getProfile(req, res);

      expect(MockedUser.findById).toHaveBeenCalledWith("user-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          isVerified: true,
        },
      });
    });
  });

  describe("logout", () => {
    it("returns success message", () => {
      const req = {} as Request;
      const res = createMockResponse();

      logout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Logged out successfully",
      });
    });
  });
});
