const path = require("path");
const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
// const multer = require('multer');
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const whatsappNumber = "6281234567890";
const adminAccount = { username: "admin", password: "admin123" };

// const upload = multer({
//   dest: path.join(__dirname, 'public', 'images'),
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Hanya file gambar yang diperbolehkan'));
//     }
//   },
//   limits: { fileSize: 5 * 1024 * 1024 } // 5MB
// });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "konveksi-secret-session",
    resave: false,
    saveUninitialized: false,
  }),
);

app.use((req, res, next) => {
  res.locals.whatsappUrl = `https://wa.me/${whatsappNumber}`;
  res.locals.adminUser = req.session.adminUser;
  res.locals.memberUser = req.session.memberUser;
  next();
});

function requireAdmin(req, res, next) {
  if (req.session.adminUser) return next();
  res.redirect("/admin/login");
}

function requireMember(req, res, next) {
  if (req.session.memberUser) return next();
  res.redirect("/member/login");
}

app.get("/", async (req, res) => {
  const products = await db.all("SELECT * FROM products LIMIT 4");
  res.render("home", { products });
});

app.get("/katalog", async (req, res) => {
  const products = await db.all("SELECT * FROM products");
  res.render("katalog", { products });
});

app.get("/produk/:id", async (req, res) => {
  const product = await db.get("SELECT * FROM products WHERE id = ?", [
    req.params.id,
  ]);
  if (!product) return res.status(404).send("Produk tidak ditemukan");
  res.render("produk", { product });
});

app.get("/order", requireMember, async (req, res) => {
  const products = await db.all("SELECT * FROM products");
  res.render("order", { products, errors: [] });
});

app.post("/order", requireMember, async (req, res) => {
  const { product_id, quantity } = req.body;
  const errors = [];
  const orderQuantity = parseInt(quantity, 10) || 1;
  if (!product_id) errors.push("Produk wajib dipilih.");
  if (orderQuantity < 1) errors.push("Jumlah minimal 1.");

  if (errors.length > 0) {
    const products = await db.all("SELECT * FROM products");
    return res.render("order", { products, errors });
  }

  const product = await db.get("SELECT * FROM products WHERE id = ?", [
    product_id,
  ]);
  if (!product) return res.status(400).send("Produk tidak valid.");

  await db.run(
    "INSERT INTO orders (member_id, product_id, quantity, total_price, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      req.session.memberUser.id,
      product_id,
      orderQuantity,
      product.price * orderQuantity,
      "Menunggu konfirmasi",
      new Date().toISOString(),
    ],
  );

  res.redirect("/order-success");
});

app.get("/order-success", (req, res) => {
  res.render("order-success");
});

app.get("/member/register", (req, res) => {
  res.render("member/register", { errors: [] });
});

app.post("/member/register", async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  const errors = [];
  if (!name) errors.push("Nama wajib diisi.");
  if (!email) errors.push("Email wajib diisi.");
  if (!password || password.length < 6)
    errors.push("Password minimal 6 karakter.");
  if (!phone) errors.push("No HP wajib diisi.");
  if (!address) errors.push("Alamat wajib diisi.");

  const existing = await db.get("SELECT id FROM members WHERE email = ?", [
    email,
  ]);
  if (existing) errors.push("Email sudah terdaftar.");

  if (errors.length > 0) {
    return res.render("member/register", { errors });
  }

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  await db.run(
    "INSERT INTO members (name, email, password, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [name, email, hashedPassword, phone, address, new Date().toISOString()],
  );

  res.redirect("/member/login?message=Registrasi berhasil, silakan login.");
});

app.get("/member/login", (req, res) => {
  res.render("member/login", {
    error: null,
    message: req.query.message || null,
  });
});

app.post("/member/login", async (req, res) => {
  const { email, password } = req.body;
  const member = await db.get("SELECT * FROM members WHERE email = ?", [email]);
  if (
    !member ||
    crypto.createHash("sha256").update(password).digest("hex") !==
      member.password
  ) {
    return res.render("member/login", {
      error: "Email atau password salah.",
      message: null,
    });
  }
  req.session.memberUser = {
    id: member.id,
    name: member.name,
    email: member.email,
  };
  res.redirect("/");
});

app.get("/member/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/admin/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === adminAccount.username &&
    password === adminAccount.password
  ) {
    req.session.adminUser = username;
    return res.redirect("/admin/dashboard");
  }
  res.render("login", { error: "Username atau password salah." });
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

app.get("/admin/dashboard", requireAdmin, async (req, res) => {
  const products = await db.get("SELECT COUNT(*) AS count FROM products");
  const orders = await db.get("SELECT COUNT(*) AS count FROM orders");
  const members = await db.get("SELECT COUNT(*) AS count FROM members");
  res.render("admin/dashboard", { counts: { products, orders, members } });
});

app.get("/admin/produk", requireAdmin, async (req, res) => {
  const products = await db.all("SELECT * FROM products");
  res.render("admin/produk", { products });
});

app.get("/admin/produk/new", requireAdmin, (req, res) => {
  res.render("admin/form-produk", {
    product: null,
    action: "/admin/produk/new",
  });
});

app.post("/admin/produk/new", requireAdmin, async (req, res) => {
  const { name, price, image, description } = req.body;
  await db.run(
    "INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)",
    [name, price, image, description],
  );
  res.redirect("/admin/produk");
});

app.get("/admin/produk/edit/:id", requireAdmin, async (req, res) => {
  const product = await db.get("SELECT * FROM products WHERE id = ?", [
    req.params.id,
  ]);
  if (!product) return res.redirect("/admin/produk");
  res.render("admin/form-produk", {
    product,
    action: `/admin/produk/edit/${product.id}`,
  });
});

app.post("/admin/produk/edit/:id", requireAdmin, async (req, res) => {
  const { name, price, image, description } = req.body;
  await db.run(
    "UPDATE products SET name = ?, price = ?, image = ?, description = ? WHERE id = ?",
    [name, price, image, description, req.params.id],
  );
  res.redirect("/admin/produk");
});

app.post("/admin/produk/delete/:id", requireAdmin, async (req, res) => {
  await db.run("DELETE FROM products WHERE id = ?", [req.params.id]);
  res.redirect("/admin/produk");
});

app.get("/admin/pesanan", requireAdmin, async (req, res) => {
  const orders = await db.all(`
    SELECT o.id, m.name AS member_name, m.phone, m.address, p.name AS product_name, o.quantity, o.total_price, o.status, o.created_at
    FROM orders o
    JOIN members m ON o.member_id = m.id
    JOIN products p ON o.product_id = p.id
    ORDER BY o.created_at DESC
  `);
  res.render("admin/pesanan", { orders });
});

app.post("/admin/pesanan/update/:id", requireAdmin, async (req, res) => {
  const { status } = req.body;
  await db.run("UPDATE orders SET status = ? WHERE id = ?", [
    status,
    req.params.id,
  ]);
  res.redirect("/admin/pesanan");
});

app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
