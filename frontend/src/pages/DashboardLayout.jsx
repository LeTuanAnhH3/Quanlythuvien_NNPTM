import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function DashboardLayout() {
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");
  const location = useLocation();

  if (!token) return <Navigate to="/" />;

  if (location.pathname.startsWith("/dashboard/nhanvien") && role !== "Admin") {
    alert("Bạn không có quyền truy cập khu vực này!");
    return <Navigate to="/dashboard" />;
  }

  return (
    <div style={layoutContainer}>
      {/* Sidebar cố định bên trái với màu sắc theo ảnh mẫu */}
      <Sidebar />

      {/* Phần nội dung bên phải có khoảng cách và nền sáng */}
      <main style={mainContentStyle}>
        {/* Header ẩn để hiển thị tên người dùng và vai trò nếu cần */}
        <div style={topNavStyle}>
          <div style={{ color: "#7f8c8d" }}>
            Trang quản trị / {location.pathname.split("/").pop()}
          </div>
          <div style={{ fontWeight: "600", color: "#2c3e50" }}>
            👤 {name} <span style={roleBadgeStyle}>{role}</span>
          </div>
        </div>

        {/* Nội dung trang hiển thị tại đây */}
        <div style={pageWrapper}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// --- CSS IN JS THEO PHONG CÁCH CREATIVE TIM ---
const layoutContainer = {
  display: "flex",
  background: "#f4f7fe", // Nền hơi xanh xám nhạt hiện đại
  minHeight: "100vh",
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const mainContentStyle = {
  marginLeft: "260px", // Khớp với chiều rộng Sidebar
  flex: 1,
  padding: "20px 30px",
  transition: "all 0.3s ease",
  display: "flex",
  flexDirection: "column",
};

const topNavStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "15px 0",
  marginBottom: "20px",
};

const pageWrapper = {
  background: "transparent",
  flex: 1,
};

const roleBadgeStyle = {
  fontSize: "11px",
  background: "linear-gradient(135deg, #8e44ad, #9b59b6)", // Tím theo ảnh mẫu
  color: "white",
  padding: "2px 8px",
  borderRadius: "12px",
  marginLeft: "8px",
  textTransform: "uppercase",
};

export default DashboardLayout;
