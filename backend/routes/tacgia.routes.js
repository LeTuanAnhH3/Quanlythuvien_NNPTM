const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Lấy danh sách tất cả tác giả
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id_tac_gia, ten_tac_gia FROM tacgia");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách tác giả: " + err.message });
    }
});

module.exports = router;