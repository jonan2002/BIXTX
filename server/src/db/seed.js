// Auto-seed admin user on startup (Render's filesystem is ephemeral)
const path = require("path");
require("./store"); // ensure users table exists before seeding
require("./store"); // ensure users table exists before seeding
require("./store"); // ensure users table exists before seeding
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || path.join(__dirname, "../../../data/bixtx.db");
const db = new Database(dbPath);

const email = (process.env.ADMIN_EMAIL || "systems.manager@bixtx.com").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || "BixtxAdmin2026!";
const hash = bcrypt.hashSync(password, 10);

const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!cols.includes("email")) throw new Error("users table has no 'email' column: " + cols.join(","));

const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

if (row) {
  // keep everything, just refresh the password hash
  if (cols.includes("password")) {
    db.prepare("UPDATE users SET password = ? WHERE email = ?").run(hash, email);
    console.log("[seed] admin password refreshed for", email);
  }
} else {
  const record = {};
  if (cols.includes("email")) record.email = email;
  if (cols.includes("password")) record.password = hash;
  if (cols.includes("password_hash")) { delete record.password; record.password_hash = hash; }
  if (cols.includes("role")) record.role = "admin";
  if (cols.includes("name")) record.name = "Systems Manager";
  if (cols.includes("created_at")) record.created_at = new Date().toISOString();

  const keys = Object.keys(record);
  db.prepare(`INSERT INTO users (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`)
    .run(...keys.map(k => record[k]));
  console.log("[seed] admin user created:", email);
}
