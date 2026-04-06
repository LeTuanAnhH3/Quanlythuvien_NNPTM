const jwt = require("jsonwebtoken");

// 1. Xác thực Token (Authentication)
const verifyToken = (req, res, next) => {
  // Lấy token từ header Authorization (dạng: Bearer <token>)
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Bạn cần đăng nhập để truy cập!",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Lưu thông tin user (id, role) vào request để dùng ở sau
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn!",
    });
  }
};

// 2. Middleware chỉ dành cho Admin (Dùng role từ Token)
const adminOnly = (req, res, next) => {
  // Kiểm tra role đã được giải mã từ verifyToken
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Quyền truy cập bị từ chối: Chỉ dành cho Quản trị viên!",
    });
  }
  next();
};

// 3. Middleware phân quyền linh hoạt (Dành cho nhiều nhóm quyền)
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Lỗi 403 Forbidden: Bạn không có quyền thực hiện hành động này!",
      });
    }
    next();
  };
};

module.exports = { verifyToken, adminOnly, checkRole };
