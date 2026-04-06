import { useEffect, useState } from "react";
import API from "../services/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function DashboardHome() {
  const [data, setData] = useState({
    tongDauSach: 0,
    tongDocGia: 0,
    dangMuon: 0,
    tienPhat: 0,
    trendData: [], // Lưu xu hướng mượn theo ngày
    genreData: [], // Lưu dữ liệu thể loại
    topBooks: [], // Lưu top sách
  });

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/dashboard");
        setData({
          tongDauSach: res.data.tongDauSach || 0,
          tongDocGia: res.data.tongDocGia || 0,
          dangMuon: res.data.dangMuon || 0,
          tienPhat: Number(res.data.tienPhat || 0),
          trendData: res.data.trendData || [],
          genreData: res.data.genreData || [],
          topBooks: res.data.topBooks || [],
        });
      } catch (err) {
        console.error("🔥 Lỗi fetch dashboard:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={containerStyle}>
      {/* TIÊU ĐỀ */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "#2c3e50" }}>
          📈 Thống kê chung
        </h1>
        <button
          onClick={async () => {
            try {
              const res = await API.get("/report/export-no-sach", {
                responseType: "blob",
              });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const a = document.createElement("a");
              a.href = url;
              a.download = "BaoCao_NoSach.xlsx";
              a.click();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              alert(
                "Không có sinh viên nào nợ sách quá hạn hoặc lỗi xuất file!",
              );
            }
          }}
          style={exportBtnStyle}
        >
          📥 Xuất báo cáo Excel
        </button>
      </div>

      {/* CÁC THẺ THỐNG KÊ */}
      <div style={statsGridStyle}>
        <StatCard
          title="Tổng Đầu Sách"
          value={data.tongDauSach}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          title="Độc Giả"
          value={data.tongDocGia}
          gradient="linear-gradient(135deg, #2af598 0%, #009efd 100%)"
        />
        <StatCard
          title="Đang Cho Mượn"
          value={data.dangMuon}
          gradient="linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
        />
        <StatCard
          title="Tiền Phạt"
          value={new Intl.NumberFormat("vi-VN").format(data.tienPhat) + "đ"}
          gradient="linear-gradient(135deg, #ff0844 0%, #ffb199 100%)"
        />
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}
      >
        {/* BIỂU ĐỒ XU HƯỚNG THEO NGÀY */}
        <div style={chartWrapperStyle}>
          <h3 style={chartTitleStyle}>📊 Xu hướng mượn sách gần đây</h3>
          <div style={{ height: "350px", marginTop: "20px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#95a5a6", fontSize: 13 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#95a5a6", fontSize: 13 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BIỂU ĐỒ TRÒN THỂ LOẠI */}
        <div style={chartWrapperStyle}>
          <h3 style={chartTitleStyle}>📂 Cơ cấu Thể loại</h3>
          <div style={{ height: "350px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.genreData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.genreData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BẢNG TOP SÁCH MƯỢN NHIỀU */}
      <div style={{ ...chartWrapperStyle, marginTop: "20px" }}>
        <h3 style={chartTitleStyle}>🏆 Top 5 sách được mượn nhiều nhất</h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "15px",
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: "#7f8c8d",
                borderBottom: "1px solid #eee",
              }}
            >
              <th style={{ padding: "12px" }}>Tên Sách</th>
              <th style={{ padding: "12px" }}>Số lượt mượn</th>
            </tr>
          </thead>
          <tbody>
            {data.topBooks &&
              data.topBooks.map((book, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #f9f9f9" }}>
                  <td style={{ padding: "12px", fontSize: "14px" }}>
                    {book.ten_sach}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        background: "#eef2ff",
                        color: "#4f46e5",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      {book.so_luong} lượt
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// COMPONENT CON: THẺ THỐNG KÊ
function StatCard({ title, value, gradient }) {
  return (
    <div
      style={{
        background: gradient,
        padding: "25px",
        borderRadius: "16px",
        color: "#fff",
        boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          opacity: 0.85,
          marginBottom: "8px",
          fontWeight: "500",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

// CSS STYLES
const containerStyle = {
  padding: "25px",
  background: "#fdfdfd",
  minHeight: "90vh",
};
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "30px",
};
const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  marginBottom: "30px",
};
const chartWrapperStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "20px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
};
const chartTitleStyle = {
  margin: 0,
  fontSize: "18px",
  color: "#34495e",
  fontWeight: "600",
};
const exportBtnStyle = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  padding: "10px 20px",
  borderRadius: "10px",
  fontWeight: "600",
  cursor: "pointer",
  color: "#444",
};
