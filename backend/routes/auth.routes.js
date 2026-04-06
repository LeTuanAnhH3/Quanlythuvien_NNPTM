const express = require("express");
const router = express.Router();
const db = require("../config/db");
<<<<<<< Updated upstream
=======
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const JWT_SECRET = process.env.JWT_SECRET;
>>>>>>> Stashed changes

router.post("/login", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false });
    }

    const sql = `
      SELECT * FROM nhanvien 
      WHERE TRIM(ten_dang_nhap) = TRIM(?) 
      AND TRIM(trang_thai) = 'DangLamViec'
    `;

    const [results] = await db.query(sql, [username]);

<<<<<<< Updated upstream
    console.log("RESULT:", results);

    if (results.length > 0) {
=======
    const valid =
      results.length > 0 &&
      (await bcrypt.compare(password, results[0].mat_khau));

    if (valid) {
      const token = jwt.sign(
        {
          id: results[0].id_nhan_vien,
          role: results[0].quyen,
          name: results[0].ho_ten,
        },
        JWT_SECRET,
        { expiresIn: "8h" },
      );
>>>>>>> Stashed changes
      return res.json({
        success: true,
        name: results[0].ho_ten,
        role: results[0].quyen
      });
    }

    res.json({ success: false });

  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;