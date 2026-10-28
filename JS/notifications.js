// ===================================================================
// D'Printing — pusat notifikasi (dipakai lewat shell.js)
//
// Yang dikerjakan file ini:
// 1. Memantau berbagai sumber kabar buat user yang login dan
//    mengelompokkannya ke 6 KATEGORI (bisa disortir lewat tab di panel):
//      pesanan   — status pesanan berubah: diterima, sedang diprint, selesai
//                  (printJobs.customerId == uid)
//      pesan     — DM baru (conversations) & permintaan pertemanan masuk
//      komunitas — pengikut baru & komentar baru di postingan profilmu
//      sistem    — kabar dari developer / sistem (users/{uid}/notifications),
//                  termasuk BALASAN developer atas pesan Kontak CS
//                  (dulu bernama "developer"; entri lama otomatis dimigrasi)
//      masalah   — ada kendala: pesanan ditolak semua operator, atau
//                  pengumuman gangguan dari developer
//      bantuan   — KHUSUS developer: pesan Kontak CS yang dikirim user
//                  (koleksi supportTickets). Dibalas dari Kotak Masuk;
//                  balasannya jatuh ke kategori "sistem" milik si user.
//    Tiap kabar muncul sebagai toast + tersimpan di panel lonceng.
// 2. Status/penanda terakhir tiap sumber disimpan di localStorage, jadi
//    kabar yang terjadi saat user sedang tidak membuka web tetap diberitahu
//    begitu dia buka halaman apa pun (web ini MPA: tiap pindah halaman =
//    reload penuh, sama seperti alasan seenPendingIds di shell.js).
//    Pertama kali sebuah sumber dipantau di browser ini, isinya cuma
//    dicatat (tidak dibunyikan) supaya data lama tidak membanjiri toast.
// 3. Ikon lonceng di topbar + badge jumlah belum dibaca + panel riwayat
//    dengan tab kategori & filter "Belum dibaca".
// 4. Suara pendek (file MP3 di Resources/Audios/) & notifikasi browser saat
//    tab sedang tidak aktif — keduanya bisa dimatikan dari Settings (menu
//    titik-tiga di panel profil sidebar, modal dirender shell.js lewat
//    getNotifPrefs / setSoundPref / setBrowserPref di bawah). Panel lonceng
//    sendiri HANYA berisi daftar notifikasi, tanpa pengaturan.
//
// 5. Riwayat yang sama dibaca halaman Kotak Masuk (inbox.html / inbox.js)
//    lewat fungsi export di bagian bawah file ini (getNotifHistory,
//    patchNotifs, purgeNotifs, subscribeNotifs). Sengaja SATU salinan
//    riwayat di memori: bintang/hapus/baca dari Kotak Masuk langsung
//    tercermin di lonceng dan tidak saling menimpa saat ada kabar baru.
//    Tiap entri punya penanda tambahan: starred (berbintang) & trashed
//    (di Sampah, dikosongkan otomatis setelah 30 hari).
//
// Semua data disimpan per-uid di localStorage; dibungkus try/catch karena
// localStorage bisa diblokir (mode privat, dsb).
// ===================================================================
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { iconImg, iconChip, showToast, fmtRupiah, playSfx, setSfxEnabled, usernameLabel } from "./app.js";
import {
  collection, query, where, orderBy, limit, onSnapshot, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Nama halaman Kotak Masuk — SATU tempat buat ganti nama (dipakai sidebar,
// tombol di panel lonceng, judul halaman inbox.html).
export const INBOX_LABEL = "Kotak Masuk";

const MAX_HISTORY = 300; // yang berbintang tidak ikut terhitung & tidak pernah terpotong
const TRASH_KEEP_MS = 30 * 24 * 3600 * 1000; // Sampah dikosongkan otomatis setelah 30 hari

// Kategori notifikasi — urutan = urutan tab di panel.
export const NOTIF_CATS = [
  { id: "pesanan",   label: "Pesanan",   icon: "Stack",     color: "navy",  action: "Lihat pesanan" },
  { id: "pesan",     label: "Pesan",     icon: "Message",   color: "navy",  action: "Buka pesan" },
  { id: "komunitas", label: "Komunitas", icon: "Community", color: "green", action: "Lihat" },
  { id: "sistem",    label: "Sistem",    icon: "System",    color: "gold",  action: "Baca" },
  { id: "masalah",   label: "Masalah",   icon: "Warning",   color: "red",   action: "Lihat" },
  // devOnly: kategori ini cuma ditampilkan (tab/label) buat role developer.
  { id: "bantuan",   label: "Bantuan",   icon: "Support",   color: "navy",  action: "Baca", devOnly: true }
];
const CATS = NOTIF_CATS;
const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));

// Diisi saat initNotifications: apakah yang lagi login itu developer.
let devViewer = false;
export function isDevViewer() { return devViewer; }
function visibleCats() { return CATS.filter((c) => !c.devOnly || devViewer); }

let started = false;
let uidNow = null;
let lastStatuses = {};
let history = [];
let seen = {};
let prefs = { sound: true, browser: true, tab: "all", unreadOnly: false };
const listeners = new Set(); // pendengar perubahan riwayat (halaman Kotak Masuk)

