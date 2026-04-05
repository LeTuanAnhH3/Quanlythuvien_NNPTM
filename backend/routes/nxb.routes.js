const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Lấy danh sách nhà xuất bản
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id_nxb, ten_nxb FROM nhaxuatban");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách NXB: " + err.message });
    }
});

module.exports = router;