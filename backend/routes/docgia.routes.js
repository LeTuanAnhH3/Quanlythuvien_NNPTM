const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 1. Lấy danh sách độc giả
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM docgia ORDER BY id_doc_gia DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
  }
});

// 2. Thêm độc giả mới (Đã sửa lỗi gán giá trị mặc định và kiểm tra trùng ID)
router.post("/", async (req, res) => {
  const { id_doc_gia, ho_ten, email, loai_doc_gia, ngay_het_han_the } =
    req.body;

  // Kiểm tra dữ liệu bắt buộc
  if (!id_doc_gia || !ho_ten || !ngay_het_han_the) {
    return res
      .status(400)
      .json({ error: "Vui lòng nhập đầy đủ Mã ĐG, Họ tên và Ngày hết hạn!" });
  }

  try {
    await db.query(
      `INSERT INTO docgia (id_doc_gia, ho_ten, email, loai_doc_gia, ngay_het_han_the, trang_thai_the) 
             VALUES (?, ?, ?, ?, ?, 'HoatDong')`,
      [id_doc_gia, ho_ten, email, loai_doc_gia, ngay_het_han_the],
    );
    res.json({ success: true, message: "Thêm độc giả thành công!" });
  } catch (err) {
    console.error("Lỗi MySQL:", err);
    // Xử lý lỗi trùng mã ID độc giả (Primary Key)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Mã độc giả này đã tồn tại!" });
    }
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

// 3. Xóa độc giả
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM docgia WHERE id_doc_gia = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy độc giả!" });
    }
    res.json({ success: true, message: "Đã xóa độc giả!" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res
        .status(400)
        .json({
          error: "Không thể xóa độc giả này (đã có lịch sử mượn sách)!",
        });
    }
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

module.exports = router;
