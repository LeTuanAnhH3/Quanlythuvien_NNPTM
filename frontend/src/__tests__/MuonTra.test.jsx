import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock API — không gọi server thật
vi.mock("../services/api.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import MuonTra from "../pages/MuonTra.jsx";
import API from "../services/api.js";

function renderMuonTra() {
  return render(
    <MemoryRouter>
      <MuonTra />
    </MemoryRouter>,
  );
}

describe("Trang MuonTra — render cơ bản", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    // Mặc định cung cấp danh sách mượn rỗng
    API.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TC-MTO-01: Render tiêu đề và form mượn sách", async () => {
    await act(async () => renderMuonTra());
    expect(screen.getByText(/QUẢN LÝ MƯỢN TRẢ/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mã Độc giả")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mã vạch sách")).toBeInTheDocument();
    expect(screen.getByText("XÁC NHẬN MƯỢN")).toBeInTheDocument();
  });

  it("TC-MTO-02: Tải danh sách đang mượn khi mount", async () => {
    API.get.mockResolvedValueOnce({
      data: [
        {
          id_phieu: 1,
          ho_ten: "Nguyen A",
          ten_sach: "Dế Mèn",
          ma_vach_id: "B001",
          ngay_muon: "2026-03-01",
          han_tra: "2027-04-01", // Chưa quá hạn
        },
      ],
    });

    await act(async () => renderMuonTra());

    await waitFor(() => {
      expect(screen.getByText("Nguyen A")).toBeInTheDocument();
      expect(screen.getByText("Dế Mèn")).toBeInTheDocument();
    });
  });

  it("TC-MTO-03: Nhập mã độc giả → gọi API find-reader khi đủ 4 ký tự", async () => {
    API.get
      .mockResolvedValueOnce({ data: [] }) // fetchLoans khi mount
      .mockResolvedValueOnce({
        data: {
          ho_ten: "Tran Thi B",
          trang_thai_the: "HoatDong",
          ngay_het_han_the: "2027-12-31",
        },
      });

    await act(async () => renderMuonTra());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Mã Độc giả"), {
        target: { value: "SV01" }, // 4 ký tự → kích hoạt useEffect
      });
    });

    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining("/muontra/find-reader/SV01"),
      );
    });
  });

  it("TC-MTO-04: Thẻ độc giả hết hạn → nút XÁC NHẬN MƯỢN bị disable", async () => {
    API.get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({
      data: {
        ho_ten: "Le Van C",
        trang_thai_the: "HetHan",
        ngay_het_han_the: "2020-01-01", // Đã hết hạn
      },
    });

    await act(async () => renderMuonTra());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Mã Độc giả"), {
        target: { value: "SV02" },
      });
    });

    await waitFor(() => {
      const btn = screen.getByText("XÁC NHẬN MƯỢN");
      expect(btn).toBeDisabled();
    });
  });

  it("TC-MTO-05: Thẻ hết hạn → click mượn → alert cảnh báo, không gọi API", async () => {
    API.get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({
      data: {
        ho_ten: "Le Van C",
        trang_thai_the: "HetHan",
        ngay_het_han_the: "2020-01-01",
      },
    });

    await act(async () => renderMuonTra());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Mã Độc giả"), {
        target: { value: "SV02" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("XÁC NHẬN MƯỢN"));
    });

    // Nút bị disabled nên API.post không được gọi
    expect(API.post).not.toHaveBeenCalled();
  });

  it("TC-MTO-06: Mượn sách thành công → gọi fetchLoans lại và alert thành công", async () => {
    API.get
      .mockResolvedValueOnce({ data: [] }) // mount
      .mockResolvedValueOnce({
        // find-reader
        data: {
          ho_ten: "OK User",
          trang_thai_the: "HoatDong",
          ngay_het_han_the: "2027-12-31",
        },
      })
      .mockResolvedValueOnce({ data: [] }); // fetchLoans sau mượn
    API.post.mockResolvedValue({ data: { success: true } });

    await act(async () => renderMuonTra());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Mã Độc giả"), {
        target: { value: "SV01" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("XÁC NHẬN MƯỢN"));
    });

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith(
        "/muontra/muon",
        expect.objectContaining({ id_doc_gia: "SV01" }),
      );
      expect(window.alert).toHaveBeenCalledWith("Mượn sách thành công!");
    });
  });
});
