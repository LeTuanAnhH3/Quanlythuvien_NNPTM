const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const nhanvienRoutes = require("./routes/nhanvien.routes");
const muonTraRoutes = require("./routes/muontra.routes"); 
const dauSachRoutes = require("./routes/dausach.routes"); 
const docGiaRoutes = require("./routes/docgia.routes"); // ✅ 1. Đã thêm
const reportRoutes = require("./routes/report.routes"); 
const tacGiaRoutes = require("./routes/tacgia.routes");
const nxbRoutes = require("./routes/nxb.routes");
const viTriKeRoutes = require("./routes/vitrike.routes");
const caiDatRoutes = require("./routes/caidat.routes");
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api", authRoutes); 
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/nhanvien", nhanvienRoutes); 
app.use("/api/muontra", muonTraRoutes);
app.use("/api/dausach", dauSachRoutes);
app.use("/api/docgia", docGiaRoutes); // ✅ 2. Đã thêm (Phải khớp với http://localhost:5000/api/docgia)
app.use("/api/report", reportRoutes); 
app.use("/api/tacgia", tacGiaRoutes);
app.use("/api/nxb", nxbRoutes);
app.use("/api/vitrike", viTriKeRoutes);
app.use("/api/caidat", caiDatRoutes);

app.use('/uploads', express.static('uploads'));

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Backend chạy tại http://localhost:${PORT}`));