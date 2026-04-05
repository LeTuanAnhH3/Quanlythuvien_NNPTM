import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock API — không gọi server thật
vi.mock("../services/api.js", () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock useNavigate — không điều hướng thật
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import Login from "../pages/Login.jsx";
import API from "../services/api.js";

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Trang Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TC-LG-01: Render đúng UI — có ô input username, password và nút đăng nhập", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Tên đăng nhập")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mật khẩu")).toBeInTheDocument();
    expect(screen.getByText("Đăng nhập")).toBeInTheDocument();
  });

  it("TC-LG-02: Đăng nhập thành công → lưu token, điều hướng /dashboard", async () => {
    API.post.mockResolvedValue({
      data: {
        success: true,
        token: "fake.jwt.token",
        name: "Nguyen Van A",
        role: "Admin",
      },
    });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Tên đăng nhập"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mật khẩu"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByText("Đăng nhập"));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("fake.jwt.token");
      expect(localStorage.getItem("name")).toBe("Nguyen Van A");
      expect(localStorage.getItem("role")).toBe("Admin");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("TC-LG-03: Sai tài khoản → alert thông báo, KHÔNG điều hướng", async () => {
    API.post.mockResolvedValue({
      data: { success: false, message: "Sai tài khoản hoặc mật khẩu" },
    });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Tên đăng nhập"), {
      target: { value: "wrong" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mật khẩu"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByText("Đăng nhập"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Sai tài khoản hoặc mật khẩu");
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(localStorage.getItem("token")).toBeNull();
    });
  });

  it("TC-LG-04: Server lỗi (network error) → alert thông báo không kết nối được", async () => {
    API.post.mockRejectedValue(new Error("Network Error"));

    renderLogin();
    fireEvent.click(screen.getByText("Đăng nhập"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringMatching(/không thể kết nối/i),
      );
    });
  });

  it("TC-LG-05: Sau đăng nhập thành công → alert 'Đăng nhập thành công!'", async () => {
    API.post.mockResolvedValue({
      data: {
        success: true,
        token: "tok",
        name: "Test",
        role: "NhanVien",
      },
    });

    renderLogin();
    fireEvent.click(screen.getByText("Đăng nhập"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Đăng nhập thành công!");
    });
  });
});
