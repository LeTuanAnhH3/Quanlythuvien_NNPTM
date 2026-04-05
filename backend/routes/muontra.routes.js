const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 1. Lấy danh sách sách đang được mượn (Bao gồm cả ID độc giả để Frontend lọc)
router.get("/dang-muon", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                pm.id_phieu, 
                pm.id_doc_gia,
                dg.ho_ten, 
                ds.ten_sach, 
                ct.ma_vach_id, 
                pm.ngay_muon, 
                pm.han_tra
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

// 2. [MỚI] Check tên Độc giả nhanh khi nhập mã (Phục vụ Hint Frontend)
router.get("/check-reader/:id", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT ho_ten, ngay_het_han_the FROM docgia WHERE id_doc_gia = ?", 
            [req.params.id.toUpperCase()]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ ho_ten: "Không tìm thấy độc giả" });
        }
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 3. [MỚI] Check tên Sách nhanh khi nhập mã vạch (Phục vụ Hint Frontend)
router.get("/check-book/:id", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ds.ten_sach, sv.trang_thai 
            FROM sach_vatly sv 
            JOIN dausach ds ON sv.id_dau_sach = ds.id_dau_sach 
            WHERE sv.ma_vach_id = ?`, 
            [req.params.id.toUpperCase()]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ ten_sach: "Sách không tồn tại" });
        }
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 4. API Mượn sách - Xử lý logic nghiệp vụ & Ràng buộc từ bảng cài đặt
router.post("/muon", async (req, res) => {
    const { id_doc_gia, ma_vach_id, han_tra } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const readerID = id_doc_gia.toUpperCase();
        const bookID = ma_vach_id.toUpperCase();

        // Kiểm tra số lượng mượn tối đa từ tham số hệ thống
        const [configLimit] = await connection.query(
            "SELECT gia_tri FROM cai_dat WHERE ten_tham_so = 'so_luong_muon_toida'"
        );
        const maxBooks = configLimit.length > 0 ? parseInt(configLimit[0].gia_tri) : 5;

        const [currentLoans] = await connection.query(
            `SELECT COUNT(*) as count FROM chitietphieumuon ct 
             JOIN phieumuon pm ON ct.id_phieu = pm.id_phieu 
             WHERE pm.id_doc_gia = ? AND ct.ngay_tra_thuc_te IS NULL`,
            [readerID]
        );

        if (currentLoans[0].count >= maxBooks) {
            throw new Error(`Độc giả đã mượn tối đa ${maxBooks} cuốn. Vui lòng trả sách trước!`);
        }

        // Kiểm tra hạn thẻ
        const [reader] = await connection.query("SELECT ngay_het_han_the FROM docgia WHERE id_doc_gia = ?", [readerID]);
        if (reader.length === 0) throw new Error("Độc giả không tồn tại");
        if (new Date(reader[0].ngay_het_han_the) < new Date()) throw new Error("Thẻ đã hết hạn sử dụng!");

        // Kiểm tra trạng thái sách
        const [book] = await connection.query("SELECT trang_thai FROM sach_vatly WHERE ma_vach_id = ?", [bookID]);
        if (book.length === 0) throw new Error("Mã vạch sách không tồn tại");
        if (book[0].trang_thai !== 'SanSang') throw new Error("Sách này hiện không sẵn sàng để mượn");

        // Thực hiện ghi phiếu mượn (Mặc định NV01 hoặc lấy từ session nếu có)
        const [phieu] = await connection.query(
            "INSERT INTO phieumuon (id_doc_gia, id_nhan_vien, ngay_muon, han_tra) VALUES (?, 'NV01', NOW(), ?)",
            [readerID, han_tra]
        );

        await connection.query("INSERT INTO chitietphieumuon (id_phieu, ma_vach_id) VALUES (?, ?)", [phieu.insertId, bookID]);
        await connection.query("UPDATE sach_vatly SET trang_thai = 'DangMuon' WHERE ma_vach_id = ?", [bookID]);
        
        await connection.commit();
        res.json({ success: true, message: "Mượn sách thành công" });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ error: err.message });
    } finally { 
        connection.release(); 
    }
});

// 5. API Trả sách - Tính tiền phạt tự động theo cấu hình
router.post("/tra", async (req, res) => {
    const { id_phieu, ma_vach_id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Lấy thông tin phiếu mượn và số ngày trễ
        const [info] = await connection.query(`
            SELECT dg.ho_ten, ds.ten_sach, pm.han_tra, DATEDIFF(NOW(), pm.han_tra) as tre
            FROM phieumuon pm
            JOIN docgia dg ON pm.id_doc_gia = dg.id_doc_gia
            JOIN chitietphieumuon ct ON pm.id_phieu = ct.id_phieu
            JOIN sach_vatly sv ON ct.ma_vach_id = sv.ma_vach_id
            JOIN dausach ds ON sv.id_dau_sach = ds.id_dau_sach
            WHERE pm.id_phieu = ? AND ct.ma_vach_id = ?
        `, [id_phieu, ma_vach_id]);

        if (info.length === 0) throw new Error("Không tìm thấy thông tin mượn");

        // Lấy mức phạt mỗi ngày từ bảng cài đặt
        const [configFine] = await connection.query(
            "SELECT gia_tri FROM cai_dat WHERE ten_tham_so = 'tien_phat_ngay'"
        );
        const finePerDay = configFine.length > 0 ? parseInt(configFine[0].gia_tri) : 5000;

        const data = info[0];
        const so_ngay_tre = data.tre > 0 ? data.tre : 0;
        const tien_phat = so_ngay_tre * finePerDay;

        // Cập nhật trạng thái trả và tiền phạt
        await connection.query(`
            UPDATE chitietphieumuon SET ngay_tra_thuc_te = NOW(), tien_phat_tre = ?
            WHERE id_phieu = ? AND ma_vach_id = ?
        `, [tien_phat, id_phieu, ma_vach_id]);

        await connection.query("UPDATE sach_vatly SET trang_thai = 'SanSang' WHERE ma_vach_id = ?", [ma_vach_id]);
        
        await connection.commit();
        res.json({ 
            success: true, 
            receipt: { ...data, so_ngay_tre, tien_phat } 
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally { 
        connection.release(); 
    }
});

module.exports = router;