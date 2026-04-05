const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

// Mock exceljs để không tạo file Excel thật trong quá trình test
jest.mock("exceljs", () => {
  const mockWorksheet = {
    columns: [],
    addRow: jest.fn(),
  };
  const mockWorkbook = {
    addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
    xlsx: {
      writeBuffer: jest
        .fn()
        .mockResolvedValue(Buffer.from("fake-excel-content")),
    },
  };
  return { Workbook: jest.fn().mockImplementation(() => mockWorkbook) };
});

const app = require("../server");
const db = require("../config/db");

function makeToken(role = "NhanVien") {
  return jwt.sign({ id: 1, role, name: "Test" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

// ============================================================
// GET /api/stats/summary — Thống kê tổng quan Dashboard
// ============================================================
describe("GET /api/stats/summary", () => {
  test("TC-ST-01: Trả đầy đủ số liệu tổng quan", async () => {
    db.query
      .mockResolvedValueOnce([[{ total: 120 }]]) // dausach count
      .mockResolvedValueOnce([[{ total: 350 }]]) // docgia count
      .mockResolvedValueOnce([[{ total: 45 }]]) // đang mượn count
      .mockResolvedValueOnce([[{ total: 75000 }]]) // tổng tiền phạt
      .mockResolvedValueOnce([
        [
          // chart data
          { month: "01/2026", count: 30 },
          { month: "02/2026", count: 25 },
        ],
      ]);

    const res = await request(app)
      .get("/api/stats/summary")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.totalBooks).toBe(120);
    expect(res.body.totalReaders).toBe(350);
    expect(res.body.totalBorrowing).toBe(45);
    expect(res.body.totalFine).toBe(75000);
    expect(res.body.chartData).toHaveLength(2);
  });

  test("TC-ST-02: DB trả về null → trả về 0 mặc định", async () => {
    db.query
      .mockResolvedValueOnce([[{ total: null }]])
      .mockResolvedValueOnce([[{ total: null }]])
      .mockResolvedValueOnce([[{ total: null }]])
      .mockResolvedValueOnce([[{ total: null }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get("/api/stats/summary")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.totalBooks).toBe(0);
    expect(res.body.totalFine).toBe(0);
    expect(res.body.chartData).toHaveLength(0);
  });

  test("TC-ST-03: Không có token → 401", async () => {
    const res = await request(app).get("/api/stats/summary");
    expect(res.status).toBe(401);
  });

  test("TC-ST-04: Lỗi DB → 500", async () => {
    db.query.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .get("/api/stats/summary")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(500);
  });
});

// ============================================================
// GET /api/report/export-no-sach — Xuất báo cáo Excel
// ============================================================
describe("GET /api/report/export-no-sach", () => {
  test("TC-RP-01: Có dữ liệu nợ sách → trả file Excel (buffer)", async () => {
    db.query.mockResolvedValue([
      [
        {
          "Họ và Tên": "Nguyen A",
          "Mã Sinh Viên": "SV001",
          "Mã Vạch Sách": "B001",
          "Hạn Trả": "2026-03-01",
          "Số Ngày Quá Hạn": 35,
        },
      ],
    ]);

    const res = await request(app)
      .get("/api/report/export-no-sach")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
    );
    expect(res.headers["content-disposition"]).toMatch(/BaoCao_NoSach\.xlsx/);
  });

  test("TC-RP-02: Không có sinh viên nợ sách → 404", async () => {
    db.query.mockResolvedValue([[]]); // Mảng rỗng

    const res = await request(app)
      .get("/api/report/export-no-sach")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/không có/i);
  });

  test("TC-RP-03: Không có token → 401", async () => {
    const res = await request(app).get("/api/report/export-no-sach");
    expect(res.status).toBe(401);
  });

  test("TC-RP-04: Lỗi DB → 500", async () => {
    db.query.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .get("/api/report/export-no-sach")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(500);
  });
});
