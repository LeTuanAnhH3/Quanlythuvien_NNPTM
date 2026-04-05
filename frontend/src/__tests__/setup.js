// Thêm các matcher của jest-dom (toBeInTheDocument, toBeDisabled, v.v.)
import "@testing-library/jest-dom";

// Mock localStorage cho môi trường jsdom
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Tắt console.error để output test sạch hơn (chỉ xem lỗi vitest)
// Bỏ dòng dưới nếu cần debug chi tiết
// vi.spyOn(console, 'error').mockImplementation(() => {});
