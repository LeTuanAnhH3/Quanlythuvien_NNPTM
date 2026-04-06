const express = require("express");
const router = express.Router();
const db = require("../config/db");
<<<<<<< Updated upstream
=======
const bcrypt = require("bcryptjs");
const { adminOnly } = require("../middleware/auth");
>>>>>>> Stashed changes

// 1. LẤY DANH SÁCH NHÂN VIÊN
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM nhanvien");
    res.json(results);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// 2. THÊM NHÂN VIÊN MỚI
router.post("/", async (req, res) => {
  try {
<<<<<<< Updated upstream
    const { id_nhan_vien, ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai } = req.body;
    
    const sql = "INSERT INTO nhanvien (id_nhan_vien, ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai) VALUES (?, ?, ?, ?, ?, ?)";
    await db.query(sql, [id_nhan_vien, ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai]);
    
=======
    const { id_nhan_vien, ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai } =
      req.body;

    if (!id_nhan_vien || !ho_ten || !ten_dang_nhap || !mat_khau) {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập đầy đủ thông tin nhân viên!" });
    }

    const hashedPassword = await bcrypt.hash(mat_khau, 10);
    const sql =
      "INSERT INTO nhanvien (id_nhan_vien, ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai) VALUES (?, ?, ?, ?, ?, ?)";
    await db.query(sql, [
      id_nhan_vien,
      ho_ten,
      ten_dang_nhap,
      hashedPassword,
      quyen,
      trang_thai,
    ]);

>>>>>>> Stashed changes
    res.json({ success: true, message: "Thêm nhân viên thành công!" });
  } catch (err) { 
    res.status(500).json({ error: "Lỗi khi thêm nhân viên: " + err.message }); 
  }
});

// 3. CẬP NHẬT NHÂN VIÊN (ĐÃ ĐỒNG BỘ TRẠNG THÁI)
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id; // Lấy ID từ URL param
    const { ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai } = req.body;

    // Kiểm tra và thực thi lệnh SQL tương ứng
    if (mat_khau && mat_khau.trim() !== "") {
      // Cập nhật bao gồm cả mật khẩu mới
<<<<<<< Updated upstream
      const sql = "UPDATE nhanvien SET ho_ten=?, ten_dang_nhap=?, mat_khau=?, quyen=?, trang_thai=? WHERE id_nhan_vien=?";
      await db.query(sql, [ho_ten, ten_dang_nhap, mat_khau, quyen, trang_thai, id]);
=======
      const hashedPassword = await bcrypt.hash(mat_khau, 10);
      const sql =
        "UPDATE nhanvien SET ho_ten=?, ten_dang_nhap=?, mat_khau=?, quyen=?, trang_thai=? WHERE id_nhan_vien=?";
      await db.query(sql, [
        ho_ten,
        ten_dang_nhap,
        hashedPassword,
        quyen,
        trang_thai,
        id,
      ]);
>>>>>>> Stashed changes
    } else {
      // Chỉ cập nhật thông tin khác, giữ nguyên mật khẩu cũ
      const sql = "UPDATE nhanvien SET ho_ten=?, ten_dang_nhap=?, quyen=?, trang_thai=? WHERE id_nhan_vien=?";
      await db.query(sql, [ho_ten, ten_dang_nhap, quyen, trang_thai, id]);
    }

    res.json({ success: true, message: "Cập nhật thông tin thành công!" });
  } catch (err) { 
    console.error("Backend Error:", err);
    res.status(500).json({ error: "Lỗi Server: " + err.message }); 
  }
});

// 4. XÓA NHÂN VIÊN
router.delete("/:id", async (req, res) => {
  try {
<<<<<<< Updated upstream
    await db.query("DELETE FROM nhanvien WHERE id_nhan_vien=?", [req.params.id]);
=======
    const [dangXuLy] = await db.query(
      `SELECT COUNT(*) AS total
       FROM chitietphieumuon ct
       JOIN phieumuon pm ON ct.id_phieu_muon = pm.id_phieu_muon
       WHERE pm.id_nhan_vien = ? AND ct.ngay_tra_thuc_te IS NULL`,
      [req.params.id],
    );
    if (dangXuLy[0].total > 0) {
      return res.status(400).json({
        error: "Nhân viên đang có phiếu mượn chưa xử lý xong, không thể xóa!",
      });
    }
    const [result] = await db.query(
      "UPDATE nhanvien SET trang_thai = 'DaXoa' WHERE id_nhan_vien = ? AND trang_thai != 'DaXoa'",
      [req.params.id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy nhân viên!" });
    }
>>>>>>> Stashed changes
    res.json({ success: true, message: "Đã xóa nhân viên!" });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

module.exports = router;