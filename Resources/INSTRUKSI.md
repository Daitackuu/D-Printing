# Instruksi isi folder Resources/ (Build 0.8 — diupdate 3 Okt 2026)

File ini daftar LENGKAP semua file gambar yang dipanggil kode web
D'Printing dari folder `Resources/`. Daftarnya sudah dicek ulang
langsung terhadap kode (`HTML/*.html`, `JS/*.js`) — jadi semua yang
tertulis di sini memang dipakai, dan semua yang dipakai kode ada di sini.
Kalau ada file yang hilang, bagian itu di web bakal tampil sebagai
**ikon rusak** (gambar broken) — bukan error yang bikin web crash, cuma
kelihatan jelek aja.

Aturan umum: file **PNG**, background **transparan** (kecuali
`Default-Avatar.png`), sebaiknya **persegi (1:1)**. Ukuran nggak harus
persis 512×512 — yang penting persegi dan nggak buram pas ditampilkan
kecil di UI. Nama file **case-sensitive** — harus persis sama termasuk
huruf besar/kecil dan tanda hubung (`-`).

Semua halaman ada di folder `HTML/`, jadi path yang dipakai kode selalu
`../Resources/Icons/NamaFile.png` (lewat helper `iconImg()` di
`JS/app.js`, atau langsung lewat tag `<img>` di file HTML).

## `Resources/Icons/` — ikon UI (pengganti emoji), 68 file (4 di antaranya aset nganggur, lihat catatan di bawah tabel)

Semua file di bawah **sudah ada** di folder ini, jadi web nggak bakal
nampilin ikon rusak kalau di-deploy apa adanya. Sebagian sudah ikon final,
sebagian masih placeholder — timpa langsung file-nya (nama & ekstensi
persis sama) kapan pun kamu punya ikon baru.

> **Warna ikon otomatis (sejak update ini):** semua ikon dirender lewat
> CSS *mask* (`iconImg()` di `JS/app.js` + class `.icon-img`), bukan `<img>`.
> Artinya **warna PNG-nya nggak berpengaruh** — yang dipakai cuma bentuk &
> transparansinya, sedangkan warnanya otomatis ikut warna teks
> (`currentColor`) tempat ikon itu berada. Jadi kalau kamu ganti ikon dan
> warna aslinya hitam/putih/apapun, tetap kelihatan di background terang
> maupun gelap. Ikon `-Dark` sekarang nggak wajib lagi (dibiarkan aja).
> Syarat: PNG harus punya alpha (background transparan) & satu warna solid.

