const express = require("express");
const cors = require("cors");
const { verifyToken } = require("./middleware/auth");
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const nhanvienRoutes = require("./routes/nhanvien.routes");
const muonTraRoutes = require("./routes/muontra.routes");
const dauSachRoutes = require("./routes/dausach.routes");
const docGiaRoutes = require("./routes/docgia.routes");
const reportRoutes = require("./routes/report.routes");

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Route đăng nhập: công khai, không cần token
app.use("/api", authRoutes);

// Các route cần xác thực: gắn verifyToken trước
app.use("/api/dashboard", verifyToken, dashboardRoutes);
app.use("/api/nhanvien", verifyToken, nhanvienRoutes);
app.use("/api/muontra", verifyToken, muonTraRoutes);
app.use("/api/dausach", verifyToken, dauSachRoutes);
app.use("/api/docgia", verifyToken, docGiaRoutes);
app.use("/api/report", verifyToken, reportRoutes);
app.use("/uploads", express.static("uploads"));

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Backend chạy tại http://localhost:${PORT}`),
);