// Potong riwayat: yang berbintang selalu disimpan, sisanya paling baru MAX_HISTORY.
function trimHistory(list) {
  const sorted = list.slice().sort((a, b) => b.ts - a.ts);
  let others = 0;
  return sorted.filter((n) => n.starred || ++others <= MAX_HISTORY);
}
function emitChange() {
  listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
function persistAndRefresh() {
  save("notifs", history);
  updateBadge();
  renderPanel();
  emitChange();
}

// ---------- storage helpers ----------
function keyOf(kind) { return `dp_${kind}_${uidNow}`; }
function load(kind, fallback) {
  try {
    const raw = localStorage.getItem(keyOf(kind));
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function save(kind, value) {
  try { localStorage.setItem(keyOf(kind), JSON.stringify(value)); } catch (e) { /* abaikan */ }
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function clip(s, n) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

// Tautan dari data Firestore (mis. field "link" buatan developer) hanya
// boleh berupa alamat RELATIF di web ini — tolak "javascript:", "http:",
// "//domain-lain" dsb.
function safeHref(h) {
  if (typeof h !== "string") return "";
  const t = h.trim();
  if (!t || t.length > 200 || t.startsWith("//") || !/^[A-Za-z0-9_\-./?=&%#]+$/.test(t)) return "";
  return t;
}

function onPage(name) {
  return location.pathname.split("/").pop() === name;
}

// ---------- pesan per perubahan status ----------
// prev = status sebelumnya, next = status sekarang, j = data pesanan.
// Mengembalikan null kalau perubahan itu tidak perlu diberitahukan
// (mis. customer sendiri yang membatalkan).
function describeChange(prev, next, j) {
  const file = j.fileName || "file kamu";
  const code = j.code ? `#${j.code}` : "";
  const tag = code ? ` ${code}` : "";
  if (next === "queued") {
    const price = j.price != null && j.price !== "" ? ` Harga ${fmtRupiah(j.price)}.` : "";
    return { icon: "Accept", title: `Pesanan${tag} diterima`, message: `${file} sudah diterima operator.${price}` };
  }
  if (next === "printing") {
    return { icon: "Print-Start", title: `Pesanan${tag} sedang diprint`, message: `${file} lagi dicetak sekarang.` };
  }
  if (next === "done") {
    return { icon: "Print-Done", title: `Pesanan${tag} selesai!`, message: `${file} sudah selesai dicetak. Silakan hubungi operator untuk pengambilan.` };
  }
  if (next === "waiting" && prev === "pending") {
    return { icon: "Redirect", title: `Operator menolak pesanan${tag}`, message: `${file} dialihkan ke operator lain. Kamu tidak perlu upload ulang.` };
  }
  if (next === "rejected") {
    // Ini satu-satunya kabar pesanan yang tergolong "masalah".
    return { cat: "masalah", icon: "Reject", title: `Pesanan${tag} ditolak`, message: `Semua operator di wilayahmu menolak ${file}. Coba lagi nanti atau hubungi CS.` };
  }
  return null;
}

// ---------- suara & notifikasi browser ----------
// Suara memakai file MP3 di Resources/Audios/ (lihat playSfx di app.js).

// Chrome Android melarang `new Notification()` dari halaman ("Illegal
// constructor") — di HP harus lewat service worker (sw.js di root project).
// Laptop/desktop tetap jalan lewat kedua jalur; service worker dicoba dulu.
let swRegPromise = null;
function getSwRegistration() {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);
  if (!swRegPromise) {
    swRegPromise = navigator.serviceWorker
      .register(new URL("../sw.js", import.meta.url).href)
      .then(() => navigator.serviceWorker.ready)
      .catch((e) => { console.error("service worker gagal didaftarkan", e); return null; });
  }
  return swRegPromise;
}

async function showSystemNotification(title, body, url) {
  const options = {
    body,
    icon: new URL("../Resources/Images/Web-Logo.png", import.meta.url).href,
    badge: new URL("../Resources/Images/Web-Logo.png", import.meta.url).href,
    tag: "dprinting-status",
    renotify: true,
    data: { url: url || new URL("../HTML/home.html", import.meta.url).href }
  };
  const reg = await getSwRegistration();
  if (reg && reg.showNotification) {
    try { await reg.showNotification(title, options); return true; } catch (e) { console.error(e); }
  }
  try { new Notification(title, options); return true; } catch (e) { console.error(e); }
  return false;
}

function browserNotify(title, body, url) {
  if (!prefs.browser) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!document.hidden) return; // tab aktif: toast sudah cukup
  showSystemNotification(title, body, url);
}

// Minta izin dengan dua gaya API (Safari/browser lama pakai callback).
function askPermission() {
  return new Promise((resolve) => {
    try {
      const r = Notification.requestPermission((p) => resolve(p));
      if (r && typeof r.then === "function") r.then(resolve, () => resolve("denied"));
    } catch (e) { resolve("denied"); }
  });
}

// Nyalain "Notifikasi browser" (popup asli kayak notif Windows/HP, bukan
// cuma toast di dalam web). Dipakai dua tempat: (1) toggle di Settings
// (user klik manual, announce:true -> tampilin toast hasil & minta izin
// biarpun sudah pernah ditolak sebelumnya lewat prompt browser), dan
// (2) otomatis pas initNotifications() kalau prefs.browser belum pernah
// disentuh user sama sekali (announce:false -> diam-diam, tanpa toast
// kalau gagal/ditolak, biar tidak berisik tiap buka halaman).
// Return true kalau berhasil aktif (izin "granted"), false kalau tidak.
async function enableBrowserNotify({ announce = false } = {}) {
  const fail = (msg) => {
    prefs.browser = false;
    save("prefs", prefs);
    if (announce && msg) showToast(msg, "warning");
    return false;
  };
  if (!("Notification" in window)) {
    return fail(announce ? "Browser ini belum mendukung notifikasi. Di iPhone, tambahkan web ini ke Layar Utama dulu lalu buka dari sana." : null);
  }
  if (!window.isSecureContext) return fail(announce ? "Notifikasi browser hanya jalan di koneksi HTTPS." : null);
  // Pastikan service worker siap SEBELUM minta izin — di HP notifikasi
  // hanya bisa tampil lewat service worker.
  const reg = await getSwRegistration();
  if (!reg && !(typeof Notification === "function" && !/Android/i.test(navigator.userAgent))) {
    return fail(announce ? "Gagal menyiapkan notifikasi di browser ini. Coba muat ulang halaman." : null);
  }
  let perm = Notification.permission;
  if (perm === "default") perm = await askPermission();
  if (perm === "granted") {
    prefs.browser = true;
    save("prefs", prefs);
    // Tes langsung: kalau ini muncul, di HP juga pasti jalan. Cuma dites
    // (dan dikasih toast) kalau announce:true, biar aktivasi otomatis
    // pas buka web pertama kali tidak nembak notifikasi tes tiba-tiba.
    if (announce) {
      const ok = await showSystemNotification("Notifikasi aktif", "Kamu akan diberi tahu soal status pesanan walau tab di background.");
      showToast(ok
        ? "Notifikasi browser aktif. Kamu diberi tahu walau tab sedang di background."
        : "Izin sudah diberikan, tapi notifikasi percobaan tidak muncul. Cek pengaturan notifikasi HP/browser kamu.",
        ok ? "success" : "warning");
    }
    return true;
  }
  if (perm === "denied") {
    return fail(announce ? "Izin notifikasi diblokir. Buka pengaturan situs di browser (ikon di sebelah alamat) > Notifikasi > Izinkan, lalu coba lagi." : null);
  }
  return fail(announce ? "Izin notifikasi belum diberikan. Coba nyalakan lagi lalu pilih Izinkan." : null);
}

// ---------- riwayat & badge ----------
function unreadCount(cat) {
  return history.filter((n) => !n.trashed && !n.read && (!cat || cat === "all" || n.cat === cat)).length;
}

function updateBadge() {
  const n = unreadCount();
  const text = n > 9 ? "9+" : String(n);
  const badge = document.getElementById("notifBadge");
  if (badge) {
    badge.textContent = text;
    badge.classList.toggle("hidden", n === 0);
    const btn = document.getElementById("notifBellBtn");
    if (btn) btn.setAttribute("aria-label", n > 0 ? `Notifikasi, ${n} belum dibaca` : "Notifikasi");
  }
  // Badge di menu akun "Kotak Masuk" (dirender shell.js, jadi bisa ada
  // lebih dulu atau lebih belakangan dari lonceng — makanya dicari terpisah).
  document.querySelectorAll(".side-mail-badge").forEach((el) => {
    el.textContent = text;
    el.classList.toggle("hidden", n === 0);
  });
  // Titik merah di tombol titik-tiga (panel profil) — penanda ada kabar
  // belum dibaca selagi menunya masih tertutup.
  document.querySelectorAll(".side-more-dot").forEach((el) => {
    el.classList.toggle("hidden", n === 0);
  });
}

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

// Riwayat lama (sebelum ada kategori) hanya punya jobId & tanpa cat/href.
function normalizeEntry(n) {
  const oldCat = n.cat === "developer" ? "sistem" : n.cat; // nama lama -> "sistem"
  const cat = CAT_BY_ID[oldCat] ? oldCat : (n.icon === "Reject" ? "masalah" : "pesanan");
  const href = n.href != null ? n.href : (n.jobId ? `job.html?id=${encodeURIComponent(n.jobId)}` : "");
  return { ...n, cat, href, starred: !!n.starred, trashed: !!n.trashed };
}

function renderTabs() {
  const box = document.getElementById("notifTabs");
  if (!box) return;
  const tab = (id, label, extraClass = "") => {
    const n = unreadCount(id);
    const active = prefs.tab === id;
    return `<button type="button" class="notif-tab ${active ? "is-active" : ""} ${extraClass}" role="tab" aria-selected="${active}" data-cat="${id}">${label}${n > 0 ? ` <span class="notif-tab-count">${n > 9 ? "9+" : n}</span>` : ""}</button>`;
  };
  box.innerHTML =
    tab("all", "Semua") +
    visibleCats().map((c) => tab(c.id, c.label)).join("") +
    `<button type="button" class="notif-tab notif-tab-toggle ${prefs.unreadOnly ? "is-active" : ""}" data-unread-only="1" aria-pressed="${!!prefs.unreadOnly}">Belum dibaca</button>`;
}

function emptyMessage() {
  if (prefs.unreadOnly) return "Tidak ada notifikasi yang belum dibaca.";
  if (prefs.tab !== "all") {
    const hint = {
      pesanan: "Kabar status pesananmu muncul di sini.",
      pesan: "Pesan baru & permintaan pertemanan muncul di sini.",
      komunitas: "Pengikut baru & komentar di postinganmu muncul di sini.",
      sistem: "Kabar dari developer/sistem & balasan Kontak CS muncul di sini.",
      masalah: "Kabar kendala & gangguan muncul di sini.",
      bantuan: "Pesan Kontak CS dari user muncul di sini."
    }[prefs.tab];
    return `Belum ada notifikasi ${CAT_BY_ID[prefs.tab].label.toLowerCase()}.<br>${hint}`;
  }
  return "Belum ada notifikasi.<br>Pesanan, pesan, komunitas, dan kabar dari sistem/developer muncul di sini.";
}

function renderList() {
  const list = document.getElementById("notifList");
  if (!list) return;
  const rows = history.filter((n) => !n.trashed &&
    (prefs.tab === "all" || n.cat === prefs.tab) && (!prefs.unreadOnly || !n.read));
  if (rows.length === 0) {
    list.innerHTML = `<div class="notif-empty">${iconImg("Bell", "", "icon-img notif-empty-icon")}<p>${emptyMessage()}</p></div>`;
    return;
  }
  list.innerHTML = rows.map((n) => {
    const cat = CAT_BY_ID[n.cat];
    const inner = `
        ${iconChip(n.icon || cat.icon, n.color || cat.color)}
        <div class="notif-item-body">
          <div class="notif-item-title">${esc(n.title)}</div>
          <div class="notif-item-text">${esc(n.message)}</div>
          <div class="notif-item-time"><span class="notif-cat-tag notif-cat-${n.cat}">${esc(cat.label)}</span> ${timeAgo(n.ts)}</div>
        </div>`;
    const cls = `notif-item ${n.read ? "" : "is-unread"}`;
    return n.href
      ? `<a class="${cls}" href="${esc(n.href)}" data-nid="${esc(n.id)}">${inner}</a>`
      : `<div class="${cls}" data-nid="${esc(n.id)}" tabindex="0">${inner}</div>`;
  }).join("");
}

function renderPanel() {
  renderTabs();
  renderList();
}

// Titik masuk tunggal semua kabar baru (dari sumber mana pun).
// entries: [{ id?, cat, icon?, color?, title, message, href?, ts? }]
// opts.toast = false -> cuma dicatat ke panel (tanpa toast/suara).
function addEntries(entries, { toast = true } = {}) {
  const now = Date.now();
  const fresh = [];
  entries.forEach((e, i) => {
    const id = e.id || `${e.cat}-${now}-${i}`;
    if (history.some((h) => h.id === id) || fresh.some((h) => h.id === id)) return;
    const cat = CAT_BY_ID[e.cat] ? e.cat : "pesanan";
    fresh.push({
      id, cat, ts: e.ts || now, read: false, starred: false, trashed: false,
      icon: e.icon || CAT_BY_ID[cat].icon, color: e.color || "",
      title: e.title, message: e.message, href: safeHref(e.href),
      ...(e.ticket ? { ticket: e.ticket, replied: !!e.replied } : {})
    });
  });
  if (!fresh.length) return;

  history = trimHistory(fresh.concat(history));
  persistAndRefresh();
  if (!toast) return;

  // Kalau banyak sekaligus (mis. baru buka web setelah lama), ringkas jadi
  // satu toast supaya layar tidak penuh. Tiap kabar tetap dicatat sendiri-
  // sendiri di panel lonceng.
  if (fresh.length > 3) {
    showToast({
      type: "info",
      icon: "Stack",
      title: `${fresh.length} kabar baru buat kamu`,
      message: "Buka lonceng notifikasi untuk melihat detailnya.",
      sound: "Notif",
      duration: 8000
    });
    tagStatusToast();
    browserNotify(`${fresh.length} kabar baru buat kamu`, "Buka D'Printing untuk detailnya.");
  } else {
    fresh.forEach((n) => {
      showToast({
        type: n.cat === "masalah" ? "warning" : "info",
        icon: n.icon,
        title: n.title,
        message: n.message,
        actionLabel: n.href ? CAT_BY_ID[n.cat].action : undefined,
        onAction: n.href ? () => { window.location.href = n.href; } : undefined,
        sound: "Notif",
        duration: 8000
      });
      tagStatusToast();
      browserNotify(n.title, n.message, n.href ? new URL(n.href, location.href).href : undefined);
    });
  }
  pulseBell();
}

// Tandai toast terakhir sebagai toast status (ditutup otomatis saat panel dibuka).
function tagStatusToast() {
  const wrap = document.getElementById("pendingToastWrap");
  if (wrap && wrap.lastElementChild) wrap.lastElementChild.classList.add("toast-status");
}

function pulseBell() {
  const btn = document.getElementById("notifBellBtn");
  if (!btn) return;
  btn.classList.remove("is-ringing");
  void btn.offsetWidth; // restart animasi
  btn.classList.add("is-ringing");
}

// ---------- UI lonceng ----------
function mountBell(topbarMini) {
  if (!topbarMini || document.getElementById("notifBellBtn")) return;
  const right = topbarMini.querySelector(".topbar-right") || topbarMini;
  const wrap = document.createElement("div");
  wrap.className = "notif-wrap";
  wrap.innerHTML = `
    <button type="button" class="notif-bell-btn" id="notifBellBtn" aria-label="Notifikasi" aria-haspopup="true" aria-expanded="false">
      ${iconImg("Bell", "", "icon-img")}
      <span class="notif-badge hidden" id="notifBadge">0</span>
    </button>
    <div class="notif-panel hidden" id="notifPanel" role="dialog" aria-label="Notifikasi">
      <div class="notif-panel-head">
        <strong>Notifikasi</strong>
        <button type="button" class="notif-link-btn" id="notifMarkRead">Tandai dibaca semua</button>
      </div>
      <div class="notif-tabs" id="notifTabs" role="tablist" aria-label="Kategori notifikasi"></div>
      <div class="notif-list" id="notifList"></div>
      <a class="notif-open-inbox" href="inbox.html">
        ${iconImg("Inbox", "", "icon-img icon-sm")} Buka ${INBOX_LABEL} <span aria-hidden="true">→</span>
      </a>
    </div>
  `;
  right.insertBefore(wrap, right.firstChild);

  const btn = wrap.querySelector("#notifBellBtn");
  const panel = wrap.querySelector("#notifPanel");

  const closePanel = () => {
    if (panel.classList.contains("hidden")) return;
    panel.classList.add("is-leaving");
    setTimeout(() => { panel.classList.add("hidden"); panel.classList.remove("is-leaving"); }, 140);
    btn.setAttribute("aria-expanded", "false");
  };
  const openPanel = () => {
    // Toast status yang masih tampil ditutup dulu: isinya sudah ada di
    // panel, dan toast menutupi lonceng/panel di pojok kanan atas.
    document.querySelectorAll(".pending-toast.toast-status .pending-toast-close").forEach((c) => c.click());
    renderPanel();
    panel.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.contains("hidden") ? openPanel() : closePanel();
  });
  // Tutup panel HANYA kalau klik benar-benar di luar area lonceng+panel.
  // Penting: tombol tab/filter dirender ulang (innerHTML) saat diklik, jadi
  // begitu event sampai ke document, e.target sudah lepas dari DOM dan
  // wrap.contains(e.target) jadi false -> panel salah dikira "klik di luar"
  // dan ikut ketutup. composedPath() dicatat saat event dikirim (sebelum
  // render ulang), jadi tetap akurat. Panel juga tidak ditutup oleh klik
  // pada daftar kosong / filter / centang suara — cuma oleh ikon lonceng,
  // klik di luar, atau Escape.
  document.addEventListener("click", (e) => {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    const inside = path.length ? path.includes(wrap) : wrap.contains(e.target);
    if (!inside) closePanel();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  // Tab kategori + filter "Belum dibaca" (delegasi: tombol dirender ulang tiap perubahan).
  wrap.querySelector("#notifTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.unreadOnly) prefs.unreadOnly = !prefs.unreadOnly;
    else if (b.dataset.cat) prefs.tab = b.dataset.cat;
    else return;
    save("prefs", prefs);
    renderTabs();
    renderList();
  });

  // Klik satu notifikasi = dianggap sudah dibaca. Sengaja TIDAK render ulang
  // daftar di sini (kalau itu link, halaman tujuan sedang dibuka); cukup
  // ubah tampilan barisnya + badge.
  const markOneRead = (row) => {
    const n = history.find((h) => h.id === row.dataset.nid);
    if (!n || n.read) return;
    n.read = true;
    save("notifs", history);
    row.classList.remove("is-unread");
    updateBadge();
    renderTabs();
    emitChange();
  };
  wrap.querySelector("#notifList").addEventListener("click", (e) => {
    const row = e.target.closest(".notif-item");
    if (row) markOneRead(row);
  });
  wrap.querySelector("#notifList").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const row = e.target.closest(".notif-item");
    if (row && row.tagName !== "A") { e.preventDefault(); markOneRead(row); }
  });

  // "Tandai dibaca semua" = semua notifikasi di tab yang sedang dibuka
  // (di tab "Semua" = semuanya).
  wrap.querySelector("#notifMarkRead").addEventListener("click", () => {
    history.forEach((n) => { if (!n.trashed && (prefs.tab === "all" || n.cat === prefs.tab)) n.read = true; });
    persistAndRefresh();
  });

  updateBadge();
  renderPanel();
}

// ---------- pemantau: status pesanan (kategori pesanan / masalah) ----------
function watchJobs(uid, { guest = false } = {}) {
  const q = query(collection(db, "printJobs"), where("customerId", "==", uid));

  onSnapshot(q, (snap) => {
    const entries = [];
    snap.docs.forEach((d) => {
      const j = d.data();
      const prev = lastStatuses[d.id];
      if (prev !== j.status) {
        // Pesanan yang belum pernah tercatat (prev === undefined) cuma
        // dicatat, tidak diberitahukan: itu pesanan baru dibuat atau
        // pertama kali dipakai di browser ini, jadi tidak ada "perubahan".
        if (prev !== undefined) {
          const info = describeChange(prev, j.status, j);
          if (info) {
            entries.push({
              cat: "pesanan", ...info,
              id: `${d.id}-${j.status}-${Date.now()}`,
              // Tamu tidak bisa buka job.html (butuh akun) -> arahkan ke riwayat di Upload.
              href: guest ? "upload.html" : `job.html?id=${encodeURIComponent(d.id)}`
            });
          }
        }
        lastStatuses[d.id] = j.status;
      }
    });
    save("jobStatus", lastStatuses);
    if (entries.length) addEntries(entries);
  }, (err) => {
    console.error("gagal memantau status pesanan buat notif", err);
  });
}

// ---------- pemantau: sumber lain ----------
// Penanda "sudah pernah dilihat" per sumber ada di `seen` (localStorage).
// Kalau sebuah sumber BELUM punya penanda (pertama kali di browser ini),
// isinya cuma dicatat sebagai baseline — tidak dibunyikan.
function saveSeen() { save("seen", seen); }

const nameCache = {};
async function userName(otherUid) {
  if (nameCache[otherUid]) return nameCache[otherUid];
  let name = "Seseorang";
  try {
    const s = await getDoc(doc(db, "users", otherUid));
    if (s.exists()) {
      const u = s.data();
      name = u.displayName || u.username || usernameLabel(u.email) || name;
    }
  } catch (e) { /* pakai nama bawaan */ }
  nameCache[otherUid] = name;
  return name;
}

// DM baru. Butuh field `lastSenderId` di dokumen conversations (diisi
// messages.js saat kirim pesan) supaya tahu pesan terakhir dari siapa;
// percakapan lama yang belum punya field itu dilewati.
function watchConversations(uid) {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc"),
    limit(20)
  );
  onSnapshot(q, async (snap) => {
    const baseline = !seen.conv;
    if (!seen.conv) seen.conv = {};
    const found = [];
    snap.docs.forEach((d) => {
      if (d.metadata.hasPendingWrites) return; // timestamp server belum jadi
      const c = d.data();
      const ms = c.updatedAt && c.updatedAt.toMillis ? c.updatedAt.toMillis() : 0;
      if (!ms) return;
      const prev = seen.conv[d.id];
      if (prev === ms) return;
      seen.conv[d.id] = ms;
      if (baseline || !c.lastSenderId || c.lastSenderId === uid || !c.lastMessage) return;
      if (prev !== undefined && ms <= prev) return;
      // Lagi buka halaman Pesan & tab aktif: pesannya sudah kelihatan langsung.
      if (onPage("messages.html") && !document.hidden) return;
      found.push({ id: d.id, ms, c });
    });
    saveSeen();
    if (!found.length) return;
    const entries = await Promise.all(found.map(async ({ id, ms, c }) => ({
      id: `conv-${id}-${ms}`, cat: "pesan", icon: "Message", ts: ms,
      title: `Pesan baru dari ${await userName(c.lastSenderId)}`,
      message: clip(c.lastMessage, 100),
      href: `messages.html?with=${encodeURIComponent(c.lastSenderId)}`
    })));
    addEntries(entries);
  }, (err) => {
    console.error("gagal memantau pesan buat notif", err);
  });
}

// Permintaan pertemanan masuk (users/{uid}/friendRequests) — kategori pesan
// karena daftarnya juga ada di halaman Pesan.
function watchFriendRequests(uid) {
  onSnapshot(collection(db, "users", uid, "friendRequests"), (snap) => {
    const baseline = !seen.req;
    const prev = new Set(seen.req || []);
    const entries = [];
    snap.docs.forEach((d) => {
      if (prev.has(d.id) || baseline) return;
      const r = d.data();
      entries.push({
        id: `req-${d.id}`, cat: "pesan", icon: "Members",
        title: `${r.fromDisplayName || "Seseorang"} mau berteman`,
        message: "Ada permintaan pertemanan baru. Buka Pesan untuk menerima atau menolak.",
        href: "messages.html"
      });
    });
    // Simpan yang ADA sekarang (bukan gabungan): kalau permintaan dihapus lalu
    // dikirim ulang, dia dihitung baru lagi.
    seen.req = snap.docs.map((d) => d.id);
    saveSeen();
    if (entries.length) addEntries(entries);
  }, (err) => {
    console.error("gagal memantau permintaan teman buat notif", err);
  });
}

// Pengikut baru (users/{uid}/followers).
function watchFollowers(uid) {
  onSnapshot(collection(db, "users", uid, "followers"), async (snap) => {
    const baseline = !seen.fol;
    const prev = new Set(seen.fol || []);
    const fresh = baseline ? [] : snap.docs.filter((d) => !prev.has(d.id) && !d.metadata.hasPendingWrites);
    seen.fol = snap.docs.map((d) => d.id);
    saveSeen();
    if (!fresh.length) return;
    const entries = await Promise.all(fresh.map(async (d) => ({
      id: `fol-${d.id}`, cat: "komunitas", icon: "Community",
      title: `${await userName(d.id)} mulai mengikuti kamu`,
      message: "Kamu punya pengikut baru.",
      href: `profile.html?uid=${encodeURIComponent(d.id)}`
    })));
    addEntries(entries);
  }, (err) => {
    console.error("gagal memantau pengikut buat notif", err);
  });
}

// Komentar baru di postingan profil sendiri. Dipantau di 10 postingan
// terbaru saja (tiap postingan 1 listener, masing-masing max 10 komentar
// terbaru) supaya jumlah baca Firestore tetap kecil.
function watchComments(uid) {
  const subscribed = new Set();
  const q = query(collection(db, "posts"), where("authorId", "==", uid), orderBy("createdAt", "desc"), limit(10));
  onSnapshot(q, (snap) => {
    snap.docs.forEach((p) => {
      if (subscribed.has(p.id)) return;
      subscribed.add(p.id);
      const cq = query(collection(db, "posts", p.id, "comments"), orderBy("createdAt", "desc"), limit(10));
      onSnapshot(cq, (csnap) => {
        const baseline = !seen.com;
        const known = new Set(seen.com || []);
        const entries = [];
        csnap.docs.forEach((c) => {
          if (known.has(c.id) || c.metadata.hasPendingWrites) return;
          known.add(c.id);
          const x = c.data();
          if (baseline || x.authorId === uid) return;
          entries.push({
            id: `com-${c.id}`, cat: "komunitas", icon: "Message",
            ts: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : undefined,
            title: `${x.authorDisplayName || "Seseorang"} berkomentar di postinganmu`,
            message: clip(x.text, 100),
            href: `profile.html?uid=${encodeURIComponent(uid)}`
          });
        });
        // Simpan max 200 id komentar terbaru yang sudah dilihat.
        seen.com = Array.from(known).slice(-200);
        saveSeen();
        if (entries.length) addEntries(entries);
      }, (err) => console.error("gagal memantau komentar buat notif", err));
    });
  }, (err) => {
    console.error("gagal memantau postingan buat notif", err);
  });
}

// Kabar dari developer/sistem: users/{uid}/notifications/{id} — dibuat developer
// lewat halaman "Kirim Notifikasi" ATAU otomatis saat developer membalas
// pesan Kontak CS dari Kotak Masuk. Field: category ("sistem" | "masalah";
// nilai lama "developer" tetap dibaca sebagai "sistem"), title, message,
// link (opsional, alamat relatif), fromName, createdAt. Selalu dibunyikan kalau baru (kecuali umurnya sudah
// > 3 hari: cuma dicatat di panel).
function watchDeveloperNotifs(uid) {
  const q = query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(20));
  onSnapshot(q, (snap) => {
    const known = new Set(seen.dev || []);
    const loud = [];
    const quiet = [];
    snap.docs.forEach((d) => {
      if (known.has(d.id) || d.metadata.hasPendingWrites) return;
      known.add(d.id);
      const x = d.data();
      const ts = x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now();
      const cat = x.category === "masalah" ? "masalah" : "sistem";
      const entry = {
        id: `dev-${d.id}`, cat, ts,
        icon: cat === "masalah" ? "Warning" : "System",
        title: clip(x.title, 80) || (cat === "masalah" ? "Kabar kendala" : "Pesan dari sistem"),
        message: clip(x.message, 300),
        href: x.link
      };
      (Date.now() - ts > 3 * 24 * 3600 * 1000 ? quiet : loud).push(entry);
    });
    seen.dev = Array.from(known).slice(-200);
    saveSeen();
    if (quiet.length) addEntries(quiet, { toast: false });
    if (loud.length) addEntries(loud);
  }, (err) => {
    console.error("gagal memantau notifikasi developer", err);
  });
}

