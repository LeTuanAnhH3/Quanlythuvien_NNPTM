const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "librarydb",
  waitForConnections: true,
  connectionLimit: 10,
});

console.log("✅ MySQL Connected");
module.exports = db;
