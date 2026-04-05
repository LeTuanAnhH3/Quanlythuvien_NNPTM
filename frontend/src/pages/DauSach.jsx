import { useEffect, useState } from "react";
import API from "../services/api";

function DauSach() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    isbn: "",
    ten_sach: "",
    tac_gia: "",
    id_the_loai: "",
    file: null,
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await API.get("/dausach");
      setBooks(res.data);
    } catch (err) {
      console.error("Lỗi tải sách");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/dausach/the-loai");
      setCategories(res.data);
    } catch (err) {
      console.error("Lỗi tải thể loại");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("isbn", formData.isbn);
    data.append("ten_sach", formData.ten_sach);
    data.append("tac_gia", formData.tac_gia);
    data.append("id_the_loai", formData.id_the_loai);
    if (formData.file) data.append("hinh_anh", formData.file);

    try {
      const url = editingId ? `/dausach/${editingId}` : "/dausach";

      const method = editingId ? "put" : "post";
      await API[method](url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Thao tác thành công!");
      setEditingId(null);
      setFormData({
        isbn: "",
        ten_sach: "",
        tac_gia: "",
        id_the_loai: "",
        file: null,
      });
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.error || "Lỗi hệ thống!");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, color: "#2c3e50" }}>📚 Quản lý Đầu sách</h2>
        <input
          style={searchInput}
          placeholder="Tìm tên sách hoặc tác giả..."
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* FORM NHẬP LIỆU */}
      <div style={formCard}>
        <h3 style={{ marginTop: 0, fontSize: "16px", color: "#5d78ff" }}>
          {editingId ? "Cập nhật thông tin" : "Thêm đầu sách mới"}
        </h3>
        <form onSubmit={handleSubmit} style={formGrid}>
          <input
            style={inputStyle}
            placeholder="Mã ISBN"
            value={formData.isbn}
            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
            required
          />
          <input
            style={inputStyle}
            placeholder="Tên sách"
            value={formData.ten_sach}
            onChange={(e) =>
              setFormData({ ...formData, ten_sach: e.target.value })
            }
            required
          />
          <input
            style={inputStyle}
            placeholder="Tác giả"
            value={formData.tac_gia}
            onChange={(e) =>
              setFormData({ ...formData, tac_gia: e.target.value })
            }
            required
          />

          <select
            style={inputStyle}
            value={formData.id_the_loai}
            onChange={(e) =>
              setFormData({ ...formData, id_the_loai: e.target.value })
            }
            required
          >
            <option value="">-- Chọn thể loại --</option>
            {categories.map((c) => (
              <option key={c.id_the_loai} value={c.id_the_loai}>
                {c.ten_the_loai}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={fileLabel}>
              📁 Chọn ảnh bìa
              <input
                type="file"
                style={{ display: "none" }}
                onChange={(e) =>
                  setFormData({ ...formData, file: e.target.files[0] })
                }
              />
            </label>
            {formData.file && (
              <span style={{ fontSize: "12px", color: "#2ecc71" }}>
                ✔ {formData.file.name}
              </span>
            )}
          </div>

          <button type="submit" style={editingId ? btnUpdate : btnAdd}>
            {editingId ? "Cập nhật" : "Thêm mới"}
          </button>
        </form>
      </div>

      {/* DANH SÁCH BẢNG */}
      <div style={tableWrapper}>
        <table style={tableStyle}>
          <thead>
            <tr style={theadStyle}>
              <th style={thStyle}>Ảnh</th>
              <th style={thStyle}>ISBN</th>
              <th style={thStyle}>Tên Sách</th>
              <th style={thStyle}>Tác Giả</th>
              <th style={thStyle}>Thể Loại</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {books
              .filter((b) =>
                b.ten_sach.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((b) => (
                <tr key={b.id_dau_sach} style={trStyle}>
                  <td style={tdStyle}>
                    {b.hinh_anh ? (
                      <img
                        src={`http://localhost:5000${b.hinh_anh}`}
                        alt="book"
                        style={imgPreview}
                      />
                    ) : (
                      <div style={noImg}>No Image</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={idBadge}>{b.isbn}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: "600" }}>
                    {b.ten_sach}
                  </td>
                  <td style={tdStyle}>{b.tac_gia}</td>
                  <td style={tdStyle}>
                    <span style={genreBadge}>{b.ten_the_loai}</span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => {
                        setEditingId(b.id_dau_sach);
                        setFormData({
                          isbn: b.isbn,
                          ten_sach: b.ten_sach,
                          tac_gia: b.tac_gia,
                          id_the_loai: b.id_the_loai,
                          file: null,
                        });
                      }}
                      style={btnEdit}
                    >
                      Sửa
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

// --- CSS IN JS (ĐỒNG BỘ PROJECT) ---
const containerStyle = {
  padding: "30px",
  background: "#f8faff",
  minHeight: "100vh",
};
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
};
const searchInput = {
  padding: "10px 15px",
  borderRadius: "10px",
  border: "1px solid #e0e7ff",
  width: "300px",
  outline: "none",
};

const formCard = {
  background: "#fff",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  marginBottom: "30px",
};
const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr) 200px 150px 120px",
  gap: "15px",
  alignItems: "center",
};
const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "14px",
  outline: "none",
};

const fileLabel = {
  background: "#f0f3ff",
  color: "#5d78ff",
  padding: "10px",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "center",
  fontSize: "13px",
  fontWeight: "600",
  border: "1px dashed #5d78ff",
};
const btnAdd = {
  background: "#2ecc71",
  color: "#fff",
  border: "none",
  padding: "10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};
const btnUpdate = {
  background: "#f1c40f",
  color: "#fff",
  border: "none",
  padding: "10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

const tableWrapper = {
  background: "#fff",
  borderRadius: "16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  overflow: "hidden",
};
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "#fcfdff", borderBottom: "2px solid #f1f4f9" };
const thStyle = {
  padding: "15px",
  textAlign: "left",
  color: "#8898aa",
  fontSize: "13px",
  textTransform: "uppercase",
};
const tdStyle = {
  padding: "15px",
  borderBottom: "1px solid #f1f4f9",
  fontSize: "14px",
  color: "#32325d",
};
const trStyle = { transition: "0.2s" };

const imgPreview = {
  width: "45px",
  height: "60px",
  objectFit: "cover",
  borderRadius: "4px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
};
const noImg = {
  width: "45px",
  height: "60px",
  background: "#eee",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "9px",
  color: "#999",
};
const idBadge = {
  background: "#e8f0fe",
  color: "#1a73e8",
  padding: "4px 8px",
  borderRadius: "6px",
  fontWeight: "700",
  fontSize: "12px",
};
const genreBadge = {
  background: "#f0f5ff",
  color: "#1d39c4",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  border: "1px solid #adc6ff",
};
const btnEdit = {
  background: "#e1f5fe",
  color: "#03a9f4",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
};

export default DauSach;
