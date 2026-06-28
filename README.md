# Website Pemasaran Produk Konveksi

Aplikasi web sederhana untuk promosi dan manajemen konveksi dengan fitur katalog produk, detail produk, form pemesanan, dan dashboard admin.

## Fitur Utama

- Halaman home dengan profil usaha dan banner
- Katalog produk (gambar, nama, harga)
- Detail produk
- Form pemesanan (nama, no HP, alamat, produk)
- Dashboard admin (login, kelola produk, kelola pesanan)
- Database SQLite untuk produk, pelanggan, dan pesanan
- Desain responsive dan tombol WhatsApp

## Struktur Folder

- `app.js` - server Express utama
- `db.js` - inisialisasi database SQLite dan helper query
- `data/konveksi.db` - file database SQLite otomatis dibuat saat pertama dijalankan
- `public/` - asset statis seperti CSS dan gambar
- `views/` - template EJS untuk halaman

## Cara Menjalankan di Localhost

1. Buka terminal di folder proyek.
2. Install dependensi:

```bash
npm install
```

3. Jalankan server:

```bash
npm start
```

4. Buka browser kemudian buka:

```text
http://localhost:3001
```

## Akun Admin

- Username: `admin`
- Password: `admin123`

## Catatan

Jika ingin mengubah nomor WhatsApp, buka `app.js` dan ubah nilai `whatsappNumber`.
