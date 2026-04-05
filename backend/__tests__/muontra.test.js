const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock DB - không chạm dữ liệu thật
jest.mock("../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const app = require("../server");
const db = require("../config/db");

function makeToken(role = "NhanVien", userId = 10) {
  return jwt.sign(
    { id: userId, role, name: "Test NV" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

// Helper: tạo connection mock cho transaction
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
// GET /api/muontra/dang-muon — Danh sách đang mượn
// ============================================================
describe("GET /api/muontra/dang-muon", () => {
  test("TC-MT-01: Trả danh sách sách đang được mượn", async () => {
    db.query.mockResolvedValue([
      [
        {
          id_phieu: 1,
          ho_ten: "Nguyen Van A",
          ten_sach: "Dế Mèn",
          ma_vach_id: "B001",
          ngay_muon: "2026-03-01",
          han_tra: "2026-04-01",
        },
      ],
    ]);

    const res = await request(app)
      .get("/api/muontra/dang-muon")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].ten_sach).toBe("Dế Mèn");
  });

  test("TC-MT-02: Không có token → 401", async () => {
    const res = await request(app).get("/api/muontra/dang-muon");
    expect(res.status).toBe(401);
  });
});

// ============================================================
// GET /api/muontra/find-reader/:id — Tìm độc giả
// ============================================================
describe("GET /api/muontra/find-reader/:id", () => {
  test("TC-MT-03: Tìm thấy độc giả còn hạn thẻ → trả thông tin", async () => {
    db.query.mockResolvedValue([
      [
        {
          ho_ten: "Tran Thi B",
          trang_thai_the: "HoatDong",
          ngay_het_han_the: "2027-12-31",
        },
      ],
    ]);

    const res = await request(app)
      .get("/api/muontra/find-reader/SV001")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ho_ten).toBe("Tran Thi B");
  });

  test("TC-MT-04: Không tìm thấy độc giả → 404", async () => {
    db.query.mockResolvedValue([[]]); // Không có kết quả

    const res = await request(app)
      .get("/api/muontra/find-reader/SVKOTONTAI")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});

// ============================================================
// GET /api/muontra/find-book/:barcode — Tìm sách
// ============================================================
describe("GET /api/muontra/find-book/:barcode", () => {
  test("TC-MT-05: Tìm thấy sách đang sẵn sàng → trả trạng thái SanSang", async () => {
    db.query.mockResolvedValue([
      [{ ten_sach: "Lập trình JS", trang_thai: "SanSang" }],
    ]);

    const res = await request(app)
      .get("/api/muontra/find-book/B001")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.trang_thai).toBe("SanSang");
  });

  test("TC-MT-06: Sách đang được mượn → trạng thái DangMuon", async () => {
    db.query.mockResolvedValue([
      [{ ten_sach: "Lập trình JS", trang_thai: "DangMuon" }],
    ]);

    const res = await request(app)
      .get("/api/muontra/find-book/B001")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.trang_thai).toBe("DangMuon");
  });

  test("TC-MT-07: Không tìm thấy sách → 404", async () => {
    db.query.mockResolvedValue([[]]);

    const res = await request(app)
      .get("/api/muontra/find-book/KOTONTAI")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});

// ============================================================
// POST /api/muontra/muon — Mượn sách
// ============================================================
describe("POST /api/muontra/muon", () => {
  const validBody = {
    id_doc_gia: "SV001",
    ma_vach_id: "B001",
    han_tra: "2026-05-01",
  };

  test("TC-MT-08: Thẻ còn hạn, sách SanSang → mượn thành công, commit được gọi", async () => {
    const conn = makeConnection({
      query: jest
        .fn()
        // 1. Kiểm tra hạn thẻ độc giả
        .mockResolvedValueOnce([[{ ngay_het_han_the: "2027-12-31" }]])
        // 2. Kiểm tra trạng thái sách
        .mockResolvedValueOnce([[{ trang_thai: "SanSang" }]])
        // 3. INSERT phieumuon
        .mockResolvedValueOnce([{ insertId: 55 }])
        // 4. INSERT chitietphieumuon
        .mockResolvedValueOnce([{}])
        // 5. UPDATE sach_vatly
        .mockResolvedValueOnce([{}]),
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .post("/api/muontra/muon")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  test("TC-MT-09: Thẻ độc giả HẾT HẠN → rollback, trả lỗi 400", async () => {
    const conn = makeConnection({
      query: jest
        .fn()
        .mockResolvedValueOnce([[{ ngay_het_han_the: "2020-01-01" }]]), // Thẻ đã hết hạn
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .post("/api/muontra/muon")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/hết hạn/i);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });

  test("TC-MT-10: Sách đang DangMuon → rollback, trả lỗi 400", async () => {
    const conn = makeConnection({
      query: jest
        .fn()
        .mockResolvedValueOnce([[{ ngay_het_han_the: "2027-12-31" }]])
        .mockResolvedValueOnce([[{ trang_thai: "DangMuon" }]]),
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .post("/api/muontra/muon")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đang được mượn/i);
    expect(conn.rollback).toHaveBeenCalled();
  });

  test("TC-MT-11: Độc giả không tồn tại → rollback, trả lỗi 400", async () => {
    const conn = makeConnection({
      query: jest.fn().mockResolvedValueOnce([[]]), // Không tìm thấy độc giả
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .post("/api/muontra/muon")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/không tồn tại/i);
  });

  test("TC-MT-12: Không có token → 401", async () => {
    const res = await request(app).post("/api/muontra/muon").send(validBody);
    expect(res.status).toBe(401);
  });
});

// ============================================================
// POST /api/muontra/tra — Trả sách
// ============================================================
describe("POST /api/muontra/tra", () => {
  test("TC-MT-13: Trả đúng hạn → success, tien_phat = 0", async () => {
    // Ngày hạn trả là tương lai nên tre <= 0
    const conn = makeConnection({
      query: jest
        .fn()
        .mockResolvedValueOnce([
          [
            {
              ho_ten: "Tran Thi B",
              ten_sach: "Lập trình JS",
              han_tra: "2026-12-31",
              tre: -10, // Chưa trễ
            },
          ],
        ])
        .mockResolvedValueOnce([{}]) // UPDATE chitietphieumuon
        .mockResolvedValueOnce([{}]), // UPDATE sach_vatly
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .post("/api/muontra/tra")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ id_phieu: 1, ma_vach_id: "B001" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receipt.tien_phat).toBe(0);
    expect(conn.commit).toHaveBeenCalled();
  });

  test("TC-MT-14: Trả TRỄ 3 ngày → tien_phat = 15000", async () => {
    const conn = makeConnection({
      query: jest
        .fn()
        .mockResolvedValueOnce([
          [
            {
              ho_ten: "Tran Thi B",
              ten_sach: "Lập trình JS",
              han_tra: "2026-03-31",
              tre: 3,
            },
          ],
        ])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]),
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .post("/api/muontra/tra")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ id_phieu: 1, ma_vach_id: "B001" });

    expect(res.status).toBe(200);
    expect(res.body.receipt.tien_phat).toBe(15000); // 3 * 5000
    expect(res.body.receipt.so_ngay_tre).toBe(3);
  });

  test("TC-MT-15: Không tìm thấy phiếu mượn → rollback, lỗi 404", async () => {
    const conn = makeConnection({
      query: jest.fn().mockResolvedValueOnce([[]]), // Không tìm thấy
    });
    db.getConnection.mockResolvedValue(conn);

    const res = await request(app)
      .post("/api/muontra/tra")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ id_phieu: 999, ma_vach_id: "BKOTONTAI" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/không tìm thấy/i);
    expect(conn.rollback).toHaveBeenCalled();
  });
});

// ============================================================
// Validation — POST /api/muontra/muon
// ============================================================
describe("Validation: POST /api/muontra/muon", () => {
  test("TC-MT-16: Ngày han_tra trong quá khứ → 400, không gọi DB", async () => {
    const res = await request(app)
      .post("/api/muontra/muon")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ id_doc_gia: "SV001", ma_vach_id: "B001", han_tra: "2020-01-01" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tương lai/i);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test("TC-MT-17: Thiếu id_doc_gia → 400, không gọi DB", async () => {
    const res = await request(app)
      .post("/api/muontra/muon")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ ma_vach_id: "B001", han_tra: "2026-05-01" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đầy đủ/i);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test("TC-MT-18: Thiếu id_phieu trong /tra → 400, không gọi DB", async () => {
    const res = await request(app)
      .post("/api/muontra/tra")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ ma_vach_id: "B001" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đầy đủ/i);
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});
