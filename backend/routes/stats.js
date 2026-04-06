const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/summary", async (req, res) => {
  try {
    const [books] = await db.query("SELECT COUNT(*) as total FROM dausach");
    const [readers] = await db.query("SELECT COUNT(*) as total FROM docgia");
    const [borrowing] = await db.query(
      "SELECT COUNT(*) as total FROM chitietphieumuon WHERE ngay_tra_thuc_te IS NULL",
    );

    // Lấy tổng tiền phạt thực tế từ DB
    const [fines] = await db.query(
      "SELECT SUM(COALESCE(tien_phat_tre, 0)) as total FROM chitietphieumuon",
    );

    const [chartData] = await db.query(`
            SELECT DATE_FORMAT(ngay_muon, '%m/%Y') as month, COUNT(*) as count 
            FROM phieumuon 
            GROUP BY month 
            ORDER BY MIN(ngay_muon) ASC 
            LIMIT 6
        `);

    res.json({
      totalBooks: books[0]?.total || 0,
      totalReaders: readers[0]?.total || 0,
      totalBorrowing: borrowing[0]?.total || 0,
      totalFine: fines[0]?.total || 0,
      chartData: chartData || [],
    });
  } catch (err) {
    console.error("Lỗi API Dashboard:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
