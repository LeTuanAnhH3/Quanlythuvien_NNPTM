const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock DB trước khi load app
jest.mock("../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const app = require("../server");
const db = require("../config/db");

// ============================================================
// POST /api/login
// ============================================================
describe("POST /api/login", () => {
  test("TC-AUTH-01: Đăng nhập thành công → trả token và success: true", async () => {
    const fakeEmployee = {
      id_nhan_vien: "NV001",
      ho_ten: "Nguyen Van A",
      quyen: "Admin",
      trang_thai: "DangLamViec",
    };
    db.query.mockResolvedValue([[fakeEmployee]]);

    const res = await request(app)
      .post("/api/login")
      .send({ username: "admin", password: "123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.name).toBe("Nguyen Van A");
    expect(res.body.role).toBe("Admin");
  });

  test("TC-AUTH-02: Token trả về có thể giải mã với JWT_SECRET", async () => {
    const fakeEmployee = {
      id_nhan_vien: "NV001",
      ho_ten: "Nguyen Van A",
      quyen: "NhanVien",
    };
    db.query.mockResolvedValue([[fakeEmployee]]);

    const res = await request(app)
      .post("/api/login")
      .send({ username: "nv1", password: "pass" });

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe("NhanVien");
  });

  test("TC-AUTH-03: Sai mật khẩu / không tìm thấy user → success: false", async () => {
    db.query.mockResolvedValue([[]]); // Không tìm thấy user

    const res = await request(app)
      .post("/api/login")
      .send({ username: "wrong", password: "wrong" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.token).toBeUndefined();
  });

  test("TC-AUTH-04: Thiếu username → success: false (không gọi DB)", async () => {
    const res = await request(app).post("/api/login").send({ password: "123" });

    expect(res.body.success).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });

  test("TC-AUTH-05: Thiếu password → success: false (không gọi DB)", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "admin" });

    expect(res.body.success).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });

  test("TC-AUTH-06: Body hoàn toàn rỗng → success: false", async () => {
    const res = await request(app).post("/api/login").send({});

    expect(res.body.success).toBe(false);
  });

  test("TC-AUTH-07: Lỗi DB (500) → success: false với status 500", async () => {
    db.query.mockRejectedValue(new Error("DB connection failed"));

    const res = await request(app)
      .post("/api/login")
      .send({ username: "admin", password: "123" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
