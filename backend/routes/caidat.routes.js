const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Lấy cấu hình tham số (ví dụ: tiền phạt)
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT ten_tham_so, gia_tri FROM cai_dat");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy cấu hình: " + err.message });
    }
});

module.exports = router;