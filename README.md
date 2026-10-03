# D'Printing

Web upload-untuk-print: customer upload file (PDF/Word/gambar), file langsung
dikirim ke akun operator print yang sedang online — tanpa perlu ke counter print dahulu untuk antre.
Ada juga profil, komunitas (channel), dan pesan/pertemanan ala Discord.

> **Versi saat ini: Build 0.8** — **terakhir diupdate:** 3 Oktober 2026
> (lihat "Changelog" tepat di bawah ini; penjelasan **Mode Tamu** ada di bagian
> *Dokumentasi → Mode Tamu*). Daftar ikon/gambar yang wajib ada ada
> di [`Resources/INSTRUKSI.md`](Resources/INSTRUKSI.md).

***

# Changelog

> Riwayat perubahan dinomori pakai sistem **Build**: mulai Build 1.0, nomornya
> naik terus sesuai urutan rilis. Riwayat SEBELUM Build 1.0 (dulu ditulis
> pakai sistem "Fase" A–S) dinomori dengan pola kebalikannya — makin ke
> belakang (makin lama kejadiannya), makin KECIL angkanya, diurutkan mulai
> **Build 0.1** (Fase C, paling awal) sampai **Build 0.17** (Fase S, persis
> sebelum Build 1.0). Cuma yang sebelum Fase C (belum ada penamaan Fase sama
> sekali) yang tetap ditandai **INDEV**. Nama Fase lama (kalau ada) tetap
> dicatat di tiap poin sebagai referensi.

> **Terbaru — Build 0.8 (3 Okt 2026)**, ringkasan (detail lengkap ada di
> bagian *Build 0.8* paling bawah changelog ini):
>
> * **Edit profil dibagi jadi kategori yang bisa dibuka/ditutup** (Data diri,
>   Lokasi, Sosial), masing-masing dengan ikon. **Foto profil & Bio** kini ada
>   di kategori Sosial; ganti foto baru dipakai setelah klik **Simpan**.
>
> * **Kategori Sosial baru**: tautan Instagram, TikTok, Facebook, dan YouTube
>   (field baru `socials`) tampil di kepala profil.
>
> * **Login memeriksa username**: username yang diketik harus sama persis
>   (tak peduli kapitalisasi) dengan yang tersimpan di Firebase, kalau tidak
>   dianggap "belum terdaftar".
>
> * **Username tamu tidak boleh sama dengan akun terdaftar.**
>
> * **Label & judul disamakan**: "Nama tampilan" jadi **Nama**, judul form tamu
>   jadi **Profil Pelanggan** (sama dengan akun login).
>
> * **Daftar Switch account bisa discroll** kalau akunnya banyak, dan
>   tombol **Masuk dengan akun lain** membuka form username/password langsung
>   di dalam popup — kalau cocok, langsung login ke akun itu.
>
> * **Ikon baru**: `Profile`, `Location`, `Social`, `Image-Upload`, `Recovery`.
>   Menu Recovery tidak lagi memakai ikon yang sama dengan Pesanan.
>
> * **`Resources/INSTRUKSI.md` disinkronkan** dengan changelog & kode: total
>   ikon jadi 68, ikon `Lock`/`Lock-Dark` dan 10 ikon `-Fit` dicatat, dan
>   aset nganggur (`OPD`, `Community-Dark`, `Check-Dark`, `Image-Add-Dark`)
>   ditandai.
>
> * **Wajib publish ulang `Rules/firestore.rules`** (field `socials`).

> **Sebelumnya — Build 0.7 (2 Okt 2026)**, ringkasan (detail lengkap ada di
> bagian *Build 0.7* paling bawah changelog ini):
>
> * **Hosting tambahan di Cloudflare**: repo dihubungkan ke Cloudflare
>   (Workers & Pages), jadi tiap push ke `main` otomatis tayang di
>   `https://d-printing.therealofbest.workers.dev/`.
>
> * **`sitemap.xml` & `robots.txt` diisi alamat baru** (placeholder
>   `GANTI-DOMAIN-KAMU` dihapus) dan disesuaikan dengan alamat tanpa `.html`.
>
> * Alamat baru **wajib ditambahkan di Firebase → Authentication → Authorized
>   domains**. Kode web, `firestore.rules`, dan index **tidak berubah**.

> **Sebelumnya — Build 0.6 (2 Okt 2026)**, ringkasan (detail lengkap ada di
> bagian *Build 0.6* paling bawah changelog ini):
>
> * **Mode Tamu**: belum login/daftar sekarang bisa **upload file tanpa akun**
>   (Firebase Anonymous Auth), melihat riwayat & membatalkan pesanan, membuka
>   **Profil tamu** (nama, username, No. WhatsApp, wilayah — disimpan di
>   browser), Detail Info pesanan, Kotak Masuk, dan preview Komunitas & Pesan.
>   Nama bawaan tamu **"Customer"**, role **unassigned**.
>
> * **Pesanan tamu dicocokkan otomatis** ke operator online di wilayah yang
>   sama, riwayatnya **tersimpan di perangkat** (`dcp_guestJobs`).
>
> * **Recovery** (titik-tiga sidebar > General): kode pemulihan + cadangan
>   cloud `guestProfiles`. **Data tamu tidak lagi dipindah otomatis** saat
>   daftar/masuk — wajib lewat kode (popup wajib kalau akun masih kosong).
>
> * **Home jadi landing page**: **Panduan** + tabel **Perbandingan** Belum
>   login vs Sudah login. Teks Home disesuaikan: riwayat pesanan tamu
>   tersimpan di perangkat dan tamu bisa membuka Detail Info.
>
> * **Ukuran kertas sama untuk semua user** (Firestore `settings/paperSizes`).
>
> * **Halaman Pesan didesain ulang** + **Tambah teman lewat username**;
>   **Komunitas**: urutan channel jadi dropdown.
>
> * **Operator**: popup + tombol *Lengkapi di Profil →* kalau lokasi/No. WA
>   belum lengkap saat *Mulai Bekerja*.
>
> * **Sidebar**: titik merah kabar belum dibaca di tombol ⋯ dikecilkan (tidak
>   lagi menutupi ikon), dan di HP menekan ⋯ tidak lagi menutup drawer sidebar.
>
> * **Sidebar tamu**: item **Komunitas** & **Pesan** sekarang ikut ter-highlight
>   (background merah) saat halamannya dibuka, sama seperti Home & Printer.
>   **Lonceng**: badge angka notifikasi dikecilkan.
>   **Login/Daftar**: kode pemulihan tamu tidak lagi ditaruh di halaman, tapi
>   muncul sebagai **popup wajib salin** saat tombol Masuk / Daftar ditekan.
>   Teks *"Login dulu sebelum bisa upload…"* diganti (upload sudah bisa tanpa akun).
>
> * **Dihapus**: teks *"Setelah tersimpan, buka menu Printer…"* dan teks
>   *"Belum login — data ini tersimpan di browser ini…"* di profil, efek glow
>   emas di belakang kartu pratinjau pesanan (landing), panah di tombol
>   *Kembali* (Masuk/Daftar) dan panah antar kartu *Panduan singkat*.
>
> * **`firestore.rules`** **BERUBAH — wajib publish ulang**, dan **Anonymous Auth
>   wajib di-Enable** (lihat Setup 1). Index tidak berubah.

> **Sebelumnya — Build 0.5 (29 Sep 2026)**, ringkasan (detail lengkap ada di
> bagian *Build 0.5* paling bawah changelog ini):
>
> * **Riwayat upload dihapus dari profil sendiri** — sekarang cuma developer
>   yang bisa lihat, lewat profil user lain yang dibuka dari **Kelola User**.
>
> * **Halaman Printers dihapus & digabung ke Kelola User** (`users.html`):
>   user dikelompokkan per kategori (Operator Printer / Customer /
>   Developer) dengan tab filter, jumlah, dan status Online/Offline.
>
> * **Bug kolom Kode Web ID di form Daftar diperbaiki** (cincin fokus input
>   tidak kepotong lagi).
>
> * **Komunitas tampil lebih hidup**: kartu channel bergaya banner berwarna
>
>   * lencana "Baru", kolom cari berbentuk pil dengan urutan Terbaru / A–Z,
>     header ruang obrolan berbanner, dan kolom kirim dengan tombol ikon di HP.
>
> * **Tampilan HP dirapikan di semua halaman**: halaman tidak lagi
>   "melebar" gara-gara nama file/email panjang, teks tidak menumpuk satu
>   huruf per baris, dan tombol aksi turun rapi ke baris berikutnya.
>
> * **Dashboard Printing dibuat minimalis** (`printer.html`): bingkai "tiket"
>   dan kartu di dalam kartu dibuang, detail pesanan (kode, tanggal, ukuran
>   file, kertas) jadi chip kecil, badge status jadi pil berwarna dengan
>   garis status di sisi kiri tiap pesanan, dan kotak **Perlu konfirmasi**
>   otomatis memerah kalau ada pesanan menunggu. CSS-nya dipisah ke file baru
>   `CSS/printer.css` (halaman lain tidak terpengaruh).
>
> * **Outline Komunitas & Recovery tidak lagi mirip kotak upload**: garis
>   putus-putus (dashed) di sana diganti garis solid bergaya sendiri, supaya
>   cuma area upload file yang tampil putus-putus.
>
> * **Tombol "Pilih tipe file" di Upload dipisah jadi dua**: kotak label di
>   kiri dan kotak panah ▾ di kanan (ada celah di antaranya). Klik yang mana
>   pun hasilnya sama (buka/tutup menu tipe file), dan animasi "menekan" satu
>   tombol penuh dihapus — yang bergerak cuma panahnya (berputar saat menu
>   terbuka).
>
> * **Halaman Masuk/Daftar: tombol kembali dirapikan**: tombol "Kembali ke
>   Home" kecil di atas dihapus. Tombol besar di bawah kartu sekarang tidak
>   lagi selalu "Kembali ke Upload" — ia membawa balik ke **halaman yang baru
>   saja dilihat** (selain Masuk/Daftar), dan kalau belum ada, ke **Home**.
>
> * **Ikon baru** **`Inbox.png`** untuk Kotak Masuk (tidak lagi sama dengan
>   ikon pesan); ikon **Dashboard Printing** diganti ke `Printer.png`;
>   `Dashboard.png` diganti nama jadi `System.png`.
>
> * Tidak ada perubahan `firestore.rules` / index — **tidak perlu publish ulang**.

## INDEV

* **Fondasi awal** (dulu "Sebelum Fase C") — upload → Cloudinary →
  `printJobs`, dashboard operator, profil/komunitas/DM/pertemanan, login
  username, Kode Web ID.

## Pre-Build 0.1

* **Alur status pesanan** (dulu Fase C) — `waiting → pending → queued →
  printing → done`, harga & pendapatan, `waNumber`, notif WA manual, kartu
  Riwayat & Pendapatan.

* **Emoji UI diganti gambar** (dulu Fase D) — semua emoji diganti gambar dari
  `Resources/Icons/` (helper `iconImg()`); daftar lengkap di
  `Resources/INSTRUKSI.md`.

## Pre-Build 0.2

* **Perbaikan & polish UI** (dulu Fase E) — fix race condition login (role
  ke-reset jadi customer), UI ala Discord diperbesar, Edit Saluran, klik
  nama/foto → profil, Kontak CS ambil data terbaru, Hapus user dengan error
  handling, kode pesanan `DP-XXXXXX`.

## Pre-Build 0.3

* **Dashboard Printing lebih mudah diakses** (dulu Fase F) — kartu "Buka
  Dashboard Printing" di `home.html`, Switch akun cuma muncul kalau >1 akun,
  `describeFirestoreError()` + tombol bikin index.

* **Link Dashboard Printing dirapikan** (dulu Fase G) — dihapus dari sidebar
  (lewat kartu di Upload / bubble menu developer).

* **Halaman Detail Pesanan** (dulu Fase H) — `job.html`.

## Pre-Build 0.4

* **Dropdown ukuran kertas & "Simpan file"** (dulu Fase I) — dropdown ukuran
  kertas, tombol "Simpan file" (`fl_attachment`), tombol berbentuk link tidak
  digarisbawahi lagi.

## Pre-Build 0.5

* **Penyempurnaan alur Upload** (dulu Fase J) — dropdown kertas kecil &
  muncul setelah pilih tipe, Enter submit di semua form, "Simpan file" muncul
  setelah *Mulai print* (yang otomatis download), Detail Info di kedua sisi.

## Pre-Build 0.6

* **Form lokasi dirampingkan** (dulu Fase K) — Provinsi & Kota/Kabupaten jadi
  dropdown (data wilayah Indonesia), Kode Pos, opsi "Lainnya".

* **No. WhatsApp wajib untuk operator** (dulu Fase L) — wajib diisi untuk
  role `printer`.

## Pre-Build 0.7

* **Sumber data wilayah pindah ke jsDelivr** (dulu Fase M) — pesan error
  Google Maps (`gm_authFailure`) lebih jelas.

## Pre-Build 0.8 (24 Sep 2026)

* **Perbaikan form lokasi Profil** (`JS/profile.js`, dulu Fase N):

  * Kotak "Tulis nama provinsi/kota/kabupaten kamu" **hanya muncul kalau
    dropdown-nya dipilih "Tidak ada di daftar (tulis sendiri)"** (label diganti dari "isi
    manual"). Sebelumnya kotak bisa muncul sendiri tanpa dipilih (terutama
    saat daftar wilayah gagal dimuat), dan dropdown kota bisa tampil kosong.
    Sekarang visibilitasnya diatur satu fungsi (`syncCustomInputs()`) yang
    mengikuti nilai dropdown.

  * Fetch daftar wilayah dapat **batas waktu 6 detik + sumber cadangan**, jadi
    dropdown tidak lagi nyangkut selamanya di "Memuat daftar provinsi…".

  * Ganti pilihan provinsi cepat-cepat tidak lagi menimpa hasil lama
    (pengaman `provinceChangeToken`).

  * `README.md` dan `Resources/INSTRUKSI.md` ditulis ulang mengikuti kondisi
    web saat itu (login username, status `pending`/`cancelled`, kode pesanan,
    popup notifikasi, ban user, daftar ikon lengkap 27 file, GitHub Pages).

* **Dropdown Provinsi/Kota tetap "gagal memuat daftar" di localhost,
  penyebabnya ketemu** (`JS/profile.js`, dulu Fase O):

  * **Sumber data lama sudah mati.** Repo `emsifa/api-wilayah-indonesia`
    pindah ke API v2, jadi `cdn.jsdelivr.net/gh/emsifa/...@master/api/` dan
    `emsifa.github.io/api-wilayah-indonesia/api/` (dua-duanya dipakai di
    Build 0.11 & 0.12) tidak lagi bisa dipakai dari browser. Sekarang dipakai
    `https://www.emsifa.com/api-wilayah-indonesia/v2/` (`/provinces.json`,
    `/regencies/{province_id}.json`, format `{ data, meta }`, ID kab/kota
    berformat `35.73`), dengan API versi lama di `.../api/` sebagai cadangan.
    Kode sekarang menerima dua format itu. Daftar provinsi jadi 38 (termasuk
    Papua Selatan/Tengah/Pegunungan/Barat Daya).

  * **Error Google Maps tidak lagi menampilkan kotak abu-abu Google** — kalau
    API key bermasalah, kotak peta disembunyikan dan yang tampil cuma pesan
    error yang jelas.

  * **Script Google Maps sekarang minta hasil berbahasa Indonesia**
    (`&language=id`), supaya nama provinsi/kota hasil "Isi otomatis" (mis.
    "Jawa Timur", "Kota Malang") cocok dengan isi dropdown, bukan versi
    Inggris ("East Java", "Malang City") yang selalu jatuh ke "Lainnya".

* **Order dipisah per wilayah + Kecamatan & Kelurahan** (dulu Fase P):

  * Form lokasi Profil jadi 4 dropdown bertingkat (Provinsi → Kota/Kabupaten →
    Kecamatan → Kelurahan/Desa), bisa diisi otomatis dari Google Maps,
    tetap ada opsi "Tidak ada di daftar (tulis sendiri)" per tingkat.

  * Order hanya masuk ke operator yang keempat tingkat wilayahnya sama dengan
    customer (`regionKey`); wilayah lokasi lengkap jadi wajib untuk operator
    (saat Simpan profil) dan untuk customer (saat upload).

  * `firestore.rules` **wajib di-publish ulang** (aturan baca/klaim job
    `waiting` dan pembuatan job kini memeriksa `regionKey`; field
    `regionKey` ditambahkan ke daftar field profil yang boleh diubah sendiri).

  * Semua user yang sudah punya lokasi lama (tanpa kecamatan/kelurahan) perlu
    membuka Profil → Edit profil → melengkapi lokasi → Simpan.

* **Alur tolak order** (dulu Fase Q) — operator yang menolak dicatat di
  `rejectedBy`; order dilempar ke operator lain di wilayah yang sama yang belum
  menolak (`pending` kalau online, `waiting` kalau offline, dan operator yang
  sudah menolak tidak akan mengklaimnya lagi). Kalau semua operator di
  wilayah itu sudah menolak → status baru `rejected` (final). `firestore.rules`
  perlu di-publish ulang lagi.

* **Kolom Detail alamat** (dulu Fase R) — **jalan, nomor rumah, RT/RW,
  patokan (opsional)** ditambahkan ke Edit profil (`location.streetDetail`),
  disembunyikan di balik tombol accordion "(opsional)" persis kolom Kode Web
  ID, dan ditampilkan buat semua role (sebelumnya field ini memang belum
  punya halaman sama sekali). `firestore.rules` tidak perlu di-publish ulang
  (field baru ini ikut di dalam objek `location` yang sudah diizinkan).

## Build 0.1 (26 Sep 2026)

* **Ban/Hapus di Kelola User sekarang nge-kick real-time** (dulu Fase S),
  bukan cuma dicek pas halaman dibuka (`JS/app.js`):

  * Ditambah `watchOwnAccount()` — `onSnapshot` terus-menerus ke dokumen
    `users/{uid}` sendiri selama tab kebuka, dipakai `requireAuth()` (semua
    halaman wajib-login) dan `home.js`/`upload.js` (halaman yang boleh
    diakses guest). Sebelumnya, akun yang di-ban/dihapus developer sementara
    orangnya masih login TIDAK langsung ke-logout — dia baru ketauan pas
    reload/pindah halaman berikutnya (`ensureUserDoc()` bahkan diam-diam
    bikinin lagi profil `customer` baru tanpa logout paksa sama sekali).
    Sekarang begitu dokumennya dihapus/`banned` berubah, SAAT ITU JUGA dia
    di-`signOut()` dan dilempar ke `login.html?removed=1`/`login.html?banned=1`.

  * `login.html` menampilkan pesan buat `?removed=1` (mirip `?banned=1` yang
    sudah ada).

  * Kalau akunnya dihapus langsung dari **Firebase Console/Admin SDK**
    (bukan tombol Hapus di Kelola User), kick real-time ini baru jalan
    seketika kalau dokumen `users/{uid}`-nya ikut disentuh/dihapus saat itu
    juga — lihat catatan ⚠️ di bagian "Kelola User" di atas.

  * `firestore.rules` **tidak perlu** di-publish ulang (rule
    `allow read: if isSignedIn();` di `users/{uid}` sudah cukup buat
    `onSnapshot` ini).

* **Nama repo GitHub resmi ganti jadi** **`D-Printing`** (sebelumnya
  `D-CopyNPrint`) — semua referensi di README (link GitHub Pages, contoh
  command `git remote add origin`, struktur folder) disamakan mengikuti nama
  baru: `https://github.com/Daitackuu/D-Printing` /
  `https://daitackuu.github.io/D-Printing/`.

* **`firestore.rules`** **dikonfirmasi sudah sinkron** antara file di repo dan
  yang di-publish di Firebase Console — isinya identik secara logika, cuma
  file di repo yang punya komentar penjelasan tambahan (tidak memengaruhi
  aturan). Kalau ada error *permission-denied* di aplikasi padahal rules
  sudah dicek sama, penyebabnya hampir selalu rules belum benar-benar
  di-**Publish** di Console (bukan isinya yang beda) — lihat "Troubleshooting".

* **Instruksi "Push ke GitHub" ditambah 2 hal baru:**

  * Skenario **timpa total isi repo yang sudah ada** (`git push origin main --force`) — dipakai kalau repo GitHub-nya bukan kosong dan mau
    digantikan penuh oleh folder lokal, lengkap peringatan soal histori
    commit yang ikut hilang.

  * Catatan cara menangani **path folder yang mengandung spasi** di Git Bash
    (format `/d/Nama Folder/...` + tanda kutip), biar tidak kena error
    `bash: cd: too many arguments`.

* **Riwayat perubahan di README diganti nama jadi "Changelog"**, dan mulai
  pakai penomoran **Build** (dimulai dari Build 1.0 ini) menggantikan
  penamaan "Fase" A–S sebelumnya (riwayat Fase itu sendiri belakangan ikut
  dinomori ulang jadi INDEV/Build 0.1–0.17, lihat di atas).

* **Copywriting landing page** **`home.html`** **diperbarui** — istilah "warnet"
  diganti jadi "counter printing"/"FC", dan narasi alur pesanan diubah dari
  *"tunggu diantar"* jadi **"tinggal ambil di operator"** (judul tab,
  headline hero, sub-teks hero, dan sub-teks di bagian bawah halaman
  disamakan semua). Ini murni perubahan teks tampilan, tidak mengubah alur
  data/status pesanan di `printJobs`.

* **`Resources/Images/Default-Avatar.png`** **diganti dari placeholder abu-abu
  "PLACEHOLDER" jadi ikon avatar final** (siluet orang dalam lingkaran,
  500×500, latar transparan/RGBA — sebelumnya 554×554 mode `P`). Lihat
  `Resources/INSTRUKSI.md` yang sudah disesuaikan.

## Build 0.2 (27 Sep 2026)

