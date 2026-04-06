const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 1. Lấy danh sách sách đang được mượn (Bao gồm cả ID độc giả để Frontend lọc)
router.get("/dang-muon", async (req, res) => {
  try {
    const [rows] = await db.query(`
            SELECT pm.id_phieu, dg.ho_ten, ds.ten_sach, ct.ma_vach_id, pm.ngay_muon, pm.han_tra
            FROM phieumuon pm
            JOIN docgia dg ON pm.id_doc_gia = dg.id_doc_gia
            JOIN chitietphieumuon ct ON pm.id_phieu = ct.id_phieu
            JOIN sach_vatly sv ON ct.ma_vach_id = sv.ma_vach_id
            JOIN dausach ds ON sv.id_dau_sach = ds.id_dau_sach
            WHERE ct.ngay_tra_thuc_te IS NULL
            ORDER BY pm.ngay_muon DESC
        `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Tìm độc giả & Trả về ngày hết hạn để Frontend kiểm tra
router.get("/find-reader/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT ho_ten, trang_thai_the, ngay_het_han_the FROM docgia WHERE id_doc_gia = ?",
      [req.params.id.toUpperCase()],
    );
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).json({ message: "Không tìm thấy" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Tìm sách theo ISBN
router.get("/find-book/:isbn", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ds.ten_sach,
              COUNT(CASE WHEN sv.trang_thai = 'SanSang' THEN 1 END) AS so_luong_san_sang
       FROM dausach ds
       LEFT JOIN sach_vatly sv ON ds.id_dau_sach = sv.id_dau_sach
       WHERE ds.isbn = ?
       GROUP BY ds.id_dau_sach`,
      [req.params.isbn.trim()],
    );
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).json({ message: "Không tìm thấy" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. API Mượn sách - Xử lý logic nghiệp vụ & Ràng buộc từ bảng cài đặt
router.post("/muon", async (req, res) => {
  const { id_doc_gia, isbn, han_tra } = req.body;

  if (!id_doc_gia || !isbn) {
    return res
      .status(400)
      .json({ error: "Vui lòng nhập đầy đủ thông tin mượn sách!" });
  }

  if (!han_tra || new Date(han_tra) <= new Date()) {
    return res
      .status(400)
      .json({ error: "Ngày hạn trả phải là ngày trong tương lai!" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // KIỂM TRA HẠN THẺ ĐỘC GIẢ
    const [reader] = await connection.query(
      "SELECT ngay_het_han_the FROM docgia WHERE id_doc_gia = ?",
      [id_doc_gia.toUpperCase()],
    );

    if (reader.length === 0) throw new Error("Độc giả không tồn tại");

    const ngayHetHan = new Date(reader[0].ngay_het_han_the);
    if (ngayHetHan < new Date()) {
      throw new Error(
        `Thẻ đã hết hạn vào ngày ${ngayHetHan.toLocaleDateString("vi-VN")}. Không thể mượn!`,
      );
    }

    // TÌM BẢN VẬT LÝ CÒN SẴN SÀNG THEO ISBN
    const [available] = await connection.query(
      `SELECT sv.ma_vach_id FROM sach_vatly sv
       JOIN dausach ds ON sv.id_dau_sach = ds.id_dau_sach
       WHERE ds.isbn = ? AND sv.trang_thai = 'SanSang'
       LIMIT 1`,
      [isbn.trim()],
    );
    if (available.length === 0)
      throw new Error("Sách không tồn tại hoặc tất cả bản sao đang được mượn");

    const selectedBarcode = available[0].ma_vach_id;

    // THỰC HIỆN MƯỢN
    const [phieu] = await connection.query(
      "INSERT INTO phieumuon (id_doc_gia, id_nhan_vien, ngay_muon, han_tra) VALUES (?, ?, NOW(), ?)",
      [id_doc_gia.toUpperCase(), req.user.id, han_tra],
    );

    await connection.query(
      "INSERT INTO chitietphieumuon (id_phieu, ma_vach_id) VALUES (?, ?)",
      [phieu.insertId, selectedBarcode],
    );

    await connection.query(
      "UPDATE sach_vatly SET trang_thai = 'DangMuon' WHERE ma_vach_id = ?",
      [selectedBarcode],
    );

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// 5. API Trả sách - Tính tiền phạt tự động theo cấu hình
router.post("/tra", async (req, res) => {
  const { id_phieu, ma_vach_id } = req.body;

  if (!id_phieu || !ma_vach_id) {
    return res
      .status(400)
      .json({ error: "Vui lòng nhập đầy đủ thông tin trả sách!" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [info] = await connection.query(
      `
            SELECT dg.ho_ten, ds.ten_sach, pm.han_tra, DATEDIFF(NOW(), pm.han_tra) as tre
            FROM phieumuon pm
            JOIN docgia dg ON pm.id_doc_gia = dg.id_doc_gia
            JOIN chitietphieumuon ct ON pm.id_phieu = ct.id_phieu
            JOIN sach_vatly sv ON ct.ma_vach_id = sv.ma_vach_id
            JOIN dausach ds ON sv.id_dau_sach = ds.id_dau_sach
            WHERE pm.id_phieu = ? AND ct.ma_vach_id = ?
        `,
      [id_phieu, ma_vach_id],
    );

    if (info.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Không tìm thấy dữ liệu mượn!" });
    }

    const data = info[0];
    const so_ngay_tre = data.tre > 0 ? data.tre : 0;
    const tien_phat = so_ngay_tre * 5000;

    await connection.query(
      `
            UPDATE chitietphieumuon SET ngay_tra_thuc_te = NOW(), tien_phat_tre = ?
            WHERE id_phieu = ? AND ma_vach_id = ?
        `,
      [tien_phat, id_phieu, ma_vach_id],
    );

    await connection.query(
      "UPDATE sach_vatly SET trang_thai = 'SanSang' WHERE ma_vach_id = ?",
      [ma_vach_id],
    );

    await connection.commit();
    res.json({
      success: true,
      receipt: {
        ...data,
        so_ngay_tre,
        tien_phat,
        ngay_tra: new Date().toLocaleDateString("vi-VN"),
      },
    });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
