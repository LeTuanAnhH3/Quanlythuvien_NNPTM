import { useEffect, useState } from "react";
import axios from "axios";

function DauSach() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State cho các danh mục đổ vào Dropdown
  const [metadata, setMetadata] = useState({
    authors: [],
    publishers: [],
    shelves: []
  });

  const [formData, setFormData] = useState({
    isbn: "",
    ten_sach: "",
    id_tac_gia: "",
    id_nxb: "",
    id_the_loai: "",
    id_ke: "",
    file: null 
  });
  
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchBooks();
    fetchCategories();
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
        const [tg, nxb, ke] = await Promise.all([
            axios.get("http://localhost:5000/api/tacgia"),
            axios.get("http://localhost:5000/api/nxb"),
            axios.get("http://localhost:5000/api/vitrike")
        ]);
        setMetadata({ authors: tg.data, publishers: nxb.data, shelves: ke.data });
    } catch (err) { console.error("Lỗi tải danh mục metadata"); }
  };

  const fetchBooks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dausach");
      setBooks(res.data);
    } catch (err) { console.error("Lỗi tải sách"); }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dausach/the-loai");
      setCategories(res.data);
    } catch (err) { console.error("Lỗi tải thể loại"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
        if (key === 'file') {
            if (formData.file) data.append("hinh_anh", formData.file);
        } else {
            data.append(key, formData[key]);
        }
    });

    try {
      const url = editingId 
        ? `http://localhost:5000/api/dausach/${editingId}` 
        : "http://localhost:5000/api/dausach";
      
      const method = editingId ? "put" : "post";
      await axios[method](url, data, { headers: { "Content-Type": "multipart/form-data" } });

      alert("🎉 Thao tác thành công!");
      handleReset();
      fetchBooks();
    } catch (err) { alert("❌ Lỗi: " + err.response?.data?.error || "Hệ thống trục trặc"); }
  };

  const handleReset = () => {
    setEditingId(null);
    setFormData({ isbn: "", ten_sach: "", id_tac_gia: "", id_nxb: "", id_the_loai: "", id_ke: "", file: null });
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
            <h2 style={{ margin: 0, color: "#2c3e50", fontSize: '24px' }}>📚 Quản lý Đầu sách</h2>
            <p style={{ color: "#7f8c8d", margin: "5px 0 0 0" }}>Quản lý thông tin sách và vị trí lưu trữ</p>
        </div>
        <input 
          style={searchInput} 
          placeholder="🔍 Tìm tên sách hoặc mã ISBN..." 
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* FORM NHẬP LIỆU HIỆN ĐẠI */}
      <div style={formCard}>
        <div style={{ borderBottom: "1px solid #eee", marginBottom: "20px", paddingBottom: "10px" }}>
            <span style={{ fontWeight: "700", color: editingId ? "#f1c40f" : "#5d78ff" }}>
                {editingId ? "📝 CHẾ ĐỘ CHỈNH SỬA" : "➕ THÊM ĐẦU SÁCH MỚI"}
            </span>
        </div>
        
        <form onSubmit={handleSubmit} style={formGrid}>
          <div style={inputGroup}>
            <label style={labelStyle}>Mã ISBN</label>
            <input style={inputStyle} placeholder="Nhập ISBN..." value={formData.isbn} onChange={(e) => setFormData({...formData, isbn: e.target.value})} required />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Tên đầu sách</label>
            <input style={inputStyle} placeholder="Nhập tên sách..." value={formData.ten_sach} onChange={(e) => setFormData({...formData, ten_sach: e.target.value})} required />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Tác giả</label>
            <select style={inputStyle} value={formData.id_tac_gia} onChange={(e) => setFormData({...formData, id_tac_gia: e.target.value})} required>
              <option value="">-- Chọn tác giả --</option>
              {metadata.authors.map(a => <option key={a.id_tac_gia} value={a.id_tac_gia}>{a.ten_tac_gia}</option>)}
            </select>
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Thể loại</label>
            <select style={inputStyle} value={formData.id_the_loai} onChange={(e) => setFormData({...formData, id_the_loai: e.target.value})} required>
              <option value="">-- Chọn thể loại --</option>
              {categories.map(c => <option key={c.id_the_loai} value={c.id_the_loai}>{c.ten_the_loai}</option>)}
            </select>
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Nhà xuất bản</label>
            <select style={inputStyle} value={formData.id_nxb} onChange={(e) => setFormData({...formData, id_nxb: e.target.value})} required>
              <option value="">-- Chọn NXB --</option>
              {metadata.publishers.map(p => <option key={p.id_nxb} value={p.id_nxb}>{p.ten_nxb}</option>)}
            </select>
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Vị trí (Kệ)</label>
            <select style={inputStyle} value={formData.id_ke} onChange={(e) => setFormData({...formData, id_ke: e.target.value})} required>
              <option value="">-- Chọn vị trí --</option>
              {metadata.shelves.map(s => <option key={s.id_ke} value={s.id_ke}>{s.ten_ke} (Tầng {s.tang})</option>)}
            </select>
          </div>

          <div style={{ ...inputGroup, gridColumn: "span 1" }}>
            <label style={labelStyle}>Ảnh bìa</label>
            <label style={fileLabel}>
              {formData.file ? `✅ ${formData.file.name.substring(0,15)}...` : "📁 Tải ảnh lên"}
              <input type="file" style={{ display: "none" }} onChange={(e) => setFormData({...formData, file: e.target.files[0]})} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", height: "100%" }}>
            <button type="submit" style={editingId ? btnUpdate : btnAdd}>
              {editingId ? "Cập nhật" : "Thêm mới"}
            </button>
            {editingId && <button type="button" onClick={handleReset} style={btnCancel}>Hủy</button>}
          </div>
        </form>
      </div>

      {/* DANH SÁCH BẢNG */}
      <div style={tableWrapper}>
        <table style={tableStyle}>
          <thead>
            <tr style={theadStyle}>
              <th style={thStyle}>Ảnh</th>
              <th style={thStyle}>Thông tin sách</th>
              <th style={thStyle}>Tác giả</th>
              <th style={thStyle}>Vị trí lưu trữ</th>
              <th style={thStyle}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {books.filter(b => b.ten_sach.toLowerCase().includes(searchTerm.toLowerCase()) || b.isbn.includes(searchTerm)).map((b) => (
              <tr key={b.id_dau_sach} style={trStyle}>
                <td style={tdStyle}>
                  {b.hinh_anh ? (
                    <img src={`http://localhost:5000${b.hinh_anh}`} alt="book" style={imgPreview} />
                  ) : (
                    <div style={noImg}>Ảnh trống</div>
                  )}
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: "700", color: "#2c3e50" }}>{b.ten_sach}</div>
                  <div style={{ fontSize: "12px", color: "#95a5a6" }}>ISBN: {b.isbn}</div>
                  <span style={genreBadge}>{b.ten_the_loai}</span>
                </td>
                <td style={tdStyle}>
                  <div style={{ color: "#34495e" }}>{b.ten_tac_gia || "Chưa cập nhật"}</div>
                  <div style={{ fontSize: "12px", color: "#bdc3c7" }}>{b.ten_nxb}</div>
                </td>
                <td style={tdStyle}>
                  <span style={shelfBadge}>
                    📍 {b.ten_ke || "Kệ trống"} - Tầng {b.tang || "0"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => {
                      setEditingId(b.id_dau_sach);
                      setFormData({
                          isbn: b.isbn, 
                          ten_sach: b.ten_sach, 
                          id_tac_gia: b.id_tac_gia, 
                          id_nxb: b.id_nxb,
                          id_the_loai: b.id_the_loai,
                          id_ke: b.id_ke,
                          file: null
                      })}} style={btnEdit}>Sửa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- CSS TRONG JS (Đồng bộ Style hiện đại) ---
const containerStyle = { padding: "40px", background: "#f0f2f5", minHeight: "100vh", fontFamily: "'Inter', sans-serif" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" };
const searchInput = { padding: "12px 20px", borderRadius: "12px", border: "none", width: "350px", outline: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" };

const formCard = { background: "#fff", padding: "25px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", marginBottom: "30px" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" };
const inputGroup = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#64748b" };
const inputStyle = { padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none", transition: "0.3s" };

const fileLabel = { background: "#f8fafc", color: "#6366f1", padding: "12px", borderRadius: "10px", cursor: "pointer", textAlign: "center", fontSize: "13px", fontWeight: "600", border: "2px dashed #e2e8f0" };
const btnAdd = { background: "#6366f1", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", width: "100%" };
const btnUpdate = { background: "#f59e0b", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", width: "100%" };
const btnCancel = { background: "#94a3b8", color: "#fff", border: "none", padding: "12px 15px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };

const tableWrapper = { background: "#fff", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", overflow: "hidden" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "#f8fafc" };
const thStyle = { padding: "18px", textAlign: "left", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" };
const tdStyle = { padding: "18px", borderBottom: "1px solid #f1f5f9", fontSize: "14px" };
const trStyle = { transition: "0.2s" };

const imgPreview = { width: "50px", height: "70px", objectFit: "cover", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" };
const noImg = { width: "50px", height: "70px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#94a3b8", textAlign: "center" };
const genreBadge = { display: "inline-block", marginTop: "5px", background: "#e0e7ff", color: "#4338ca", padding: "2px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" };
const shelfBadge = { background: "#f0fdf4", color: "#166534", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "1px solid #bbf7d0" };
const btnEdit = { background: "#eff6ff", color: "#2563eb", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" };

export default DauSach;