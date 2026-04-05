const express = require("express");
const router = express.Router();
const db = require("../config/db");

// --- 1. ROUTE CHÍNH: GET /api/dashboard ---
router.get("/", async (req, res) => {
  try {
    // A. LẤY DANH SÁCH ĐẦU SÁCH (Cho trang Quản lý)
    const [bookList] = await db.query(`
      SELECT d.*, t.ten_the_loai 
      FROM dausach d 
      LEFT JOIN theloai t ON d.id_the_loai = t.id_the_loai
      ORDER BY d.id_dau_sach DESC
    `);

    // B. LẤY THỐNG KÊ TỔNG QUAN (Thẻ số)
    const [books] = await db.query("SELECT COUNT(*) as total FROM dausach");
    const [readers] = await db.query("SELECT COUNT(*) as total FROM docgia");
    const [borrowing] = await db.query(
      "SELECT COUNT(*) as total FROM chitietphieumuon WHERE ngay_tra_thuc_te IS NULL",
    );
    const [fines] = await db.query(
      "SELECT SUM(COALESCE(tien_phat_tre, 0)) as total FROM chitietphieumuon",
    );

    // C. XU HƯỚNG MƯỢN THEO NGÀY (Biểu đồ miền/đường)
    // Trả về định dạng: { date: "28/03", count: 5 }
    const [trendData] = await db.query(`
      SELECT DATE_FORMAT(ngay_muon, '%d/%m') AS date, COUNT(*) AS count 
      FROM phieumuon 
      GROUP BY date 
      ORDER BY MIN(ngay_muon) DESC 
      LIMIT 15
    `);

    // D. THỐNG KÊ THEO THỂ LOẠI (Biểu đồ tròn)
    const [genreData] = await db.query(`
      SELECT t.ten_the_loai AS name, COUNT(ct.ma_vach_id) AS value
      FROM chitietphieumuon ct
      JOIN sach_vatly sv ON ct.ma_vach_id = sv.ma_vach_id
      JOIN dausach ds ON sv.id_dau_sach = ds.id_dau_sach
      JOIN theloai t ON ds.id_the_loai = t.id_the_loai
      GROUP BY t.ten_the_loai
    `);

    // E. TOP 5 SÁCH MƯỢN NHIỀU NHẤT (Bảng danh sách)
    const [topBooks] = await db.query(`
      SELECT ds.ten_sach, COUNT(ct.ma_vach_id) AS so_luong
      FROM chitietphieumuon ct
      JOIN sach_vatly sv ON ct.ma_vach_id = sv.ma_vach_id
      JOIN dausach ds ON sv.id_dau_sach = ds.id_dau_sach
      GROUP BY ds.ten_sach
      ORDER BY so_luong DESC 
      LIMIT 5
    `);

    // F. TRẢ VỀ DỮ LIỆU TỔNG HỢP
    res.json({
      bookList: bookList,
      tongDauSach: books[0]?.total || 0,
      tongDocGia: readers[0]?.total || 0,
      dangMuon: borrowing[0]?.total || 0,
      tienPhat: fines[0]?.total || 0,
      trendData: trendData.reverse(), // Đảo ngược để hiển thị từ cũ đến mới trên biểu đồ
      genreData: genreData || [],
      topBooks: topBooks || [],
    });
  } catch (err) {
    console.error("🔥 DASHBOARD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 2. LẤY DANH SÁCH THỂ LOẠI ---
router.get("/the-loai", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM theloai");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. THÊM ĐẦU SÁCH MỚI ---
router.post("/", async (req, res) => {
  const { isbn, ten_sach, tac_gia, id_the_loai } = req.body;
  if (!isbn || !ten_sach || !tac_gia) {
    return res
      .status(400)
      .json({ error: "Vui lòng nhập đầy đủ thông tin sách!" });
  }
  try {
    const genreId = id_the_loai || 1;
    await db.query(
      "INSERT INTO dausach (isbn, ten_sach, tac_gia, id_the_loai) VALUES (?, ?, ?, ?)",
      [isbn, ten_sach, tac_gia, genreId],
    );
    res.json({ success: true, message: "Thêm thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. SINH MÃ VẠCH (SÁCH VẬT LÝ) ---
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
    const lastNum =
      last && last.length > 0
        ? parseInt(last[0].ma_vach_id.replace("BV", "")) || 0
        : 0;

    for (let i = 1; i <= qty; i++) {
      const newCode = "BV" + String(lastNum + i).padStart(3, "0");
      await connection.query(
        "INSERT INTO sach_vatly (ma_vach_id, id_dau_sach, trang_thai) VALUES (?, ?, 'SanSang')",
        [newCode, id_dau_sach],
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
