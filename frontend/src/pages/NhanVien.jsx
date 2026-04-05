import { useEffect, useState } from "react";
import API from "../services/api";

function NhanVien() {
  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    id_nhan_vien: "",
    ho_ten: "",
    ten_dang_nhap: "",
    mat_khau: "",
    quyen: "ThuThu",
    trang_thai: "DangLamViec",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await API.get("/nhanvien");
      setList(res.data);
    } catch (err) {
      console.error("Lỗi load dữ liệu:", err);
    }
  };

  const resetForm = () => {
    setForm({
      id_nhan_vien: "",
      ho_ten: "",
      ten_dang_nhap: "",
      mat_khau: "",
      quyen: "ThuThu",
      trang_thai: "DangLamViec",
    });
    setEditingId(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ HÀM SUBMIT ĐÃ ĐỒNG BỘ VỚI BACKEND
  const handleSubmit = async () => {
    if (!form.id_nhan_vien || !form.ho_ten || !form.ten_dang_nhap) {
      alert("Vui lòng điền đầy đủ Mã NV, Họ tên và Tên đăng nhập!");
      return;
    }

    if (!editingId && !form.mat_khau) {
      alert("Vui lòng nhập mật khẩu cho nhân viên mới!");
      return;
    }

    // Bóc tách dữ liệu sạch để đảm bảo Backend nhận đúng tên trường
    const dataToSubmit = {
      ho_ten: form.ho_ten,
      ten_dang_nhap: form.ten_dang_nhap,
      mat_khau: form.mat_khau,
      quyen: form.quyen,
      trang_thai: form.trang_thai,
    };

    try {
      if (editingId) {
        // Cập nhật: gửi PUT kèm ID trên URL và body chứa data sạch
        await API.put(`/nhanvien/${editingId}`, dataToSubmit);
        alert("Cập nhật nhân viên thành công!");
      } else {
        // Thêm mới: gửi POST kèm mã nhân viên
        await API.post("/nhanvien", {
          ...dataToSubmit,
          id_nhan_vien: form.id_nhan_vien,
        });
        alert("Thêm nhân viên mới thành công!");
      }

      await fetchData(); // Tải lại danh sách để thấy thay đổi ngay lập tức
      resetForm();
    } catch (err) {
      console.error("Lỗi cập nhật:", err);
      alert("Có lỗi xảy ra khi lưu dữ liệu!");
    }
  };

  const handleEdit = (nv) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setEditingId(nv.id_nhan_vien);
    // Gán dữ liệu vào form nhưng để trống mật khẩu để bảo mật
    setForm({
      ...nv,
      mat_khau: "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn chắc chắn muốn xoá nhân viên có mã ${id}?`))
      return;
    try {
      await API.delete(`/nhanvien/${id}`);
      alert("Đã xoá nhân viên!");
      fetchData();
    } catch (err) {
      console.error("Lỗi xoá:", err);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>👤 QUẢN LÝ NHÂN VIÊN</h2>

      <div style={glassCard}>
        <h3 style={subTitleStyle}>
          {editingId ? "✏️ Cập nhật thông tin" : "➕ Tạo tài khoản nhân viên"}
        </h3>

        <div style={formGrid}>
          <div style={inputGroup}>
            <label style={labelStyle}>Mã Nhân Viên</label>
            <input
              name="id_nhan_vien"
              value={form.id_nhan_vien}
              disabled={editingId}
              onChange={handleChange}
              style={editingId ? disabledInputStyle : inputStyle}
            />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Họ và Tên</label>
            <input
              name="ho_ten"
              value={form.ho_ten}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Tên đăng nhập</label>
            <input
              name="ten_dang_nhap"
              value={form.ten_dang_nhap}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Mật khẩu</label>
            <input
              name="mat_khau"
              type="password"
              placeholder={
                editingId ? "(Bỏ trống nếu không đổi)" : "Nhập mật khẩu"
              }
              value={form.mat_khau}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Phân quyền</label>
            <select
              name="quyen"
              value={form.quyen}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="ThuThu">Thủ Thư</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Trạng thái</label>
            <select
              name="trang_thai"
              value={form.trang_thai}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="DangLamViec">Đang làm việc</option>
              <option value="NghiViec">Nghỉ việc</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 25, display: "flex", gap: "12px" }}>
          <button onClick={handleSubmit} style={primaryBtn}>
            {editingId ? "Lưu thay đổi" : "Tạo nhân viên"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={cancelBtn}>
              Hủy bỏ
            </button>
          )}
        </div>
      </div>

      <div style={tableWrapperStyle}>
        <div style={tableHeader}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#444" }}>
            📋 Danh sách nhân viên hệ thống
          </h3>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr style={theadStyle}>
              <th style={thStyle}>Mã NV</th>
              <th style={thStyle}>Họ tên</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Quyền</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {list.map((nv) => (
              <tr key={nv.id_nhan_vien} style={trStyle}>
                <td style={tdStyle}>
                  <b>{nv.id_nhan_vien}</b>
                </td>
                <td style={tdStyle}>{nv.ho_ten}</td>
                <td style={tdStyle}>
                  <code>{nv.ten_dang_nhap}</code>
                </td>
                <td style={tdStyle}>
                  <span style={nv.quyen === "Admin" ? adminBadge : userBadge}>
                    {nv.quyen === "Admin" ? "🛡️ Admin" : "👤 User"}
                  </span>
                </td>
                <td style={tdStyle}>
                  {/* Logic hiển thị màu sắc dựa trên giá trị text chuẩn */}
                  <span
                    style={
                      nv.trang_thai === "DangLamViec"
                        ? statusActive
                        : statusInactive
                    }
                  >
                    {nv.trang_thai === "DangLamViec"
                      ? "● Đang làm"
                      : "○ Nghỉ việc"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => handleEdit(nv)} style={editBtn}>
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(nv.id_nhan_vien)}
                    style={deleteBtn}
                  >
                    Xoá
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

// --- CSS STYLES (GIỮ NGUYÊN) ---
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
const glassCard = {
  background: "#fff",
  padding: "25px",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
  border: "1px solid #f0f0f0",
  marginBottom: "30px",
};
const subTitleStyle = {
  fontSize: "16px",
  color: "#764ba2",
  marginBottom: "20px",
  fontWeight: "700",
};
const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
};
const inputGroup = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#718096" };
const inputStyle = {
  padding: "12px 15px",
  borderRadius: "12px",
  border: "1px solid #e0e7ff",
  fontSize: "14px",
  background: "#fcfdff",
  outline: "none",
};
const disabledInputStyle = {
  ...inputStyle,
  background: "#f1f3f5",
  color: "#adb5bd",
  cursor: "not-allowed",
};
const primaryBtn = {
  padding: "12px 30px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 4px 15px rgba(118, 75, 162, 0.2)",
};
const cancelBtn = {
  padding: "12px 30px",
  background: "#f8faff",
  color: "#718096",
  border: "1px solid #e0e7ff",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "600",
};
const tableWrapperStyle = {
  background: "#fff",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
  overflow: "hidden",
  border: "1px solid #f0f0f0",
};
const tableHeader = {
  padding: "20px",
  borderBottom: "1px solid #f8faff",
  background: "#fcfdff",
};
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "#f8faff" };
const thStyle = {
  padding: "18px 20px",
  textAlign: "left",
  fontSize: "13px",
  color: "#718096",
  fontWeight: "600",
};
const trStyle = { borderBottom: "1px solid #f8faff" };
const tdStyle = { padding: "18px 20px", fontSize: "14px", color: "#444" };
const adminBadge = {
  background: "#fff1f0",
  color: "#f5222d",
  padding: "4px 10px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "700",
  border: "1px solid #ffa39e",
};
const userBadge = {
  background: "#f0f5ff",
  color: "#1d39c4",
  padding: "4px 10px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "700",
  border: "1px solid #adc6ff",
};
const statusActive = { color: "#52c41a", fontWeight: "600" };
const statusInactive = { color: "#bfbfbf", fontWeight: "600" };
const editBtn = {
  background: "#e6f7ff",
  color: "#1890ff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  marginRight: "8px",
  fontWeight: "600",
};
const deleteBtn = {
  background: "#fff1f0",
  color: "#ff4d4f",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

export default NhanVien;
