const { verifyToken, adminOnly, checkRole } = require("../middleware/auth");
const jwt = require("jsonwebtoken");

// ============================================================
// Helper: tạo mock req, res, next
// ============================================================
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ============================================================
// verifyToken
// ============================================================
describe("verifyToken", () => {
  test("TC-MW-01: Không có token → trả 401", () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW-02: Token sai / giả mạo → trả 403", () => {
    const req = { headers: { authorization: "Bearer invalid.token.here" } };
    const res = makeRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW-03: Token hết hạn → trả 403", () => {
    const expired = jwt.sign(
      { id: 1, role: "NhanVien", name: "Test" },
      process.env.JWT_SECRET,
      { expiresIn: -1 }, // hết hạn ngay lập tức
    );
    const req = { headers: { authorization: `Bearer ${expired}` } };
    const res = makeRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW-04: Token hợp lệ → gọi next() và gán req.user", () => {
    const token = jwt.sign(
      { id: 99, role: "NhanVien", name: "Nguyen A" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 99, role: "NhanVien" });
  });
});

// ============================================================
// adminOnly
// ============================================================
describe("adminOnly", () => {
  test("TC-MW-05: role là Admin → gọi next()", () => {
    const req = { user: { id: 1, role: "Admin" } };
    const res = makeRes();
    const next = jest.fn();

    adminOnly(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("TC-MW-06: role là NhanVien → trả 403", () => {
    const req = { user: { id: 2, role: "NhanVien" } };
    const res = makeRes();
    const next = jest.fn();

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW-07: Không có req.user → trả 403", () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ============================================================
// checkRole
// ============================================================
describe("checkRole", () => {
  test("TC-MW-08: Role nằm trong danh sách cho phép → gọi next()", () => {
    const middleware = checkRole(["Admin", "QuanLy"]);
    const req = { user: { role: "QuanLy" } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("TC-MW-09: Role không nằm trong danh sách → trả 403", () => {
    const middleware = checkRole(["Admin"]);
    const req = { user: { role: "NhanVien" } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW-10: Không có req.user → trả 403", () => {
    const middleware = checkRole(["Admin"]);
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
