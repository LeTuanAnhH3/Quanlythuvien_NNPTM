const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const app = require("../server");
const db = require("../config/db");

// Helper: tạo token hợp lệ
function makeToken(role = "NhanVien") {
  return jwt.sign({ id: 1, role, name: "Test User" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

// ============================================================
// GET /api/docgia — Lấy danh sách độc giả
// ============================================================
describe("GET /api/docgia", () => {
  test("TC-DG-01: Có token hợp lệ → trả danh sách độc giả", async () => {
    const fakeList = [
      { id_doc_gia: "SV001", ho_ten: "Tran Thi B", email: "b@email.com" },
      { id_doc_gia: "SV002", ho_ten: "Le Van C", email: "c@email.com" },
    ];
    db.query.mockResolvedValue([fakeList]);

    const res = await request(app)
      .get("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id_doc_gia).toBe("SV001");
  });

  test("TC-DG-02: Không có token → 401", async () => {
    const res = await request(app).get("/api/docgia");
    expect(res.status).toBe(401);
  });

  test("TC-DG-03: Lỗi DB → 500", async () => {
    db.query.mockRejectedValue(new Error("DB Error"));

    const res = await request(app)
      .get("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(500);
  });
});

// ============================================================
// POST /api/docgia — Thêm độc giả
// ============================================================
describe("POST /api/docgia", () => {
  const validBody = {
    id_doc_gia: "SV003",
    ho_ten: "Nguyen Thi D",
    email: "d@email.com",
    loai_doc_gia: "SinhVien",
    ngay_het_han_the: "2026-12-31",
  };

  test("TC-DG-04: Dữ liệu hợp lệ → thêm thành công", async () => {
    db.query.mockResolvedValue([{ insertId: 3 }]);

    const res = await request(app)
      .post("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-DG-05: Thiếu id_doc_gia → 400 với thông báo lỗi", async () => {
    const res = await request(app)
      .post("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ ho_ten: "Test", ngay_het_han_the: "2026-12-31" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đầy đủ/i);
  });

  test("TC-DG-06: Thiếu ho_ten → 400", async () => {
    const res = await request(app)
      .post("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ id_doc_gia: "SV010", ngay_het_han_the: "2026-12-31" });

    expect(res.status).toBe(400);
  });

  test("TC-DG-07: Thiếu ngay_het_han_the → 400", async () => {
    const res = await request(app)
      .post("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ id_doc_gia: "SV010", ho_ten: "Test" });

    expect(res.status).toBe(400);
  });

  test("TC-DG-08: Trùng mã độc giả (ER_DUP_ENTRY) → 400 với thông báo đã tồn tại", async () => {
    const dupError = new Error("Duplicate entry");
    dupError.code = "ER_DUP_ENTRY";
    db.query.mockRejectedValue(dupError);

    const res = await request(app)
      .post("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đã tồn tại/i);
  });

  test("TC-DG-09: Lỗi DB khác → 500", async () => {
    db.query.mockRejectedValue(new Error("Unknown DB error"));

    const res = await request(app)
      .post("/api/docgia")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(500);
  });
});

// ============================================================
// DELETE /api/docgia/:id — Xóa độc giả
// ============================================================
describe("DELETE /api/docgia/:id", () => {
  test("TC-DG-10: Xóa thành công → success: true", async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete("/api/docgia/SV001")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("TC-DG-11: Độc giả có lịch sử mượn sách (FK constraint) → 400", async () => {
    const fkError = new Error("Cannot delete or update a parent row");
    fkError.code = "ER_ROW_IS_REFERENCED_2";
    db.query.mockRejectedValue(fkError);

    const res = await request(app)
      .delete("/api/docgia/SV001")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lịch sử mượn/i);
  });

  test("TC-DG-12: Không có token → 401", async () => {
    const res = await request(app).delete("/api/docgia/SV001");
    expect(res.status).toBe(401);
  });

  test("TC-DG-13: ID độc giả không tồn tại → 404", async () => {
    db.query.mockResolvedValue([{ affectedRows: 0 }]);

    const res = await request(app)
      .delete("/api/docgia/SVKOTONTAI")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/không tìm thấy/i);
  });
});
