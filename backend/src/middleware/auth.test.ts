import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

vi.mock("../config/env", () => ({
  loadEnv: () => ({
    PORT: 3001,
    DATABASE_URL: "postgres://test",
    REDIS_URL: "redis://test",
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3001",
    CORS_ORIGINS: ["http://localhost:5173"],
  }),
}));

const { requireAdmin } = await import("./auth");

describe("RBAC middleware", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {};
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe("requireAdmin", () => {
    it("should return 401 if no user is present", async () => {
      mockRequest.user = undefined;

      await requireAdmin(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "unauthorized",
      });
    });

    it("should return 403 if user is not an admin", async () => {
      mockRequest.user = {
        id: "user-id",
        email: "user@example.com",
        role: "user",
      };

      await requireAdmin(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({ error: "forbidden" });
    });

    it("should not send response if user is an admin", async () => {
      mockRequest.user = {
        id: "admin-id",
        email: "admin@example.com",
        role: "admin",
      };

      await requireAdmin(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.code).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it("should handle different role values correctly", async () => {
      const roles = ["moderator", "owner", "superuser"];

      for (const role of roles) {
        mockRequest.user = {
          id: "user-id",
          email: "user@example.com",
          role,
        };

        await requireAdmin(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.code).toHaveBeenCalledWith(403);
        expect(mockReply.send).toHaveBeenCalledWith({
          error: "forbidden",
        });
      }
    });
  });

  describe("role-based access control", () => {
    it("should ensure role is case-sensitive", async () => {
      mockRequest.user = {
        id: "user-id",
        email: "user@example.com",
        role: "Admin",
      };

      await requireAdmin(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(403);
    });

    it("should not allow empty role", async () => {
      mockRequest.user = {
        id: "user-id",
        email: "user@example.com",
        role: "",
      };

      await requireAdmin(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(403);
    });
  });
});