* **Kontak CS — notice error form sekarang konsisten, tidak ada lagi popup
  `alert()`** **browser** (`JS/shell.js`). Sebelumnya, form kosong/keluhan
  kosong nampilin `alert()` bawaan browser lalu langsung nutup modal
  (user harus buka ulang & isi dari awal). Sekarang **semua** validasi di
  modal itu — form kosong, keluhan kosong, ataupun "isi salah satu
  username/email"/"format email salah" yang memang sudah dari awal begini
  — sama-sama munculin notice **di dalam modal** (`#csErr`, div
  `.error-msg` merah di bawah field), modal **tetap kebuka**, dan isian
  yang sudah diketik **tidak dihapus**. Jadi user tinggal lengkapin
  kurangnya, bukan diusir dan disuruh isi ulang dari nol.

* **Kelola User (`users.html`, developer) — fitur baru "Ganti password"**:
  tombol di tiap baris user buat paksa-set password login BARU buat user
  itu (mis. dia lupa password & tidak bisa reset sendiri). Password lama
  langsung tidak berlaku, orangnya wajib pakai password baru lain kali
  Masuk — **username & role-nya tidak berubah sama sekali**.

  Ini beda cara kerja dari fitur-fitur developer lain di halaman yang
  sama (ganti role, ban, edit username, hapus), yang semuanya cuma
  nulis ke Firestore langsung dari browser: **password memang tidak
  pernah disimpan di Firestore sama sekali** (itu urusan Firebase Auth),
  dan Firebase Auth di client cuma bisa `updatePassword()` buat akun yang
  SEDANG login di browser itu sendiri — tidak ada API client buat ganti
  password akun **orang lain**. Makanya fitur ini jalan lewat **Cloud
  Function opsional** `adminChangePassword` (kode baru di
  `functions/index.js`, jalan pakai Admin SDK di server, double-cek role
  developer si pemanggil dulu sebelum override password akun target).

  Konsekuensi buat kamu yang deploy:

  * **Tidak wajib** — semua fitur LAIN di web ini (login, upload, chat,
    komunitas, ban/hapus/rename user, dst) tetap jalan 100% normal tanpa
    langkah tambahan apa pun.

  * Kalau folder `functions/` belum di-deploy, tombol "Ganti password"
    doang yang gagal, dengan pesan jelas di dalam modalnya ("Cloud
    Function belum di-deploy...") — bukan bikin error di tempat lain.

  * Buat yang MAU pakai tombolnya: butuh upgrade project Firebase ke
    **plan Blaze** (beda dari Firestore/Auth yang dipakai sisa web ini,
    yang cukup plan Spark/gratis) + `firebase deploy --only functions`.
    Langkah lengkapnya di bagian **"7. Setup Cloud Function (opsional) —
    Ganti Password"** di atas.

  * File baru: `functions/index.js` (kode Cloud Function-nya) dan
    `functions/package.json` (dependency `firebase-admin` +
    `firebase-functions`). `JS/firebase-config.js` nambah satu export
    (`functions`, dari `getFunctions()`) buat dipakai `JS/users.js`
    manggil Cloud Function itu — baris ini sendiri **gratis & tidak
    butuh Blaze**, cuma nyiapin klien-nya di browser.

* **Dropdown "Ukuran kertas" (Upload) & "Role" (Kelola User) diganti jadi
  dropdown custom beranimasi**, gantiin `<select>` bawaan browser yang
  tidak bisa di-style/dianimasikan penuh:

  * Komponen baru yang bisa dipakai ulang di `JS/app.js`:
    `customSelectHtml()` (bangun markup tombol + menu opsi) dan
    `wireCustomSelect()` (nyalain buka/tutup/pilih-opsinya). Gaya
    visualnya disamakan sama menu "Pilih tipe file" di Upload
    (`.filetype-menu`), dan animasi buka-nya (fade + geser dikit + scale,
    `@keyframes customDropdownOpen` di `CSS/style.css`) disamakan sama
    animasi pop-in modal ganti status di halaman Profil — jadi kelihatan
    satu bahasa desain, bukan tiga gaya dropdown yang beda-beda.

  * **`upload.html`/`JS/upload.js`** — dropdown "Ukuran kertas" (isi
    listnya tetap sama: daftar custom dari `localStorage` + opsi
    "Custom…" yang tetap terkunci) sekarang pakai komponen ini,
    termasuk pas dibuka lewat panah tipe file, dipilih Custom, atau
    di-reset otomatis abis upload — semua alur lama tetap jalan sama,
    cuma tampilannya yang beranimasi.

  * **`users.html`/`JS/users.js`** **(Kelola User)** — dropdown ganti Role
    tiap baris user (customer/printer/developer) juga sekarang pakai
    komponen yang sama; baris akun sendiri (developer yang lagi login)
    tetap dikunci (tidak bisa buka dropdown-nya), gantiin atribut
    `disabled` versi `<select>` lama.

  * **Bonus kecil**: menu "Pilih tipe file" (`.filetype-menu`) di Upload
    sendiri sekarang juga kebagian animasi buka yang sama (sebelumnya
    cuma muncul instan tanpa transisi).

* **Landing page (`home.html`) — 2 chip info yang ngambang di sebelah
  kartu "Pratinjau status pesanan" (📍 "Dicocokkan ke operator terdekat"
  & 💬 "Notifikasi WA terkirim") dipindah posisinya supaya tidak nutupin
  isi kartu preview-nya lagi.** Sebelumnya kedua chip itu diposisikan
  `position:absolute` NUMPUK di atas pojok kartu (mengandalkan sisa
  ruang kosong di kanan kartu yang ternyata sering tidak cukup di lebar
  browser yang lebih sempit dari desain awal, jadi nutupin teks harga
  `Rp ...`/status `Diprint`). Sekarang `.landing-hero-visual` dikasih
  padding atas & bawah khusus sebagai "strip" tempat kedua chip itu
  ngambang — chip pertama di strip atas, chip kedua di strip bawah, dua
  duanya di LUAR kotak kartu preview, bukan lagi di atasnya — jadi kartu
  previewnya selalu kebaca penuh, di lebar browser berapa pun (termasuk
  saat halaman turun ke layout satu-kolom di layar sempit). Cuma
  perubahan CSS (`CSS/style.css`), markup & teks chip di `HTML/home.html`
  tidak berubah.

* **Popup konfirmasi "Hapus Saluran"/Kick/Ban anggota di halaman Channel
  (`JS/channel.js`) diganti dari** **`confirm()`** **bawaan browser jadi modal
  custom yang sama gayanya kayak konfirmasi lain di app ini** (mis.
  Ban/Hapus user di Kelola User) — bukan lagi kotak dialog polos
  bawaan Chrome/Firefox yang gayanya beda sendiri & bisa keblokir
  pop-up blocker.

  * Helper baru **`askConfirm({ title, body, confirmLabel, danger })`**
    di `JS/app.js`: modal `.modal-backdrop`/`.modal-box` (fade + pop-in
    animation yang sama dipakai modal lain) dibikin sekali & ditempel
    ke `<body>` on-demand (pola yang sama kayak `openReasonPrompt()`),
    jadi bisa dipanggil dari halaman mana pun tanpa perlu nambah markup
    modal manual di tiap `.html`-nya. `danger:true` (default) bikin
    tombol konfirmasi merah (`.btn-stamp`, buat aksi destruktif kayak
    hapus/ban/kick), `danger:false` bikin biru (`.btn-primary`).

  * Dipakai sekarang di: **Hapus Saluran**, **Kick anggota**, **Ban
    anggota** (`JS/channel.js`).

  * **Kelola User (`JS/users.js`) juga dipindah ke helper yang sama**
    — sebelumnya sudah pakai modal custom juga, tapi implementasi
    sendiri + markup modal manual di `HTML/users.html` (`#confirmModal`
    dkk.); sekarang markup itu dihapus dan dua pemanggilnya (Ban/Buka
    blokir, Hapus user) pindah ke `askConfirm()` yang sama biar cuma
    ada SATU implementasi modal konfirmasi di seluruh app, bukan dua
    yang kebetulan mirip.

  * **Belum ikut dipindah** (masih pakai `confirm()` bawaan browser,
    di luar cakupan perubahan ini): Hapus pertemanan
    (`JS/messages.js`, `JS/profile.js`), Hapus postingan
    (`JS/profile.js`), dan Hapus pilihan ukuran kertas di modal Kelola
    Ukuran (`JS/upload.js`) — bisa disamakan juga ke `askConfirm()`
    kalau memang mau semuanya seragam.

* **Penulisan nama brand dirapikan jadi konsisten** **`D'Printing`** **(tanpa
  spasi sebelum "Printing") di seluruh file** — sebelumnya beberapa
  tempat (komentar kode, judul halaman, README, dsb.) masih nulis
  `D' Printing` (pakai spasi) peninggalan versi lama, campur sama
  `D'Printing` (tanpa spasi) yang sudah dipakai di tempat lain. Ini
  cuma perubahan teks/label, tidak ada logika yang berubah.

* **Kelola User (`users.html`, developer) — "Ganti password" sekarang
  bisa langsung diteruskan ke user via WhatsApp, bukan cuma diketik
  developer terus dikabari manual lewat cara lain.** Begitu password
  baru berhasil di-set (lewat Cloud Function `adminChangePassword`,
  lihat poin di atas), **kalau** user targetnya sudah isi "No.
  WhatsApp" di profilnya (field `waNumber`), browser otomatis buka tab
  baru ke `wa.me` dengan pesan **sudah terisi** (nama user + password
  barunya + saran buat segera login & ganti lagi) — developer tinggal
  klik "Kirim" di WhatsApp Web/App, sama persis pola "Notif WA" yang
  sudah ada di Dashboard Printing (`JS/printer.js`). Kalau user itu
  **belum** isi No. WhatsApp, tidak ada tab yang kebuka — muncul notice
  di halaman Kelola User yang bilang developer harus kabari password
  barunya sendiri lewat cara lain.

  * **Bukan kirim otomatis dari server** — sama seperti semua notif WA
    lain di app ini, ini cuma nyiapin pesan & buka jendela kirimnya;
    tetap developer sendiri yang mengetik/klik "Kirim" di WhatsApp-nya.
    Jadi tidak butuh API/akun WhatsApp Business, key tambahan, ataupun
    upgrade plan Firebase di luar yang sudah dibutuhkan fitur "Ganti
    password" itu sendiri.

  * **Password baru tetap tidak pernah disimpan di Firestore** — cuma
    lewat sebentar di memori browser buat dipakai bikin teks pesan WA
    itu, persis seperti sebelumnya.

  * File yang berubah: `JS/users.js` (pakai ulang `waLinkTo()` yang
    sudah ada di `JS/support-config.js`, tidak ada helper WA baru).

* **Notice error di modal Kontak CS sekarang auto-nutup sendiri**
  (`JS/shell.js`) — sebelumnya notice kayak "Formulir belum diisi sama
  sekali" cuma nampil dan nunggu ditutup manual (tombol Batal/klik luar
  modal). Sekarang begitu notice muncul, modal otomatis nutup sendiri
  \~3.5 detik kemudian kalau tidak ada tindakan lanjutan — TAPI kalau
  user sempat ngetik lagi (username/email/keluhan) sebelum waktu itu
  habis, auto-tutupnya dibatalkan dulu supaya modal tidak ketutup pas
  lagi aktif dibenerin.

* **Guest yang klik fitur yang butuh login sekarang dikasih notice
  dulu, baru diarahkan ke Daftar — bukan langsung dilempar diam-diam
  kayak sebelumnya**: menu **Komunitas**/**Pesan** bergembok di sidebar
  (`JS/shell.js`), dan tombol **Upload File**/panah pilih tipe file di
  halaman Upload (`JS/upload.js`). Sebelumnya klik-klik itu LANGSUNG
  `window.location.href` ke `login.html?mode=signup` (buat tombol
  Upload) atau baru ketahuan belum login SETELAH nyampe di
  `community.html`/`messages.html` (`requireAuth()` di situ yang diam-
  diam nge-redirect). Sekarang semuanya munculin **toast** singkat
  dulu ("Perlu masuk dulu") — komponen visual yang sama kayak toast
  "pesanan belum diterima" yang sudah ada, cuma tanpa tombol aksi —
  lalu begitu toast-nya selesai, OTOMATIS diarahkan ke
  `login.html?mode=signup`. Helper baru: `showGuestGateToast()` di
  `JS/shell.js` (di-export, dipakai ulang dari `JS/upload.js`).

* **Peringatan "lokasi belum lengkap" di halaman Upload (`upload.html`,
  label "Printer" begitu sudah login) sekarang muncul sebagai POPUP,
  bukan tombol kecil yang nempel di form lagi.** Sebelumnya, klik
  tombol Upload/pilih tipe file pas lokasi profil belum lengkap cuma
  nampilin pesan teks di `#errMsg` + satu tombol kecil "Lengkapi
  Lokasi di Profil →" di bawahnya yang harus disadari & diklik sendiri.
  Sekarang langsung munculin **popup modal** (`askConfirm()` yang sama
  gayanya kayak konfirmasi lain di app ini, BUKAN `alert()` bawaan
  browser) yang jelasin kenapa — begitu diklik **"Lengkapi di Profil
  →"**, LANGSUNG diarahkan ke `profile.html` (scroll ke bagian lokasi).
  Klik Batal/luar modal cuma nutup popupnya, tetap di halaman Upload
  (tidak dipaksa pindah).

  * Elemen `#completeLocationBtn` di `HTML/upload.html` dihapus (sudah
    tidak dipakai lagi, gantiin sama popup).

  * Fungsi baru `showLocationIncompletePopup()` di `JS/upload.js`,
    dipanggil dari kedua titik yang sebelumnya munculin tombol itu
    (klik tombol Upload & di dalam `uploadFile()` sebagai jaga-jaga
    kedua).

  * **Dashboard Printing (`printer.html`) TIDAK ikut berubah** — di
    sana peringatan wilayah belum lengkap memang dari awal cuma teks
    kecil di sebelah tombol Online/Offline (`onlineStatusText()`),
    bukan tombol terpisah, jadi di luar cakupan perubahan ini.

* **Icon "Login" (`Resources/Icons/Login.png`) diganti jadi icon pintu
  baru** (gaya panah masuk ke pintu terbuka) — dipakai di link "Masuk /
  Daftar" (sidebar guest) dan tempat lain yang manggil
  `iconImg("Login", ...)`. Sama seperti icon lain di app ini: putih,
  background transparan, kanvas 512×512.

## Build 0.3 (28 Sep 2026)

* **Label nav "Upload" di sidebar buat guest (belum daftar/login) diganti
  jadi "Counter"** (`JS/shell.js`) — link-nya TETAP ke `upload.html` dan
  ikonnya tetap ikon Upload, cuma teksnya yang beda. Begitu sudah login,
  labelnya tetap otomatis jadi "Printer" seperti sebelumnya (tidak
  berubah); "Counter" murni gantiin "Upload" versi guest.

* **Peta preview lokasi di Profil tidak lagi menutupi layar / tembus ke
  atas menu** (`HTML/profile.html`, `JS/profile.js`, `CSS/style.css`).
  Sebelumnya peta Leaflet (yang punya z-index internal 400–1000) muncul di
  atas sidebar drawer, panel notifikasi, dan bubble developer di HP. Dua
  perbaikan: (1) peta sekarang dikurung di stacking context sendiri
  (`.location-map` + `.leaflet-container` pakai `isolation:isolate` &
  `z-index:0`), jadi elemen lain selalu di atasnya di semua device; (2)
  peta **otomatis tertutup** begitu lokasi cocok (setelah tombol *Isi
  otomatis dari peta*, setelah pin digeser, dan saat profil dibuka dengan
  lokasi tersimpan). Petanya bisa dibuka lagi lewat tombol **Tampilkan
  peta / Sembunyikan peta** kalau mau koreksi pin.

* **Notifikasi browser sekarang jalan di HP (Android)**
  (`JS/notifications.js`, file baru `sw.js` di root project). Penyebab
  sebelumnya: Chrome Android melarang `new Notification()` dari halaman
  (hanya boleh lewat service worker), makanya cuma laptop yang bisa.
  Perubahan: notifikasi ditampilkan lewat service worker
  (`registration.showNotification`), dengan cadangan `new Notification()`
  di desktop; `sw.js` tidak nge-cache apa pun (tanpa handler `fetch`).
  Tap notifikasi membuka/memfokuskan D'Printing (langsung ke detail
  pesanan). Toggle juga jadi lebih jujur: setelah izin diberikan langsung
  muncul notifikasi percobaan, pesan error dibedakan (diblokir / belum
  dipilih / browser tidak mendukung / bukan HTTPS), dan toggle otomatis
  mati kalau izinnya dicabut dari pengaturan browser. Kalau izin sudah
  terlanjur ditolak, aktifkan lagi lewat ikon di sebelah alamat > Setelan
  situs > Notifikasi > Izinkan. Catatan: iPhone hanya mendukung
  notifikasi kalau web ditambahkan ke Layar Utama.

* **Mengubah nama dan nomor versi**

  FASE C-N diganti jadi Pre-Build 0.1-0.12, setelah itu Build 1.0-1.3 diganti jadi Build 0.1-0.3.
  untuk yang lain bisa dicek di bagian Changelog.

* **Notifikasi status pesanan buat customer** (file baru
  `JS/notifications.js`, dipanggil dari `initShell` di `JS/shell.js`).
  Tiap status pesanan milik user berubah — diterima operator (+ harga),
  sedang diprint, selesai, ditolak operator, ditolak semua operator —
  muncul toast dengan tombol *Lihat pesanan*. Status terakhir tiap
  pesanan disimpan di `localStorage` (`dp_jobStatus_<uid>`), jadi
  perubahan yang terjadi saat web ditutup tetap diberitahu begitu web
  dibuka lagi. Kalau ada lebih dari 3 perubahan sekaligus, diringkas jadi
  satu toast. Pembatalan oleh customer sendiri tidak dinotifikasi.

* **Lonceng notifikasi di topbar** (kiri tombol Kontak CS) dengan badge
  jumlah belum dibaca, animasi lonceng bergoyang saat ada kabar baru,
  dan panel riwayat (20 terakhir, tombol *Tandai dibaca*). Di dalam
  panel ada toggle **Suara** (bunyi pendek dari file MP3 di
  `Resources/Audios/`, lihat bullet "Efek suara" di bawah) dan **Notifikasi browser** (Notification API lewat service worker `sw.js` — hanya muncul
  kalau tab sedang tidak aktif, izin diminta saat toggle dinyalakan).

* **`showToast()`** **di** **`JS/app.js`** — pengganti `alert()` bawaan browser
  (tipe `success` / `error` / `info` / `warning`, memakai kartu
  `.pending-toast` yang sama dengan notif pesanan). Semua `alert()` di
  `channel.js`, `job.js`, `messages.js`, `printer.js`, `profile.js`,
  `upload.js` sudah diganti (17 tempat). Semua `confirm()` bawaan
  (hapus teman, hapus postingan, hapus pilihan ukuran kertas) diganti
  `askConfirm()`.

* **Animasi baru**: baris pesanan baru slide-in + highlight emas, badge
  status berganti dengan efek "cap ditempel", badge *Diprint* berdenyut
  (helper `animateJobRows()` di `JS/app.js` — hanya baris yang benar-
  benar baru/berubah yang dianimasikan, bukan semua baris tiap snapshot).
  Toast sukses upload menampilkan kode pesanan dengan ikon centang
  beranimasi. Ikon di toast/panel dipasang di lingkaran berwarna
  (`iconChip()` di `JS/app.js`) karena sebagian ikon di `Resources/Icons`
  berwarna putih dan tidak terlihat di kartu putih.

* **Skeleton loading** menggantikan teks "Memuat…" di daftar pesanan
  (`upload.html`, `printer.html` ×3), daftar channel (`community.html`),
  detail pesanan (`job.html`), profil & riwayat (`profile.html`),
  percakapan/permintaan/teman (`messages.html`), dan chat (`channel.html`).
  Empty state di halaman Upload/Printer sekarang punya ikon.

* **`prefers-reduced-motion`**: semua animasi/transisi dimatikan otomatis
  buat user yang mengaktifkan "kurangi gerakan" di sistemnya.

* **Halaman Upload: area drag & drop + tombol Kirim/Batal**
  (`HTML/upload.html`, `JS/upload.js`, `CSS/style.css`). Tombol "Pilih file
  untuk diupload" diganti area bergaya slot printer (`.dropzone`) — bisa
  diklik atau di-drag & drop, dan **folder** juga bisa (isinya dibaca
  rekursif lewat `webkitGetAsEntry`, lalu difilter sesuai tipe file yang
  dipilih). Tombol tipe file sekarang satu tombol lebar di atas area
  upload (bukan tombol terbelah + panah). File yang dipilih tidak langsung
  diupload: masuk daftar `staged` dulu (bisa dihapus satu-satu lewat ×),
  baru diupload setelah tekan **Kirim**. Tiap file jadi 1 pesanan dengan
  kode sendiri, maksimal 10 file sekali kirim; file yang gagal tetap ada
  di daftar buat dicoba lagi. `uploadFile()` sekarang hanya mengurus 1
  file, alur multi-file ada di `sendStaged()`.

* **Tombol Batal** (sebelum Kirim) mengosongkan daftar file dan mereset
  tipe file + ukuran kertas (`resetTypeState()`), tapi **catatan buat
  operator dipertahankan** — kolomnya disembunyikan sampai tipe dipilih
  lagi, isinya tidak hilang. Setelah Kirim sukses, catatan tetap
  dikosongkan seperti sebelumnya.

* **Modal "Kelola pilihan ukuran kertas"** (khusus developer): scroll
  hanya di daftar ukurannya (`#paperSizeManageList`, tinggi maksimal
  ±300px); popup-nya sendiri tidak ikut scroll dan tingginya dibatasi
  85% layar, jadi form Tambah & tombol Selesai selalu kelihatan.