| Nama file            | Dipakai di mana                                                                 |
|----------------------|----------------------------------------------------------------------------------|
| `Eye.png`            | Tombol tampilkan password (mata terbuka) — `login.html`                         |
| `Eye-Off.png`        | Tombol sembunyikan password (mata tercoret) — `login.html`                      |
| `Home.png`           | Menu sidebar "Home" (link ke `home.html`, paling atas, termasuk tampilan guest) |
| `Upload.png`         | Menu sidebar "Upload"/"Printer" (link ke `upload.html`, termasuk tampilan guest) |
| `Community.png`      | Menu sidebar "Komunitas" & ikon jumlah komentar di kartu postingan (`profile.js`) |
| `Message.png`        | Menu sidebar "Pesan"                                                             |
| `Login.png`          | Link "Masuk / Daftar" di sidebar (tampilan guest, belum login)                  |
| `Support.png`        | Ikon bulat di tombol "Kontak CS" (topbar)                                        |
| `Bell.png`           | Ikon lonceng di topbar & panel notifikasi kosong, dan ikon popup "Ada pesanan belum diterima!" (notifikasi operator/developer, `shell.js`) |
| `OPD.png`            | **Tidak dipakai lagi** — tombol/kartu Dashboard Printing sekarang pakai `Printer.png` (Build 0.5). Aset nganggur, aman dihapus |
| `System.png`, `System-Fit.png` | Kategori "Sistem" di Kotak Masuk & ikon notifikasi dari sistem (`notifications.js`, `inbox.js`). Dulu bernama `Dashboard.png` |
| `Notify.png`         | Item "Kirim Notifikasi" di bubble menu developer (ikon megafon)                  |
| `Printer.png`        | Item "Dashboard Printing" di bubble menu developer & kartu Dashboard Printing di `upload.html` |
| `Members.png`        | Item "Kelola User" di bubble menu developer & tombol "Kelola Anggota" di channel |
| `Settings.png`       | Tombol bulat bubble menu developer (pojok kanan bawah)                          |
| `Plus.png`           | Tombol "Tambah teman" (profil orang lain, `profile.js`) & tombol tambah ukuran di modal "Kelola pilihan ukuran kertas" (`upload.html`) |
| `Check.png`          | Status tombol "Berteman ✓" di profil orang lain                                  |
| `Heart-Filled.png`   | Ikon like yang SUDAH ditekan (kartu postingan)                                   |
| `Heart-Outline.png`  | Ikon like yang BELUM ditekan (kartu postingan)                                   |
| `Image-Add.png`      | Tombol "Ganti foto" di Edit profil → kategori Sosial (`profile.html`)            |
| `Image-Upload.png`   | Tombol "Tambah gambar" di modal bikin postingan baru (`profile.html`)            |
| `Profile.png`        | Judul kategori "Data diri" di Edit profil (`profile.html`)                       |
| `Location.png`       | Judul kategori "Lokasi" di Edit profil (`profile.html`)                          |
| `Social.png`         | Judul kategori "Sosial" di Edit profil (`profile.html`)                          |
| `Recovery.png`       | Menu "Recovery" di menu akun sidebar (`shell.js`)                                |
| `Switch.png`         | Menu "Switch account" di menu titik-tiga (⋯) panel profil sidebar (`shell.js`). Tidak ada lagi di halaman Profil |
| `More.png`           | Tombol titik-tiga (menu akun) di panel profil bawah sidebar                      |
| `Logout.png`         | Menu "Log out" di menu titik-tiga (⋯) panel profil sidebar (`shell.js`). Tidak ada lagi di halaman Profil |
| `Back.png`           | Link "Kembali" di `channel.html`, `job.html`, `printer.html`, dan panah di tombol "Kembali ke …" `login.html` |
| `Edit.png`           | Tombol "Edit Saluran" di header channel & tombol Edit di profil (`channel.html`, `profile.js`) |
| `Trash.png`          | Tombol "Hapus Saluran" di header channel & tombol hapus di Kotak Masuk (`channel.html`, `inbox.js`) |
| `Reject.png`         | Tombol ikon "Tolak" (Dashboard Printing) & "Batal" pesanan (riwayat customer, `home.js`) |
| `Accept.png`         | Tombol ikon "Terima" pesanan masuk (Dashboard Printing)                          |
| `Print-Start.png`    | Tombol ikon "Mulai print" (Dashboard Printing)                                   |
| `Print-Done.png`     | Tombol ikon "Tandai selesai" (Dashboard Printing)                                |
| `Edit-Dark.png`      | Tombol "Ubah" per baris di modal "Kelola pilihan ukuran kertas" (`upload.html`, khusus developer) |
| `Trash-Dark.png`     | Tombol "Hapus" per baris di modal "Kelola pilihan ukuran kertas" (`upload.html`, khusus developer) |
| `Settings-Dark.png`  | Menu "Settings" di menu titik-tiga (⋯) sidebar (`shell.js`) & tombol "Kelola pilihan ukuran kertas" di `upload.html` (khusus developer) |
| `Info.png`           | Ikon toast "Info" (`showToast` type info, `app.js`) — khusus notifikasi, animasi melayang |
| `Warning.png`        | Ikon toast "Perhatian" (`showToast` type warning, `app.js`) — khusus notifikasi, animasi goyang |
| `Redirect.png`       | Notifikasi customer "Operator menolak, pesanan dialihkan ke operator lain" (`notifications.js`) |
| `Stack.png`          | Notifikasi ringkasan "N pesananmu punya kabar baru" (`notifications.js`) |
| `Empty-Inbox.png`    | Empty state "Belum ada pesanan masuk" (Dashboard Printing, `printer.js`)         |
| `Empty-File.png`     | Empty state "Belum ada file masuk" (Dashboard Printing, `printer.js`)            |
| `Empty-History.png`  | Empty state "Belum ada pesanan yang selesai" (Dashboard Printing, `printer.js`)  |
| `Empty-Upload.png`   | Empty state "Belum ada file yang diupload" (`upload.js`)                         |
| `Inbox.png`, `Inbox-Fit.png` | Menu sidebar "Kotak Masuk", tombol "Buka Kotak Masuk" di panel lonceng, label Kotak Masuk & empty state (`inbox.html`, `shell.js`, `notifications.js`) |
| `Mail.png`           | Amplop: panel baca kosong di Kotak Masuk (`inbox.js`) |
| `Star-Filled.png`    | Bintang SUDAH diberi (baris kabar di Kotak Masuk) & label "Berbintang" (`inbox.js`) |
| `Star-Outline.png`   | Bintang BELUM diberi (baris kabar di Kotak Masuk) (`inbox.js`)                  |
| `Community-Dark.png` | **Tidak dipakai lagi** — versi gelap `Community.png`; sejak ikon dirender pakai mask, varian `-Dark` tidak wajib |
| `Check-Dark.png`     | **Tidak dipakai lagi** — versi gelap `Check.png` (tombol "Berteman" sekarang pakai `Check.png`) |
| `Image-Add-Dark.png` | **Tidak dipakai lagi** — versi gelap `Image-Add.png` (tombol "Ganti foto" pakai `Image-Add.png`) |
| `Lock.png`           | Gembok penanda fitur khusus akun terdaftar (badge menu sidebar tamu, toast gerbang tamu, catatan di Profil — `shell.js`, `profile.js`) |
| `Lock-Dark.png`      | Versi gelap `Lock.png` — dipakai di background terang (`shell.js`, `profile.js`) |
| `Bell-Fit.png`, `Community-Fit.png`, `Mail-Fit.png`, `Message-Fit.png`, `Stack-Fit.png`, `Star-Filled-Fit.png`, `Star-Outline-Fit.png`, `Support-Fit.png`, `Trash-Fit.png`, `Warning-Fit.png` | Versi **Fit** (dipotong rapat, ukuran visual seragam) dari ikon dengan nama yang sama. Dipanggil lewat `fitIcon()` di `inbox.js` untuk label, bintang, dan empty state Kotak Masuk. Kalau PNG aslinya diganti, timpa file `-Fit`-nya juga. |

