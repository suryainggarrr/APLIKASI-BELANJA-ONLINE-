const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dataFolder = path.join(__dirname, "data");
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });

const dbFile = path.join(dataFolder, "konveksi.db");

// Hapus database lama untuk force reinitialize
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
}

const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ensureProduct(name, price, image, description) {
  const existing = await get(
    "SELECT id, price, image, description FROM products WHERE name = ?",
    [name],
  );
  if (!existing) {
    await run(
      "INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)",
      [name, price, image, description],
    );
  } else if (
    existing.price !== price ||
    existing.image !== image ||
    existing.description !== description
  ) {
    await run(
      "UPDATE products SET price = ?, image = ?, description = ? WHERE id = ?",
      [price, image, description, existing.id],
    );
  }
}

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT NOT NULL,
    description TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(member_id) REFERENCES members(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  await ensureProduct(
    "Baju Wanita",
    75000,
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
    "Baju wanita berkualitas tinggi, nyaman dipakai untuk acara formal maupun santai.",
  );
  await ensureProduct(
    "Celana Wanita",
    95000,
    "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=800&q=80",
    "Celana wanita nyaman dan stylish, cocok untuk aktivitas sehari-hari.",
  );
  await ensureProduct(
    "Hijab",
    55000,
    "/images/hijab-wanita.avif",
    "Hijab lembut dengan bahan premium, mudah dibentuk dan nyaman dipakai.",
  );
  await ensureProduct(
    "Sandal Wanita",
    65000,
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80",
    "Sandal wanita modis dengan sol empuk untuk gaya santai sehari-hari.",
  );
}

init().catch((err) => {
  console.error("Gagal inisialisasi database:", err);
});

module.exports = { run, get, all };