* **Ikon notifikasi per jenis + animasi masing-masing** (`JS/app.js`,
  `JS/notifications.js`, `JS/shell.js`, `CSS/style.css`). Sebelumnya semua
  toast cuma pakai beberapa ikon (centang, X, lonceng) dan hanya centang
  sukses yang beranimasi. Sekarang tiap jenis notifikasi punya ikon PNG
  sendiri di lingkaran berwarna (`iconChip()`), dan tiap ikon punya animasi
  sendiri lewat class `.ni-<nama-ikon>` di `style.css`:

  * Toast umum (`showToast()`): **berhasil** = `Check` (pop berputar +
    cincin), **gagal** = `Reject` (dicap masuk lalu bergetar), **info** =
    `Info` (melayang + cincin), **perhatian** = `Warning` (goyang).

  * Status pesanan customer (`notifications.js`): **diterima** = `Accept`
    (jatuh memantul), **sedang diprint** = `Print-Start` (berdenyut terus),
    **selesai** = `Print-Done` (melompat + kilau + cincin), **dialihkan ke
    operator lain** = `Redirect`, **ditolak semua operator** = `Reject`,
    **ringkasan >3 perubahan** = `Stack` (jatuh menumpuk).

  * Popup **"pesanan belum diterima"** (operator/developer) = `Bell`
    (lonceng berayun + cincin), toast **"perlu masuk dulu"** (guest) =
    `Lock` (goyang seperti mencoba dibuka). Keduanya sebelumnya cuma
    gambar diam.

  Aturan pemakaian ikon: **di notifikasi boleh memakai ikon yang sama
  dengan Dashboard Printing kalau tujuannya sama** (mis. `Accept`,
  `Print-Start`, `Print-Done`, `Reject`), tapi ikon baru yang dibuat untuk
  notifikasi tidak dipasang di luar notifikasi. Semua ikon tetap file PNG
  di `Resources/Icons/` seperti yang lain.

* **4 file ikon PNG baru** di `Resources/Icons/` (256×256, latar
  transparan, glyph navy — di toast otomatis tampil putih di lingkaran
  berwarna): `Info.png`, `Warning.png`, `Redirect.png`, `Stack.png`.
  `Resources/INSTRUKSI.md` sudah diperbarui (tabel ikon + total jadi 38
  file). Ikon tersimpan di riwayat lonceng lewat namanya, jadi riwayat lama
  ikut memakai animasi baru. Di panel riwayat animasi hanya diputar sekali;
  `prefers-reduced-motion` tetap mematikan semuanya.

* **Efek suara pindah ke folder baru** **`Resources/Audios/`** **(file MP3, bisa
  diganti sendiri)** (`JS/app.js`, `JS/notifications.js`, `JS/shell.js`).
  Sebelumnya bunyi notifikasi dibuat lewat WebAudio di dalam kode
  (`playChime()`), jadi tidak bisa diganti tanpa edit JS. Sekarang semua
  suara berupa file MP3 — untuk mengganti SFX, **timpa file-nya dengan nama
  & ekstensi yang sama** (`.mp3`), tidak perlu ubah kode. Helper barunya
  `playSfx(nama)` dan `setSfxEnabled(true/false)` ada di `JS/app.js`.

  | File          | Dimainkan saat                                                                                         |
  | ------------- | ------------------------------------------------------------------------------------------------------ |
  | `Success.mp3` | toast berhasil (`showToast` type success)                                                              |
  | `Error.mp3`   | toast gagal (`showToast` type error)                                                                   |
  | `Info.mp3`    | toast info (`showToast` type info)                                                                     |
  | `Warning.mp3` | toast perhatian (`showToast` type warning)                                                             |
  | `Notif.mp3`   | kabar status pesanan customer (diterima, diprint, selesai, dialihkan, ditolak, ringkasan >3 perubahan) |
  | `Pending.mp3` | popup "pesanan belum diterima" (operator/developer)                                                    |
  | `Gate.mp3`    | toast "perlu masuk dulu" (guest)                                                                       |

  Catatan perilaku: toast umum (`showToast()`) sekarang ikut berbunyi sesuai
  jenisnya — sebelumnya cuma notifikasi status pesanan yang berbunyi. Bisa
  diganti per toast lewat opsi `sound` (`sound: "Notif"` = pakai file lain,
  `sound: false` = diam). Semua suara mengikuti toggle **Suara** di panel
  lonceng (tersimpan per akun); guest tidak punya toggle, jadi suaranya
  selalu aktif. Kalau file MP3 hilang atau browser memblokir suara sebelum
  ada interaksi, suara dilewati diam-diam (tidak ada error). Ketujuh MP3
  bawaan adalah suara sintetis sederhana (durasi 0,4–1 detik) yang memang
  dimaksudkan sebagai pengganti sementara.

* Catatan: listener `onSnapshot` untuk notif customer aktif di semua
  halaman (per-halaman, karena web ini MPA), jadi di halaman Upload ada 2
  listener ke query yang sama — masih ringan, tapi kalau nanti mau
  dihemat, `upload.js` bisa dioper data dari `notifications.js`.

* Diuji di Chromium headless dengan Firestore/Auth palsu (in-memory):
  alur notifikasi status, ringkasan >3 perubahan, notif saat web ditutup,
  panel lonceng, animasi baris, dashboard operator, dan semua halaman
  dimuat tanpa error JS.

## Build 0.4 (29 Sep 2026)

* **Empty state Dashboard Printing & riwayat upload sekarang punya ikon
  sendiri-sendiri** (`JS/printer.js`, `JS/upload.js`, `CSS/style.css`).
  Sebelumnya semua bagian kosong memakai gambar `Printer.png` yang sama.
  Ikon baru (PNG 512×512, transparan, satu warna):
  `Empty-Inbox.png` (Pesanan masuk), `Empty-File.png` (File untuk
  diprint), `Empty-History.png` (Riwayat selesai print), dan
  `Empty-Upload.png` (daftar file di halaman Upload). Ukuran ikon empty
  state juga dibesarkan (42 → 56px) dan dibuat lebih jelas (opacity
  0.28 → 0.55, warna `--ink-soft`) karena sebelumnya terlalu pucat.

