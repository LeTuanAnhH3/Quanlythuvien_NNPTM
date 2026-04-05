const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock multer để KHÔNG ghi file thật vào thư mục uploads/ khi chạy test
jest.mock("multer", () => {
  const multerMock = () => ({
    // single() trả về middleware rỗng, không xử lý file
    single: () => (req, _res, next) => {
      req.file = null; // Mặc định không có file upload
      next();
    },
  });
  multerMock.diskStorage = () => ({});
  multerMock.memoryStorage = () => ({});
  return multerMock;
});

jest.mock("../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const app = require("../server");
const db = require("../config/db");

function makeToken(role = "NhanVien") {
  return jwt.sign({ id: 1, role, name: "Test" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

// ============================================================
// GET /api/dausach/the-loai — Lấy thể loại
// ============================================================
describe("GET /api/dausach/the-loai", () => {
  test("TC-DS-01: Trả danh sách thể loại", async () => {
    db.query.mockResolvedValue([
      [
        { id_the_loai: 1, ten_the_loai: "Văn học" },
        { id_the_loai: 2, ten_the_loai: "Khoa học" },
      ],
    ]);

    const res = await request(app)
      .get("/api/dausach/the-loai")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].ten_the_loai).toBe("Văn học");
  });

  test("TC-DS-02: Không có token → 401", async () => {
    const res = await request(app).get("/api/dausach/the-loai");
    expect(res.status).toBe(401);
  });
});

// ============================================================
// GET /api/dausach — Lấy danh sách đầu sách
// ============================================================
describe("GET /api/dausach", () => {
  test("TC-DS-03: Trả danh sách đầu sách có kèm tên thể loại", async () => {
    db.query.mockResolvedValue([
      [
        {
          id_dau_sach: 1,
          ten_sach: "Dế Mèn",
          tac_gia: "To Hoai",
          ten_the_loai: "Văn học",
        },
      ],
    ]);

    const res = await request(app)
      .get("/api/dausach")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body[0].ten_sach).toBe("Dế Mèn");
    expect(res.body[0].ten_the_loai).toBe("Văn học");
  });

  test("TC-DS-04: Lỗi DB → 500", async () => {
    db.query.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/api/dausach")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(500);
  });
});

// ============================================================
// POST /api/dausach — Thêm đầu sách (không upload ảnh)
// ============================================================
describe("POST /api/dausach", () => {
  test("TC-DS-05: Thêm sách không kèm ảnh → success", async () => {
    db.query.mockResolvedValue([{ insertId: 10 }]);

    const res = await request(app)
      .post("/api/dausach")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        isbn: "978-3-16-148410-0",
        ten_sach: "Lập trình Node.js",
        tac_gia: "Author A",
        id_the_loai: "2",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-DS-06: Lỗi DB khi thêm → 500", async () => {
    db.query.mockRejectedValue(new Error("DB insert error"));

    const res = await request(app)
      .post("/api/dausach")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        isbn: "978-bad",
        ten_sach: "Test",
        tac_gia: "Author",
        id_the_loai: "1",
      });

    expect(res.status).toBe(500);
  });

  test("TC-DS-12: Thiếu trường bắt buộc (ten_sach) → 400", async () => {
    const res = await request(app)
      .post("/api/dausach")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ isbn: "978-test", tac_gia: "Author", id_the_loai: "1" }); // thiếu ten_sach

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đầy đủ/i);
  });
});

// ============================================================
// PUT /api/dausach/:id — Cập nhật đầu sách
// ============================================================
describe("PUT /api/dausach/:id", () => {
  test("TC-DS-07: Cập nhật không đổi ảnh → success", async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    const res = await request(app)
      .put("/api/dausach/1")
      .set("Authorization", `Bearer ${makeToken()}`)
      .field("isbn", "978-updated")
      .field("ten_sach", "Tên mới")
      .field("tac_gia", "Tác giả mới")
      .field("id_the_loai", "3");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-DS-08: Không có token → 401", async () => {
    const res = await request(app).put("/api/dausach/1").field("ten_sach", "X");
    expect(res.status).toBe(401);
  });
});

// Helper: tạo connection mock cho transaction (dùng cho DELETE)
function makeConnection(overrides = {}) {
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
    query: jest.fn(),
    ...overrides,
  };
}

// ============================================================
// DELETE /api/dausach/:id — Xóa đầu sách (dùng transaction)
// ============================================================
describe("DELETE /api/dausach/:id", () => {
  test("TC-DS-09: Xóa thành công → success: true, commit được gọi", async () => {
    const conn = makeConnection({
      query: jest
        .fn()
        // 1. Kiểm tra sách đang mượn → không có
        .mockResolvedValueOnce([[]])
        // 2. Xóa sach_vatly
        .mockResolvedValueOnce([{ affectedRows: 2 }])
        // 3. Xóa dausach → affectedRows: 1
        .mockResolvedValueOnce([{ affectedRows: 1 }]),
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .delete("/api/dausach/1")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  test("TC-DS-10: Có sách đang mượn → rollback, trả lỗi 400", async () => {
    const conn = makeConnection({
      query: jest
        .fn()
        // Kiểm tra sách đang mượn → tìm thấy 1 bản ghi
        .mockResolvedValueOnce([
          [{ ma_vach_id: "B001", trang_thai: "DangMuon" }],
        ]),
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .delete("/api/dausach/1")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đang được mượn/i);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });

  test("TC-DS-11: Lỗi DB trong transaction → rollback, trả 500", async () => {
    const conn = makeConnection({
      query: jest
        .fn()
        .mockResolvedValueOnce([[]]) // Không có sách đang mượn
        .mockRejectedValueOnce(new Error("DB crash")), // Lỗi khi xóa
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .delete("/api/dausach/1")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(500);
    expect(conn.rollback).toHaveBeenCalled();
  });
});
