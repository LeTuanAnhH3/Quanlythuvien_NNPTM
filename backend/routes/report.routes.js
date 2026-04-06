const express = require("express");
const router = express.Router();
const db = require("../config/db");
const ExcelJS = require("exceljs");

// API Xuất danh sách sinh viên đang nợ sách quá hạn
router.get("/export-no-sach", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        dg.ho_ten AS 'Họ và Tên', 
        dg.id_doc_gia AS 'Mã Sinh Viên', 
        sv.ma_vach_id AS 'Mã Vạch Sách', 
        pm.han_tra AS 'Hạn Trả',
        DATEDIFF(NOW(), pm.han_tra) AS 'Số Ngày Quá Hạn'
      FROM chitietphieumuon ctp
      JOIN phieumuon pm ON ctp.id_phieu = pm.id_phieu
      JOIN docgia dg ON pm.id_doc_gia = dg.id_doc_gia
      JOIN sach_vatly sv ON ctp.ma_vach_id = sv.ma_vach_id
      WHERE ctp.ngay_tra_thuc_te IS NULL AND pm.han_tra < NOW()
    `);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không có sinh viên nào nợ sách quá hạn." });
    }

    // Tạo workbook ExcelJS và ghi buffer
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("DanhSachNoSach");

    if (rows.length > 0) {
      worksheet.columns = Object.keys(rows[0]).map((key) => ({
        header: key,
        key,
      }));
      rows.forEach((row) => worksheet.addRow(row));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=BaoCao_NoSach.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).send("Lỗi xuất file: " + err.message);
  }
});

module.exports = router;
