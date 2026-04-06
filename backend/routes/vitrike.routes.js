const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Lấy danh sách vị trí kệ
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id_ke, ten_ke, tang FROM vitrike");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách kệ: " + err.message });
    }
});

module.exports = router;