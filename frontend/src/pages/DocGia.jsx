import { useEffect, useState } from "react";
import API from "../services/api";

function DocGia() {
  const [readers, setReaders] = useState([]);
  const [formData, setFormData] = useState({
    id_doc_gia: "",
    ho_ten: "",
    email: "",
    loai_doc_gia: "SinhVien",
    ngay_het_han_the: "",
  });

  useEffect(() => {
    fetchReaders();
  }, []);

  const fetchReaders = async () => {
    try {
      const res = await API.get("/docgia");
      setReaders(res.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ngay_het_han_the) {
      alert("Vui lòng chọn ngày hết hạn thẻ!");
      return;
    }

    try {
      const response = await API.post("/docgia", formData);
      alert(response.data.message);
      setFormData({
        id_doc_gia: "",
        ho_ten: "",
        email: "",
        loai_doc_gia: "SinhVien",
        ngay_het_han_the: "",
      });
      fetchReaders();
    } catch (err) {
      alert(err.response?.data?.error || "Lỗi khi thêm độc giả");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Bạn có chắc muốn xóa độc giả mã: ${id}?`)) {
      try {
        await API.delete(`/docgia/${id}`);
        alert("Đã xóa độc giả!");
        fetchReaders();
      } catch (err) {
        alert(
          "Lỗi: " +
            (err.response?.data?.error || err.message || "Không thể xóa!"),
        );
      }
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>👤 QUẢN LÝ ĐỘC GIẢ</h2>

      {/* FORM THÊM MỚI (PHONG CÁCH GLASS) */}
      <div style={formCardStyle}>
        <h3 style={subTitleStyle}>➕ Thêm độc giả mới</h3>
        <form onSubmit={handleSubmit} style={formGridStyle}>
          <div style={inputBox}>
            <label style={labelStyle}>Mã độc giả</label>
            <input
              placeholder="VD: SV001"
              value={formData.id_doc_gia}
              onChange={(e) =>
                setFormData({ ...formData, id_doc_gia: e.target.value })
              }
              required
              style={inputStyle}
            />
          </div>
          <div style={inputBox}>
            <label style={labelStyle}>Họ và tên</label>
            <input
              placeholder="Nhập tên đầy đủ"
              value={formData.ho_ten}
              onChange={(e) =>
                setFormData({ ...formData, ho_ten: e.target.value })
              }
              required
              style={inputStyle}
            />
          </div>
          <div style={inputBox}>
            <label style={labelStyle}>Email</label>
            <input
              placeholder="example@gmail.com"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={inputBox}>
            <label style={labelStyle}>Loại độc giả</label>
            <select
              value={formData.loai_doc_gia}
              onChange={(e) =>
                setFormData({ ...formData, loai_doc_gia: e.target.value })
              }
              style={inputStyle}
            >
              <option value="SinhVien">Sinh Viên</option>
              <option value="GiangVien">Giảng Viên</option>
            </select>
          </div>
          <div style={inputBox}>
            <label style={labelStyle}>Ngày hết hạn thẻ</label>
            <input
              type="date"
              value={formData.ngay_het_han_the}
              onChange={(e) =>
                setFormData({ ...formData, ngay_het_han_the: e.target.value })
              }
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" style={btnLuuStyle}>
              Lưu Độc Giả
            </button>
          </div>
        </form>
      </div>

      {/* BẢNG DANH SÁCH */}
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={theadStyle}>
              <th style={thStyle}>Mã ĐG</th>
              <th style={thStyle}>Họ Tên</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Loại</th>
              <th style={thStyle}>Hết hạn</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {readers.map((r) => (
              <tr key={r.id_doc_gia} style={trStyle}>
                <td style={tdStyle}>
                  <b>{r.id_doc_gia}</b>
                </td>
                <td style={tdStyle}>{r.ho_ten}</td>
                <td style={tdStyle}>{r.email || "---"}</td>
                <td style={tdStyle}>
                  <span style={roleBadge(r.loai_doc_gia)}>
                    {r.loai_doc_gia}
                  </span>
                </td>
                <td style={tdStyle}>
                  {new Date(r.ngay_het_han_the).toLocaleDateString("vi-VN")}
                </td>
                <td style={tdStyle}>
                  <span style={statusBadge(r.trang_thai_the)}>
                    {r.trang_thai_the}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDelete(r.id_doc_gia)}
                    style={btnXoaStyle}
                  >
                    🗑 Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- STYLES ĐỒNG BỘ GALAXY PASTEL ---

const containerStyle = {
  padding: "30px",
  background: "#f8faff",
  minHeight: "100vh",
};
const titleStyle = {
  color: "#2c3e50",
  fontSize: "24px",
  fontWeight: "800",
  marginBottom: "25px",
};

const formCardStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
  border: "1px solid #f0f0f0",
  marginBottom: "30px",
};

const subTitleStyle = {
  fontSize: "16px",
  color: "#5d78ff",
  marginBottom: "20px",
  fontWeight: "700",
};
const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
};
const inputBox = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#718096" };

const inputStyle = {
  padding: "12px 15px",
  borderRadius: "12px",
  border: "1px solid #e0e7ff",
  fontSize: "14px",
  outline: "none",
  background: "#fcfdff",
};

const btnLuuStyle = {
  width: "100%",
  padding: "12px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 4px 15px rgba(118, 75, 162, 0.2)",
  transition: "0.3s",
};

const tableWrapperStyle = {
  background: "#fff",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
  overflow: "hidden",
  border: "1px solid #f0f0f0",
};

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "#f8faff" };
const thStyle = {
  padding: "18px 20px",
  textAlign: "left",
  fontSize: "13px",
  color: "#718096",
  fontWeight: "600",
  borderBottom: "1px solid #f0f0f0",
};
const trStyle = { borderBottom: "1px solid #f8faff", transition: "0.2s" };
const tdStyle = { padding: "18px 20px", fontSize: "14px", color: "#444" };

const btnXoaStyle = {
  background: "#fff1f0",
  color: "#ff4d4f",
  border: "1px solid #ffccc7",
  padding: "8px 15px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

// Badges
const roleBadge = (role) => ({
  padding: "4px 10px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "600",
  background: role === "GiangVien" ? "#e6f7ff" : "#f9f0ff",
  color: role === "GiangVien" ? "#1890ff" : "#722ed1",
});

const statusBadge = (status) => ({
  padding: "4px 10px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "600",
  background:
    status === "HoatDong" || status === "Đang hoạt động"
      ? "#f6ffed"
      : "#fff1f0",
  color:
    status === "HoatDong" || status === "Đang hoạt động"
      ? "#52c41a"
      : "#f5222d",
});

export default DocGia;
