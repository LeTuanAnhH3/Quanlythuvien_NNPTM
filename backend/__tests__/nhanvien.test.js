const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const app = require("../server");
const db = require("../config/db");

function makeToken(role = "Admin") {
  return jwt.sign({ id: 1, role, name: "Admin" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

const validNV = {
  id_nhan_vien: "NV010",
  ho_ten: "Nguyen Van Test",
  ten_dang_nhap: "nvtest",
  mat_khau: "pass123",
  quyen: "NhanVien",
  trang_thai: "DangLamViec",
};

// ============================================================
// GET /api/nhanvien — Lấy danh sách (Admin only)
// ============================================================
describe("GET /api/nhanvien", () => {
  test("TC-NV-01: Admin → trả danh sách nhân viên", async () => {
    db.query.mockResolvedValue([
      [
        { id_nhan_vien: "NV001", ho_ten: "Nguyen A", quyen: "Admin" },
        { id_nhan_vien: "NV002", ho_ten: "Tran B", quyen: "NhanVien" },
      ],
    ]);

    const res = await request(app)
      .get("/api/nhanvien")
      .set("Authorization", `Bearer ${makeToken("Admin")}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("TC-NV-02: NhanVien (không phải Admin) → 403", async () => {
    const res = await request(app)
      .get("/api/nhanvien")
      .set("Authorization", `Bearer ${makeToken("NhanVien")}`);

    expect(res.status).toBe(403);
  });

  test("TC-NV-03: Không có token → 401", async () => {
    const res = await request(app).get("/api/nhanvien");
    expect(res.status).toBe(401);
  });
});

// ============================================================
// POST /api/nhanvien — Thêm nhân viên (Admin only)
// ============================================================
describe("POST /api/nhanvien", () => {
  test("TC-NV-04: Admin thêm nhân viên hợp lệ → success", async () => {
    db.query.mockResolvedValue([{ insertId: 5 }]);

    const res = await request(app)
      .post("/api/nhanvien")
      .set("Authorization", `Bearer ${makeToken("Admin")}`)
      .send(validNV);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-NV-05: NhanVien cố thêm → 403", async () => {
    const res = await request(app)
      .post("/api/nhanvien")
      .set("Authorization", `Bearer ${makeToken("NhanVien")}`)
      .send(validNV);

    expect(res.status).toBe(403);
  });

  test("TC-NV-06: Lỗi DB khi thêm → 500", async () => {
    db.query.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .post("/api/nhanvien")
      .set("Authorization", `Bearer ${makeToken("Admin")}`)
      .send(validNV);

    expect(res.status).toBe(500);
  });

  test("TC-NV-13: Thiếu trường bắt buộc → 400", async () => {
    const res = await request(app)
      .post("/api/nhanvien")
      .set("Authorization", `Bearer ${makeToken("Admin")}`)
      .send({ ho_ten: "Test", ten_dang_nhap: "test" }); // thiếu id_nhan_vien và mat_khau

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đầy đủ/i);
  });
});

// ============================================================
// PUT /api/nhanvien/:id — Cập nhật nhân viên
// ============================================================
describe("PUT /api/nhanvien/:id", () => {
  test("TC-NV-07: Cập nhật CÓ đổi mật khẩu → thành công", async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    const res = await request(app)
      .put("/api/nhanvien/NV001")
      .set("Authorization", `Bearer ${makeToken("Admin")}`)
      .send({
        ho_ten: "Tên Mới",
        ten_dang_nhap: "tendangnhap",
        mat_khau: "newpass",
        quyen: "NhanVien",
        trang_thai: "DangLamViec",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-NV-08: Cập nhật KHÔNG đổi mật khẩu (mat_khau rỗng) → thành công, giữ nguyên mật khẩu cũ", async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    const res = await request(app)
      .put("/api/nhanvien/NV001")
      .set("Authorization", `Bearer ${makeToken("Admin")}`)
      .send({
        ho_ten: "Tên Mới",
        ten_dang_nhap: "tendangnhap",
        mat_khau: "", // Rỗng → giữ mật khẩu cũ
        quyen: "Admin",
        trang_thai: "NghiViec",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-NV-09: Không phải Admin → 403", async () => {
    const res = await request(app)
      .put("/api/nhanvien/NV001")
      .set("Authorization", `Bearer ${makeToken("NhanVien")}`)
      .send({ ho_ten: "X" });

    expect(res.status).toBe(403);
  });
});

// ============================================================
// DELETE /api/nhanvien/:id — Xóa nhân viên
// ============================================================
describe("DELETE /api/nhanvien/:id", () => {
  test("TC-NV-10: Admin xóa → success: true", async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete("/api/nhanvien/NV002")
      .set("Authorization", `Bearer ${makeToken("Admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-NV-11: Không phải Admin → 403", async () => {
    const res = await request(app)
      .delete("/api/nhanvien/NV002")
      .set("Authorization", `Bearer ${makeToken("NhanVien")}`);

    expect(res.status).toBe(403);
  });

  test("TC-NV-12: Lỗi DB → 500", async () => {
    db.query.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .delete("/api/nhanvien/NV002")
      .set("Authorization", `Bearer ${makeToken("Admin")}`);

    expect(res.status).toBe(500);
  });

  test("TC-NV-14: ID không tồn tại → 404", async () => {
    db.query.mockResolvedValue([{ affectedRows: 0 }]);

    const res = await request(app)
      .delete("/api/nhanvien/NVKOTONTAI")
      .set("Authorization", `Bearer ${makeToken("Admin")}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/không tìm thấy/i);
  });
});
