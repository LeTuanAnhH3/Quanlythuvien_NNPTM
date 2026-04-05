const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { adminOnly } = require("../middleware/auth");

// 1. LẤY DANH SÁCH NHÂN VIÊN
router.get("/", adminOnly, async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM nhanvien");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. THÊM NHÂN VIÊN MỚI
router.post("/", adminOnly, async (req, res) => {
  try {
    const { id_nhan_vien, ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai } =
      req.body;

    if (!id_nhan_vien || !ho_ten || !ten_dang_nhap || !mat_khau) {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập đầy đủ thông tin nhân viên!" });
    }

    const sql =
      "INSERT INTO nhanvien (id_nhan_vien, ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai) VALUES (?, ?, ?, ?, ?, ?)";
    await db.query(sql, [
      id_nhan_vien,
      ho_ten,
      ten_dang_nhap,
      mat_khau,
      quyen,
      trang_thai,
    ]);

    res.json({ success: true, message: "Thêm nhân viên thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi thêm nhân viên: " + err.message });
  }
});

// 3. CẬP NHẬT NHÂN VIÊN (ĐÃ ĐỒNG BỘ TRẠNG THÁI)
router.put("/:id", adminOnly, async (req, res) => {
  try {
    const id = req.params.id; // Lấy ID từ URL param
    const { ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai } = req.body;

    // Kiểm tra và thực thi lệnh SQL tương ứng
    if (mat_khau && mat_khau.trim() !== "") {
      // Cập nhật bao gồm cả mật khẩu mới
      const sql =
        "UPDATE nhanvien SET ho_ten=?, ten_dang_nhap=?, mat_khau=?, quyen=?, trang_thai=? WHERE id_nhan_vien=?";
      await db.query(sql, [
        ho_ten,
        ten_dang_nhap,
        mat_khau,
        quyen,
        trang_thai,
        id,
      ]);
    } else {
      // Chỉ cập nhật thông tin khác, giữ nguyên mật khẩu cũ
      const sql =
        "UPDATE nhanvien SET ho_ten=?, ten_dang_nhap=?, quyen=?, trang_thai=? WHERE id_nhan_vien=?";
      await db.query(sql, [ho_ten, ten_dang_nhap, quyen, trang_thai, id]);
    }

    res.json({ success: true, message: "Cập nhật thông tin thành công!" });
  } catch (err) {
    console.error("Backend Error:", err);
    res.status(500).json({ error: "Lỗi Server: " + err.message });
  }
});

// 4. XÓA NHÂN VIÊN
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM nhanvien WHERE id_nhan_vien=?",
      [req.params.id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy nhân viên!" });
    }
    res.json({ success: true, message: "Đã xóa nhân viên!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
