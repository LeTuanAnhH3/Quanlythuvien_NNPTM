module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["<rootDir>/__tests__/setup.js"],
  clearMocks: true,
  // Đóng pool DB và tất cả async handles sau khi chạy xong
  forceExit: true,
  // Cảnh báo nếu có handles bị giữ quá 5 giây
  detectOpenHandles: true,
};
