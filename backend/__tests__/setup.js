// Thiết lập biến môi trường test TRƯỚC KHI bất kỳ module nào được load
// dotenv.config() sẽ không ghi đè các biến đã tồn tại nên .env thật bị bỏ qua
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.DB_HOST = "localhost";
process.env.DB_USER = "root";
process.env.DB_PASSWORD = "test";
process.env.DB_NAME = "testdb";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