// Pesan Kontak CS: supportTickets/{id}, dibuat user lewat modal Kontak CS
// (shell.js). Cuma dipantau kalau yang login role "developer" (rules juga
// membatasi baca). Tiap tiket baru jadi satu kabar kategori "bantuan" di
// Kotak Masuk developer, membawa data `ticket` supaya bisa dibalas dari
// inbox.js (balasan ditulis ke users/{uid pengirim}/notifications).
function watchSupportTickets() {
  const q = query(collection(db, "supportTickets"), orderBy("createdAt", "desc"), limit(30));
  onSnapshot(q, (snap) => {
    const known = new Set(seen.cs || []);
    const loud = [];
    const quiet = [];
    snap.docs.forEach((d) => {
      if (known.has(d.id) || d.metadata.hasPendingWrites) return;
      known.add(d.id);
      const x = d.data();
      const ts = x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now();
      const who = clip(x.username, 40) || clip(x.email, 40) || "user";
      const entry = {
        id: `cs-${d.id}`, cat: "bantuan", ts, icon: "Support",
        title: `Kontak CS — ${who}`,
        message: clip(x.message, 500),
        ticket: { id: d.id, uid: x.uid, username: clip(x.username, 60), email: clip(x.email, 120) },
        replied: x.status === "replied"
      };
      (Date.now() - ts > 3 * 24 * 3600 * 1000 || entry.replied ? quiet : loud).push(entry);
    });
    seen.cs = Array.from(known).slice(-200);
    saveSeen();
    if (quiet.length) addEntries(quiet, { toast: false });
    if (loud.length) addEntries(loud);
  }, (err) => {
    console.error("gagal memantau pesan Kontak CS", err);
  });
}

