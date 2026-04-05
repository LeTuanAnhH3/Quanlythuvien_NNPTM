# Hướng dẫn Kiểm thử Phần mềm — Hệ thống Quản lý Thư viện

## Tổng quan

Dự án được chia thành 2 phần kiểm thử độc lập:

| Phần                            | Framework                      | Thư mục test              |
| ------------------------------- | ------------------------------ | ------------------------- |
| **Backend** (Node.js / Express) | Jest + Supertest               | `backend/__tests__/`      |
| **Frontend** (React / Vite)     | Vitest + React Testing Library | `frontend/src/__tests__/` |

> **Nguyên tắc cách ly:** Tất cả test đều dùng mock — **KHÔNG** kết nối database thật, **KHÔNG** ghi file lên disk, **KHÔNG** gọi server thật. Code nguồn chính không bị ảnh hưởng khi chạy test.

---

## Cài đặt

Chạy lần đầu để cài đầy đủ dependencies:

```bash
# Cài backend
cd backend
npm install

# Cài frontend
cd ../frontend
npm install
```

---

## Chạy kiểm thử Backend

```bash
cd backend
```

| Lệnh                    | Mô tả                            |
| ----------------------- | -------------------------------- |
| `npm test`              | Chạy toàn bộ test 1 lần          |
| `npm run test:watch`    | Chạy lại tự động khi lưu file    |
| `npm run test:coverage` | Chạy và xuất báo cáo độ phủ code |

**Kết quả mong đợi:**

```
Test Suites: 7 passed, 7 total
Tests:       75 passed, 75 total
```

### Danh sách file test backend

| File                   | Module được test                                   | Số test |
| ---------------------- | -------------------------------------------------- | ------- |
| `middleware.test.js`   | `verifyToken`, `adminOnly`, `checkRole`            | 10      |
| `auth.test.js`         | `POST /api/login`                                  | 7       |
| `docgia.test.js`       | `GET/POST/DELETE /api/docgia`                      | 12      |
| `dausach.test.js`      | `GET/POST/PUT/DELETE /api/dausach`                 | 11      |
| `muontra.test.js`      | `GET/POST /api/muontra/*`                          | 15      |
| `nhanvien.test.js`     | `GET/POST/PUT/DELETE /api/nhanvien`                | 12      |
| `stats_report.test.js` | `/api/stats/summary`, `/api/report/export-no-sach` | 8       |

---

## Chạy kiểm thử Frontend

```bash
cd frontend
```

| Lệnh                    | Mô tả                            |
| ----------------------- | -------------------------------- |
| `npm test`              | Chạy toàn bộ test 1 lần          |
| `npm run test:watch`    | Chạy lại tự động khi lưu file    |
| `npm run test:coverage` | Chạy và xuất báo cáo độ phủ code |

### Danh sách file test frontend

| File               | Component được test                            | Số test |
| ------------------ | ---------------------------------------------- | ------- |
| `api.test.js`      | `services/api.js` — axios config & interceptor | 2       |
| `Login.test.jsx`   | Trang Đăng nhập                                | 5       |
| `MuonTra.test.jsx` | Trang Quản lý Mượn/Trả                         | 6       |

---

## Cấu trúc thư mục test

```
backend/
├── jest.config.js              # Cấu hình Jest
└── __tests__/
    ├── setup.js                # Thiết lập env, chạy trước mỗi test suite
    ├── middleware.test.js
    ├── auth.test.js
    ├── docgia.test.js
    ├── dausach.test.js
    ├── muontra.test.js
    ├── nhanvien.test.js
    └── stats_report.test.js

frontend/
├── vite.config.js              # Có cấu hình vitest.test block
└── src/__tests__/
    ├── setup.js                # Mock localStorage, import jest-dom
    ├── api.test.js
    ├── Login.test.jsx
    └── MuonTra.test.jsx
```

---

## Nguyên lý Mock trong test

### Backend — Mock Database

Mỗi file test đều mock module `../config/db` để không kết nối MySQL:

```js
jest.mock("../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));
```

Sau đó điều khiển kết quả từng query bằng `mockResolvedValue` hoặc `mockRejectedValue`:

```js
// Giả lập tìm thấy 1 bản ghi
db.query.mockResolvedValue([[{ id_doc_gia: "SV001", ho_ten: "Test" }]]);

// Giả lập lỗi DB
db.query.mockRejectedValue(new Error("DB connection failed"));
```

Với các route dùng **transaction** (DELETE đầu sách, Mượn sách, Trả sách), mock connection:

```js
const conn = {
  beginTransaction: jest.fn().mockResolvedValue(),
  commit: jest.fn().mockResolvedValue(),
  rollback: jest.fn().mockResolvedValue(),
  release: jest.fn(),
  query: jest
    .fn()
    .mockResolvedValueOnce([[]]) // Query 1
    .mockResolvedValueOnce([{ insertId: 1 }]), // Query 2
};
db.getConnection.mockResolvedValue(conn);
```

### Backend — Mock Multer (upload file)

Route đầu sách dùng multer. Để test KHÔNG ghi file thật:

```js
jest.mock("multer", () => {
  const multerMock = () => ({
    single: () => (req, _res, next) => {
      req.file = null;
      next();
    },
  });
  multerMock.diskStorage = () => ({});
  return multerMock;
});
```

### Frontend — Mock API

```js
vi.mock("../services/api.js", () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

// Giả lập đăng nhập thành công
API.post.mockResolvedValue({ data: { success: true, token: "fake.token" } });
```

---

## Các trường hợp kiểm thử chính

### Authentication (auth.test.js)

- ✅ Đăng nhập đúng → trả JWT token
- ✅ Token có thể giải mã với JWT_SECRET
- ✅ Sai tài khoản → `success: false`
- ✅ Thiếu username / password → không gọi DB
- ✅ Lỗi DB → status 500

### Middleware (middleware.test.js)

- ✅ Không có token → 401
- ✅ Token sai / giả mạo → 403
- ✅ Token hết hạn → 403
- ✅ Token hợp lệ → gọi `next()`, gán `req.user`
- ✅ Role không phải Admin → 403
- ✅ `checkRole` — đúng role → được phép

### Mượn/Trả sách (muontra.test.js) — Nghiệp vụ cốt lõi

- ✅ Mượn thành công: thẻ còn hạn + sách SanSang → commit DB
- ✅ Thẻ hết hạn → rollback, trả lỗi
- ✅ Sách đang DangMuon → rollback, trả lỗi
- ✅ Độc giả không tồn tại → rollback, trả lỗi
- ✅ Trả đúng hạn → `tien_phat = 0`
- ✅ Trả trễ 3 ngày → `tien_phat = 15000` (3 × 5,000 VNĐ)
- ✅ Không tìm thấy phiếu mượn → rollback

---

## Lưu ý quan trọng

1. **Biến môi trường test** được đặt trong `backend/__tests__/setup.js`. File `.env` thật **không bị đọc** trong khi test vì `process.env` đã được gán trước khi `dotenv.config()` chạy.

2. **Không cần chạy server** hay kết nối MySQL để chạy test backend — mọi thứ đều được mock.

3. **Không cần chạy Vite** để chạy test frontend — Vitest sử dụng jsdom để giả lập môi trường browser.

4. Nếu thêm route mới, tạo test case tương ứng trong `__tests__/` và mock DB theo cùng pattern.