> **Plus-Dark.png** dipakai tombol "Buat channel" di `community.html`
> (latar terang). **Aset nganggur** (tidak dipanggil kode): `OPD.png`,
> `Community-Dark.png`, `Check-Dark.png`, `Image-Add-Dark.png` — bukan ikon
> rusak, aman dihapus atau dibiarkan.

> **Catatan file kembar:** `Eye.png` dan `Eye-Off.png` isinya masih gambar
> generik bertuliskan "PLACEHOLDER" (dulu `Images/Default-Avatar.png` juga
> sama, tapi sudah diganti final di Build 0.1 — lihat catatan di
> `Resources/Images/` di bawah). Fungsinya tetap jalan (nggak ikon rusak),
> cuma kelihatan aneh secara visual sampai kamu timpa.
> `Dashboard.png` sudah diganti namanya jadi `System.png` (isinya beda dari `OPD.png`).

## `Resources/Images/` — gambar umum

- `Web-Logo.png` — **logo web D'Printing** (**PLACEHOLDER**: ikon printer di tile
  biru tua, 512×512). Timpa file ini dengan logo asli (nama & ekstensi
  persis sama, PNG, persegi 1:1, boleh berwarna/transparan). Dipakai di:
  sebelah kiri tulisan D'PRINTING (sidebar, topbar home, halaman login),
  favicon tab browser + apple-touch-icon (semua halaman `HTML/*.html` dan
  `index.html`), dan ikon notifikasi browser (`JS/notifications.js`).
  Ukuran tampil di UI 28×28 lewat class `.brand-logo` di `CSS/style.css`.