// ---------- mode TAMU ----------
// Tamu (belum login / sesi anonymous) tetap punya Kotak Masuk: riwayatnya
// disimpan di localStorage browser (kunci "guest"), dan satu-satunya sumber
// kabar adalah status pesanannya sendiri (printJobs milik sesi anonymous-nya,
// yang memang boleh dibaca rules). Sumber lain (pesan, komunitas, developer)
// butuh akun, jadi tidak dipantau. Lonceng, panel, toast, suara & notifikasi
// browser berjalan sama persis seperti user login.
export function initGuestNotifications({ topbarMini } = {}) {
  // initShell dipanggil ulang tiap status login berubah dan topbar dirender
  // ulang dari nol -> lonceng harus dipasang lagi, tapi pantauan cukup sekali.
  if (started) { mountBell(topbarMini); return; }
  started = true;
  uidNow = "guest";
  lastStatuses = load("jobStatus", {});
  history = load("notifs", []).map(normalizeEntry);
  const trashCutoff = Date.now() - TRASH_KEEP_MS;
  history = history.filter((n) => !(n.trashed && (n.trashedAt || n.ts) < trashCutoff));
  seen = load("seen", {});
  prefs = { sound: true, browser: true, tab: "all", unreadOnly: false, ...load("prefs", {}) };
  if (prefs.tab !== "all" && !CAT_BY_ID[prefs.tab]) prefs.tab = "all";
  const notifSupported = "Notification" in window;
  if (prefs.browser && notifSupported && Notification.permission === "granted") {
    getSwRegistration();
  } else if (prefs.browser && notifSupported && Notification.permission === "default") {
    enableBrowserNotify({ announce: false });
  } else {
    prefs.browser = false;
  }
  setSfxEnabled(prefs.sound);
  mountBell(topbarMini);
  updateBadge();

  let watching = false;
  onAuthStateChanged(auth, (u) => {
    // Sesi anonymous baru ada setelah tamu mengirim file di Upload.
    if (u && u.isAnonymous && !watching) {
      watching = true;
      watchJobs(u.uid, { guest: true });
    }
  });

  window.addEventListener("storage", (e) => {
    if (e.key !== keyOf("notifs")) return;
    history = load("notifs", []).map(normalizeEntry);
    updateBadge();
    renderPanel();
    emitChange();
  });
}

