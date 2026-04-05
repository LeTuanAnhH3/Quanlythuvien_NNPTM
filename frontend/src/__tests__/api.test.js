import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Test: services/api.js — axios instance & interceptor
// Không gọi server thật, chỉ kiểm tra cấu hình interceptor
// ============================================================

// Mock axios trước khi import api.js
vi.mock("axios", () => {
  const mockInstance = {
    interceptors: {
      request: {
        use: vi.fn(),
      },
    },
  };
  return {
    default: {
      create: vi.fn().mockReturnValue(mockInstance),
    },
  };
});

describe("services/api.js", () => {
  it("TC-API-01: axios.create được gọi với baseURL từ import.meta.env", async () => {
    const axios = (await import("axios")).default;
    // Import api.js để trigger axios.create
    await import("../services/api.js");
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: expect.anything() }),
    );
  });

  it("TC-API-02: Interceptor request được đăng ký", async () => {
    const axios = (await import("axios")).default;
    const instance = axios.create();
    expect(instance.interceptors.request.use).toHaveBeenCalled();
  });
});