- `Default-Avatar.png` — foto profil default kalau user belum upload foto
  sendiri (`DEFAULT_AVATAR_PATH` di `JS/app.js`). Dipakai buat avatar
  orang saja, bukan channel: channel yang belum punya foto pakai ikon
  bundar "#" bawaan CSS. **Sudah final sejak Build 0.1 (26 Sep 2026)** (siluet orang
  dalam lingkaran, 500×500, latar transparan) — sebelumnya masih gambar
  "PLACEHOLDER" abu-abu 554×554.

## `Resources/Audios/` — efek suara notifikasi, 7 file MP3

Semua file **sudah ada** (suara sintetis sederhana sebagai bawaan). Mau ganti
SFX? Timpa file-nya dengan nama & ekstensi yang persis sama (`.mp3`, nama
case-sensitive) — tidak perlu ubah kode. Disarankan durasi pendek (kurang
dari ±2 detik) supaya tidak menumpuk kalau ada beberapa notifikasi sekaligus.
Kalau file hilang, suaranya dilewati diam-diam (web tidak error). Semua suara
mengikuti toggle "Suara" di panel lonceng.

| Nama file      | Dimainkan saat                                                              |
|----------------|------------------------------------------------------------------------------|
| `Success.mp3`  | Toast berhasil (`showToast` type success, `app.js`)                          |
| `Error.mp3`    | Toast gagal (`showToast` type error, `app.js`)                               |
| `Info.mp3`     | Toast info (`showToast` type info, `app.js`)                                 |
| `Warning.mp3`  | Toast perhatian (`showToast` type warning, `app.js`)                         |
| `Notif.mp3`    | Kabar status pesanan customer & tes toggle "Suara" (`notifications.js`)      |
| `Pending.mp3`  | Popup "Ada pesanan belum diterima!" untuk operator/developer (`shell.js`)    |
| `Gate.mp3`     | Toast "Perlu masuk dulu" untuk guest (`shell.js`)                            |

Nggak ada file lain yang wajib disiapkan di folder ini saat ini.

## Yang BUKAN dari folder Resources/

- **Foto profil, foto channel, gambar postingan, dan file yang diupload
  customer** disimpan di **Cloudinary** (bukan di folder ini, dan bukan
  di repo GitHub) — lihat bagian "Setup Cloudinary" di `README.md`.
- **Peta di Profil** ("Isi otomatis dari peta") digambar oleh **Leaflet**
  (lib peta dari CDN) + **Nominatim/OpenStreetMap** (reverse-geocode) — bukan
  Google Maps, tidak butuh file config atau API key apapun (lihat "Setup
  peta" di `README.md`).

---

Kalau nanti nambah fitur baru yang butuh ikon/gambar baru, tambahkan
barisnya di tabel atas ini juga (jangan cuma di `README.md` utama) —
supaya file ini selalu jadi satu sumber kebenaran (*single source of
truth*) buat semua aset gambar yang wajib disiapkan sebelum web di-deploy
ke publik. Cara cek cepat kalau ragu: cari nama file-nya di seluruh
proyek — kalau nggak ada yang manggil, berarti nggak dipakai; kalau ada
yang manggil tapi filenya nggak ada di folder ini, itu bakal jadi ikon
rusak.