export function initNotifications({ user, profile, topbarMini }) {
  if (!user) return;
  if (started) { mountBell(topbarMini); return; }
  started = true;
  uidNow = user.uid;
  devViewer = !!(profile && profile.role === "developer");
  lastStatuses = load("jobStatus", {});
  history = load("notifs", []).map(normalizeEntry);
  // Sampah dikosongkan otomatis setelah 30 hari.
  const trashCutoff = Date.now() - TRASH_KEEP_MS;
  history = history.filter((n) => !(n.trashed && (n.trashedAt || n.ts) < trashCutoff));
  seen = load("seen", {});
  prefs = { sound: true, browser: true, tab: "all", unreadOnly: false, ...load("prefs", {}) };
  if (prefs.tab !== "all" && !CAT_BY_ID[prefs.tab]) prefs.tab = "all";
  const notifSupported = "Notification" in window;
  if (prefs.browser && notifSupported && Notification.permission === "granted") {
    // Izin sudah pernah dikasih sebelumnya — tinggal siapin service worker.
    getSwRegistration();
  } else if (prefs.browser && notifSupported && Notification.permission === "default") {
    // prefs.browser nyala (default buat semua orang, lihat deklarasi
    // `prefs` di atas) TAPI izin browser-nya belum pernah ditanya sama
    // sekali — coba minta izin OTOMATIS begitu halaman kebuka, tanpa user
    // harus klik centang dulu (announce:false = diam-diam kalau ternyata
    // browser-nya block prompt otomatis ini atau user pilih Blokir; tidak
    // ada toast/warning yang bikin kaget di percobaan pertama ini).
    enableBrowserNotify({ announce: false });
  } else {
    // Izin pernah diminta & ditolak ("denied"), atau browser tidak
    // mendukung sama sekali — jangan biarkan toggle "nyala" palsu.
    prefs.browser = false;
  }
  setSfxEnabled(prefs.sound);
  mountBell(topbarMini);
  watchJobs(user.uid);
  watchConversations(user.uid);
  watchFriendRequests(user.uid);
  watchFollowers(user.uid);
  watchComments(user.uid);
  watchDeveloperNotifs(user.uid);
  if (devViewer) watchSupportTickets();

  // Tab/halaman lain mengubah riwayat (mis. Kotak Masuk dibuka di tab lain)
  // -> muat ulang supaya lonceng & badge di sini ikut sinkron.
  window.addEventListener("storage", (e) => {
    if (e.key !== keyOf("notifs")) return;
    history = load("notifs", []).map(normalizeEntry);
    updateBadge();
    renderPanel();
    emitChange();
  });
}