* **Warna ikon otomatis menyesuaikan latar** (`iconImg()` di
  `JS/app.js`, class `.icon-img` di `CSS/style.css`, semua `HTML/*.html`).
  Ikon tidak lagi dirender sebagai `<img>`, tapi sebagai `<span>` dengan
  CSS *mask* (`--icon:url(...)` + `background-color:currentColor`). Yang
  dipakai cuma bentuk & transparansi PNG-nya; warnanya ikut warna teks
  sekitarnya. Hasilnya ikon putih yang dulu hilang di background terang
  (komentar, like, "Berteman", "Tambah teman", "Tambah gambar", "Edit
  Saluran") dan ikon hitam yang hilang di tombol gelap (Buka Dashboard)
  sekarang selalu kelihatan. Ikon like yang sudah ditekan otomatis merah
  (warna tombol `.like-btn[data-liked="true"]`). Penyesuaian terkait:
  `.icon-chip` diberi `color:#fff` (filter `brightness/invert` dihapus),
  tombol lonceng & tombol mata login diberi warna eksplisit, dan tombol
  mata di `login.html` sekarang mengganti variabel `--icon` (bukan
  `src`). Konsekuensi: **warna asli PNG tidak berpengaruh**, jadi kalau
  ganti ikon cukup pastikan background transparan & satu warna solid;
  ikon berwarna banyak akan tampil satu warna. Varian `-Dark` tidak wajib
  lagi (file lama dibiarkan).

* **Ikon** **`Dashboard.png`** **dan** **`OPD.png`** **dibedakan.** `Dashboard.png` kini
  ikon panel grid (menu bubble developer), `OPD.png` tetap ikon
  speedometer tapi diperbaiki jadi putih. Ikon-ikon baru ditambahkan ke
  tabel di `Resources/INSTRUKSI.md` (sekarang 45 file).

* **Nama "Dashboard Operator" diganti jadi "Dashboard Printing"** di semua
  teks yang tampil ke pengguna (`HTML/upload.html`, `HTML/printer.html`,
  `HTML/home.html`, `JS/shell.js`, `JS/job.js`, dll.) serta README &
  `INSTRUKSI.md`. Alamat halamannya tetap `printer.html`, jadi tidak ada
  link yang berubah.

* **Halaman Upload: kartu "Dashboard Printing" didesain ulang dan kini
  juga muncul untuk developer** (`HTML/upload.html`, `JS/upload.js`,
  `CSS/style.css`). Kartu lama (teks polos + tombol) diganti kartu gelap
  bergradasi dengan ikon dashboard, label peran (**Operator Print** /
  **Developer**), deskripsi yang menyesuaikan peran, dan tombol putih
  *Buka Dashboard Printing →* (lebar penuh di HP). Sebelumnya kartu ini
  hanya tampil untuk role `printer`; sekarang tampil untuk `printer` dan
  `developer`. Customer biasa & guest tetap tidak melihatnya. Styling
  baru ada di blok `.dash-cta*` (paling bawah `CSS/style.css`).

* **Perbaikan tampilan empty state (Riwayat print & Dashboard Printing)**
  (`JS/upload.js`, `JS/printer.js`, `CSS/style.css`). Ikon empty state
  sebelumnya dipanggil lewat `iconImg(..., "empty-state-icon")` tanpa class
  `icon-img`, padahal sejak ikon dirender pakai CSS *mask* class itulah
  yang membuat gambarnya muncul. Akibatnya ikon cuma jadi kotak putih
  kosong dan teks "Belum ada ..." terlihat turun/tidak sejajar. Sekarang
  keempat empty state ("Belum ada file yang diupload.", "Belum ada pesanan
  masuk.", "Belum ada file masuk.", "Belum ada pesanan yang selesai.")
  memakai class `icon-img empty-state-icon`, dan `.empty-state` dibuat
  `flex` kolom rata tengah dengan jarak (`gap`) konsisten antara ikon dan
  teks. `.empty-state-icon` juga punya deklarasi mask sendiri supaya tetap
  tampil walau class `icon-img` terlewat.

* **Logo web ditambahkan** (`Resources/Images/Web-Logo.png`, `JS/shell.js`,
  `JS/notifications.js`, `CSS/style.css`, semua `HTML/*.html`,
  `index.html`). File `Web-Logo.png` (PNG 512×512) saat ini masih
  **placeholder** (ikon printer di tile biru tua) — timpa dengan logo
  asli tanpa mengubah nama/ekstensinya. Dipakai di:

  * **Sebelah kiri tulisan D'PRINTING** — menggantikan titik kecil lama
    (`<span class="dot">`) di sidebar (versi sudah login & belum login),
    topbar `home.html`, dan halaman `login.html`. Ditampilkan 28×28 lewat
    class `.brand-logo`; `.sidebar .brand` kini `display:flex` supaya
    logo dan teks sejajar (termasuk di layar ≤760px).

  * **Favicon tab browser** dan `apple-touch-icon` di semua halaman
    (`HTML/*.html` dan `index.html`).

  * **Ikon notifikasi browser** (`showSystemNotification()` di
    `JS/notifications.js`): `icon` diganti dari `Icons/Printer.png` ke
    logo web, plus `badge` dengan file yang sama. Catatan: di Android
    `badge` biasanya ditampilkan sebagai siluet satu warna, jadi kalau
    logo asli banyak warna sebaiknya dibuatkan versi monokrom terpisah.
    Nama file sempat `Logo.png` lalu diganti jadi `Web-Logo.png`; semua
    referensi (HTML, JS, CSS, `INSTRUKSI.md`) sudah disinkronkan. Kalau
    favicon belum berubah setelah update, hard refresh (Ctrl+Shift+R)
    karena favicon dan `sw.js` sering ke-cache browser.

* **Notifikasi dipisah per kategori & bisa disortir** (`JS/notifications.js`,
  `CSS/style.css`). Panel lonceng sekarang punya tab **Semua / Pesanan /
  Pesan / Komunitas / Developer / Masalah** (tiap tab menampilkan jumlah
  yang belum dibaca) plus tombol filter **Belum dibaca**. Pilihan tab
  diingat per akun. Tiap notifikasi diberi label kategori, dan kalau
  diklik langsung ditandai sudah dibaca. Tombol **Tandai dibaca**
  sekarang berlaku untuk tab yang sedang dibuka. Batas riwayat naik dari
  20 jadi 60. Sumber tiap kategori:

  * **Pesanan** — perubahan status pesanan (diterima, diprint, selesai,
    dialihkan). Sumber lama, tidak berubah.

  * **Masalah** — pesanan ditolak semua operator (dulu masuk kabar biasa),
    dan pengumuman kendala/gangguan dari developer.

  * **Pesan** — DM baru (`conversations`) dan permintaan pertemanan masuk.
    Tidak dibunyikan kalau user sedang membuka halaman Pesan dengan tab aktif.

  * **Komunitas** — pengikut baru dan komentar baru di 10 postingan
    profil terbaru milik sendiri.

  * **Developer** — pesan langsung dari developer.
    Riwayat lama (sebelum ada kategori) otomatis dimigrasi: kabar pesanan
    ditolak masuk **Masalah**, sisanya **Pesanan**. Sumber baru yang pertama
    kali dipantau di sebuah browser cuma dicatat sebagai *baseline* (tanpa
    toast) supaya data lama tidak membanjiri layar; penandanya disimpan di
    localStorage (`dp_seen_{uid}`). Kalau ada lebih dari 3 kabar sekaligus,
    toast diringkas jadi satu.

* **Panel notifikasi tidak lagi menutup sendiri saat memilih tab/filter**
  (`JS/notifications.js`, `mountBell()`). Penyebabnya: tombol tab dirender
  ulang lewat `innerHTML` saat diklik, sehingga saat klik sampai ke
  listener "klik di luar" di `document`, `wrap.contains(e.target)` bernilai
  `false` (elemennya sudah lepas dari DOM) dan panel dianggap diklik dari
  luar. Sekarang pengecekan memakai `e.composedPath()` (dicatat sebelum
  render ulang). Panel hanya tertutup oleh ikon lonceng, klik di luar
  panel, atau Escape — pilih tab (kosong maupun ada isi), filter
  *Belum dibaca*, *Tandai dibaca*, dan centang Suara/Notifikasi browser
  tidak menutupnya.

* **Developer bisa kirim notifikasi ke user lewat halaman sendiri**
  (`HTML/notify.html`, `JS/notify.js`, `Resources/Icons/Notify.png`,
  `firestore.rules`). Fitur ini dulu berupa modal di Kelola User; sekarang
  dipindah ke halaman **Kirim Notifikasi** yang dibuka dari bubble menu
  developer (gelembung di pojok kanan bawah, item **Kirim Notifikasi** dengan
  ikon megafon; sidebar tidak berubah). Penerima dipilih lewat
  satu tab **User** (cari, lalu centang satu atau beberapa user). Tab
  **Semua user** beserta pilihan grupnya (semua customer / operator print /
  developer lain) dihapus, jadi tidak ada lagi kirim massal ke seluruh
  user sekaligus; tab yang tersisa (sebelumnya bernama "User tertentu")
  diganti nama jadi **User**, dan kode mode/grup di `JS/notify.js` ikut
  dibersihkan. Tombol **Kosongkan pilihan** sekarang hanya tampil kalau
  user yang dipilih lebih dari 1 (disembunyikan saat 0 atau 1 terpilih,
  diatur di `renderPicked()`).
  Pilih jenis **Pesan dari developer / sistem** (masuk tab Sistem) atau
  **Masalah / gangguan** (tab Masalah), isi judul (maks. 80 karakter) dan
  pesan (maks. 300 karakter). Kalau penerimanya lebih dari satu ada
  konfirmasi dulu. Tombol **Kirim notifikasi** di tiap baris Kelola User
  sekarang jadi tautan ke halaman ini dengan user itu sudah terpilih
  (`notify.html?uid=...`); tombol kirim massal di bagian atas Kelola User
  dihapus. Datanya ditulis ke `users/{uid}/notifications`.
  **WAJIB publish ulang** **`firestore.rules`** — ada aturan baru untuk
  subkoleksi ini (hanya developer yang boleh membuat, hanya pemilik akun
  yang boleh membaca/menghapus punyanya). Sebelum rules dipublish, tab
  Developer/Masalah kosong dan di console muncul error `permission-denied`
  (bagian lain tetap jalan).

* **Menu titik-tiga di panel profil sidebar; Kotak Masuk pindah ke sana**
  (`JS/shell.js`, `JS/notifications.js`, `CSS/style.css`,
  `Resources/Icons/More.png` — ikon baru).

  * Di kanan panel profil (bawah sidebar) ada tombol **⋯**. Diklik, menu
    muncul ke atas berisi **Settings**, **Kotak Masuk** (dengan angka belum
    dibaca), garis pemisah, **Switch account**, dan **Log out**. Ditutup
    dengan klik di luar menu atau tombol Escape. Klik area nama/foto tetap
    membuka Profil seperti biasa.

  * Item **Kotak Masuk dihapus dari daftar menu sidebar** (untuk user login
    maupun guest). Kalau ada kabar belum dibaca, tombol ⋯ diberi titik
    merah supaya tetap terlihat saat menu tertutup.

  * **Settings** membuka modal berisi saklar **Suara** & **Notifikasi
    browser** (lihat catatan di bawah). **Switch account** & **Log out** memakai logika
    yang sama dengan tombol di Profil: Switch → form Masuk, Log out → form
    Daftar. Berbeda dari tombol di Profil, **Switch account di menu ini
    selalu tampil**, tidak menunggu ada lebih dari satu akun di browser.

* **Settings = pengaturan notifikasi; kaki panel lonceng dihapus; "Counter"
  jadi "Printer"** (`JS/shell.js`, `JS/notifications.js`, `JS/app.js`,
  `CSS/style.css`).

  * Klik **Settings** di menu titik-tiga → modal **Settings** dengan dua
    saklar: **Suara** dan **Notifikasi browser**. Datanya memakai `prefs`
    localStorage yang sama seperti sebelumnya, jadi pilihan lama user tidak
    hilang. Saklar Notifikasi browser tetap meminta izin browser dan
    otomatis kembali mati kalau izin ditolak / browser tidak mendukung.

  * Panel lonceng tidak lagi punya baris **Suara / Notifikasi browser** di
    bawahnya — hanya tab kategori, daftar notifikasi, dan tautan *Buka
    Kotak Masuk*. Fungsi baru di `notifications.js`: `getNotifPrefs()`,
    `setSoundPref()`, `setBrowserPref()`.

  * Menu sidebar untuk guest yang tadinya berlabel **Counter** sekarang
    **Printer**, sama seperti user yang sudah login.

* **Kontak CS dirombak: pesan masuk ke Kotak Masuk developer, balasan
  muncul di kategori Sistem** (`JS/shell.js`, `JS/notifications.js`,
  `JS/inbox.js`, `JS/notify.js`, `HTML/notify.html`, `CSS/style.css`,
  `firestore.rules`).

  * **Kirim**: modal Kontak CS (username, email, keluhan maks. 500
    karakter) untuk user yang LOGIN sekarang menulis dokumen ke koleksi baru
    `supportTickets` (field `uid, username, email, message, status:"open",
    createdAt`), bukan lagi membuka WhatsApp. Tombolnya jadi **Kirim**.
    Guest / akun yang diblokir tetap dialihkan ke WhatsApp CS
    (`JS/support-config.js`) karena tidak punya Kotak Masuk untuk menerima
    balasan.

  * **Diterima developer**: tiap tiket baru jadi kabar di Kotak Masuk
    developer dengan kategori baru **Bantuan** (label/tab-nya hanya tampil
    untuk role developer). Isi pesan + nama & email pengirim tampil di
    panel baca.

  * **Balas**: di panel baca ada kotak **Balas** (maks. 300 karakter).
    Kirim balasan menulis satu kabar ke `users/{uid pengirim}/notifications`
    dengan `category: "sistem"` dan menandai tiket `status: "replied"`
    (`repliedAt`, `repliedBy`, `replyMessage`). Draf balasan tidak hilang
    walau panel dirender ulang.

  * **Kategori Sistem**: menggantikan kategori **Developer** — isinya kabar
    dari developer/sistem, termasuk balasan Kontak CS dan pesan dari
    halaman Kirim Notifikasi. Riwayat lama berkategori `developer` (di
    localStorage) dan dokumen Firestore lama dengan `category:"developer"`
    otomatis dibaca sebagai Sistem, jadi tidak ada data yang hilang.

  * **WAJIB publish ulang** **`firestore.rules`**: ada aturan baru untuk
    `supportTickets` (user hanya bisa membuat tiket atas namanya sendiri &
    membaca miliknya; developer baca semua, membalas, dan menghapus) dan
    kategori `sistem` diizinkan di `users/{uid}/notifications`. Sebelum
    rules dipublish, Kirim/Balas gagal dengan `permission-denied`.

* **`conversations`** **punya field baru** **`lastSenderId`** (`JS/messages.js`),
  diisi setiap kirim pesan, dipakai notifikasi untuk tahu pesan terakhir
  dari siapa. Percakapan lama yang belum punya field ini baru memicu
  notifikasi setelah ada pesan baru di dalamnya.

* **Halaman Kotak Masuk — notifikasi bergaya email**
  (`HTML/inbox.html`, `JS/inbox.js`, `JS/notifications.js`, `JS/shell.js`,
  `CSS/style.css`, `Resources/Icons/Mail.png`, `Star-Filled.png`,
  `Star-Outline.png`). Halaman baru untuk semua user yang login (guest
  melihat menunya bergembok, sama seperti Komunitas & Pesan). Isinya
  riwayat yang SAMA dengan panel lonceng, tapi dilihat seperti Gmail:

  * **Label** di kiri: Kotak Masuk, Belum dibaca, Berbintang, lima kategori
    (Pesanan, Pesan, Komunitas, Sistem, Masalah; plus **Bantuan** khusus
    developer), dan Sampah — angkanya
    jumlah yang belum dibaca (Sampah: jumlah semua).

  * Kolom tengah: cari (judul/isi), urutkan (Terbaru / Terlama / Belum
    dibaca dulu), centang banyak sekaligus lalu **Tandai dibaca / Belum
    dibaca / Bintangi / Hapus**, dan bintang per baris.

  * Kolom kanan: isi lengkap kabar + tombol aksi (buka halaman terkait,
    bintangi, tandai belum dibaca, hapus). Di HP daftar & isi bergantian.

  * **Sampah**: hapus = pindah ke Sampah (ada tombol *Urungkan*),
    dikosongkan otomatis setelah 30 hari; bisa **Pulihkan**, **Hapus
    permanen**, atau **Kosongkan Sampah**. Kabar berbintang tidak pernah
    terpotong oleh batas riwayat.

  * Tombol baru **Buka Kotak Masuk** di dasar panel lonceng, dan badge
    angka belum dibaca di menu sidebar.
    Teknis: tidak ada koleksi Firestore baru (jadi **tidak perlu publish
    ulang** **`firestore.rules`**) — semua tetap di `localStorage` per akun.
    `notifications.js` sekarang mengekspor `getNotifHistory`, `patchNotifs`,
    `purgeNotifs`, `subscribeNotifs`, `refreshNotifBadges`, `NOTIF_CATS`,
    dan `INBOX_LABEL`, supaya lonceng & Kotak Masuk memakai SATU salinan data
    di memori (tidak saling menimpa) dan tersinkron antar tab lewat event
    `storage`. Tiap entri punya field baru `starred` & `trashed`
    (riwayat lama otomatis dianggap `false`). Batas riwayat naik dari 60
    jadi 300 (di luar yang berbintang). **Mau ganti nama halaman?** Ubah
    `INBOX_LABEL` di `JS/notifications.js` (dipakai sidebar, tombol lonceng,
    judul halaman).

* Diuji lewat Chromium headless (render tombol/ikon di latar terang &
  gelap, kartu di lebar 390px). Belum diuji dengan Firebase asli.

## Build 0.5 (29 Sep 2026)

* **Riwayat upload hanya bisa dilihat developer** (`JS/profile.js`).
  Kartu "Riwayat upload" tidak lagi tampil di profil sendiri (termasuk
  profil developer). Sekarang kartu itu cuma muncul kalau yang melihat
  adalah **developer** dan yang dibuka adalah **profil orang lain** (dibuka
  lewat klik nama di **Kelola User**). Pengecualian: operator print tetap
  melihat "Riwayat dikerjakan & pendapatan" miliknya sendiri di profilnya.
  `firestore.rules` tidak diubah (developer memang sudah boleh membaca semua
  `printJobs`).

* **Halaman Printers digabung ke Kelola User.** `HTML/printers.html` &
  `JS/printers.js` **dihapus** (sempat diganti nama jadi "Monitor Printing"
  di tengah pengerjaan, lalu digabung — jadi tidak ada file `monitor.*` di
  hasil akhir). Yang tersisa satu halaman: **Kelola User**
  (`HTML/users.html`, `JS/users.js`). Menu **Printers** dihapus dari bubble
  menu developer (`JS/shell.js`), yang sekarang isinya 3 item: Kelola User,
  Kirim Notifikasi, Dashboard Printing. Baris `printers.html` di
  `robots.txt` juga dihapus.

* **Kelola User ditata per kategori** (`JS/users.js`, `HTML/users.html`,
  `CSS/style.css`). Semua user dikelompokkan berdasarkan role dalam bagian
  terpisah — **Operator Printer**, **Customer**, **Developer** — masing-masing
  dengan judul, jumlah user, dan jumlah yang sedang online. Tombol
  aksi (Edit username, Ganti password, dropdown role, Ban,
  Hapus) tetap ada. Kalau role user diganti lewat dropdown, dia otomatis
  pindah ke kategorinya. Urutan dalam kelompok: yang online dulu, lalu
  urut nama. Kotak cari (username/email) tetap ada.

* **Tombol "Kirim notifikasi" di baris user dihapus** (`JS/users.js`),
  karena fiturnya sudah punya halaman sendiri (**Kirim Notifikasi**,
  `notify.html`, lewat bubble menu developer). `notify.html?uid=...` masih
  jalan kalau dibuka manual.

* **Tampilan baris user dirapikan** (`JS/users.js`, `CSS/style.css`). Isi
  baris dibagi dua zona: kiri identitas (foto, nama, penanda "kamu"/
  "Diblokir", badge Online/Offline sejajar nama, email di bawahnya), kanan
  grup tombol aksi yang rapat (Edit username, Ganti password, role, Ban,
  Hapus). Nama tidak lagi patah jadi dua baris (dipotong `…` kalau kepanjangan),
  dan di layar ≤1200px grup tombol turun ke baris sendiri dengan garis
  pemisah putus-putus.

* **Menu titik-tiga di panel profil sidebar dibuat lebih ringkas**
  (`CSS/style.css`, `.account-menu*`). Sebelumnya menu selebar penuh sidebar
  dan cukup tinggi sampai menutupi menu navigasi di belakangnya. Sekarang
  ada jarak 8px dari tepi kiri-kanan, padding item dikecilkan (10→7px), font
  14→13px, ikon 18→16px, label section & header email dikecilkan, dan
  bayangannya dilembutkan — tinggi menu turun ±25%.

* **Dashboard Printing dirombak** (`HTML/printer.html`, `JS/printer.js`,
  `CSS/style.css`): kartu status jadi tombol **Mulai Bekerja / Istirahat
  dulu** (kartu berubah hijau + titik berdenyut saat online, judul "Lagi
  bekerja"/"Lagi istirahat"); judul halaman jadi sapaan "Halo, <nama>";
  kotak pendapatan diganti 4 kartu statistik (Pendapatan, Perlu konfirmasi,
  Antrean cetak, Selesai); judul section diberi badge jumlah
  (Pesanan masuk / Antrean cetak / Selesai dicetak) dan kartu Pesanan masuk
  diberi garis merah saat ada pesanan yang menunggu. Logika terima/tolak/
  print tidak diubah.

* **Dashboard Printing — tahap 2, dibuat minimalis** (`HTML/printer.html`,
  `JS/printer.js`, `CSS/printer.css` baru): tujuannya ringkas dan enak
  dipindai tapi detail pesanan tetap lengkap.

  * **Bingkai dibuang.** Lubang "tiket" di pinggir kartu dan kartu di dalam
    kartu dihapus; section Pesanan masuk / Antrean cetak / Selesai dicetak
    sekarang berupa judul + daftar di atas latar abu muda. Hanya kartu
    status kerja dan kartu statistik yang tetap berbingkai.

  * **Header disederhanakan**: label kecil huruf kapital "Dashboard printing"
    dihapus, judul "Halo, <nama>" memakai font sans, subjudul dipersingkat.

  * **Kartu status kerja** memakai gradasi hijau lembut saat online; tombol
    "Istirahat dulu" berbingkai putih polos.

  * **Statistik**: kotak Pendapatan dibuat lebih lebar (navy), dan kotak
    **Perlu konfirmasi** otomatis berlatar merah muda + angka merah saat ada
    pesanan menunggu (lewat `:has(#pendingCard.has-items)`). Di HP jadi 3
    kolom, Pendapatan satu baris penuh.

  * **Detail pesanan jadi chip** lewat fungsi baru `metaChips()` di
    `JS/printer.js`: kode `#XXXX`, tanggal, ukuran file, dan ukuran kertas
    (di riwayat: "Selesai <tanggal>"). Harga (`.job-price`) dan lokasi
    customer (`.job-loc`, ikon pin dari CSS) punya baris sendiri; emoji 📍
    dan 📝 di kotak catatan/lokasi diganti gaya CSS.

  * **Status lebih mudah dibaca**: badge cap miring bergaris diganti pil
    polos berwarna (kuning = Antre, biru = Diprint, hijau = Selesai, merah =
    Perlu konfirmasi), plus garis warna tipis di sisi kiri setiap baris/kartu
    sesuai statusnya. Catatan customer tampil sebagai kotak kuning lembut.

  * **Tombol seragam**: inline style `padding:8px 12px;font-size:12px` di
    `printer.js` diganti class `.btn-sm`; tombol ikon (Terima/Tolak/Mulai
    print/Tandai selesai) 34×34.

  * **Kondisi kosong** diberi garis putus-putus dan ikon lebih kecil;
    toggle list/grid, mode grid, dan skeleton loading ikut dirapikan.

  * **Fokus keyboard** terlihat di tombol & toggle.

  * Semua aturan di-scope ke `body.page-printer` jadi halaman lain tidak
    berubah. Logika Firebase (klaim, terima/tolak, antrean, notif WA) **tidak
    diubah**.

* **Tampilan Komunitas dirombak** (`HTML/community.html`, `HTML/channel.html`,
  `JS/community.js`, `JS/channel.js`, `CSS/style.css`): halaman daftar
  channel punya banner gradasi (jumlah channel + tombol Buat channel), dan
  daftar channel jadi kartu grid dengan avatar berwarna otomatis (dari nama
  channel), deskripsi 2 baris, dan pil "Buka →". Ruang obrolan: header
  bergaya kartu, latar chat bermotif titik, bubble lebih membulat dengan
  gradasi untuk pesan sendiri, pesan beruntun dari orang yang sama
  dikelompokkan (nama & foto cuma di pesan pertama), pemisah hari
  ("Selasa, 29 September"), empty state baru, dan kolom kirim berbentuk pil.
  Logika data/aturan tidak diubah.

* **Komunitas — tahap 2, lebih menarik** (`HTML/community.html`,
  `HTML/channel.html`, `JS/community.js`, `JS/channel.js`, `CSS/style.css`,
  blok "Komunitas v2" di akhir CSS): banner hero diberi pola titik &
  tanda `#` besar; **kolom cari** berbentuk pil dengan ikon, plus tombol
  urut **Terbaru / A–Z** dan keterangan "x dari y channel cocok"; **kartu
  channel** punya banner gradasi sesuai warna channel, avatar yang menimpa
  banner, lencana **Baru** untuk channel < 24 jam, nama maks. 2 baris; empty
  state bergambar `#`/`?`. **Ruang obrolan**: header berbanner warna channel
  (foto channel menimpa banner, nama & deskripsi di bawahnya), tombol
  "Kembali" berbentuk pil, kolom kirim satu pil dengan cincin fokus, dan
  di HP tombol Kirim jadi ikon pesawat kertas, tombol Edit/Kelola/Hapus bisa
  digeser ke samping. Warna banner otomatis dari nama channel (fungsi
  warna yang sama dengan avatar). Logika data/aturan tidak diubah.

* **Perbaikan tampilan HP** (`CSS/style.css`, blok "Build 0.4 — perbaikan
  tampilan mobile" di akhir): `.wrap` diberi `width:100%` + `min-width:0`
  (sebelumnya melebar mengikuti isi terpanjang, mis. nama file, sehingga
  seluruh halaman ikut melebar di HP); `overflow-wrap:break-word` di seluruh
  halaman (teks panjang tanpa spasi dipatah, kata pendek tidak dipatah
  huruf-per-huruf) dan `anywhere` khusus nama file/email/username; di HP
  baris Kelola User memberi identitas satu baris penuh dulu baru tombolnya,
  baris tombol aksi pesanan boleh turun ke baris berikutnya, dan tombol di
  kartu profil tidak dipatah.

* **Outline Komunitas & Recovery dibedakan dari area upload file**
  (`CSS/style.css`): kotak putus-putus `.dropzone` di Upload adalah satu-satunya
  area yang bergaris dashed. Di **Komunitas**, kartu kosong `.comm-empty`
  jadi kartu solid berbayangan lembut, garis pemisah kaki kartu channel
  (`.channel-card-foot`) jadi garis solid, ikon kosong obrolan channel
  (`.chat-empty-icon`) jadi lingkaran solid, dan banner tamu `.preview-banner`
  ("Kamu melihat Komunitas sebagai tamu…") jadi solid dengan aksen emas di
  kiri dan tanpa lubang tiket di sisinya. Di **Recovery**, kotak kode
  `.recovery-code` jadi chip putih bergaris solid dengan aksen biru tua di
  kiri, dan pemisah `.recovery-sep` jadi garis solid. Banner tamu dipakai
  bersama halaman lain yang bisa dilihat tamu (mis. Pesan), jadi di sana
  tampilannya ikut berubah.

* **Pilih tipe file di Upload: label & panah dipisah** (`HTML/upload.html`,
  `JS/upload.js`, `CSS/style.css`): sebelumnya satu tombol `#caretBtn` berisi
  label + panah dan seluruh tombol ikut "menekan" (`.btn:active`
  scale) tiap diklik. Sekarang `.type-split` berisi dua tombol terpisah —
  `#caretBtn` (label, melebar) dan `#caretArrowBtn` (panah, kotak 52px) —
  dengan celah 8px. Keduanya memakai satu fungsi `toggleTypeMenu()` sehingga
  klik di area mana pun membuka/menutup menu yang sama; atribut
  `aria-expanded` di keduanya ikut disinkronkan lewat `syncTypeMenuAria()`
  (termasuk saat menu dibuka dari dialog peringatan "pilih tipe file dulu").
  Animasi tekan satu-baris dimatikan khusus di sini; panah berputar 180°
  (transisi 0,22 dtk) saat menu terbuka dan kedua kotak mendapat garis tegas
  selama menu terbuka. Pada "reduced motion" putarannya tanpa transisi.
  Kelas lama `.type-picker` dihapus (tidak dipakai lagi).

* **Tombol kembali di Masuk/Daftar** (`HTML/login.html`, `JS/app.js`,
  `CSS/style.css`): pil "Kembali ke Home" di atas logo dihapus (beserta CSS
  `.auth-back`). Kartu `#authBackBtn` di bawah form sekarang dinamis:
  `app.js` (dimuat semua halaman kecuali login) mencatat halaman yang sedang
  dibuka ke `sessionStorage` kunci `dp:lastPage` (nama file + query, mis.
  `channel.html?id=…`), lalu login.html membacanya untuk mengisi tujuan dan
  judul ("Kembali ke Komunitas", "Kembali ke Upload", dst.). Tanpa riwayat
  -> `home.html` / "Kembali ke Home". Halaman khusus peran (`printer`,
  `users`, `notify`, `inbox`) tidak dicatat karena tamu tidak bisa
  membukanya, login.html tidak pernah menimpa catatan (jadi pindah mode
  Masuk/Daftar aman), dan `logout()` menghapus catatannya.

* **Ikon Dashboard Printing diganti ke** **`Printer.png`** (`JS/shell.js`,
  `HTML/upload.html`) — di item bubble menu developer dan di kartu
  "Dashboard Printing" halaman Upload.

* **`Dashboard.png`** **&** **`Dashboard-Fit.png`** **diganti nama jadi** **`System.png`** **&
  `System-Fit.png`** (`JS/notifications.js`). Ikon laptop-dengan-grafik ini
  memang dipakai untuk kategori **Sistem** di Kotak Masuk dan notifikasi dari
  sistem, jadi namanya disesuaikan dengan fungsinya.

* **Kotak Masuk memakai ikon sendiri** (`JS/shell.js`, `JS/inbox.js`,
  `JS/notifications.js`): menu "Kotak Masuk" di panel profil sidebar, label
  Kotak Masuk, empty state "Belum ada kabar", dan tombol "Buka Kotak Masuk"
  di panel lonceng sekarang pakai `Inbox.png` (tidak lagi `Mail.png` yang
  sama dengan ikon pesan). `Mail.png` tetap dipakai di panel baca kosong
  Kotak Masuk.

* **Kolom "Kode Web ID (opsional)" di form Daftar kelihatan rusak**
  (`CSS/style.css`, `.webid-collapse`). Penyebabnya `overflow:hidden` (perlu
  untuk animasi buka/tutup) memotong cincin fokus input di sisi kiri, kanan,
  dan bawah. Sekarang isi kolom diberi ruang 4px (padding) yang ditarik balik
  pakai margin negatif, jadi border utuh dan tata letak tidak bergeser.

* **Kategori & tab filter di Kelola User**: tab *Semua / Operator Printer /
  Customer / Developer* dengan badge jumlah (ikut hasil pencarian), plus
  badge status **Online/Offline** di tiap baris user. Daftar kategori diatur
  di array `CATEGORIES` di `JS/users.js` — tambah/ubah kategori cukup di
  situ. Class CSS baru: `.usercat-tabs`, `.usercat-section`, `.usercat-title`,
  `.usercat-count`, `.usercat-online`.

* **`CSS/printer.css`** **(file baru)**: gaya khusus halaman Dashboard
  Printing, dimuat setelah `style.css` di `HTML/printer.html`. Class baru:
  `.pg-head`, `.sec-sub`, `.chip`, `.chip-row`, `.chip-code`, `.job-price`,
  `.job-loc`.

* **Ikon baru** **`Inbox.png`** **(512×512) &** **`Inbox-Fit.png`** **(128×128)** di
  `Resources/Icons/` — gambar baki inbox dengan panah masuk, tebal garis
  sama dengan `Mail.png`.

* **Dihapus:** Tombol **Kirim notifikasi** di tiap baris Kelola User.

* **Dihapus:** `HTML/printers.html`, `JS/printers.js`, dan CSS daftar printer lama
  (`.printer-list`, `.printer-row*`) yang tidak terpakai lagi.

* **Catatan:** Tidak ada koleksi/index Firestore baru dan `firestore.rules` tidak berubah,
  jadi **tidak perlu publish ulang**.

* **Catatan:** Dokumentasi ikut diperbarui: tabel Halaman, struktur folder, & bagian
  Profil / Kelola User di README, serta `Resources/INSTRUKSI.md` (baris
  `Inbox`, `System`, `Printer`). Jumlah PNG di `Resources/Icons/` sekarang 63.

* **Catatan:** Diuji: pengecekan sintaks JS (`node --check`) dan render Chromium
  headless (desktop 1400px & HP 390px, memakai data contoh untuk Dashboard
  Printing). Belum diuji dengan Firebase asli.

## Build 0.6 (2 Okt 2026)

Semua yang berbeda dari Build 0.5 dikumpulkan di sini. Penjelasan cara kerja
Mode Tamu selengkapnya ada di *Dokumentasi → Mode Tamu*.

* **Mode Tamu — upload tanpa login** (`JS/upload.js`, `JS/guest.js`,
  `JS/app.js`, `firestore.rules`). Orang yang belum login/daftar bisa upload
  file, melihat riwayat, dan membatalkan pesanannya sendiri. Sesi
  **Firebase Anonymous Auth** dibuat saat tamu menekan **Kirim** (bukan saat
  halaman dibuka). Dokumen pesanan tamu punya `isGuest: true`, `customerName`,
  dan `customerWaNumber`. Rules membatasi: status hanya `waiting` atau
  `pending`, ukuran file maks 50 MB, URL harus dari `res.cloudinary.com`,
  field dikunci. Semua fitur lain tetap butuh akun (dikunci di client lewat
  `requireAuth()` dan di server lewat `isSignedIn()` yang false untuk
  anonymous). **Anonymous Auth wajib di-Enable** (lihat Setup 1).

* **Profil tamu** (`initGuestProfile()` di `JS/profile.js` + `JS/guest.js`):
  memakai UI profil yang sama dengan akun terdaftar (kartu kepala, kartu
  *Data diri*, dropdown wilayah bertingkat, peta, *Isi otomatis*) dengan
  penanda tamu (pill `unassigned`, banner gembok). Isinya nama tampilan,
  username (tanpa "@"; kalau kosong diturunkan dari nama), No. WhatsApp (wajib;
  `08xx` otomatis jadi `62xx`), dan wilayah — disimpan di `localStorage`, bukan
  Firestore. Tidak ada foto profil, status Online/DND, bio, postingan,
  riwayat, atau detail alamat. Tombol **Edit profil** hanya muncul kalau data
  diri pernah tersimpan (`hasGuestInfo()`).

* **Sidebar tamu** disamakan dengan user login: panel profil bawah (avatar
  default, nama, role `unassigned`, titik-tiga) dengan menu header *Kamu
  belum terdaftar* + *Masuk untuk fitur lengkap*, General (**Settings**,
  **Kotak Masuk** — tidak terkunci, **Recovery**), dan satu item
  **Masuk / Daftar**.

* **Pesanan tamu dicocokkan otomatis ke operator** (`pickOnlinePrinter` di
  `JS/upload.js` dipakai tamu juga). Operator online di wilayah yang sama
  dipilih acak → status `pending`; tidak ada → `waiting`. Kalau pencarian
  gagal (mis. rules belum dipublish), pesanan tetap terkirim sebagai
  `waiting`. Wilayah tamu diketik di Profil tamu dan dicocokkan lewat
  `regionKeyFrom()` yang sama. Baris tabel *Pencocokan otomatis ke operator
  wilayahmu* di `home.html` sekarang ✓ untuk tamu dan user login.

* **Riwayat tamu tersimpan & tersinkron** (`JS/guest-jobs.js` baru):
  salinan pesanan di `localStorage` (`dcp_guestJobs`, maks 100) — tetap ada
  walau tamu keluar akun, sesi anonymous berganti, atau browser ditutup.
  `upload.js` menampilkan salinan lokal dulu lalu menyinkronkan (query sesi
  sekarang + listener per-dokumen untuk pesanan yang belum final). Tombol
  **Detail Info** ada untuk tamu; `job.html` memakai `allowGuest` dan tamu
  hanya bisa membuka pesanan yang ada di riwayat perangkatnya (kartu operator
  memakai nama dari `printerEmail`). Tamu yang belum pernah upload melihat
  empty state yang sama dengan user login ("Belum ada file yang diupload.").

* **Recovery: kode pemulihan + cadangan cloud** (`JS/guest-sync.js`,
  `JS/guest-gate.js` baru, `JS/shell.js`). Profil tamu + daftar id pesanan
  dicadangkan ke `guestProfiles/{kodePemulihan}` (kode acak 20 karakter,
  dibuat otomatis). Menu **titik-tiga > General > Recovery** ada untuk tamu
  dan akun login: tamu hanya **melihat & menyalin** kode; akun login
  menempel kode → **Cek kode** → pilih bagian (Nama tampilan, No. WhatsApp,
  Wilayah, Riwayat pesanan; **Tambah** kalau isian akun kosong, **Timpa** kalau
  beda) → **Terapkan pilihan** / **Timpa semuanya**. Pilihan memakai kotak
  centang (`.recovery-check`). Username tamu **tidak pernah** dipindah.

* **Pemindahan data tamu WAJIB lewat kode** — tidak ada lagi pindah otomatis
  saat daftar/masuk. Di `login.html`, kalau perangkat masih menyimpan data
  tamu, muncul kotak peringatan berisi kode + tombol **Salin**. Setelah login,
  kalau akun masih kosong (belum ada No. WA **dan** wilayah) dan perangkat
  masih menyimpan data tamu, muncul **popup Recovery wajib** ("Pindahkan data
  tamu") yang tidak bisa ditutup lewat klik latar/Escape, dengan pintu darurat
  **Lewati dulu** (hanya untuk sesi tab itu). Data tamu lokal baru dibuang
  setelah SEMUA bagian berhasil dipindah dan kode yang ditempel = kode
  perangkat ini.

* **Home jadi landing page** (`HTML/home.html`, `JS/home.js`, `CSS/style.css`):
  section baru **Panduan** (`#panduan`: panduan singkat 3 langkah + panduan
  lengkap berbentuk accordion) dan **Perbandingan** (`#perbandingan`: tabel
  Belum login vs Sudah login). Isi mengikuti status (`setAud()`), dan bisa
  diganti lewat tombol toggle; kolom yang sesuai statusmu diberi penanda
  "Kamu". Teks hero, kartu Fitur, dan Cara Kerja diperbarui mengikuti sistem
  sekarang.

* **Ukuran kertas sama untuk semua user**: daftar pilihan disimpan di
  Firestore `settings/paperSizes` (`{ sizes: [...] }`), dibaca semua orang dan
  berubah real-time begitu developer menambah/mengubah/menghapus.
  `localStorage` hanya cache. Developer pertama yang membuka `upload.html`
  setelah deploy otomatis menjadikan daftar yang dia lihat sebagai daftar
  resmi (kalau dokumennya belum ada). Perubahan bersifat optimistis (tampil
  dulu, dikembalikan + pesan error kalau gagal disimpan). Pesanan lama
  menyimpan ukuran sebagai teks, jadi tidak terpengaruh.

* **Tambah teman lewat username** (Pesan → tab Teman, `JS/messages.js`):
  ketik username persis → Enter / **Kirim permintaan** → dokumen
  `users/{target}/friendRequests/{me}` dibuat (alur request yang sama).
  Pencarian lewat `usernames/{nama}` → uid → `users/{uid}`, cadangan ke field
  `email` untuk akun lama. Ditolak dengan pesan jelas: format salah / tidak
  ketemu / banned, akun sendiri, sudah berteman, request sudah terkirim, atau
  dia sudah kirim request duluan. Tamu: input memunculkan popup Masuk/Daftar.

* **Popup "data belum lengkap" untuk operator** (`JS/printer.js`): klik
  *Mulai Bekerja* saat lokasi (4 tingkat) atau No. WhatsApp belum lengkap →
  tidak online, muncul popup + tombol **Lengkapi di Profil →**
  (`profile.html#locationLabel`). Berlaku untuk `printer` dan `developer`.

* **Preview Komunitas & Pesan untuk tamu**: menu tetap berbadge gembok tapi
  **bisa dibuka**. Komunitas menampilkan jumlah & daftar channel (cari & urut
  jalan); klik channel / *Buat channel* → popup + tombol **Masuk / Daftar**.
  Pesan menampilkan kerangka halaman; fokus ke kolom cari atau klik
  obrolan → popup yang sama. Helper baru `showGuestLockBanner(namaFitur)` di
  `JS/shell.js` memasang banner "sebagai tamu" di atas halaman (dipakai
  Komunitas & Pesan).

* **Kotak Masuk untuk tamu** (`JS/inbox.js`, `JS/notifications.js`):
  memakai `requireAuth(..., { allowGuest: true })`. Riwayat tamu di
  `localStorage` (kunci `guest`), sumber kabarnya status pesanan miliknya
  sendiri (`initGuestNotifications()`), mengarah ke `upload.html` (bukan
  `job.html`).

* **Dropdown urutan channel di Komunitas** (`JS/community.js`): tombol pil
  *Terbaru / A–Z* diganti dropdown `custom-select` dengan pilihan **Terbaru,
  Terlama, Nama A–Z, Nama Z–A, Pembuat A–Z**, dan **Channel milikku dulu**
  (hanya untuk yang login). Pembanding ada di `channelComparator()`.

* **Halaman Pesan didesain ulang** (`HTML/messages.html`, blok "Pesan" di
  akhir `CSS/style.css`, scope `.msg-page`): hero biru → tab pill
  Obrolan/Teman → kolom cari → kartu messenger (daftar | chat). Bubble
  dikelompokkan per pengirim, pemisah hari (Hari ini/Kemarin/tanggal), kotak
  tulis berbentuk pil dengan tombol kirim ikon. Responsif memakai container
  query (≤880px daftar menyempit, ≤700px satu layar), tinggi memakai `dvh`.
  Semua `id` tidak berubah, jadi logika `messages.js` sama.

* **Form edit profil akun terdaftar disamakan dengan form tamu**: judul
  *Profil pelanggan*, label *Nama*, lalu No. WhatsApp dan panel Lokasi.
  **Bio dipindah ke bawah panel Lokasi.** Detail alamat & tombol Batal tetap
  ada untuk akun terdaftar.

* **Kartu kepala Profil tamu** disusun sama seperti akun terdaftar: nama +
  pill `unassigned`, `@username`, baris lokasi (hanya kalau wilayah sudah
  diisi), lalu info tamu.

* **Kontak CS untuk tamu** (`JS/shell.js`): tamu = belum login ATAU sesi
  anonymous. Kolom **Email dihapus** untuk tamu, username terisi otomatis dari
  profil tamu (kalau sudah disimpan), yang wajib hanya keluhan. Pesan selalu
  ke WhatsApp developer; sesi anonymous tidak lagi salah masuk jalur tiket
  Firestore.

* **Popup "belum lengkap" di halaman Upload** sekarang berupa **toast** untuk
  user login maupun tamu (sebelumnya modal konfirmasi): "Lokasi belum lengkap"

  * tombol *Lengkapi di Profil →*. Tamu yang nama/No. WA-nya belum diisi
    mendapat toast "Data diri belum lengkap".

* **`showGuestGateToast`** sekarang cuma menampilkan toast bertombol
  **Masuk / Daftar** — tidak lagi redirect otomatis setelah 1,8 detik.

* **Nama bawaan user belum login jadi "Customer"** (bukan "Tamu"): sidebar,
  kartu profil tamu, Kotak Masuk, detail pesanan, dan username default
  (`customer`). Chip "Tamu: <nama>" di dashboard printer sengaja tidak
  diubah (itu penanda jenis pesanan).

* **Pesan "Mode tamu belum aktif"**: petunjuk mengaktifkan Anonymous Auth hanya
  tampil untuk developer; tamu/user biasa melihat "Mode tamu sedang tidak
  tersedia. Silakan masuk / daftar dulu, atau coba lagi nanti."

* **Banner "sebagai tamu" di halaman Upload dihapus** (upload terbuka untuk
  semua, banner itu cuma membingungkan). Banner hanya muncul di fitur
  terkunci lewat `showGuestLockBanner()`.

* **Aturan baca** **`channels`**: `channels/{id}` boleh dibaca siapa saja supaya
  jumlah channel tampil untuk tamu. `messages` & `members` channel tetap
  tertutup untuk tamu.

* **Teks Home disesuaikan dengan fitur tamu terbaru** (`HTML/home.html`):
  teks hero tidak lagi menyebut "riwayat tersimpan" sebagai fitur akun
  — sekarang tertulis riwayat pesanan tersimpan di perangkat, dan fitur akun
  yang disebut: chat, komunitas, profil lengkap. Panduan tamu *Memantau &
  membatalkan* kini menyebut riwayat tersimpan di perangkat dan tombol
  **Detail Info**; *Kapan sebaiknya daftar* tidak lagi menyebut "detail
  pesanan". Baris tabel Perbandingan **Halaman detail pesanan** untuk tamu
  berubah dari ✕ jadi "Pesanan di perangkat ini" (tamu bisa membuka
  pesanan yang ada di riwayat perangkatnya).

* **Badge angka di lonceng notifikasi dikecilkan** (`CSS/style.css`,
  `.notif-badge`): ukuran 17px → 12px, font 10.5px → 8.5px, garis tepi putih
  2px → 1.5px, dan posisinya digeser sedikit ke arah lonceng supaya tetap
  rapi dan tidak terlalu menutupi ikon.

* **Kode pemulihan tamu di halaman Masuk / Daftar jadi popup** (`HTML/login.html`).
  Sebelumnya kotak kuning berisi kode + tombol Salin selalu tampil di dalam
  kartu login kalau perangkat masih menyimpan data tamu. Kotak itu **dihapus
  dari halaman**. Sekarang kartu login bersih, dan popup *Salin kode
  pemulihan dulu* baru muncul saat tombol **Masuk / Daftar** ditekan (setelah
  isian lolos validasi, sebelum proses auth jalan). Di popup ada kode, tombol
  **Salin**, **Batal** (atau klik di luar popup), dan tombol lanjut
  (**Lanjut Masuk / Lanjut Daftar**) yang **baru aktif setelah Salin
  ditekan**. Kalau sudah disalin sekali di halaman yang sama, popup tidak
  muncul lagi untuk percobaan berikutnya (mis. salah password). Kode tetap
  disiapkan di latar belakang sejak halaman dibuka (`backupGuestProfile()`),
  dan peringatan cadangan cloud tetap tampil di dalam popup. Popup tidak
  muncul sama sekali kalau perangkat tidak punya data tamu. Alur setelah login
  (popup Recovery wajib di `guest-gate.js`) tidak berubah.

* **Teks di bawah judul halaman Masuk / Daftar diganti** (`HTML/login.html`).
  Teks lama *"Login dulu sebelum bisa upload file untuk diprint."* sudah tidak
  benar sejak Mode Tamu (upload bisa tanpa akun). Sekarang berbunyi *"Masuk atau
  daftar untuk fitur lengkap: chat, komunitas, dan profil. Upload file tetap
  bisa tanpa akun."*

* **Titik merah di tombol titik-tiga (panel profil sidebar) kebesaran dan
  menutupi ikon** (`CSS/style.css`, `.side-more-dot`). Penyebabnya class
  `.badge` (min-width & tinggi 18px) didefinisikan lebih bawah di file CSS
  dan menimpa ukuran titik 9px. Sekarang selektornya dibuat lebih spesifik
  (`.sidebar-user-more .side-more-dot`) dengan ukuran tetap 10px (termasuk
  garis tepi), digeser ke pojok kanan atas, dan tidak menangkap klik
  (`pointer-events:none`) — ikon ⋯ tetap terlihat penuh.

* **HP: menekan tombol titik-tiga tidak lagi menutup sidebar** (`JS/shell.js`,
  `initMobileDrawer()`). Sebelumnya semua tombol di dalam drawer, termasuk
  tombol titik-tiga `#accountMenuBtn`, otomatis menutup drawer, sehingga
  menu akun (Settings, Kotak Masuk, Recovery, Switch account, Log out) tidak
  pernah sempat terlihat. Sekarang tombol itu dikecualikan: drawer tetap
  terbuka dan hanya menu akunnya yang buka/tutup. Tap link navigasi, tap di
  luar (backdrop), tombol hamburger, dan memilih item di dalam menu akun tetap
  menutup drawer seperti biasa.

* **Sidebar tamu: Komunitas & Pesan tidak ter-highlight saat dibuka**
  (`JS/shell.js`, blok sidebar guest di `initShell()`). Link Home & Printer
  sudah mengecek parameter `active`, tapi link Komunitas & Pesan
  di-hardcode `class="side-link"` tanpa pengecekan itu, jadi walau
  `community.js` / `messages.js` sudah mengirim `active: "community"` /
  `active: "messages"`, kelas `active` (background merah) tidak pernah
  dipasang. Sekarang keduanya memakai pola yang sama seperti Home & Printer
  (`${active === "community" ? "active" : ""}`). Ikon gembok tetap tampil.

* **Dihapus:** **Teks** ***"Setelah tersimpan, buka menu Printer di sidebar untuk upload
  file."*** di bawah tombol Simpan Profil tamu (`JS/profile.js`), beserta
  blok kode yang hanya dipakai untuk menyisipkannya.

* **Dihapus:** **Teks** ***"Belum login — data ini tersimpan di browser ini dan dicadangkan ke
  cloud (pulihkan lewat menu Recovery di titik-tiga sidebar)."*** di kartu
  kepala Profil tamu (`JS/profile.js`).

* **Dihapus:** **Efek glow emas di belakang kartu "Pratinjau status pesanan"** di landing
  page (`.landing-hero-visual::before` di `CSS/style.css`). Kartu pratinjau
  dan chip di sekitarnya tidak berubah.

* **Dihapus:** **Panah → di sisi kanan tombol "Kembali"** di `login.html` beserta CSS
  `.auth-upload-arrow` (ikon ← di kiri tetap).

* **Dihapus:** **Panah penghubung antar kartu "Panduan singkat"** di Home
  (`.qg li:not(:last-child)::after`) — sekarang hanya kartu bergaya tiket
  dengan lingkaran nomor.

* **Dihapus:** **Pemindahan otomatis data tamu saat daftar/masuk**
  (`migrateGuestToAccount()` dan `restoreGuestFromCode()`), toast "Pesanan
  tamu dipindahkan", serta halaman `recovery.html` / `recovery.js` versi
  sebelumnya — diganti menu/popup **Recovery**.

* **Dihapus:** **Gaya lama** `.comm-sort` / `.comm-chip` (tombol pil urutan Komunitas).

* **Catatan:** **`firestore.rules`** **BERUBAH — WAJIB publish ulang.** Perubahan: `printJobs`
  (buat/baca/batalkan oleh tamu, `guestJobValid()`, `guestJobClaim()`, `get`
  oleh akun login untuk pesanan `isGuest`), `users/{uid}` (tamu boleh membaca
  profil **operator online saja** lewat query yang memfilter `role == "printer"`
  dan `online == true`), koleksi baru `guestProfiles`, `settings/{docId}`
  (baca semua orang; tulis hanya developer, hanya `paperSizes`, maks 30 item),
  dan `channels/{id}` (`allow read: if true`). Index Firestore **tidak
  berubah**.

* **Catatan:** **Wajib Enable Anonymous Auth:** Firebase Console → Authentication →
  Sign-in method → Anonymous → Enable. Tanpa ini tamu melihat pesan "Mode tamu
  belum aktif".

* **Catatan:** Privasi — karena tamu = Anonymous Auth (siapa pun bisa dapat), data
  profil operator yang online (nama, email login, No. WA, wilayah) praktis
  terbaca publik lewat query pencocokan. Kalau mau lebih ketat, pindahkan
  pencocokan ke Cloud Function (`functions/` sudah ada).

* **Catatan:** Kode pemulihan = kunci: siapa pun yang punya kodenya bisa membaca cadangan
  profil tamu itu. Karena upload terbuka, ada risiko spam — pertimbangkan
  Firebase App Check dan batas ukuran/rate di preset Cloudinary.

* **Catatan:** Kotak Masuk tamu belum ikut menerima kabar Pesan/Komunitas/developer
  (butuh akun); lonceng tamu masih berdasar sesi anonymous sekarang.

* **Catatan:** File baru: `JS/guest.js`, `JS/guest-jobs.js`, `JS/guest-sync.js`,
  dan `JS/guest-gate.js`. Catatan Mode Tamu (dulu `CATATAN-MODE-TAMU.md`)
  sekarang ada di README bagian *Mode Tamu* dan file catatannya dihapus.

## Build 0.7 (2 Okt 2026)

Semua yang berbeda dari Build 0.6 dikumpulkan di sini.

* **Hosting tambahan di Cloudflare** (Workers & Pages → *Connect to Git*).
  Repo `Daitackuu/D-Printing` dihubungkan ke Cloudflare (branch `main`, root
  directory `/`, tanpa build command), sehingga **setiap push ke `main`
  otomatis di-deploy ulang** dan tayang di
  `https://d-printing.therealofbest.workers.dev/`. Toggle *workers.dev* di
  Settings → Domains harus aktif; jangan klik *Enable Access* karena itu
  mengunci web dengan login Cloudflare. GitHub Pages
  (`daitackuu.github.io/D-Printing/`) tidak dihapus dan bisa dimatikan
  belakangan kalau Cloudflare sudah dipakai penuh.

* **`sitemap.xml` dan `robots.txt` diisi** dengan alamat Cloudflare;
  placeholder `GANTI-DOMAIN-KAMU` dihapus. Cloudflare menyajikan halaman
  tanpa `.html` (mis. `/HTML/home`), jadi sitemap memakai `/HTML/login` dan
  `robots.txt` memblokir `/HTML/printer`, `/HTML/users`, `/HTML/notify` tanpa
  `.html` (sebelumnya `printer.html`, dst., yang tidak cocok dengan alamat
  tanpa `.html`).

* **README diperbarui**: bagian *5. Hosting* (menambah Cloudflare) dan
  *6. Google Search Console* (alamat sitemap, dan catatan bahwa `workers.dev`
  hanya bisa dipakai untuk property tipe *URL prefix*).

* **Wajib:** tambahkan `d-printing.therealofbest.workers.dev` di Firebase
  Console → Authentication → Settings → **Authorized domains**, kalau tidak
  login/daftar bisa error di alamat baru. Kalau API key peta atau Cloudinary
  dibatasi per domain, tambahkan juga di sana.

* **Catatan:** data tamu di browser (riwayat pesanan, profil, kode pemulihan)
  tersimpan per alamat web, jadi tamu yang sebelumnya memakai `github.io`
  mulai dari nol di alamat baru (bisa dipulihkan lewat kode Recovery).

* **Catatan:** tidak ada perubahan kode web, `firestore.rules`, maupun index
  Firestore — **tidak perlu publish ulang**. Alamat web menampilkan nama akun
  Cloudflare (`therealofbest`); kalau nanti pindah ke domain sendiri, ganti
  alamat di `sitemap.xml` dan `robots.txt`.

## Build 0.8 (3 Okt 2026)

Semua yang berbeda dari Build 0.7 dikumpulkan di sini.

* **Edit profil dibagi jadi kategori (accordion)** (`profile.html`,
  `profile.js`, `style.css`). Form dikelompokkan jadi tiga kategori yang bisa
  dibuka/ditutup (`<details>`), masing-masing dengan ikon:
  **Data diri** (Nama, WhatsApp, + Username untuk tamu), **Lokasi** (peta &
  wilayah; peta otomatis diukur ulang saat kategori dibuka lagi), dan
  **Sosial**.

* **Foto profil & Bio di kategori Sosial.** Foto ada di atas Bio, dengan
  tombol **Ganti foto** (ber-ikon). Foto yang dipilih tampil sebagai preview
  dan baru diupload saat **Simpan** (Batal = foto tidak berubah; sebelumnya
  foto langsung diupload begitu dipilih). Klik avatar di kepala profil kini
  membuka mode edit dan scroll ke bagian ini. Kategori Sosial disembunyikan
  untuk tamu (tamu tidak punya foto/bio).

* **Tautan sosial (baru).** Kolom **Instagram, TikTok, Facebook, YouTube**
  (opsional) disimpan di field baru `users/{uid}.socials`
  `{instagram, tiktok, facebook, youtube}` dan tampil sebagai link di kepala
  profil. Semua kolom diisi dengan cara yang sama: cukup username (tanpa `@`);
  kalau yang ditempel link, otomatis dipotong jadi username-nya (huruf, angka,
  titik, underscore; YouTube juga boleh strip; maks 30).

* **Login memeriksa username** (`login.html`). Setelah masuk, username yang
  diketik dibandingkan dengan `users/{uid}.username` di Firebase. Beda satu
  huruf saja → sesi di-sign out dan muncul "Username belum terdaftar."
  (kapitalisasi tidak dihitung beda). Akun lama yang field `username`-nya
  kosong akan ditolak.

* **Username tamu vs akun terdaftar** (`profile.js`). Tamu tidak boleh
  menyimpan username yang sama persis dengan akun terdaftar (dicek ke index
  publik `usernames/`); dicek saat Simpan dan saat halaman profil dibuka.
  Beda satu huruf dianggap user lain. Kalau pengecekan gagal (offline), tamu
  tidak diblokir. Antar-tamu tetap tidak dicek.

* **Label & judul disamakan.** Label "Nama tampilan" di profil tamu jadi
  **Nama**, dan judul form (tamu & akun login) jadi **Profil Pelanggan**.

* **Daftar "Switch account" bisa discroll** (`style.css`, `shell.js`).
  Kalau akun yang diingat banyak, kotak tidak lagi meluber keluar layar:
  judul dan tombol **Tutup** tetap kelihatan, daftar akun discroll di dalam
  kotak (scrollbar tipis), akun **Aktif** menempel di atas, dan form password
  yang baru dibuka otomatis digulung ke area yang terlihat.

* **"Masuk dengan akun lain" langsung di popup Switch account** (`shell.js`).
  Tombol "Tambah akun lain" diganti tulisannya jadi **Masuk dengan akun
  lain** dan tidak lagi membuka `login.html?add=1`. Kalau diklik, muncul form
  **Username + Password** tepat di bawah tombol (di dalam popup). Kalau
  cocok, langsung login ke akun tersebut tanpa logout dulu (memakai jalur
  login yang sama dengan memilih akun yang sudah diingat), akun disimpan ke
  daftar, lalu halaman dimuat ulang. Kalau gagal, pesan error tampil di popup
  dan akun sekarang tidak tersentuh. `login.html` **tidak diubah** — judul
  halaman login tetap **Masuk ke akunmu**; penanganan `?add=1` di sana
  dibiarkan (sudah tidak dipakai dari popup).

* **Ikon baru** di `Resources/Icons/`: `Profile.png` (Data diri),
  `Location.png` (Lokasi), `Social.png` (Sosial), `Image-Upload.png` (tombol
  "Tambah gambar" di modal postingan; sebelumnya `Image-Add.png`), dan
  `Recovery.png` (menu Recovery; sebelumnya `Stack.png` yang sama dengan
  Pesanan). `Image-Add.png` kini dipakai tombol "Ganti foto".

* **`Resources/INSTRUKSI.md` disinkronkan** dengan changelog dan kode
  (`Resources/INSTRUKSI.md`, `README.md`). Tidak ada file ikon yang
  ditambah/dihapus; yang berubah hanya dokumentasinya:
  * Header jadi **Build 0.8 — 3 Okt 2026** (sebelumnya "Build 1.1"); catatan
    `Default-Avatar.png` ditulis "Build 0.1" sesuai penomoran baru.
  * Total ikon di `Resources/Icons/` dikoreksi jadi **68 file** (sebelumnya
    49 di INSTRUKSI dan 63 di struktur folder README).
  * Ditambahkan: `Lock.png`, `Lock-Dark.png`, dan 10 ikon versi **Fit**
    (`Bell`, `Community`, `Mail`, `Message`, `Stack`, `Star-Filled`,
    `Star-Outline`, `Support`, `Trash`, `Warning`) yang dipanggil lewat
    `fitIcon()` di `inbox.js`.
  * Dikoreksi: `Switch.png` & `Logout.png` kini di menu titik-tiga (⋯)
    sidebar (bukan Profil); `Settings-Dark.png` untuk menu Settings;
    `Plus.png` untuk "Tambah teman" & tambah ukuran kertas; `Plus-Dark.png`
    dipakai tombol "Buat channel" (sebelumnya tertulis tidak dipakai);
    `Back`, `Edit`, `Trash` ditambah tempat pakainya.
  * Ditandai **tidak dipakai lagi** (aset nganggur, aman dihapus):
    `OPD.png` (diganti `Printer.png` di Build 0.5), `Community-Dark.png`,
    `Check-Dark.png`, `Image-Add-Dark.png`.

* **Wajib:** publish ulang **`Rules/firestore.rules`** — aturan update
  `users/{uid}` menambahkan field `socials`. Tanpa ini, tombol **Simpan** di
  Edit profil gagal dengan error izin. Index Firestore tidak berubah.

***

# Dokumentasi

## Teknologi & tempat data disimpan

| Apa                                                         | Disimpan/dijalankan di                                                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Login (username + password) & Mode Tamu                     | Firebase Authentication (Email/Password; **Anonymous** untuk tamu)                                                                       |
| Data (user, pesanan, channel, chat)                         | Cloud Firestore                                                                                                                          |
| File upload customer, foto profil/channel, gambar postingan | **Cloudinary** (bukan Firebase Storage)                                                                                                  |
| Daftar Provinsi & Kota/Kabupaten                            | API statis publik **emsifa v2** (`www.emsifa.com/api-wilayah-indonesia/v2/`), cadangan API versi lamanya di domain yang sama — tanpa key |
| Tombol "Isi otomatis dari peta" + peta                      | **Leaflet** (peta, lib JS dari CDN) + **Nominatim/OpenStreetMap** (reverse-geocode alamat) — gratis, tanpa API key, tanpa billing        |
| Hosting                                                     | GitHub Pages saat ini (`https://daitackuu.github.io/D-Printing/`); Firebase Hosting bisa jadi alternatif                                 |

Web ini **murni client-side** (HTML + CSS + JavaScript module, tanpa server
sendiri dan tanpa build step) — jadi semua "logika keamanan" sebenarnya ada di
`firestore.rules`, bukan di JavaScript.

## Struktur folder

```
D-Printing/
├── index.html            → langsung redirect ke HTML/home.html
├── HTML/                 → semua halaman (lihat tabel di bawah)
├── CSS/style.css         → CSS bersama buat semua halaman
│   └── printer.css       → tambahan khusus Dashboard Printing (printer.html), dimuat setelah style.css
├── JS/                   → satu file JS per halaman + helper bersama
│   ├── app.js            → helper bersama: auth guard, username, kode pesanan, ikon, error Firestore, popup alasan
│   ├── shell.js          → sidebar, topbar, bubble menu developer, popup notif pesanan, modal Kontak CS
│   ├── notifications.js  → pusat notifikasi berkategori (pesanan, pesan, komunitas, sistem, masalah, bantuan[dev]): toast + lonceng + panel bertab + suara + API riwayat untuk Kotak Masuk
│   ├── cloudinary.js     → helper upload ke Cloudinary (profil/channel/postingan)
│   ├── guest.js, guest-jobs.js, guest-sync.js, guest-gate.js → Mode Tamu: profil tamu (localStorage), riwayat pesanan tamu, cadangan cloud + kode Recovery, gerbang Recovery wajib
│   ├── *-config.js       → firebase, cloudinary, support (nomor WA CS) — WAJIB diisi (peta pakai Leaflet/Nominatim, tanpa config/API key)
│   └── home.js, printer.js, job.js, profile.js, community.js, channel.js,
│       messages.js, friends.js, users.js, notify.js, inbox.js
├── JSON/firestore.indexes.json → composite index Firestore
├── firestore.rules       → aturan keamanan Firestore (WAJIB di-publish)
├── Resources/            → Icons/ (68 PNG), Audios/ (7 MP3 efek suara notifikasi), Images/ (Default-Avatar.png, Web-Logo.png), INSTRUKSI.md
├── sw.js                 → service worker (khusus notifikasi browser di HP; tanpa cache)
├── sitemap.xml, robots.txt
└── README.md
```

### Halaman

| Halaman             | Isi                                                                                 | Ditujukan untuk                                                         |
| ------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `login.html`        | Masuk / Daftar (username + password, kolom Kode Web ID saat Daftar)                 | Semua                                                                   |
| `home.html`         | Landing: hero, Panduan, Perbandingan Belum login vs Sudah login, fitur, cara kerja  | Semua                                                                   |
| `upload.html`       | Upload file + riwayat print (menu sidebar "Printer")                                | Semua, **termasuk tamu tanpa login** (lihat Mode Tamu)                  |
| `job.html?id=…`     | Detail Pesanan (kode pesanan, info file, bio pihak lawan, batalkan)                 | Customer & operator pesanan itu (tamu: pesanan di riwayat perangkatnya) |
| `printer.html`      | Dashboard Printing (toggle online, pesanan masuk, antrean, pendapatan)              | Operator (`printer`) & developer                                        |
| `profile.html`      | Profil sendiri (edit, lokasi, akun, riwayat) / profil orang lain (`?uid=…`)         | Login; tamu: **Profil tamu** (data diri saja)                           |
| `community.html`    | Daftar channel + cari + urutkan + buat channel                                      | Login; tamu: preview (lihat daftar)                                     |
| `channel.html?id=…` | Ruang obrolan publik satu channel (+ Edit/Kelola Anggota/Hapus untuk pemilik)       | Login                                                                   |
| `messages.html`     | Tab **Obrolan** (DM real-time) & tab **Teman** (permintaan + tambah lewat username) | Login; tamu: preview kerangka                                           |
| `users.html`        | Kelola User: per kategori (Operator/Customer/Developer), role, Ban, Hapus, status   | Developer                                                               |
| `notify.html`       | Kirim notifikasi ke user tertentu atau semua user                                   | Developer                                                               |
| `inbox.html`        | **Kotak Masuk** — arsip notifikasi bergaya email (label, cari, bintang, Sampah)     | Login & tamu (kabar status pesanan tamu)                                |

> Halaman `printer`, dan `users` hanya *ditujukan* untuk role
> tertentu (menunya cuma ditampilkan ke role itu), tapi yang benar-benar
> membatasi akses data adalah `firestore.rules` — bukan JavaScript halamannya.
> Makanya rules wajib selalu di-publish (lihat Setup 1).

## Cara kerja singkat

1. Buka web → `index.html` → `home.html` (landing). Upload ada di
   `upload.html` (menu sidebar **Printer**). **Tamu tanpa login juga bisa
   upload** (lihat bagian *Mode Tamu*); fitur lain butuh akun.
2. Customer klik panah di tombol upload buat pilih tipe file (PDF / Word /
   gambar). Dropdown **ukuran kertas** (A4/A5/A3/F4/Letter/Custom) baru muncul
   setelah tipe dipilih. Kalau tombol utama dipencet sebelum pilih tipe, muncul
   popup **Batal / Pilih tipe**.
3. File naik ke **Cloudinary**, lalu dibuat dokumen di Firestore
   (`printJobs`) dengan **kode pesanan acak** (mis. `DP-A3K9X2`). Customer
   **wajib sudah mengisi lokasi lengkap** (Provinsi, Kota/Kabupaten,
   Kecamatan, Kelurahan/Desa) di Profil (tamu: di Profil tamu) — kalau belum,
   upload ditolak dengan popup/toast. Sistem memilih satu operator yang sedang `online` **DAN wilayahnya
   sama persis** dengan customer (keempat tingkat sama) secara acak:

   * Ada operator online di wilayah itu → status `pending` (menunggu operator
     konfirmasi).

   * Tidak ada → status `waiting`; dilempar otomatis ke operator pertama
     **di wilayah yang sama** yang online berikutnya (diklaim lewat
     transaction di `printer.js`). Operator di wilayah lain tidak melihatnya.
4. Operator (`printer.html`) lihat **Pesanan masuk** → **Terima** (isi harga →
   `queued`) atau **Tolak** (pilih alasan → order dilempar ke operator LAIN di
   wilayah yang sama yang belum menolak: langsung `pending` kalau ada yang
   online, `waiting` kalau semuanya offline. Kalau SEMUA operator di wilayah itu
   sudah menolak, status jadi `rejected` dan order tidak bisa diterima siapa
   pun; customer tetap bisa membatalkan selama masih `waiting`/`pending`). Lalu **Mulai print** (`printing`, otomatis download file) →
   **Tandai selesai** (`done`).
5. Customer bisa **Batal** selama pesanan masih `waiting`/`pending` (pilih
   alasan); status jadi `cancelled`.
6. Operator & developer dapat **popup "Ada pesanan belum diterima!"** di
   halaman mana pun (dengan tombol *Lihat pesanan* dan *Ingatkan aku nanti*).
7. Developer punya **bubble menu** bulat di pojok kanan bawah (Kelola User,
   Dashboard Printing) — cuma muncul kalau role `developer`.

### Status pesanan (`printJobs.status`)

| Status      | Arti                                                                               | Label di UI                  |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `waiting`   | Belum ada operator online / baru ditolak operator                                  | Menunggu operator            |
| `pending`   | Sudah ditugaskan ke satu operator, menunggu dia Terima/Tolak                       | Menunggu konfirmasi operator |
| `queued`    | Diterima operator, harga sudah diisi                                               | Antre                        |
| `printing`  | Sedang dicetak                                                                     | Diprint                      |
| `done`      | Selesai                                                                            | Selesai                      |
| `cancelled` | Dibatalkan customer (sebelum diterima)                                             | Dibatalkan                   |
| `rejected`  | SEMUA operator di wilayah customer sudah menolak (final, tidak bisa diterima lagi) | Ditolak semua operator       |

## Akun & login

* Login pakai **username + password** saja. Di balik layar username diubah
  jadi email palsu `username@dprinting.local` karena Firebase Auth butuh
  email (`JS/app.js` → `usernameToEmail`). Username: 3–20 karakter, huruf
  kecil/angka/titik/underscore. Username yang sudah dipakai otomatis
  ditolak Firebase.

* Saat **Daftar** ada kolom **Email** (email asli, opsional/kontak — disimpan
  di `contactEmail`, TIDAK dipakai buat login) dan **Kode Web ID**.

* Enter di form Masuk/Daftar langsung submit.

* Akun yang di-**ban** ATAU **dihapus** developer lewat Kelola User otomatis
  di-logout **real-time** (`JS/app.js` → `watchOwnAccount()`/`requireAuth()`)
  — kalau orangnya lagi login pas itu juga, dia langsung ke-kick SAAT ITU
  JUGA (tidak perlu reload/pindah halaman dulu) dan diarahkan ke
  `login.html?banned=1` atau `login.html?removed=1` (muncul pesannya
  masing-masing). Dia wajib Masuk (akun Firebase Auth-nya tetap ada kalau
  cuma dihapus lewat Kelola User) atau Daftar lagi buat lanjut pakai app —
  sesi lamanya tidak bisa diteruskan begitu saja.

* Tombol **Switch akun** di Profil → Akun cuma muncul kalau di browser itu
  pernah login/daftar lebih dari 1 username (daftar username disimpan di
  `localStorage`, tanpa password).

### Kode Web ID (cara cepat bikin akun developer/operator)

| Kode diisi      | Role yang didapat    |
| --------------- | -------------------- |
| `CENSORED`      | `developer`          |
| `CENSORED`      | `printer`            |
| `(dikosongkan)` | `customer` (default) |

⚠️ **Soal keamanan:** kode ini ada di kode sumber yang bisa dibuka siapa saja
(`JS/app.js`, fungsi `roleFromWebID`). Siapa pun yang tahu `DP-DEV` bisa daftar
jadi developer penuh. Cocok buat bikin akun developer pertama dengan cepat,
**tapi sebelum web dipromosikan ke publik, ganti kodenya** jadi rahasia yang
cuma kamu tahu, atau hapus jalur ini dan ubah field `role` manual lewat
Firebase Console → Firestore → koleksi `users`.

⚠️ **Kode Web ID cuma jalan saat** ***Daftar akun baru***\*\*, bukan saat Masuk.\*\* Role
ditentukan sekali di `ensureUserDoc()` pas dokumen `users/{uid}` pertama kali
dibuat. Kalau akunnya sudah ada (atau dokumennya sempat dihapus lewat Kelola
User lalu login lagi → dibuat ulang sebagai `customer`), mengisi kode di
mode Masuk tidak mengubah apa-apa. Solusi: daftar pakai username baru + kode,
atau ubah field `role` manual di Firestore Console.

## Mode Tamu (upload tanpa login)

Catatan lengkap cara kerja Mode Tamu (dulunya file terpisah `CATATAN-MODE-TAMU.md`, sekarang digabung di sini).

### Aturan sistem

* **Belum login / daftar (tamu)** bisa upload file, melihat riwayat &
  membatalkan pesanannya sendiri di halaman Upload, membuka **Profil tamu**
  (`profile.html`), dan membuka Home. Role yang tampil: `unassigned`; nama
  bawaan: **"Customer"**.

* **Semua fitur lain** (Profil lengkap, Dashboard Printing, Kelola User,
  notifikasi dari developer, Kontak CS tiket, dst.) butuh akun. Dikunci di
  dua lapis:

  1. client: `requireAuth()` (`JS/app.js`) menolak sesi anonymous → redirect
     ke form Daftar;
  2. server: `firestore.rules` — `isSignedIn()` false untuk anonymous, jadi
     semua koleksi tertutup untuk tamu kecuali `printJobs` (buat, baca &
     batalkan miliknya), `settings`, `guestProfiles` (sesuai aturan), dan
     baca `channels`.

* **Sidebar tamu:** panel profil bawah sama seperti user login. Menu
  titik-tiga: header "Kamu belum terdaftar" + "Masuk untuk fitur lengkap",
  General (Settings, **Kotak Masuk** tidak terkunci, **Recovery**), lalu
  kategori Account dengan satu item **Masuk / Daftar**.

### Yang WAJIB dilakukan sebelum deploy

1. **Aktifkan Anonymous Auth:** Firebase Console → Authentication →
   Sign-in method → Anonymous → Enable. Tanpa ini tamu melihat "Mode tamu
   belum aktif di server".
2. **Publish ulang** **`firestore.rules`** (Firestore → Rules → paste → Publish).
   Index Firestore tidak berubah.

### Cara kerja pesanan tamu

* Sesi anonymous dibuat saat tamu menekan **Kirim** (bukan saat halaman
  dibuka).

* Pesanan dicocokkan **sama seperti user login**: cari operator online di
  wilayah yang sama (provinsi|kota|kecamatan|kelurahan), pilih satu acak,
  status `pending`. Tidak ada operator online → `waiting`, diklaim operator
  pertama yang online. Kalau pencarian gagal (mis. rules belum dipublish),
  pesanan tetap terkirim sebagai `waiting`.

* Dokumen pesanan tamu: `isGuest: true`, `customerName`, `customerWaNumber`
  (operator menghubungi lewat WhatsApp).

* Wilayah tamu diisi di Profil tamu dan dicocokkan lewat `regionKeyFrom()`
  yang sama, jadi ejaan harus mirip dengan wilayah operator (awalan
  "Kecamatan/Kel./Desa" otomatis diabaikan).

* Rules membatasi: status hanya `waiting` (tanpa operator) atau `pending`
  (operator harus role `printer` & wilayah sama), file maks 50 MB, URL harus
  dari `res.cloudinary.com`, field dikunci.

* Tamu boleh membaca profil **operator online saja** (`role == "printer"` &&
  `online == true`), hanya lewat query yang memfilter keduanya.

### Profil tamu

* UI sama dengan profil akun terdaftar (kartu kepala + kartu "Data diri"
  dengan dropdown wilayah bertingkat, peta & "Isi otomatis"), digabung
  penanda tamu (pill `unassigned`, banner gembok).

* Isi: **Nama tampilan** (`name`, dipakai sidebar & pesanan), **Username**
  (diisi tanpa "@", "@" ditambahkan otomatis di kartu; kosong → diturunkan
  dari nama), **No. WhatsApp** (wajib; `08xx` otomatis jadi `62xx`), dan
  wilayah. Disimpan di `localStorage` (`JS/guest.js`), bukan Firestore.

* Tidak ada foto profil, status (Online/DND), bio, postingan, riwayat, atau
  detail alamat. Logikanya di `initGuestProfile()` (`JS/profile.js`).

* Kartu kepala: nama + pill `unassigned`, `@username`, baris lokasi (muncul
  kalau wilayah sudah diisi), lalu info tamu.

* Tombol **Edit profil** hanya muncul kalau data diri pernah tersimpan
  (`hasGuestInfo()`); form tertutup (ada tombol Batal). Kalau belum pernah
  menyimpan, form langsung terbuka tanpa tombol Edit. Setelah Simpan berhasil,
  form menutup.

* Teks petunjuk "Setelah tersimpan, buka menu Printer…" dan teks "Belum login —
  data ini tersimpan di browser ini…" **sudah dihapus** (Build 0.6).

* Kalau data belum lengkap saat upload, tamu diarahkan ke profil lewat popup.

### Riwayat print tamu (`upload.html`)

* Kartu **Riwayat print** sama dengan user login: daftar pesanan, status
  real-time, tombol **Batal** (selama "Menunggu operator" / "Menunggu
  konfirmasi operator"), dan tombol **Detail Info**.

* Riwayat muncul begitu tamu menekan **Kirim** dan tetap ada saat halaman
  dibuka lagi di browser yang sama.

* **Riwayat tersimpan & tersinkron** (`JS/guest-jobs.js`): salinan di
  `localStorage` (`dcp_guestJobs`, maks 100). Tetap ada walau keluar akun /
  sesi anonymous berganti / browser ditutup. Tampil langsung dari salinan lokal
  lalu disinkronkan (query sesi sekarang + listener per-dokumen untuk pesanan
  yang belum final). Kalau belum ada sesi tapi ada riwayat, sesi anonymous
  dibuat diam-diam.

* `job.html` memakai `allowGuest`: tamu hanya bisa membuka pesanan yang ada di
  riwayat perangkatnya. Kartu operator memakai nama dari `printerEmail`.

* **Konsekuensi rules:** `get` pesanan tamu oleh sesi anonymous (tahu id
  dokumen) dan pembatalan tamu tidak mengecek `customerId`; `list` tetap
  tertutup. Jadi **id dokumen = kunci akses**.

* Kalau Kirim gagal dengan "Mode tamu belum aktif di server", Anonymous Auth
  belum di-Enable — riwayat tamu tidak akan muncul sebelum itu diaktifkan.

### Popup "belum lengkap" di Upload

* User login & tamu sama-sama memakai **toast**: judul "Lokasi belum lengkap",
  pesan `REGION_INCOMPLETE_MSG`, tombol **Lengkapi di Profil →**
  (`profile.html#locationLabel`).

* Tamu yang nama / No. WA-nya belum diisi mendapat toast "Data diri belum
  lengkap" beserta kekurangannya.

* `profile.html#locationLabel` membuka form & scroll ke Lokasi untuk akun
  terdaftar maupun tamu.

* Operator: klik "Mulai Bekerja" saat lokasi (4 tingkat) atau No. WhatsApp
  belum lengkap → tidak online, popup + tombol "Lengkapi di Profil →".
  Berlaku untuk `printer` & `developer`.

### Kotak Masuk untuk tamu

* Menu titik-tiga tamu: Kotak Masuk = link biasa ke `inbox.html` (tanpa
  gembok), lengkap dengan badge belum-dibaca & titik merah.

* `inbox.js` memakai `requireAuth(..., null, { allowGuest: true })`.

* Riwayat tamu di `localStorage` (kunci `guest`), bisa dibaca / dibintangi /
  dihapus. Sumber kabar: status pesanan miliknya sendiri
  (`initGuestNotifications()`). Pesan / Komunitas / kabar developer tetap
  butuh akun.

* Kabar pesanan tamu mengarah ke `upload.html` (riwayat tamu), bukan
  `job.html`. Belum ikut: notifikasi lonceng tamu (masih berdasar sesi
  anonymous sekarang).

### Komunitas & Pesan untuk tamu (preview)

* Menu tetap berbadge gembok tapi **bisa dibuka** (tanpa pencegatan/redirect).

* **Komunitas** (`requireAuth(..., { allowGuest: true })`): tamu melihat
  jumlah & daftar channel (cari & urut jalan). Klik channel / "Buat channel" →
  popup + tombol **Masuk / Daftar** (`showGuestGateToast`, tanpa pindah halaman
  atau redirect otomatis).

* **Pesan**: kerangka halaman tampil (tab Obrolan/Teman, pencarian, daftar
  kosong). Fokus ke kolom cari, klik daftar obrolan atau panel chat → popup
  yang sama.

* Banner "sebagai tamu" hanya di fitur terkunci lewat
  `showGuestLockBanner(namaFitur)` (`JS/shell.js`), dipakai Komunitas & Pesan.
  Banner di halaman Upload dihapus.

* `channels/{id}` boleh dibaca siapa saja (`allow read: if true`);
  `messages` & `members` channel tetap tertutup untuk tamu. Membuka
  `channel.html` lewat URL langsung tetap diarahkan ke form Daftar.

### Kontak CS untuk tamu

* Tamu = belum login ATAU sesi anonymous
  (`!auth.currentUser || auth.currentUser.isAnonymous`).

* Kolom **Email dihapus** untuk tamu. **Username terisi otomatis** dari profil
  tamu kalau sudah pernah disimpan; yang wajib hanya keluhan/pertanyaan.

* Pesan dikirim ke **WhatsApp developer** (`SUPPORT_WA_NUMBER` di
  `support-config.js`).

### Recovery (kode pemulihan) & pindah ke akun

* `JS/guest-sync.js`: profil tamu + daftar id pesanan dicadangkan ke
  `guestProfiles/{kodePemulihan}` (kode acak 20 karakter, otomatis). Kuncinya
  **kode**, bukan id sesi anonymous, karena sesi hilang saat keluar/ganti
  perangkat. Kode disinkronkan saat tamu menyimpan data diri, kirim file, dan
  tiap modal dibuka. Kalau cadangan gagal, modal memberi petunjuk penyebab
  (rules belum dipublish / Anonymous Auth belum aktif / koneksi).

* Menu **titik-tiga sidebar > General > Recovery** untuk tamu dan akun login
  (`openRecoveryModal()`, `openGuestRecovery`, `openAccountRecovery` di
  `JS/shell.js`):

  * **Tamu:** hanya melihat & **menyalin** kode. TIDAK ada kolom memasukkan
    kode — tamu tidak bisa memulihkan data tamu lain.

  * **Akun login:** tempel kode → **Cek kode** (hanya membaca) → pilihan:
    isian akun kosong = **Tambah** (dicentang), isian beda = **Timpa** (tidak
    dicentang), yang sudah sama tidak muncul. Baris: Nama tampilan,
    No. WhatsApp, Wilayah (4 tingkat; Timpa mereset detail alamat), Riwayat
    pesanan (pesanan tamu `isGuest` → diklaim jadi pesanan akun). Tombol
    **Terapkan pilihan** / **Timpa semuanya** (konfirmasi). Kalau SEMUA bagian
    dipindah tanpa gagal, cadangan cloud dihapus (kode tak berlaku lagi);
    kalau sebagian, kode tetap berlaku.

  * Fungsi: `fetchAccountMigrationPreview()` & `applyAccountMigration()`.

* **Username tamu tidak pernah dipindah/ditimpa** (identitas login & unik);
  hanya `displayName` akun yang bisa berubah. `name` tamu dibandingkan
  dengan `displayName`: sama → tidak muncul; `displayName` masih bawaan
  (sama dengan username) → **Tambah**; sudah diubah dan beda → **Timpa**.

* Pilihan data memakai kotak centang `.recovery-check`; kelas
  `.settings-switch` hanya untuk menu Settings. Mau menambah pilihan: tambah
  item di `fetchAccountMigrationPreview()` + tangani `kind`-nya di
  `applyAccountMigration()`.

### Pemindahan WAJIB lewat kode (tidak ada pindah otomatis)

1. **Sebelum login/daftar** (`login.html`): kalau perangkat masih menyimpan
   data tamu (data diri, riwayat, atau kode), muncul kotak peringatan berisi
   **kode + tombol Salin** dan penjelasan bahwa data TIDAK dipindah otomatis.
   Cadangan cloud diperbarui diam-diam saat kotak tampil.
2. **Daftar/masuk:** tidak ada pemindahan, tidak ada reset. Data tamu
   (`dcp_guestInfo`, `dcp_guestJobs`, `dcp_guestRecovery`, notifikasi tamu)
   dan cadangan cloud tetap utuh. Login langsung ke `upload.html`.
3. **Setelah login, kalau akun masih kosong** (belum ada No. WA **dan** belum
   ada wilayah/`regionKey`) **dan** perangkat masih menyimpan data tamu →
   **popup Recovery wajib** di atas halaman yang sedang dibuka (bukan pindah
   halaman). Gerbangnya di `requireAuth` (`app.js`) serta `upload.js` &
   `home.js`, dibuka sekali per muat halaman.
4. **Popup wajib** ("Pindahkan data tamu"): tidak bisa ditutup lewat klik latar
   / Escape / tombol Tutup. Isinya sama dengan modal Recovery akun login;
   kolom kode tidak terisi otomatis.
5. **Data tamu baru dibuang setelah pemindahan berhasil**
   (`applyAccountMigration()`): kalau SEMUA bagian dipindah tanpa gagal,
   cadangan cloud dihapus, dan **kalau kode yang ditempel = kode tamu di
   perangkat ini**, data tamu lokal di-reset (`resetGuestLocalData()`). Kode
   dari perangkat lain tidak menyentuh data lokal.
6. **Belum menempel kode = data tidak hilang.** Memuat ulang, menutup tab, atau
   keluar akun tidak menghapus apa pun; popup muncul lagi selama akun masih
   kosong.
7. **"Lewati dulu"** (pintu darurat kalau kode hilang): hanya berlaku di sesi
   tab itu (`sessionStorage dcp_recoverySkip`), tidak menghapus apa pun, dan
   dibersihkan tiap login baru. Mau meniadakan: hapus `#recoverySkipRow` di
   `ensureRecoveryModal()` (shell.js) + baris `#recoverySkipBtn` di
   `openForcedRecovery()`.
8. Akun yang **sudah punya data** tidak dipaksa; data tamu di perangkat tetap
   bisa dipindah kapan saja lewat **Recovery** (modal biasa, bisa ditutup).

File & fungsi: `JS/guest-gate.js` (`deviceHasGuestData()`, `accountIsEmpty()`,
`needsRecovery()`, `enforceRecoveryGate()`, `markRecoveryDone(uid)`,
`skipRecoveryThisSession()`, `copyText()` — tidak mengimpor
`app.js`/`guest-sync.js`/`shell.js` secara statis untuk menghindari import
melingkar), `JS/shell.js` (`openForcedRecovery(user)`, modal punya mode
`data-forced`), `JS/guest-sync.js` (`resetGuestLocalData()` diekspor).

### Home: Panduan & Perbandingan

* `home.html` punya section **Panduan** (`#panduan`: 3 langkah + accordion) dan
  **Perbandingan** (`#perbandingan`: tabel Belum login vs Sudah login).

* `home.js` memilih otomatis lewat `setAud()` (tamu/anonymous = "Belum
  login"); pengunjung bisa mengganti lewat toggle (berlaku sampai halaman
  dimuat ulang). Kolom tabel yang sesuai statusmu diberi penanda "Kamu".

* Teks Home mengikuti fitur tamu: riwayat pesanan tamu tersimpan di
  perangkat dan tamu bisa membuka **Detail Info** (baris tabel "Halaman detail
  pesanan" untuk tamu = "Pesanan di perangkat ini").

* Kalau fitur berubah lagi, edit teks di `home.html` saja.

### Ukuran kertas sama untuk semua user

* Daftar "Ukuran kertas" ada di Firestore `settings/paperSizes`
  (`{ sizes: [...] }`), dibaca semua orang dan berubah real-time. `localStorage`
  hanya cache. Developer pertama yang membuka `upload.html` setelah deploy
  menjadikan daftar yang dia lihat sebagai daftar resmi (kalau belum ada).

* Optimistis: tampil dulu, dikembalikan + pesan error kalau gagal disimpan.

* Rules: `settings/{docId}` boleh dibaca siapa saja; tulis hanya developer,
  hanya dokumen `paperSizes`, maks 30 item.

### Tambah teman lewat username (Pesan → tab Teman)

Kartu "Tambah teman lewat username": ketik username persis → Enter / **Kirim
permintaan** → dokumen `users/{target}/friendRequests/{me}` dibuat (alur yang
sama dengan request yang sudah ada). Pencarian: `usernames/{nama}` → uid →
`users/{uid}`; cadangan ke field `email` (`username@dprinting.local`). Ditolak
dengan pesan jelas: format salah / tidak ketemu / banned, akun sendiri, sudah
berteman, request sudah terkirim, atau dia sudah kirim request duluan. Tamu
mendapat popup Masuk/Daftar. `friendRequests` tetap butuh `isSignedIn()`.

### Komunitas: dropdown urutan channel

Pilihan: **Terbaru, Terlama, Nama A–Z, Nama Z–A, Pembuat A–Z**, dan **Channel
milikku dulu** (hanya untuk yang login). Pembanding di `channelComparator()`
(`community.js`); tambah pilihan = satu entri di `sortOptions` + satu `case`.
Memakai field yang sudah ada, jadi rules & indeks tidak berubah.

### Batasan

* Riwayat tamu terikat ke browser/perangkat (sesi anonymous + salinan lokal).
  Ganti perangkat / hapus data browser = riwayat tidak terlihat lagi kecuali
  lewat kode pemulihan. Pesanan lama TIDAK otomatis pindah ke akun baru.

* Karena upload terbuka, ada risiko spam — pertimbangkan Firebase App Check dan
  batas ukuran/rate di preset Cloudinary.

* Kode pemulihan = kunci; siapa pun yang punya bisa membaca profil tamu itu.
  Pesanan yang sudah dipindah tidak bisa dipulihkan lewat kode lagi.

* Data profil operator online (nama, email login, No. WA, wilayah) praktis
  terbaca publik lewat query pencocokan tamu. Untuk lebih ketat, pindahkan
  pencocokan ke Cloud Function.

## Fitur per halaman

### Navigasi (sidebar kiri ala Discord)

Dibangun `JS/shell.js` (`initShell()`), dipakai semua halaman setelah `home`.
Isi: **Home**, **Printer** (`upload.html`, label sama untuk tamu & user login),
**Komunitas**, **Pesan** (keduanya berbadge gembok untuk tamu tapi bisa dibuka
sebagai preview). Paling bawah: panel user (foto + username +
role) → klik ke Profil. Tamu tetap lihat semua item ini, dengan menu titik-tiga yang berisi **Masuk / Daftar**. Di layar kecil sidebar jadi drawer. Bar atas berisi
tombol **Kontak CS**. Link "Dashboard Printing" sengaja **tidak** ada di
sidebar: operator masuk lewat kartu "Kamu login sebagai Operator Print" di
`home.html` (tombol *Buka Dashboard Printing*), developer lewat bubble menu **dan** kartu yang sama di `upload.html`.

### Upload & riwayat (`upload.html`)

Riwayat print customer menampilkan kode pesanan, tanggal, ukuran kertas,
harga (kalau sudah ada), status, tombol **Detail Info**, dan tombol **Batal**
(cuma saat `waiting`/`pending`).

### Dashboard Printing (`printer.html`)

Toggle **online/offline**; **Pesanan masuk** (Terima + isi harga / Tolak +
alasan); **File untuk diprint** (Mulai print → Tandai selesai); **Buka file**
(preview di tab baru) dan **Simpan file** (download dengan nama asli lewat
flag `fl_attachment` Cloudinary — baru muncul setelah *Mulai print*);
**Notif WA** manual ke customer (buka `wa.me` dengan pesan terisi, kalau
customer sudah isi No. WhatsApp). Ini bukan WhatsApp Business API.

### Detail Pesanan (`job.html`)

Menampilkan kode pesanan (bisa disalin), nama/ukuran file, tanggal (upload,
diterima, mulai print, selesai — yang belum terjadi disembunyikan), harga,
alasan batal/tolak kalau ada, dan **kartu bio pihak lawan**: customer lihat
bio operator (foto, nama, bio, link chat WhatsApp, kalau sudah diisi),
operator lihat bio customer. Kalau belum ada operator yang menerima, tampil
"Belum ada yang mau menerima dokumen kamu untuk diprint."

### Profil (`profile.html`)

* Edit **nama**, **bio**, **foto profil**, dan **tautan sosial** lewat tombol
  **Edit profil**. Form dibagi kategori yang bisa dibuka/ditutup: Data diri,
  Lokasi, Sosial (foto & bio ada di sini). Foto baru dipakai setelah **Simpan**.

* **No. WhatsApp** — opsional, **WAJIB untuk role** **`printer`** (label berubah
  jadi "wajib diisi"; Simpan ditolak kalau kosong), karena customer
  menghubungi operator lewat nomor ini.

* **Lokasi** — opsional saat mengisi profil, tapi **wajib lengkap (4 tingkat)
  untuk role** **`printer`** (Simpan ditolak kalau ada yang kosong) dan wajib
  lengkap untuk customer sebelum bisa upload pesanan. Lihat bagian khusus di
  bawah.

* Postingan gaya IG (teks/gambar, tombol **+**, like, komentar),
  follow/unfollow, tombol **Tambah teman**.

* **Riwayat & Pendapatan**: operator lihat riwayat job + total pendapatan
  (jumlah `price` semua job `done`) di profilnya sendiri. **Riwayat upload
  customer hanya bisa dilihat developer**, lewat profil user itu yang dibuka
  dari Kelola User (tidak tampil di profil sendiri).

* **Akun**: Switch akun & Keluar.

### Komunitas & Channel

Siapa pun yang login boleh **Buat channel** (nama + deskripsi). Pemilik bisa
**Edit Saluran** (nama, deskripsi, foto), **Kelola Anggota** (lihat siapa yang
pernah membuka channel, **Kick** sementara / **Ban** permanen lewat
`bannedUids`), dan **Hapus Saluran**. Klik foto/nama pengirim di chat membuka
profil orang itu. Semua channel publik.

### Pesan (`messages.html`)

Tab **Obrolan**: DM real-time + pencarian pengguna buat mulai chat baru
(pertemanan tidak menghalangi DM). Tab **Teman**: kirim/terima/tolak
permintaan, daftar teman, badge jumlah permintaan masuk.

### Kelola User (`users.html`, developer)

User dikelompokkan per kategori (**Operator Printer / Customer / Developer**)
dengan tab filter, jumlah, dan status Online/Offline. Klik nama user untuk
membuka profilnya (di situ developer bisa lihat riwayat upload/dikerjakan).
Ubah role lewat dropdown, **Ban / Buka blokir**, dan **Hapus**. Ban dan Hapus
sama-sama langsung nge-**kick real-time** sesi yang lagi aktif (lihat bagian
"Akun & login" di atas) — orangnya tidak perlu logout manual dulu buat efeknya
kerasa. Hapus menghapus dokumen di Firestore, **bukan** akun Firebase
Auth-nya (tidak bisa dari client) — kalau orangnya Masuk lagi, dokumennya
dibuat ulang sebagai `customer`. Ini bukan bug role "ke-reset".

⚠️ Kalau developer hapus akunnya langsung dari **Firebase Console/Admin SDK**
(bukan lewat tombol Hapus di sini), kick real-time di atas cuma jalan kalau
dokumen `users/{uid}`-nya IKUT dihapus/disentuh saat itu juga (mis. dihapus
manual bareng-bareng di Firestore Console, atau lewat Cloud Function trigger
`functions.auth.user().onDelete()` kalau nanti mau pasang) — soalnya
Firestore sendiri cuma ngecek sah-tidaknya ID token, bukan tahu akun
Auth-nya masih ada apa nggak, jadi sesi yang lagi aktif baru ke-kick pas
token itu kedaluwarsa sendiri (bisa sampai \~1 jam) kalau dokumennya tidak
disentuh sama sekali.

**Edit username** sekarang rename PENUH (bukan cuma benerin ejaan/kapitalisasi
lagi): begitu disimpan, username lama langsung berhenti bisa dipakai login dan
orangnya wajib pakai username baru lain kali Masuk (password tidak berubah).
Ini jalan lewat koleksi index publik `usernames/{namaTernormalisasi} -> {uid,
authEmail}` (lihat `JS/app.js#renameUsername` & `firestore.rules`) — bukan
dengan ganti email akun Firebase Auth-nya (client memang tidak bisa itu tanpa
Admin SDK/Cloud Function). Konsekuensinya: username yang sudah "dilepas" lewat
rename **tidak bisa dipakai orang lain lagi untuk Daftar** (email palsu
`nama@dprinting.local`-nya tetap permanen terpakai akun lama di Firebase Auth).
Akun yang dibuat sebelum fitur ini ada baru ke-index otomatis begitu mereka
login sekali (lihat `JS/app.js#ensureUserDoc`) — kalau developer coba rename
akun yang belum pernah login sejak update ini, modalnya kasih pesan minta
orangnya Masuk dulu sekali.

**Ganti password** — developer bisa paksa-set password login baru buat
user manapun (mis. dia lupa password & tidak bisa reset sendiri). BEDA
sama Edit username: ini butuh **Cloud Function opsional** yang harus
di-deploy sendiri (lihat "Setup Cloud Function (opsional) — Ganti
Password" di bawah) karena client Firebase Auth memang tidak bisa ganti
password akun orang lain tanpa Admin SDK. Kalau function-nya belum
di-deploy, tombolnya kasih pesan error yang jelas ("belum di-deploy"),
bukan bikin halaman lain rusak.

Kirim notifikasi ke user tidak lagi lewat tombol di baris user (dihapus di Build 0.5) — pakai halaman **Kirim Notifikasi** (`notify.html`) dari bubble menu developer.

### Kontak CS

Tombol **Kontak CS** membuka modal formulir (username, email, keluhan) —
otomatis terisi dari profil kalau login. User yang login: pesan dikirim ke
Kotak Masuk developer (kategori **Bantuan**, koleksi `supportTickets`) dan
balasan developer kembali ke Kotak Masuk user di kategori **Sistem**.
Guest / akun diblokir: tetap diteruskan ke WhatsApp. Nomor WhatsApp diatur
di `JS/support-config.js` (`SUPPORT_WA_NUMBER`, format internasional tanpa
`+`, dan `SUPPORT_WA_MESSAGE`).

## Form lokasi di Profil (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan/Desa, Kode Pos)

Lima field, ditambah satu kolom opsional buat detail alamat lengkap.

1. **Provinsi** — dropdown daftar provinsi Indonesia.
2. **Kota / Kabupaten** — terkunci ("Pilih provinsi dulu") sampai provinsi
   dipilih, lalu berisi kota/kabupaten provinsi itu.
3. **Kecamatan** — terkunci sampai kota/kabupaten dipilih, lalu berisi
   kecamatan di kota/kabupaten itu.
4. **Kelurahan / Desa** — terkunci sampai kecamatan dipilih, lalu berisi
   kelurahan/desa di kecamatan itu.
5. **Kode Pos** — isian teks manual.
6. **Detail alamat: jalan, nomor rumah, RT/RW, patokan (opsional)** — field
   `location.streetDetail`, kotaknya disembunyikan di balik tombol accordion
   (buka/tutup) persis seperti kolom **Kode Web ID** di halaman Masuk/Daftar
   — teks tombolnya "(opsional)", diklik dulu baru kolom isiannya muncul.
   Ditampilkan di form Edit profil buat **semua role** (customer, operator
   print, developer), bukan cuma operator. Kalau sebelumnya sudah pernah
   diisi, kolomnya otomatis kebuka lagi pas halaman Profil dibuka (bukan
   ketutup) biar isinya kelihatan. Field ini murni buat catatan pribadi user
   sendiri — **tidak** ikut ditampilkan di profil publik (yang dilihat orang
   lain) atau disalin ke dokumen pesanan (`customerLocation`); yang dipakai
   buat pencocokan customer↔operator maupun ditampilkan ke operator di
   `job.html`/`printer.html` tetap cuma 4 tingkat wilayah (Provinsi →
   Kelurahan/Desa).
7. Tombol **"Isi otomatis dari peta"** — deteksi lokasi + peta preview
   dengan pin yang bisa digeser; hasilnya dicocokkan ke keempat dropdown
   (Provinsi → Kelurahan/Desa, awalan "Kecamatan"/"Kelurahan"/"Desa" tidak
   mempengaruhi pencocokan) dan mengisi Kode Pos. Mengganti pilihan di satu
   tingkat otomatis mengosongkan & memuat ulang tingkat di bawahnya.

Endpoint data wilayah (semua dari emsifa, dengan cadangan API lama):
`/provinces.json`, `/regencies/{province_id}.json`,
`/districts/{regency_id}.json`, `/villages/{district_id}.json`.

**Aturan kotak "Tulis nama … kamu" (isi sendiri):** kotak teks itu **tersembunyi
secara default** dan **hanya muncul kalau kamu memilih "Tidak ada di daftar (tulis sendiri)"
di dropdown-nya** (masing-masing untuk tiap tingkat). Kalau dropdown diganti
ke pilihan lain, kotaknya hilang lagi dan isinya dikosongkan. Detail
perilakunya:

* Pilih tingkat biasa → dropdown tingkat di bawahnya berisi daftarnya +
  opsi "Tidak ada di daftar (tulis sendiri)".

* Pilih **"Tidak ada di daftar (tulis sendiri)"** di suatu tingkat → kotaknya muncul;
  dropdown tingkat di bawahnya tetap aktif tapi isinya cuma "Pilih …" +
  "Tidak ada di daftar (tulis sendiri)" (nggak ada daftar buat wilayah buatan sendiri).

* **Data tersimpan atau hasil deteksi peta yang namanya nggak ada di
  daftar resmi** → kotak tulis sendiri TIDAK dibuka otomatis. Dropdown tetap
  di "Pilih …", muncul pesan yang menyebut nama tadi, dan tingkat di
  bawahnya dikunci sampai user memilih sendiri "Tidak ada di daftar (tulis
  sendiri)" lalu mengetik namanya.

* Kalau daftar wilayah gagal dimuat (internet mati / CDN diblok), tingkat
  yang gagal memuat menampilkan pesan error dan tetap bisa diisi lewat
  "Tidak ada di daftar (tulis sendiri)". Fetch dibatasi 6 detik per sumber (API v2 dulu,
  lalu API versi lama sebagai cadangan).

### Aturan pencocokan wilayah customer ↔ operator

Order **hanya** sampai ke dashboard operator yang **Provinsi, Kota/Kabupaten,
Kecamatan, dan Kelurahan/Desa-nya sama semua** dengan customer.

* Tiap user yang menyimpan profil mendapat field `regionKey` — gabungan
  keempat tingkat yang sudah dinormalisasi, mis.
  `jawa timur|kota malang|klojen|kauman` (huruf kecil, spasi dirapikan,
  awalan Kecamatan/Kelurahan/Desa dibuang, "Daerah Khusus Ibukota Jakarta" =
  "DKI Jakarta"). Kalau ada tingkat yang kosong, `regionKey` = `""` dan
  user itu tidak cocok dengan siapa pun.

* Saat upload, pesanan menyimpan `regionKey` + `customerLocation`
  (provinsi/kota/kecamatan/kelurahan, tanpa koordinat). Operator dipilih
  dengan query `role == printer`, `online == true`, `regionKey == …`.

* **Semua role (`customer`,** **`printer`,** **`developer`) boleh upload file buat
  diprint** — bukan cuma role `customer`. Operator (`printer`) **dan developer** yang lagi
  upload sekalipun tetap dapet card "Dashboard Printing" di halaman
  Upload sebagai jalan pintas, tapi tidak dilarang upload. Satu-satunya
  yang dijaga: **operator TIDAK PERNAH bisa jadi operator buat pesanan
  dirinya sendiri** — dicek dengan bandingin `customerId` pesanan sama
  uid operator, di tiga titik matching-nya sekaligus (dipilih online pas
  upload, diklaim otomatis dari `waiting`, dan dilempar ulang setelah
  operator lain menolak). Kalau kebetulan cuma ada 1 operator online di
  satu wilayah dan itu operatornya sendiri, pesanannya tetap `waiting`
  sampai ada operator LAIN di wilayah yang sama online/mengklaim.

* Job `waiting` cuma bisa dibaca & diklaim operator dengan `regionKey` yang
  sama (dijaga `firestore.rules`, bukan cuma JavaScript). Pesanan baru juga
  ditolak rules kalau `regionKey`-nya tidak sama dengan profil pembuatnya
  atau operator yang dituju wilayahnya beda.

* Dashboard printing: "Pesanan masuk" dan popup notifikasi hanya
  menampilkan order pending dengan `regionKey` yang sama dengan operator
  sekarang. Kalau operator pindah wilayah, order pending wilayah lama
  dilepas balik ke `waiting` otomatis. Order yang sudah diterima
  (`queued`/`printing`/`done`) tidak diganggu. Order lama tanpa `regionKey`
  (dibuat sebelum fitur ini) dibiarkan apa adanya.

* Mau dilonggarkan (mis. cukup sampai kecamatan)? Kurangi isi
  `REGION_LEVELS` di `JS/app.js`, lalu semua user perlu simpan ulang profil
  supaya `regionKey`-nya dihitung ulang.

Field yang tersimpan di `users/{uid}.location`: `province`, `city`,
`district` (kecamatan), `village` (kelurahan/desa), `postalCode`, `lat`,
`lng`, ditambah `users/{uid}.regionKey` (lihat aturan pencocokan di atas). (Field lama `street`/`houseNumber`/`rtRw`/
`landmark` kalau masih ada di data lama tidak ditampilkan lagi dan tidak ikut
tersimpan ulang saat klik Simpan.)

***

# Setup

## 1. Setup Firebase (Auth + Firestore saja — TANPA Storage/kartu)

1. Buka <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started** → aktifkan **Email/Password**,
   lalu **Sign-in method → Anonymous → Enable** (**wajib** untuk Mode Tamu).
3. **Build → Firestore Database → Create database** (mode production).
4. **Project settings → General → Your apps → Web (`</>`)**, daftarkan app,
   copy object `firebaseConfig`.
5. Tempel ke `JS/firebase-config.js`, ganti semua nilai `"GANTI_..."`.
6. Publish rules: copy isi `firestore.rules` ke tab **Rules** di Firestore
   Console → **Publish**. **Ulangi setiap** **`firestore.rules`** **berubah.**
7. Buat composite index dari `JSON/firestore.indexes.json` (lihat
   "Troubleshooting" — cara paling gampang: klik link di pesan error).

Firebase **Storage tidak dipakai** — file upload pakai Cloudinary, jadi tidak
perlu plan Blaze/kartu.

> Repo ini **tidak menyertakan** **`firebase.json`**. Kalau mau deploy rules/index
> lewat CLI: `firebase init firestore`, arahkan rules ke `firestore.rules` dan
> indexes ke `JSON/firestore.indexes.json`, lalu
> `firebase deploy --only firestore:rules,firestore:indexes`.

## 2. Setup Cloudinary (gratis, tanpa kartu)

1. Daftar di <https://cloudinary.com/users/register/free>.
2. Di **Dashboard** copy **Cloud name**.
3. **Settings → Upload → Upload presets → Add upload preset**: **Signing mode
   \= Unsigned** (wajib), folder opsional (mis. `dcopynprint-jobs`), simpan,
   copy nama preset.
4. Isi `JS/cloudinary-config.js`: `GANTI_CLOUD_NAME_KAMU` dan
   `GANTI_UPLOAD_PRESET_KAMU`.
5. Kalau `.doc`/`.docx` gagal upload, cek **Allowed formats** di preset —
   kosongkan (semua format) atau isi `doc,docx,pdf,png,jpg,jpeg`.

## 3. Setup peta (tombol "Isi otomatis dari peta")

**Tidak perlu setup apapun.** Tombol ini pakai **Leaflet** (peta, dimuat lewat
tag `<script>`/`<link>` dari CDN unpkg langsung di `profile.html`) + endpoint
publik **Nominatim/OpenStreetMap** (`nominatim.openstreetmap.org/reverse`) buat
baca alamat dari titik koordinat — dua-duanya **gratis penuh, tanpa API key,
tanpa daftar akun, tanpa kartu/billing apapun**. Tinggal buka halaman Profil,
fiturnya langsung jalan.

Tanpa koneksi internet ke CDN unpkg / Nominatim, form lokasi tetap bisa
dipakai penuh secara manual (dropdown Provinsi/Kota tidak butuh peta sama
sekali) — yang mati cuma tombol deteksi & peta preview.

Catatan pemakaian wajar Nominatim: layanan publiknya minta jangan dipakai
buat request beruntun otomatis dalam jumlah besar (rate limit ramah \~1
request/detik). Untuk penggunaan satu-per-satu oleh user manusia (klik
tombol deteksi / geser pin) ini bukan masalah; kalau nanti traffic-nya besar,
pertimbangkan pindah ke penyedia Nominatim berbayar/self-hosted.

## 4. Push ke GitHub

**Pertama kali (repo masih kosong):**

```bash
cd D-Printing
git init
git add .
git commit -m "D'Printing: initial version"
git branch -M main
git remote add origin https://github.com/Daitackuu/D-Printing.git
git push -u origin main
```

> Kalau path folder kamu ada spasi (mis. `D:\DATA DRIVE - C\Downloads\D-Printing`),
> bungkus pakai kutip di Git Bash: `cd "/d/DATA DRIVE - C/Downloads/D-Printing"`
> (drive `D:\` ditulis `/d/`, backslash `\` diganti `/`) — kalau tidak, muncul
> error `bash: cd: too many arguments`.

**Timpa total isi repo yang sudah ada (repo GitHub bukan kosong, mis. abis
ganti nama repo/mau ganti isinya total dari folder lokal):**

```bash
cd "path/ke/folder/D-Printing"
git init
git remote add origin https://github.com/Daitackuu/D-Printing.git
git add -A
git commit -m "Update project"
git branch -M main
git push origin main --force
```

⚠️ `--force` **menimpa/menghapus histori commit** yang sudah ada di GitHub
kalau beda dari lokal — cuma aman kalau repo itu memang boleh ditimpa total
(bukan repo yang lagi dikerjakan bareng orang lain). Kalau remote `origin`
sudah pernah di-set sebelumnya (arah ke repo/nama lama), pakai
`git remote set-url origin https://github.com/Daitackuu/D-Printing.git`
bukan `add`.

**Update dari folder/zip baru (repo sudah pernah di-push):**

1. Copy semua isi folder baru, paste ke folder lama, pilih **Replace**.
   **Jangan hapus/sentuh folder** **`.git`** di folder lama (tersembunyi; berisi
   riwayat commit + koneksi ke GitHub).
2. Buka **Git Bash** di folder lama (klik kanan → *Git Bash Here*, atau `cd`
   ke path-nya).
3. (Opsional) `git status` buat cek file yang berubah.
4. <br />

   ```bash
   git add .
   git commit -m "Update: kotak isi sendiri di form lokasi cuma muncul kalau dipilih"
   git push
   ```

   `origin` & branch `main` sudah ke-set dari push pertama, jadi `git push`
   polos cukup. Kalau belum pernah di-set, jalankan dulu
   `git remote add origin https://github.com/Daitackuu/D-Printing.git` lalu
   `git push -u origin main`.

Setelah deploy, **hard refresh (Ctrl+Shift+R)** supaya browser tidak memakai
file JS/CSS lama dari cache.

## 5. Hosting

**Yang dipakai sekarang: GitHub Pages** — repo **Settings → Pages**, branch
`main`, root folder. Alamat: `https://daitackuu.github.io/D-Printing/`
(`index.html` di root redirect ke `HTML/home.html`; semua path di kode relatif,
jadi aman walau di subfolder).

**Juga tayang di: Cloudflare (Workers & Pages)** — repo ini dihubungkan ke
Cloudflare lewat *Connect to Git* (branch `main`, root `/`, tanpa build
command), jadi **setiap push ke `main` otomatis di-deploy ulang**. Alamat:
`https://d-printing.therealofbest.workers.dev/` (toggle *workers.dev* di
Settings → Domains harus aktif; jangan klik *Enable Access* karena itu
mengunci web dengan login Cloudflare). Cloudflare menyajikan halaman tanpa
`.html` (mis. `/HTML/home`), dan alamat berakhiran `.html` otomatis
diarahkan ke versi tanpa `.html`. Alamat ini harus ditambahkan di Firebase
Console → Authentication → Settings → **Authorized domains**.

**Alternatif: Firebase Hosting**

```bash
firebase init hosting   # public directory: "." (folder ini)
firebase deploy --only hosting
```

Hasilnya `https://NAMA-PROJECT.web.app`.

## 6. Google Search Console (opsional)

1. <https://search.google.com/search-console> → tambah property (URL web kamu).
2. Verifikasi kepemilikan (URL prefix + HTML tag, atau meta tag di `<head>`).
3. `sitemap.xml` dan `robots.txt` sekarang berisi alamat Cloudflare
   (`d-printing.therealofbest.workers.dev`). Kalau alamat web berubah (mis.
   pindah ke domain sendiri), ganti alamat itu di kedua file, lalu submit
   `sitemap.xml`. `robots.txt` memblokir `/HTML/printer`, `/HTML/users`,
   `/HTML/notify` (tanpa `.html`, supaya cocok dengan alamat Cloudflare
   maupun versi `.html`-nya).
4. `workers.dev` tidak bisa dipakai untuk property tipe *Domain* (butuh akses
   DNS) — pakai tipe **URL prefix** dengan verifikasi HTML tag / meta tag.

## 7. Setup Cloud Function (opsional) — Ganti Password

**Cuma perlu ini kalau mau pakai tombol "Ganti password" di Kelola User**
(`HTML/users.html`, khusus developer, lihat `JS/users.js`). Kalau
di-skip, **semua fitur lain di web ini tetap jalan normal** — tombol itu
saja yang bakal gagal dengan pesan "belum di-deploy".

**Kenapa butuh ini sama sekali:** Firebase Auth di client cuma bisa ganti
password akun yang SEDANG login di browser itu sendiri. Ganti password
akun **orang lain** (yang dilakukan developer dari Kelola User) cuma bisa
lewat Admin SDK, dan Admin SDK cuma boleh jalan di server tepercaya —
bukan di browser siapa pun. Makanya dibungkus jadi Cloud Function
"callable" (`functions/adminChangePassword`) yang double-cek role
developer si pemanggil sebelum override password akun target (lihat
komentar lengkap di `functions/index.js`).

⚠️ **Butuh plan Blaze (pay-as-you-go)** — beda dari Firestore/Auth yang
dipakai web ini (plan Spark/gratis cukup). Blaze tetap ada **free tier
bulanan** (2 juta invocation Cloud Functions gratis/bulan) yang jauh dari
cukup buat pemakaian wajar fitur ini; kamu cuma perlu **hubungkan kartu**
buat upgrade plan-nya, bukan otomatis kena tagih.

Langkah deploy:

1. Upgrade project Firebase kamu ke plan **Blaze**: Firebase Console →
   pojok kiri bawah → **Upgrade**.
2. Install Firebase CLI kalau belum: `npm install -g firebase-tools`, lalu
   `firebase login`.
3. Di root repo ini, jalankan `firebase init functions` → pilih project
   Firebase kamu → bahasa **JavaScript** → **JANGAN** timpa
   `functions/index.js` & `functions/package.json` yang sudah ada di repo
   ini kalau ditanya (pilih "No"/skip overwrite) → boleh jawab apa saja
   buat pertanyaan ESLint/install dependencies (`npm install` manual juga
   boleh di dalam folder `functions/` kalau CLI tidak nawarin otomatis).
4. `firebase deploy --only functions`.
5. Selesai — tombol "Ganti password" di Kelola User langsung jalan,
   tidak perlu ubah apa pun lagi di kode `JS/`.

***

# Referensi

## Struktur data Firestore

```
users/{uid}
  username, email (email palsu username@dprinting.local buat Firebase Auth),
  contactEmail (email asli buat kontak), displayName, bio, photoURL,
  socials {instagram, tiktok, facebook, youtube} (opsional),
  role ("customer"|"printer"|"developer"), online (bool; operator mengatur
  lewat toggle di printer.html), banned (bool), waNumber (opsional; wajib
  buat printer), location {province, city, district, village, postalCode, lat, lng},
  regionKey (kunci wilayah ternormalisasi; "" kalau belum lengkap), createdAt
users/{uid}/followers/{followerUid}   — yang mengikuti user ini
users/{uid}/following/{followingUid}  — yang diikuti user ini
users/{uid}/friendRequests/{fromUid}  — permintaan pertemanan MASUK:
  fromDisplayName, fromEmail, createdAt
users/{uid}/friends/{friendUid}       — pertemanan mutual (dibuat di kedua sisi)
users/{uid}/notifications/{id}        — kabar dari developer buat user ini:
  category ("sistem"|"masalah"; "developer" lama dibaca sebagai sistem), title (maks 80), message (maks 300),
  link (opsional, alamat relatif di web ini), fromUid, fromName, createdAt.
  Dibuat developer lewat halaman Kirim Notifikasi; dibaca pemilik akun (notifications.js)
supportTickets/{ticketId}             — tiket Kontak CS user login: uid, username,
  email, message, status ("open"|"replied"), createdAt, repliedAt, repliedBy, replyMessage
usernames/{nama}                      — index publik username → {uid, authEmail}
settings/paperSizes                   — { sizes: [...] } daftar ukuran kertas bersama
  (baca semua orang, tulis developer, maks 30 item)
guestProfiles/{kodePemulihan}         — cadangan profil tamu + daftar id pesanan
  (kode acak 20 karakter; dibaca akun login, dibuat/diupdate tamu)

printJobs/{jobId}
  customerId, customerEmail, customerWaNumber, isGuest (true kalau dari tamu),
  customerName (nama tamu), printerId, printerEmail,
  regionKey, customerLocation {province, city, district, village},
  rejectedBy (array uid operator yang sudah menolak), rejectReason,
  code ("DP-XXXXXX"), fileName, fileURL, fileType, fileSize (bytes),
  paperSize, price (rupiah, diisi operator saat Terima),
  status ("waiting"|"pending"|"queued"|"printing"|"done"|"cancelled"|"rejected"),
  createdAt, acceptedAt, printingAt, doneAt,
  cancelReason (kalau dibatalkan customer), rejectReason (alasan penolakan
  operator terakhir)

posts/{postId}                        — postingan PROFIL (gaya IG)
  authorId, authorEmail, authorDisplayName, authorPhotoURL, text,
  imageURL (opsional), createdAt
posts/{postId}/likes/{uid}            — keberadaan dokumen = user nge-like
posts/{postId}/comments/{commentId}   — authorId, authorEmail,
  authorDisplayName, text, createdAt

channels/{channelId}
  name, description, photoURL, creatorId, creatorName,
  bannedUids (array), createdAt
channels/{channelId}/members/{uid}    — dicatat saat membuka channel:
  username, photoURL, joinedAt
channels/{channelId}/messages/{msgId} — senderId, senderName,
  senderPhotoURL, text, createdAt

conversations/{convId}                — id = "{uidKecil}_{uidBesar}"
  participants [uid1, uid2], lastMessage, lastSenderId, updatedAt
conversations/{convId}/messages/{msgId} — senderId, text, createdAt
```

Composite index yang dideklarasikan di `JSON/firestore.indexes.json`:
`printJobs` (customerId+createdAt, printerId+createdAt), `conversations`
(participants+updatedAt), `posts` (authorId+createdAt).

## Troubleshooting

**Halaman macet di "Memuat…" / muncul error "izin ditolak"**
`firestore.rules` belum di-*publish* ulang (atau role kamu memang tidak
diizinkan). Semua halaman menangkap error ini lewat `describeFirestoreError()`
dan menampilkan pesan jelas. Publish ulang rules dan refresh.

**Error "query requires an index" (`failed-precondition`)**
Ada composite index yang belum dibuat. `describeFirestoreError()` otomatis
menemukan link Firebase Console dari pesan error dan menampilkannya sebagai
tombol **"klik di sini buat langsung bikin index-nya"** — klik, tunggu status
index "Enabled" (1–2 menit), lalu refresh. Tidak perlu CLI.

**Dropdown Provinsi/Kota "Provinsi (gagal memuat daftar)"**
Buka Console browser (F12 → Console/Network) dan lihat request ke
`www.emsifa.com/api-wilayah-indonesia/v2/provinces.json`. Penyebab yang sudah
pernah terjadi: alamat sumber data lama (jsDelivr `@master/api/` dan
`emsifa.github.io`) sudah tidak berfungsi karena repo emsifa pindah ke v2
(diperbaiki di Fase O). Kalau sekarang masih gagal, cek koneksi internet atau
apakah jaringan memblokir `www.emsifa.com`. Selama itu terjadi, kamu tetap bisa
memilih "Tidak ada di daftar (tulis sendiri)" dan mengetik sendiri.

**Pesan "Gagal memuat peta" saat tombol "Isi otomatis dari peta" dipencet**
Cek Console browser (F12) — biasanya koneksi ke CDN unpkg (Leaflet) atau ke
`nominatim.openstreetmap.org` diblokir jaringan/internet lagi mati. Provinsi,
Kota/Kabupaten, Kecamatan, Kelurahan/Desa & Kode Pos tetap bisa diisi manual
selama itu terjadi. Tidak ada API key yang perlu dicek — lihat Setup 3.

**Tamu melihat "Mode tamu belum aktif di server" / riwayat tamu tidak muncul**
Anonymous Auth belum di-Enable: Firebase Console → Authentication → Sign-in
method → Anonymous → Enable. Pastikan juga `firestore.rules` terbaru sudah
di-**Publish** (Setup 1).

**File** **`.doc/.docx`** **gagal upload** → cek Allowed formats di upload preset
Cloudinary (Setup 2, langkah 5).

**Daftar pakai kode** **`DP-DEV`** **tapi jadi customer** → kode cuma jalan di mode
*Daftar* dengan username baru (lihat bagian Kode Web ID).

**Perubahan di GitHub belum kelihatan di web** → tunggu 1–2 menit GitHub Pages
selesai deploy, lalu hard refresh (Ctrl+Shift+R).

## Batasan & catatan pengembangan lanjutan

* Pemilihan operator masih acak di antara yang online. Untuk skala besar,
  pakai Cloud Function yang assign berdasarkan antrean paling sedikit.

* File di Cloudinary tidak otomatis dihapus setelah selesai print.

* Notif WhatsApp manual (klik tombol → `wa.me`). Notifikasi otomatis butuh
  Cloud Function + WhatsApp Business API/provider pihak ketiga.

* Menghapus post tidak menghapus subcollection `likes`/`comments`-nya (butuh
  Cloud Function). Menghapus user tidak menghapus akun Firebase Auth-nya.

* Semua channel publik (belum ada channel privat/invite-only). Pertemanan
  belum menghalangi DM.

* Kode Web ID `DP-DEV`/`DP-PRINTER` bisa dibaca siapa saja — ganti sebelum
  promosi ke publik.

* Upload tamu terbuka (Anonymous Auth): ada risiko spam dan profil operator
  online terbaca lewat query pencocokan — lihat bagian *Mode Tamu → Batasan*.

* Detail alamat lengkap (jalan/nomor rumah/RT/RW/patokan) sekarang sudah ada
  kolomnya di Edit profil (opsional, lihat bagian "Form lokasi di Profil" di
  atas), tapi belum ikut disalin ke dokumen pesanan (`customerLocation`) —
  operator yang butuh alamat detail customer tetap harus menghubungi manual
  lewat WhatsApp (`waNumber`).

