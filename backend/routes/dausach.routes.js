const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const path = require("path");

// ================== CẤU HÌNH UPLOAD ẢNH ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)!"));
  },
});

// ================== 1. LẤY THỂ LOẠI ==================
router.get("/the-loai", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM theloai");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi tải thể loại" });
  }
});

// ================== 2. LẤY DANH SÁCH ĐẦU SÁCH ==================
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, t.ten_the_loai 
      FROM dausach d 
      LEFT JOIN theloai t ON d.id_the_loai = t.id_the_loai
      WHERE d.da_xoa = 0
      ORDER BY d.id_dau_sach DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== 3. THÊM ĐẦU SÁCH (CÓ ẢNH) ==================
router.post("/", upload.single("hinh_anh"), async (req, res) => {
  const { isbn, ten_sach, tac_gia, id_the_loai } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!isbn || !ten_sach || !tac_gia || !id_the_loai) {
    return res
      .status(400)
      .json({ error: "Vui lòng nhập đầy đủ thông tin sách!" });
  }

  try {
    await db.query(
      "INSERT INTO dausach (isbn, ten_sach, tac_gia, id_the_loai, hinh_anh) VALUES (?, ?, ?, ?, ?)",
      [isbn, ten_sach, tac_gia, id_the_loai, imagePath],
    );
    res.json({ success: true, message: "Thêm sách thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi thêm sách: " + err.message });
  }
});

// ================== 4. CẬP NHẬT ĐẦU SÁCH (CÓ THỂ UPDATE ẢNH) ==================
router.put("/:id", upload.single("hinh_anh"), async (req, res) => {
  const { id } = req.params;
  const { isbn, ten_sach, tac_gia, id_the_loai } = req.body;

  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    if (imagePath) {
      // Có upload ảnh mới
      await db.query(
        "UPDATE dausach SET isbn=?, ten_sach=?, tac_gia=?, id_the_loai=?, hinh_anh=? WHERE id_dau_sach=?",
        [isbn, ten_sach, tac_gia, id_the_loai, imagePath, id],
      );
    } else {
      // Không đổi ảnh
      await db.query(
        "UPDATE dausach SET isbn=?, ten_sach=?, tac_gia=?, id_the_loai=? WHERE id_dau_sach=?",
        [isbn, ten_sach, tac_gia, id_the_loai, id],
      );
    }

    res.json({ success: true, message: "Cập nhật thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== 5. XÓA ĐẦU SÁCH (TRANSACTION) ==================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Kiểm tra sách đang mượn
    const [dangMuon] = await db.query(
      "SELECT COUNT(*) AS total FROM sach_vatly WHERE id_dau_sach = ? AND trang_thai = 'DangMuon'",
      [id],
    );
    if (dangMuon[0].total > 0) {
      return res.status(400).json({ error: "Không thể xóa! Có sách đang được mượn." });
    }

    const [result] = await db.query(
      "UPDATE dausach SET da_xoa = 1 WHERE id_dau_sach = ? AND da_xoa = 0",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy đầu sách." });
    }
    res.json({ success: true, message: "Đã xóa đầu sách!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  }
});

// ================== 6. SINH MÃ VẠCH ==================
router.post("/sinh-ma-vach", async (req, res) => {
  const { id_dau_sach, so_luong } = req.body;
  const qty = parseInt(so_luong);

  if (!id_dau_sach || !qty || qty < 1) {
    return res.status(400).json({ error: "Dữ liệu không hợp lệ!" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [last] = await connection.query(
      "SELECT ma_vach_id FROM sach_vatly ORDER BY ma_vach_id DESC LIMIT 1 FOR UPDATE",
    );

    let lastNum = 0;
    if (last.length > 0) {
      const numericPart = last[0].ma_vach_id.replace("BV", "");
      lastNum = parseInt(numericPart) || 0;
    }

    for (let i = 1; i <= qty; i++) {
      const newCode = `BV${String(lastNum + i).padStart(3, "0")}`;
      await connection.query(
        "INSERT INTO sach_vatly (ma_vach_id, id_dau_sach, trang_thai) VALUES (?, ?, 'SanSang')",
        [newCode, id_dau_sach],
      );
    }

    await connection.commit();
    res.json({ success: true, message: "Sinh mã vạch thành công!" });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: "Lỗi sinh mã vạch: " + err.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