// ---------- API buat Settings (modal di shell.js) ----------
// Pengaturan suara & notifikasi browser dulu ada di kaki panel lonceng;
// sekarang dipindah ke Settings. Datanya TETAP prefs yang sama
// (localStorage per-akun), jadi pilihan lama user tidak hilang.
export function getNotifPrefs() {
  return {
    sound: !!prefs.sound,
    browser: !!prefs.browser,
    browserSupported: "Notification" in window
  };
}

export function setSoundPref(on) {
  prefs.sound = !!on;
  save("prefs", prefs);
  setSfxEnabled(prefs.sound);
  if (prefs.sound) playSfx("Notif");
  return prefs.sound;
}

// Return status akhir (true/false) — kalau izin browser ditolak, hasilnya
// false dan toggle di Settings harus dikembalikan ke mati.
export async function setBrowserPref(on) {
  if (!on) { prefs.browser = false; save("prefs", prefs); return false; }
  return enableBrowserNotify({ announce: true });
}

// ---------- API buat halaman Kotak Masuk (inbox.js) ----------
export function getNotifHistory() { return history.slice(); }

// Ubah field beberapa entri sekaligus, mis. patchNotifs([id], { read: true }).
export function patchNotifs(ids, patch) {
  const set = new Set(ids);
  let changed = false;
  history.forEach((n) => { if (set.has(n.id)) { Object.assign(n, patch); changed = true; } });
  if (changed) persistAndRefresh();
}

// Hapus permanen (dari Sampah). Aman: penanda `seen` mencegah kabar yang sama muncul lagi.
export function purgeNotifs(ids) {
  const set = new Set(ids);
  const before = history.length;
  history = history.filter((n) => !set.has(n.id));
  if (history.length !== before) persistAndRefresh();
}

// Panggil fungsi `fn` tiap riwayat berubah; mengembalikan fungsi berhenti-mendengar.
export function subscribeNotifs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// shell.js memanggil ini setelah sidebar dirender, supaya badge "Kotak Masuk" langsung terisi.
export function refreshNotifBadges() { updateBadge(); }
