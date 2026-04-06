import { useState, useEffect } from "react";
import API from "../services/api";

function MuonTra() {
  const [loanData, setLoanData] = useState({
    id_doc_gia: "",
    isbn: "",
    han_tra: "",
  });
  const [readerInfo, setReaderInfo] = useState({
    name: "",
    status: "",
    isExpired: false,
  });
  const [bookInfo, setBookInfo] = useState({ name: "", status: "" });
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const res = await API.get("/muontra/dang-muon");
      setLoans(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách");
    }
  };

  // Kiểm tra độc giả & Hạn thẻ
  useEffect(() => {
    if (loanData.id_doc_gia.trim().length < 3) {
      setReaderInfo({ name: "", status: "", isExpired: false });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      API.get(`/muontra/find-reader/${loanData.id_doc_gia.trim()}`, {
        signal: controller.signal,
      })
        .then((res) => {
          const expired = new Date(res.data.ngay_het_han_the) < new Date();
          setReaderInfo({
            name: res.data.ho_ten,
            status: expired ? "❌ THẺ HẾT HẠN" : "✅ Hoạt động",
            isExpired: expired,
          });
        })
        .catch((err) => {
          if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
            setReaderInfo({
              name: "❌ Không tìm thấy",
              status: "",
              isExpired: false,
            });
          }
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loanData.id_doc_gia]);

  // Kiểm tra sách theo ISBN
  useEffect(() => {
    if (loanData.isbn.trim().length < 3) {
      setBookInfo({ name: "", status: "" });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      API.get(`/muontra/find-book/${loanData.isbn.trim()}`, {
        signal: controller.signal,
      })
        .then((res) =>
          setBookInfo({
            name: res.data.ten_sach,
            status:
              res.data.so_luong_san_sang > 0
                ? `✅ Còn ${res.data.so_luong_san_sang} bản`
                : "❌ Hết sách",
          }),
        )
        .catch((err) => {
          if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
            setBookInfo({ name: "❌ Không tìm thấy", status: "" });
          }
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loanData.isbn]);

  const handleLoan = async () => {
    if (readerInfo.isExpired) {
      alert("Không thể mượn sách vì thẻ độc giả đã hết hạn!");
      return;
    }
    try {
      const res = await API.post("/muontra/muon", {
        ...loanData,
        id_doc_gia: loanData.id_doc_gia.trim(),
        isbn: loanData.isbn.trim(),
      });
      if (res.data.success) {
        alert("Mượn sách thành công!");
        setLoanData({ id_doc_gia: "", isbn: "", han_tra: "" });
        fetchLoans();
      }
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || "Thất bại"));
    }
  };

  // --- 1. CẬP NHẬT HÀM TRẢ SÁCH (HIỂN THỊ CHI TIẾT TIỀN PHẠT) ---
  const handleReturn = async (id_phieu, ma_vach_id) => {
    if (window.confirm("Xác nhận trả sách và hoàn tất thủ tục?")) {
      try {
        const res = await API.post("/muontra/tra", { id_phieu, ma_vach_id });
        if (res.data.success) {
          const receipt = res.data.receipt;
          if (receipt.tien_phat > 0) {
            alert(
              `Trả sách thành công!\n` +
                `--------------------------\n` +
                `Số ngày trễ: ${receipt.so_ngay_tre} ngày\n` +
                `Tiền phạt: ${receipt.tien_phat.toLocaleString("vi-VN")} VNĐ`,
            );
          } else {
            alert("Trả sách thành công! (Sách trả đúng hạn)");
          }
          fetchLoans();
        }
      } catch (err) {
        alert("Lỗi trả sách: " + (err.response?.data?.error || "Lỗi hệ thống"));
      }
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>📖 QUẢN LÝ MƯỢN TRẢ</h2>

      <div style={formCard}>
        <h3 style={subTitleStyle}>➕ Thực hiện mượn sách</h3>
        <div style={inputGroup}>
          <div style={inputWrapper}>
            <input
              style={{
                ...inputStyle,
                borderColor: readerInfo.isExpired ? "red" : "#e0e7ff",
              }}
              placeholder="Mã Độc giả"
              value={loanData.id_doc_gia}
              onChange={(e) =>
                setLoanData({ ...loanData, id_doc_gia: e.target.value })
              }
            />
            <div
              style={{
                ...hintStyle,
                color: readerInfo.isExpired ? "red" : "#5d78ff",
              }}
            >
              {readerInfo.name} {readerInfo.status}
            </div>
          </div>
          <div style={inputWrapper}>
            <input
              style={inputStyle}
              placeholder="ISBN sách"
              value={loanData.isbn}
              onChange={(e) =>
                setLoanData({ ...loanData, isbn: e.target.value })
              }
            />
            <div style={hintStyle}>
              {bookInfo.name} {bookInfo.status}
            </div>
          </div>
          <div style={inputWrapper}>
            <input
              type="date"
              style={inputStyle}
              value={loanData.han_tra}
              onChange={(e) =>
                setLoanData({ ...loanData, han_tra: e.target.value })
              }
            />
            <div style={hintStyle}>Hạn trả</div>
          </div>
          <button
            onClick={handleLoan}
            disabled={readerInfo.isExpired}
            style={{
              ...primaryBtn,
              opacity: readerInfo.isExpired ? 0.5 : 1,
              cursor: readerInfo.isExpired ? "not-allowed" : "pointer",
            }}
          >
            XÁC NHẬN MƯỢN
          </button>
        </div>
      </div>

      <div style={tableCard}>
        <table style={tableStyle}>
          <thead>
            <tr style={theadStyle}>
              <th style={thStyle}>Độc giả</th>
              <th style={thStyle}>Sách</th>
              <th style={thStyle}>Hạn trả</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l, i) => {
              // --- 2. CẬP NHẬT LOGIC KIỂM TRA QUÁ HẠN ---
              const isOverdue = new Date(l.han_tra) < new Date();
              return (
                <tr key={i} style={trStyle}>
                  <td style={tdStyle}>
                    <b>{l.ho_ten}</b>
                  </td>
                  <td style={tdStyle}>{l.ten_sach}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color: isOverdue ? "#e74c3c" : "#27ae60",
                      fontWeight: isOverdue ? "bold" : "normal",
                    }}
                  >
                    {new Date(l.han_tra).toLocaleDateString("vi-VN")}
                    {isOverdue && " (Quá hạn!)"}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleReturn(l.id_phieu, l.ma_vach_id)}
                      style={secondaryBtn}
                    >
                      TRẢ SÁCH
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- CSS IN JS ---
const containerStyle = {
  padding: "25px",
  background: "#f8faff",
  minHeight: "100vh",
};
const titleStyle = {
  color: "#2c3e50",
  fontSize: "22px",
  fontWeight: "800",
  marginBottom: "25px",
};
const formCard = {
  background: "#fff",
  padding: "20px",
  borderRadius: "20px",
  border: "1px solid #f0f0f0",
  marginBottom: "25px",
};
const subTitleStyle = {
  fontSize: "16px",
  color: "#5d78ff",
  marginBottom: "20px",
  fontWeight: "700",
};
const inputGroup = { display: "flex", gap: "15px", flexWrap: "wrap" };
const inputWrapper = { flex: 1, minWidth: "200px" };
const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #e0e7ff",
};
const hintStyle = { fontSize: "11px", marginTop: "5px", fontWeight: "500" };
const primaryBtn = {
  background: "#2ecc71",
  color: "#fff",
  border: "none",
  padding: "12px 25px",
  borderRadius: "12px",
  fontWeight: "700",
};
const tableCard = {
  background: "#fff",
  borderRadius: "20px",
  border: "1px solid #f0f0f0",
  overflow: "hidden",
};
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "#f8faff" };
const thStyle = {
  padding: "15px 20px",
  textAlign: "left",
  color: "#718096",
  fontSize: "13px",
};
const trStyle = { borderBottom: "1px solid #f8faff" };
const tdStyle = { padding: "15px 20px", fontSize: "14px" };
const secondaryBtn = {
  background: "#fff1f0",
  color: "#ff4d4f",
  border: "1px solid #ffccc7",
  padding: "8px 15px",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};

export default MuonTra;
