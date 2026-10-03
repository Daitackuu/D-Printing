// ===================================================================
// D'Printing — shared app shell (sidebar ala Discord + top strip mini)
// Dipakai oleh semua halaman yang butuh navigasi: home, community,
// profile, messages, printer, users.
//
// Setiap halaman HARUS punya markup ini di <body>:
//   <div class="app-shell">
//     <aside class="sidebar" id="sidebar"></aside>
//     <div class="main-col">
//       <div class="topbar-mini" id="topbarMini"></div>
//       <div class="wrap"> ...isi halaman... </div>
//     </div>
//   </div>
//
// Aturan layout (per revisi terakhir):
// - Topbar atas (topbar-mini): CUMA tombol Kontak CS. Tidak ada apa-apa
//   lagi di sana (bukan link profil, bukan avatar).
// - Klik Kontak CS TIDAK langsung buka WhatsApp — user isi form (username +
//   email + keluhan/pertanyaan) dulu di modal, baru abis Submit diarahkan
//   ke WhatsApp CS dengan pesan yang udah otomatis terisi dari form itu.
// - Sidebar: menu navigasi + link Profil di paling bawah (menggantikan
//   tombol Keluar lama). Logout & switch account sekarang cuma ada di
//   halaman profile.html (lihat js/profile.js).
// ===================================================================
import { getGuestInfo, guestUsername, hasGuestInfo } from "./guest.js";
import { supportWaLink } from "./support-config.js";
import {
  iconImg, iconChip, avatarHtml, regionKeyFrom, playSfx, showToast, askConfirm, logout,
  usernameLabel, usernameToEmail, normalizeUsername, isValidUsername,
  findLoginEmailByUsername, ensureUserDoc, claimUsernameIndex,
  rememberAccount, getKnownAccounts, getKnownAccountsMeta, forgetAccount
} from "./app.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  initNotifications, initGuestNotifications, refreshNotifBadges, INBOX_LABEL,
  getNotifPrefs, setSoundPref, setBrowserPref
} from "./notifications.js";
import { auth, db } from "./firebase-config.js";
import { copyText, deviceHasGuestData } from "./guest-gate.js";
import {
  doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// active: "home" | "upload" | "community" | "messages" | "inbox" | "profile" | "users"
// (printer.html JUGA memanggil initShell dengan active: "upload" — lihat
// catatan di initShell di bawah soal kenapa)
//
// "home" = home.html, halaman depan/landing (dulu punya navbar sendiri,
// sekarang ikut pakai sidebar app kayak halaman lain). Nav item ini
// SENGAJA ditaruh paling atas, di atas item "upload" (yang labelnya
// "Printer" untuk semua orang, login maupun guest).
const NAV_ITEMS = [
  { id: "home", href: "home.html", icon: "Home", label: "Home" },
  { id: "upload", href: "upload.html", icon: "Upload", label: "Upload" },
  { id: "community", href: "community.html", icon: "Community", label: "Komunitas" },
  { id: "messages", href: "messages.html", icon: "Message", label: "Pesan" },
  // Kotak Masuk (inbox.html) SENGAJA tidak ada lagi di sini — sekarang
  // dibuka lewat menu titik-tiga di panel profil bawah sidebar
  // (lihat accountMenuHtml di bawah).
];

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function initials(nameOrEmail) {
  const s = (nameOrEmail || "?").trim();
  return s ? s[0].toUpperCase() : "?";
}

// Topbar-mini SELALU cuma berisi tombol Kontak CS, guest maupun sudah login.
// Ini <button>, BUKAN <a> — supaya klik-nya buka form dulu, bukan langsung
// lompat ke WhatsApp.
function renderTopbar(topbarMini) {
  topbarMini.innerHTML = `
    <button type="button" class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Buka menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <div class="topbar-right">
      <button type="button" class="topbar-mini-link" id="ctcCsBtn">
        <span class="avatar-circle" style="background:#3B7A57;">${iconImg("Support", "CS", "icon-img icon-sm")}</span> Kontak CS
      </button>
    </div>
  `;
}

// ---------------------------------------------------------------------
// Mobile: sidebar SEKARANG jadi drawer yang slide dari kiri (ala menu
// riwayat chat di app Claude versi mobile), bukan lagi baris navigasi
// yang nempel di atas layar (itu makan tempat & aneh di HP). Dibuka
// lewat tombol hamburger di topbar-mini, ditutup lewat tombol hamburger
// lagi, tap di luar (backdrop), atau tap salah satu link di dalamnya.
// Idempotent & aman dipanggil ulang tiap initShell (tiap ganti halaman).
// ---------------------------------------------------------------------
function ensureSidebarBackdrop() {
  let backdrop = document.getElementById("sidebarBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "sidebarBackdrop";
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

function initMobileDrawer(sidebar) {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const backdrop = ensureSidebarBackdrop();
  if (!menuBtn) return;

  const closeDrawer = () => {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  };
  const openDrawer = () => {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    menuBtn.setAttribute("aria-expanded", "true");
  };

  menuBtn.addEventListener("click", () => {
    sidebar.classList.contains("is-open") ? closeDrawer() : openDrawer();
  });
  backdrop.addEventListener("click", closeDrawer);
  // Tap link navigasi di dalam drawer -> otomatis tertutup (rapi kalau
  // sempat kelihatan sesaat sebelum halaman baru dimuat).
  // Pengecualian: tombol titik-tiga (#accountMenuBtn) cuma membuka/menutup
  // menu akun, jadi drawer TIDAK ikut tertutup — kalau ikut tertutup, menu
  // akunnya tidak pernah sempat terlihat di HP.
  sidebar.querySelectorAll("a, button").forEach((el) => {
    if (el.id === "accountMenuBtn") return;
    el.addEventListener("click", closeDrawer);
  });
}

// ===================================================================
// Toast "perlu masuk dulu" — dipakai buat tamu yang membuka ISI fitur yang
// butuh akun (channel Komunitas, obrolan Pesan, buat channel, dst).
// TIDAK memaksa pindah halaman: cuma popup notifikasi dengan tombol
// "Masuk / Daftar" — tamu yang mau lanjut tinggal klik, yang tidak mau
// bisa tutup / diamkan saja dan tetap di halaman preview.
// ===================================================================
let lastGateToastAt = 0;
export function showGuestGateToast(message, redirectUrl = "login.html?mode=signup") {
  // Cegah toast menumpuk kalau klik beruntun.
  const now = Date.now();
  if (now - lastGateToastAt < 1200) return;
  lastGateToastAt = now;
  showToast({
    type: "info", icon: "Lock", sound: "Gate", duration: 8000,
    title: "Perlu masuk dulu",
    message,
    actionLabel: "Masuk / Daftar",
    onAction: () => { window.location.href = redirectUrl; }
  });
}

// Banner info di ATAS halaman fitur terkunci (Komunitas, Pesan, dst) khusus
// tamu. Sengaja TIDAK dipasang di halaman Upload karena upload terbuka buat
// semua orang. Dipanggil dari halaman fitur terkunci yang bisa dilihat tamu
// sebagai preview. Aman dipanggil berulang (tidak membuat banner ganda).
export function showGuestLockBanner(featureLabel) {
  const wrap = document.querySelector(".main-col .wrap");
  if (!wrap || wrap.querySelector(".guest-lock-banner")) return;
  const banner = document.createElement("div");
  banner.className = "ticket preview-banner guest-lock-banner";
  banner.innerHTML =
    `<span class="icon-img icon-sm" role="img" aria-label="" style="--icon:url('../Resources/Icons/Lock-Dark.png')"></span>` +
    `<span>Kamu melihat <b>${featureLabel}</b> sebagai <b>tamu</b> — fitur ini butuh <a href="login.html?mode=signup">daftar / masuk</a>.</span>`;
  wrap.insertBefore(banner, wrap.firstChild);
}

// ---------------------------------------------------------------------
// Modal form Kontak CS: dibikin sekali (ditempel ke <body>, dipakai ulang
// tiap kali tombol Kontak CS diklik di halaman mana pun). Isi form dulu
// (username + email + keluhan/pertanyaan). Kalau user LOGIN, pesan ditulis
// ke koleksi supportTickets dan muncul di Kotak Masuk developer (kategori
// "Bantuan"); balasan developer kembali ke Kotak Masuk user, kategori
// "Sistem". Kalau GUEST (belum login / akun diblokir) tidak ada Kotak Masuk
// buat menerima balasan, jadi tetap dialihkan ke WhatsApp CS seperti dulu.
// Field username & email OTOMATIS keisi dari profil (masih bisa diedit) —
// keluhan tetap harus diketik manual tiap kali.
// ---------------------------------------------------------------------
function ensureContactModal() {
  if (document.getElementById("csContactModal")) return;

  const modal = document.createElement("div");
  modal.id = "csContactModal";
  modal.className = "modal-backdrop hidden";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px;">
      <h3>Kontak CS</h3>
      <p class="sub" id="csIntro" style="margin-bottom:14px;"></p>
      <label for="csUsername">Username (bukan nama tampilan)</label>
      <input type="text" id="csUsername" placeholder="usernamekamu">
      <label for="csEmail" id="csEmailLabel">Email</label>
      <input type="email" id="csEmail" placeholder="emailkamu@contoh.com">
      <label for="csMessage">Keluhan / pertanyaan</label>
      <textarea id="csMessage" class="post-textarea" rows="4" maxlength="500" placeholder="Ceritain kendalanya di sini..."></textarea>
      <div class="error-msg" id="csErr"></div>
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn btn-outline" id="csCancelBtn">Batal</button>
        <button class="btn btn-primary" id="csSubmitBtn">Kirim</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const usernameInput = document.getElementById("csUsername");
  const emailInput = document.getElementById("csEmail");
  const msgInput = document.getElementById("csMessage");
  const errEl = document.getElementById("csErr");
  const cancelBtn = document.getElementById("csCancelBtn");
  const submitBtn = document.getElementById("csSubmitBtn");

  const close = () => { clearCsErrorTimer(); modal.classList.add("hidden"); };
  cancelBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  // Notice error di modal ini (Formulir belum diisi/keluhan kosong/dst)
  // sekarang bikin modalnya OTOMATIS NUTUP SENDIRI abis beberapa detik,
  // bukan nunggu ditutup manual doang. Kalau user SEMPAT ngetik lagi buat
  // benerin isian sebelum waktunya habis, auto-tutup ini DIBATALKAN dulu
  // (supaya modal tidak ketutup pas lagi aktif dibenerin) — begitu dia
  // submit ulang dan masih salah, notice baru + timer baru muncul lagi.
  const CS_ERROR_AUTOCLOSE_MS = 3500;
  let csErrorTimer = null;
  function clearCsErrorTimer() {
    if (csErrorTimer) { clearTimeout(csErrorTimer); csErrorTimer = null; }
  }
  function showCsError(msg) {
    errEl.textContent = msg;
    clearCsErrorTimer();
    csErrorTimer = setTimeout(close, CS_ERROR_AUTOCLOSE_MS);
  }
  [usernameInput, emailInput, msgInput].forEach((inp) => {
    inp.addEventListener("input", clearCsErrorTimer);
  });

  // Enter di field satu baris (username/email) langsung submit. Textarea
  // keluhan SENGAJA tidak dikasih ini — Enter di textarea harus tetap
  // bikin baris baru, bukan langsung kirim.
  [usernameInput, emailInput].forEach((inp) => {
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submitBtn.click(); });
  });

  submitBtn.addEventListener("click", async () => {
    if (submitBtn.disabled) return;
    // Tamu = belum login ATAU cuma punya sesi anonymous (pernah upload tanpa
    // akun). Tamu TIDAK punya kolom Email dan tidak boleh menulis tiket ke
    // Firestore (rules menutupnya) -> pesannya dikirim lewat WhatsApp developer.
    const me = auth.currentUser;
    const isGuest = !me || me.isAnonymous;
    const username = usernameInput.value.trim();
    const email = isGuest ? "" : emailInput.value.trim();
    const message = msgInput.value.trim();

    if (isGuest) {
      // Username opsional buat tamu (terisi otomatis dari Profil kalau sudah
      // pernah disimpan); yang wajib cuma isi pesannya.
      if (!message) {
        showCsError("Keluhan/pertanyaan wajib diisi.");
        return;
      }
    } else {
      // Semua kosong ATAU keluhan/pertanyaan kosong -> notice di dalam
      // modal (errEl), SAMA kayak validasi lain di modal ini. Modal TETAP
      // kebuka dulu & isian yang sudah diketik TIDAK dihapus, biar user
      // tinggal lengkapin kurangnya (bukan alert() popup web) — tapi kalau
      // dibiarkan tanpa tindakan, modalnya otomatis nutup sendiri lewat
      // showCsError() di atas.
      if (!username && !email && !message) {
        showCsError("Formulir belum diisi sama sekali. Isi dulu username/email dan keluhan/pertanyaanmu.");
        return;
      }
      if (!message) {
        showCsError("Keluhan/pertanyaan wajib diisi.");
        return;
      }
      if (!username && !email) {
        showCsError("Isi salah satu: username atau email kamu dulu.");
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showCsError("Format email tidak valid.");
        return;
      }
    }
    clearCsErrorTimer();
    errEl.textContent = "";

    // ---- login: kirim ke Kotak Masuk developer ----
    if (!isGuest) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Mengirim…";
      try {
        await addDoc(collection(db, "supportTickets"), {
          uid: me.uid,
          username: username.slice(0, 60),
          email: email.slice(0, 120),
          message: message.slice(0, 500),
          status: "open",
          createdAt: serverTimestamp()
        });
        msgInput.value = "";
        close();
        showToast({
          type: "success", icon: "Check", sound: false, duration: 6000,
          title: "Pesan terkirim ke developer",
          message: "Balasannya akan muncul di Kotak Masuk kamu, kategori Sistem."
        });
      } catch (err) {
        console.error("gagal kirim pesan Kontak CS", err);
        showCsError("Pesan gagal terkirim. Coba lagi sebentar lagi.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim";
      }
      return;
    }

    // ---- tamu: kirim lewat WhatsApp developer ----
    // Kalimat pembuka ini FIXED (selalu sama, bukan ketikan user) — nempel
    // otomatis di depan tiap pesan Kontak CS.
    const CS_INTRO = "Hai, saya ingin berbicara kepada Developer dari website D'Printing secara langsung. Saya akan memperkenalkan diri saya terlebih dahulu.";
    const waLines = [CS_INTRO, ""];
    if (username) waLines.push(`Username : ${username}`);
    if (email) waLines.push(`Email : ${email}`);
    waLines.push(`Pesan : ${message}`);
    const waText = waLines.join("\n");
    window.open(supportWaLink(waText), "_blank", "noopener");
    msgInput.value = "";
    close();
  });
}

async function openContactModal(defaultUsername, defaultEmail) {
  ensureContactModal();
  const modal = document.getElementById("csContactModal");
  const usernameInput = document.getElementById("csUsername");
  const emailInput = document.getElementById("csEmail");
  const errEl = document.getElementById("csErr");
  const emailLabel = document.getElementById("csEmailLabel");
  const introEl = document.getElementById("csIntro");
  const guestNow = !auth.currentUser || auth.currentUser.isAnonymous;
  if (introEl) {
    introEl.textContent = guestNow
      ? "Kamu belum login, jadi pesan dikirim langsung ke WhatsApp developer. Login dulu kalau mau balasan masuk ke Kotak Masuk."
      : "Pesanmu dikirim ke Kotak Masuk developer. Kalau sudah dijawab, balasannya muncul di Kotak Masuk kamu (kategori Sistem).";
  }
  // Tamu: tidak ada kolom Email; username terisi otomatis dari profil tamu
  // kalau data dirinya sudah pernah disimpan.
  if (emailLabel) emailLabel.classList.toggle("hidden", guestNow);
  emailInput.classList.toggle("hidden", guestNow);
  if (guestNow) {
    emailInput.value = "";
    if (!usernameInput.value.trim() && hasGuestInfo()) {
      usernameInput.value = guestUsername(getGuestInfo());
    }
  } else {
    if (defaultUsername) usernameInput.value = defaultUsername;
    if (defaultEmail) emailInput.value = defaultEmail;
  }
  errEl.textContent = "";
  modal.classList.remove("hidden");

  // Ambil ulang dokumen user LANGSUNG dari Firestore begitu modal dibuka
  // (bukan cuma andalkan objek "profile" yang ditangkap sekali pas halaman
  // pertama dimuat). Ini jaga-jaga kalau field "contactEmail"/"username"
  // baru saja berubah (mis. baru daftar) — supaya username & email SELALU
  // otomatis keisi dengan data terbaru, bukan cuma username doang.
  if (guestNow) return;
  const uid = auth.currentUser && auth.currentUser.uid;
  if (!uid) return;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists() || modal.classList.contains("hidden")) return;
    const fresh = snap.data();
    if (!usernameInput.value.trim() && (fresh.username || fresh.displayName)) {
      usernameInput.value = fresh.username || fresh.displayName;
    }
    if (!emailInput.value.trim() && fresh.contactEmail) {
      emailInput.value = fresh.contactEmail;
    }
  } catch (e) {
    // Diam saja kalau gagal — field tetap terisi dari data yang sudah ada.
  }
}

// ===================================================================
// Popup notif "pesanan belum diterima" — dipasang di SINI (bukan di
// printer.js) supaya nongol di halaman MANA PUN selama operator/dev
// login, bukan cuma pas lagi buka Dashboard Printing. Nempel ke
// document.body (kayak modal Kontak CS di atas), jadi otomatis ada
// tiap kali initShell dipanggil (tiap halaman yang pakai shell).
//
// seenPendingIds: id job yang toast-nya udah pernah ditampilin — biar
// snapshot berikutnya (mis. ada job LAIN yang berubah status, tapi job
// pending yang sama masih ada) tidak bikin toast yang sama muncul lagi.
// lastPendingDocs: cache snapshot pending terakhir.
//
// PENTING soal "Ingatkan aku nanti": app ini MPA (tiap link = reload
// penuh), jadi variable JS di atas ke-reset tiap kali pindah halaman —
// setTimeout doang nggak bakal pernah sempat kepanggil (mati bareng
// halaman lama). Makanya progress snooze-nya DISIMPAN DI localStorage
// (bertahan lintas reload) dan dihitung berdasarkan JUMLAH PINDAH
// HALAMAN sungguhan (tiap initShell jalan di halaman baru = +1),
// bukan berdasarkan waktu. Begitu nyampe SNOOZE_NAV_THRESHOLD kali
// pindah halaman, job yang di-snooze itu "dilupakan" dari daftar
// seen supaya toast-nya muncul lagi kalau masih pending.
// ===================================================================
const SNOOZE_NAV_THRESHOLD = 5; // diingatkan lagi setelah 5x pindah halaman
let seenPendingIds = new Set();
let lastPendingDocs = [];
let pendingNotifierStarted = false;
let notifierUid = null;

function seenStorageKey(uid) { return `dcnp_seenPending_${uid}`; }
function snoozeStorageKey(uid) { return `dcnp_snoozePending_${uid}`; }

function loadSeenIds(uid) {
  try {
    const raw = localStorage.getItem(seenStorageKey(uid));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}
function saveSeenIds(uid, set) {
  try { localStorage.setItem(seenStorageKey(uid), JSON.stringify([...set])); } catch (e) {}
}
// snooze record: { jobIds: string[], navCount: number }
function loadSnooze(uid) {
  try {
    const raw = localStorage.getItem(snoozeStorageKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function saveSnooze(uid, data) {
  try {
    if (!data || !data.jobIds || data.jobIds.length === 0) {
      localStorage.removeItem(snoozeStorageKey(uid));
    } else {
      localStorage.setItem(snoozeStorageKey(uid), JSON.stringify(data));
    }
  } catch (e) {}
}
// Kode tiket pendek buat ditampilin di toast — biar keliatan "advanced"
// tanpa nampilin id Firestore yang panjang & bikin toast berantakan.
function shortJobCode(id) {
  return (id || "").slice(-6).toUpperCase();
}

function ensurePendingToastWrap() {
  let wrap = document.getElementById("pendingToastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "pendingToastWrap";
    wrap.className = "pending-toast-wrap";
    document.body.appendChild(wrap);
  }
  return wrap;
}

function showPendingToast(newDocs) {
  if (newDocs.length === 0) return;
  const wrap = ensurePendingToastWrap();
  const toast = document.createElement("div");
  toast.className = "pending-toast";
  const ids = newDocs.map((d) => d.id);
  const title = newDocs.length === 1 ? "Ada pesanan belum diterima!" : `${newDocs.length} pesanan belum diterima!`;

  // Ringkas: cuma tampilin 2 file + ID pendeknya inline dalam satu baris
  // teks (bukan kartu terpisah per file) supaya toast tetap kecil & tidak
  // makan tempat, sesuai versi awal — ID-nya tetap ada, cuma dikemas
  // sebagai chip mono kecil nempel di sebelah nama file.
  const VISIBLE = 2;
  const fileChips = newDocs.slice(0, VISIBLE).map((d) => {
    const fileName = (d.data() && d.data().fileName) || "File tanpa nama";
    return `<span class="pending-toast-filechip">${escapeHtml(fileName)}</span><span class="pending-toast-id">#${shortJobCode(d.id)}</span>`;
  }).join(", ");
  const extraCount = newDocs.length - VISIBLE;
  const extraText = extraCount > 0 ? ` +${extraCount} lainnya` : "";

  toast.innerHTML = `
    ${iconChip("Bell")}
    <div class="pending-toast-body">
      <p class="pending-toast-title">${title}</p>
      <p class="pending-toast-text">${fileChips}${escapeHtml(extraText)} — buruan Terima/Tolak sebelum keburu lama.</p>
      <div class="pending-toast-actions">
        <button type="button" class="btn btn-primary" data-toast-view>Lihat pesanan</button>
        <button type="button" class="btn btn-outline" data-toast-snooze>Ingatkan aku nanti</button>
      </div>
    </div>
    <button type="button" class="pending-toast-close" aria-label="Tutup" data-toast-close>&times;</button>
  `;
  wrap.appendChild(toast);
  playSfx("Pending");

  const remove = () => {
    if (!toast.isConnected) return;
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 180);
  };
  toast.querySelector("[data-toast-close]").addEventListener("click", remove);
  toast.querySelector("[data-toast-view]").addEventListener("click", () => {
    // Kalau lagi di printer.html, scroll ke section-nya langsung. Kalau
    // lagi di halaman lain, arahin dulu ke Dashboard Printing.
    const pendingList = document.getElementById("pendingList");
    if (pendingList) {
      pendingList.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.location.href = "printer.html";
    }
    remove();
  });
  toast.querySelector("[data-toast-snooze]").addEventListener("click", () => {
    // "Ingatkan aku nanti" BENERAN nunggu, bukan gimmick: progress-nya
    // disimpan di localStorage (navCount mulai dari 0) dan baru dicek
    // lagi setelah operator pindah halaman SNOOZE_NAV_THRESHOLD (5) kali
    // — dihitung tiap initShell jalan di halaman baru, lihat
    // initPendingNotifier(). Timer/setTimeout TIDAK dipakai karena mati
    // begitu halaman di-reload.
    if (notifierUid) {
      saveSnooze(notifierUid, { jobIds: ids, navCount: 0 });
    }
    remove();
  });
  // Toast otomatis nutup abis 9 detik supaya nggak numpuk di layar, TAPI
  // ini cuma nyembunyiin tampilannya doang — id-nya tetap tercatat di
  // seenPendingIds/localStorage, jadi TIDAK dianggap "snooze". Kalau job
  // masih pending pas balik lagi ke halaman ini nanti, toast tidak akan
  // muncul ulang sendiri sampai ada job baru atau snooze-nya kena giliran.
  setTimeout(remove, 9000);
}

// Bandingin daftar id pending sekarang vs yang sudah pernah "seen" — yang
// belum pernah dilihat dikasih tau lewat popup, lalu ditandai seen supaya
// tidak diulang lagi di snapshot berikutnya. seenPendingIds disimpan ke
// localStorage tiap berubah supaya bertahan lintas reload halaman (lihat
// catatan besar di atas initPendingNotifier soal kenapa ini MPA-safe).
// Dipakai KHUSUS buat snapshot PERTAMA tiap halaman dimuat — snapshot
// berikutnya (masih di halaman yang sama) pakai docChanges() langsung
// di initPendingNotifier, bukan fungsi ini (lihat catatan di sana).
function checkNewPending(pendingDocs) {
  lastPendingDocs = pendingDocs;
  const currentIds = new Set(pendingDocs.map((d) => d.id));
  reconcileSnooze(currentIds);
  const newOnes = pendingDocs.filter((d) => !seenPendingIds.has(d.id));
  seenPendingIds = currentIds;
  if (notifierUid) saveSeenIds(notifierUid, seenPendingIds);
  if (newOnes.length > 0) showPendingToast(newOnes);
}

// Job yang sebelumnya di-snooze tapi sudah tidak pending lagi (sudah
// diterima/ditolak/dibatalkan) — bersihkan dari antrian snooze supaya
// tidak nyangkut selamanya nunggu giliran diingatkan lagi.
function reconcileSnooze(currentIds) {
  if (!notifierUid) return;
  const snooze = loadSnooze(notifierUid);
  if (snooze && snooze.jobIds && snooze.jobIds.length > 0) {
    const stillPending = snooze.jobIds.filter((id) => currentIds.has(id));
    if (stillPending.length !== snooze.jobIds.length) {
      saveSnooze(notifierUid, { jobIds: stillPending, navCount: snooze.navCount });
    }
  }
}

// Cuma dipasang buat role "printer"/"developer" (satu-satunya role yang
// bisa punya job dengan printerId == dirinya sendiri — lihat printer.js
// & firestore.rules). pendingNotifierStarted jaga-jaga biar listener-nya
// nggak numpuk kalau initShell kepanggil lebih dari sekali di halaman
// yang sama.
function initPendingNotifier(user, profile) {
  if (pendingNotifierStarted) return;
  if (!user || !profile) return;
  if (profile.role !== "printer" && profile.role !== "developer") return;
  pendingNotifierStarted = true;
  notifierUid = user.uid;

  // Muat status "seen" yang sudah tersimpan dari halaman sebelumnya —
  // supaya job yang sudah pernah ditampilin toast-nya TIDAK muncul lagi
  // cuma gara-gara operator pindah halaman (tiap navigasi = reload
  // penuh, jadi tanpa ini semua job pending bakal keanggap "baru" lagi
  // tiap kali buka halaman lain).
  seenPendingIds = loadSeenIds(user.uid);

  // Hitung progress "Ingatkan aku nanti": TIAP KALI HALAMAN INI DIMUAT
  // dianggap 1x "pindah halaman". Kalau ada snooze aktif, tambah 1 —
  // begitu nyampe SNOOZE_NAV_THRESHOLD, job yang di-snooze dilupakan
  // dari seenPendingIds supaya checkNewPending() nganggep mereka "baru"
  // lagi & toast-nya nongol ulang (kalau masih pending).
  const snooze = loadSnooze(user.uid);
  if (snooze && snooze.jobIds && snooze.jobIds.length > 0) {
    const navCount = (snooze.navCount || 0) + 1;
    if (navCount >= SNOOZE_NAV_THRESHOLD) {
      snooze.jobIds.forEach((id) => seenPendingIds.delete(id));
      saveSeenIds(user.uid, seenPendingIds);
      saveSnooze(user.uid, null);
    } else {
      saveSnooze(user.uid, { jobIds: snooze.jobIds, navCount });
    }
  }

  const q = query(
    collection(db, "printJobs"),
    where("printerId", "==", user.uid),
    where("status", "==", "pending")
  );

  // Popup cuma buat order yang wilayahnya sama dengan wilayah operator ini
  // (order lama tanpa regionKey tetap dianggap cocok). Order beda wilayah
  // dilepas balik ke antrean oleh printer.js, jadi tidak perlu dinotif.
  const myRegionKey = regionKeyFrom(profile.location);
  const inMyRegion = (d) => {
    const k = d.data().regionKey;
    return !k || k === myRegionKey;
  };

  // FIX: sebelumnya toast baru cuma nongol di snapshot PERTAMA tiap
  // halaman dimuat (dibandingin manual ke seenPendingIds) — begitu ada
  // job KEDUA/KETIGA yang jadi pending SEMENTARA operator masih di
  // halaman yang sama (tanpa reload), itu ketutup & nggak kedeteksi.
  // Sekarang snapshot SESUDAH yang pertama pakai snap.docChanges() —
  // ini sumber kebenaran resmi dari Firestore soal dokumen mana yang
  // BENERAN baru nambah ke hasil query dibanding update sebelumnya,
  // jadi file customer lain yang baru pending PASTI kedeteksi sendiri²,
  // nggak peduli ada file lain yang sudah pernah ditampilin duluan.
  let isFirstSnapshot = true;
  onSnapshot(q, (snap) => {
    const regionDocs = snap.docs.filter(inMyRegion);
    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      checkNewPending(regionDocs);
      return;
    }
    lastPendingDocs = regionDocs;
    const currentIds = new Set(regionDocs.map((d) => d.id));
    reconcileSnooze(currentIds);

    const addedDocs = snap.docChanges().filter((c) => c.type === "added").map((c) => c.doc).filter(inMyRegion);
    const removedIds = snap.docChanges().filter((c) => c.type === "removed").map((c) => c.doc.id);
    addedDocs.forEach((d) => seenPendingIds.add(d.id));
    removedIds.forEach((id) => seenPendingIds.delete(id));
    if (notifierUid) saveSeenIds(notifierUid, seenPendingIds);

    if (addedDocs.length > 0) showPendingToast(addedDocs);
  }, (err) => {
    console.error("gagal mantau pesanan masuk buat notif", err);
  });
}

// user: Firebase Auth user object atau null (guest)
// profile: dokumen Firestore /users/{uid} (role, displayName, username, ...) atau null kalau guest
// active: id halaman yang lagi aktif, buat highlight link sidebar
// homeLabel: override teks nav "upload" (default "Printer" buat semua
// orang) — dipakai kalau ada yang mau override manual.
export function initShell({ user, profile, active, homeLabel }) {
  const sidebar = document.getElementById("sidebar");
  const topbarMini = document.getElementById("topbarMini");
  if (!sidebar || !topbarMini) return;

  renderTopbar(topbarMini);
  const csBtn = document.getElementById("ctcCsBtn");
  if (csBtn) {
    csBtn.addEventListener("click", () => openContactModal(
      profile && (profile.username || profile.displayName),
      profile && profile.contactEmail
    ));
  }

  // ---- guest: belum login sama sekali ----
  // Sekarang SEMUA nav item ditunjukkin ke guest juga (bukan disembunyikan
  // lagi) — biar dia bisa lihat-lihat ada fitur apa aja duluan. Yang beda
  // cuma Home & Upload beneran bisa dibuka (halaman itu sendiri yang punya
  // alur guest-preview, lihat home.js/upload.js), sedangkan Komunitas &
  // Pesan dikasih badge gembok kecil (ikon, bukan emoji — lihat
  // Resources/Icons/Lock.png) buat nandain "baru bisa dipakai penuh
  // setelah login". Link-nya TETAP diarahkan ke halaman aslinya (bukan
  // langsung ke login.html) — begitu dibuka, requireAuth() di halaman itu
  // sendiri yang otomatis lempar ke form Daftar (lihat app.js#requireAuth).
  // Label nav ini sekarang "Printer" buat SEMUA orang, login maupun guest
  // (dulu guest melihat "Counter"). Lihat juga effectiveHomeLabel di bawah.
  if (!user) {
    const lockBadge = `<span class="locked-badge" title="Login untuk fitur lengkap">${iconImg("Lock", "Terkunci", "icon-img icon-sm")}</span>`;
    sidebar.innerHTML = `
      <a class="brand" href="home.html"><img class="brand-logo" src="../Resources/Images/Web-Logo.png" alt="" width="28" height="28"> D'PRINTING</a>
      <a class="side-link ${active === "home" ? "active" : ""}" href="home.html">
        <span class="side-icon">${iconImg("Home", "Home")}</span> Home
      </a>
      <a class="side-link ${active === "upload" ? "active" : ""}" href="upload.html">
        <span class="side-icon">${iconImg("Upload", "Printer")}</span> Printer
      </a>
      <a class="side-link ${active === "community" ? "active" : ""}" href="community.html">
        <span class="side-icon">${iconImg("Community", "Komunitas")}</span> Komunitas ${lockBadge}
      </a>
      <a class="side-link ${active === "messages" ? "active" : ""}" href="messages.html">
        <span class="side-icon">${iconImg("Message", "Pesan")}</span> Pesan ${lockBadge}
      </a>
      <div class="side-spacer"></div>
      ${guestAccountPanelHtml(active)}
    `;
    // Komunitas & Pesan (badge gembok) sekarang BISA dibuka tamu sebagai
    // PREVIEW (daftar channel / tampilan obrolan). Yang butuh akun adalah
    // isinya — begitu tamu membuka/mengaksesnya, halaman itu sendiri yang
    // memunculkan popup notifikasi + tombol Masuk / Daftar (tidak dipaksa
    // ke halaman login).
    initAccountMenu(null);
    initMobileDrawer(sidebar);
    // Tamu juga punya lonceng notifikasi + Kotak Masuk (riwayat di browser ini),
    // sama seperti user login.
    initGuestNotifications({ topbarMini });
    refreshNotifBadges();
    return;
  }

  // ---- sudah login ----
  initPendingNotifier(user, profile);
  initNotifications({ user, profile, topbarMini });

  // Label nav "upload" sekarang "Printer" (guest juga, lihat blok guest di
  // atas) — berlaku buat SEMUA role
  // (customer, printer, developer), DI SEMUA HALAMAN, bukan cuma pas lagi
  // buka printer.html. URL link-nya TETAP ke upload.html, cuma labelnya
  // yang beda. Param homeLabel tetap dihormati kalau ada yang mau override
  // manual.
  const effectiveHomeLabel = homeLabel || "Printer";
  const navHtml = NAV_ITEMS.map((it) => {
    const label = (it.id === "upload" && effectiveHomeLabel) ? effectiveHomeLabel : it.label;
    return `
    <a class="side-link ${active === it.id ? "active" : ""}" href="${it.href}">
      <span class="side-icon">${iconImg(it.icon, label)}</span> ${label}${it.badge ? ' <span class="badge side-mail-badge hidden" aria-label="belum dibaca">0</span>' : ""}
    </a>
  `;
  }).join("");

  // Catatan: link "Dashboard Printing" SENGAJA tidak ada lagi di sidebar.
  // Operator print sekarang masuk ke printer.html lewat tombol khusus di
  // halaman Upload (lihat upload.html/upload.js). Supaya sidebar tidak
  // kelihatan "kosong" tanpa highlight pas lagi di printer.html, halaman
  // itu memanggil initShell({ active: "upload" }) — jadi nav
  // "Printer" tetap ke-highlight walau URL-nya sebenarnya
  // /printer.html.
  // Role "developer": tidak ada lagi link Panel Admin di sidebar — akses
  // Kelola User sekarang lewat bubble menu (lihat initBubbleMenu).

  sidebar.innerHTML = `
    <a class="brand" href="home.html"><img class="brand-logo" src="../Resources/Images/Web-Logo.png" alt="" width="28" height="28"> D'PRINTING</a>
    ${navHtml}
    <div class="side-spacer"></div>
    <div class="sidebar-user-wrap" id="accountMenuWrap">
      ${accountMenuHtml(active, profile)}
      <div class="sidebar-user-row ${active === "profile" ? "active" : ""}">
        <a class="sidebar-user-panel" href="profile.html">
          ${avatarHtml(profile, "sm")}
          <div class="sidebar-user-panel-info">
            <div class="sidebar-user-panel-name">${escapeHtml((profile && (profile.displayName || profile.username)) || "user")}</div>
            <div class="sidebar-user-panel-role">${escapeHtml((profile && profile.role) || "customer")}</div>
          </div>
        </a>
        <button type="button" class="sidebar-user-more" id="accountMenuBtn" aria-label="Menu akun" aria-haspopup="true" aria-expanded="false">
          ${iconImg("More", "", "icon-img")}
          <span class="badge side-more-dot hidden" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;

  initAccountMenu(profile);
  refreshNotifBadges(); // isi angka belum dibaca di menu Kotak Masuk
  initBubbleMenu(profile);
  initMobileDrawer(sidebar);
}

// ===================================================================
// Menu akun (titik-tiga di panel profil, bawah sidebar) — muncul KE ATAS
// ala menu akun di Claude. Isinya: Settings, Kotak Masuk (dengan angka
// belum dibaca), Switch account, Log out.
//  - Settings    -> modal pengaturan notifikasi: Suara & Notifikasi browser
//                   (dulu ada di kaki panel lonceng; nama, foto, lokasi, &
//                   nomor WhatsApp tetap diatur di halaman Profil).
//  - Kotak Masuk -> inbox.html (dulu ada di daftar menu sidebar).
//  - Switch account -> keluar lalu ke form Masuk (Firebase Auth Web cuma
//                   menyimpan SATU sesi per browser, sama seperti tombol
//                   "Switch akun" lama di Profil).
//  - Log out     -> keluar lalu ke form Daftar (sama seperti tombol
//                   "Keluar" di Profil).
// ===================================================================
// Email yang dipakai akun ini (buat header menu). Email palsu lama
// "...@dprinting.local" tidak ditampilkan — akun lama tanpa email asli
// jatuh ke "@username".
function accountEmailLabel(profile) {
  const real = (e) => (e && !/@dprinting\.local$/i.test(e) ? e : "");
  return real(profile && profile.contactEmail)
    || real(profile && profile.email)
    || real(auth.currentUser && auth.currentUser.email)
    || "";
}

// Panel profil versi TAMU di bawah sidebar — tampilan & menu titik-tiganya
// SAMA kayak user yang sudah login (header, General, Account), bedanya:
//  - avatar selalu default (tamu tidak bisa pasang foto profil), role "tamu",
//  - header "Masuk sebagai <email>" diganti "Kamu belum terdaftar" + satu baris singkat (font sama),
//  - kategori Account tetap ada, isinya cuma satu item "Masuk / Daftar"
//    (tidak ada Switch account / Log out),
//  - Kotak Masuk TIDAK terkunci: link biasa ke inbox.html (riwayat tamu disimpan di browser).
function guestAccountPanelHtml(active) {
  let name = "";
  try { name = (getGuestInfo().name || "").trim(); } catch (e) { /* abaikan */ }
  return `
    <div class="sidebar-user-wrap" id="accountMenuWrap">
      <div class="account-menu hidden" id="accountMenu" role="menu">
        <div class="account-menu-head" role="presentation">
          <span class="account-menu-head-label">Kamu belum terdaftar</span>
          <span class="account-menu-head-email">Masuk untuk fitur lengkap</span>
        </div>
        <div class="account-menu-sep" role="separator"></div>
        <div class="account-menu-label" role="presentation">General</div>
        <button type="button" class="account-menu-item" role="menuitem" data-account="settings">
          <span class="side-icon">${iconImg("Settings-Dark", "Settings")}</span> Settings
        </button>
        <a class="account-menu-item ${active === "inbox" ? "active" : ""}" role="menuitem" href="inbox.html">
          <span class="side-icon">${iconImg("Inbox", INBOX_LABEL)}</span> ${INBOX_LABEL}
          <span class="badge side-mail-badge hidden" aria-label="belum dibaca">0</span>
        </a>
        <button type="button" class="account-menu-item" role="menuitem" data-account="recovery">
          <span class="side-icon">${iconImg("Recovery", "Recovery")}</span> Recovery
        </button>
        <div class="account-menu-sep" role="separator"></div>
        <div class="account-menu-label" role="presentation">Account</div>
        <a class="account-menu-item" role="menuitem" href="login.html">
          <span class="side-icon">${iconImg("Login", "Masuk / Daftar")}</span> Masuk / Daftar
        </a>
      </div>
      <div class="sidebar-user-row ${active === "profile" ? "active" : ""}">
        <a class="sidebar-user-panel" href="profile.html">
          ${avatarHtml(null, "sm")}
          <div class="sidebar-user-panel-info">
            <div class="sidebar-user-panel-name">${escapeHtml(name || "Customer")}</div>
            <div class="sidebar-user-panel-role">unassigned</div>
          </div>
        </a>
        <button type="button" class="sidebar-user-more" id="accountMenuBtn" aria-label="Menu akun" aria-haspopup="true" aria-expanded="false">
          ${iconImg("More", "", "icon-img")}
          <span class="badge side-more-dot hidden" aria-hidden="true"></span>
        </button>
      </div>
    </div>`;
}

function accountMenuHtml(active, profile) {
  const email = accountEmailLabel(profile);
  const fallbackName = (profile && (profile.username || usernameLabel(profile.email || ""))) || "";
  const headText = email || (fallbackName ? "@" + fallbackName : "");
  return `
    <div class="account-menu hidden" id="accountMenu" role="menu">
      ${headText ? `
      <div class="account-menu-head" role="presentation">
        <span class="account-menu-head-label">Masuk sebagai</span>
        <span class="account-menu-head-email" title="${escapeHtml(headText)}">${escapeHtml(headText)}</span>
      </div>
      <div class="account-menu-sep" role="separator"></div>` : ""}
      <div class="account-menu-label" role="presentation">General</div>
      <button type="button" class="account-menu-item" role="menuitem" data-account="settings">
        <span class="side-icon">${iconImg("Settings-Dark", "Settings")}</span> Settings
      </button>
      <a class="account-menu-item ${active === "inbox" ? "active" : ""}" role="menuitem" href="inbox.html">
        <span class="side-icon">${iconImg("Inbox", INBOX_LABEL)}</span> ${INBOX_LABEL}
        <span class="badge side-mail-badge hidden" aria-label="belum dibaca">0</span>
      </a>
      <button type="button" class="account-menu-item" role="menuitem" data-account="recovery">
        <span class="side-icon">${iconImg("Recovery", "Recovery")}</span> Recovery
      </button>
      <div class="account-menu-sep" role="separator"></div>
      <div class="account-menu-label" role="presentation">Account</div>
      <button type="button" class="account-menu-item" role="menuitem" data-account="switch">
        <span class="side-icon">${iconImg("Switch", "Switch account")}</span> Switch account
      </button>
      <button type="button" class="account-menu-item is-danger" role="menuitem" data-account="logout">
        <span class="side-icon">${iconImg("Logout", "Log out")}</span> Log out
      </button>
    </div>
  `;
}

function initAccountMenu(profile) {
  const wrap = document.getElementById("accountMenuWrap");
  const btn = document.getElementById("accountMenuBtn");
  const menu = document.getElementById("accountMenu");
  if (!wrap || !btn || !menu) return;

  // Ikon menu dipakai sebagai mask CSS, dan browser baru mengunduhnya
  // begitu menu pertama kali tampil — akibatnya ikon bisa kosong sesaat.
  // Diunduh duluan di sini supaya sudah siap saat menu dibuka.
  ["Settings-Dark", "Inbox", "Recovery", "Switch", "Logout"].forEach((n) => {
    const img = new Image();
    img.src = `../Resources/Icons/${n}.png`;
  });

  const setOpen = (open) => {
    menu.classList.toggle("hidden", !open);
    btn.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menu.classList.contains("hidden"));
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  menu.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-account]");
    if (!b || b.disabled) return;
    if (b.dataset.account === "settings") {
      setOpen(false);
      openSettingsModal();
      return;
    }
    if (b.dataset.account === "recovery") {
      setOpen(false);
      openRecoveryModal();
      return;
    }
    if (b.dataset.account === "switch") {
      // Tanpa logout: cuma buka modal pilih akun. Sesi sekarang baru
      // diganti kalau login ke akun tujuannya BERHASIL.
      setOpen(false);
      openSwitchAccountModal(profile);
      return;
    }
    b.disabled = true;
    if (b.dataset.account === "logout") await logout("login.html?mode=signup");
  });
}

// ---------------------------------------------------------------------
// Modal Switch account — TANPA logout paksa. Firebase Auth Web cuma
// menyimpan satu sesi per browser, jadi kita tidak bisa menyimpan banyak
// sesi sekaligus (dan password/token memang tidak boleh disimpan di
// browser). Solusinya: user pilih akun tujuan (dari daftar akun yang
// pernah dipakai di browser ini, atau "Tambah akun"), isi password akun
// itu, lalu kita langsung signInWithEmailAndPassword ke akun tujuan.
//  - Berhasil -> sesi otomatis pindah ke akun baru, halaman dimuat ulang.
//  - Gagal (password salah dll) -> sesi akun sekarang TETAP aman, tidak
//    ada yang keluar.
// ---------------------------------------------------------------------
function switchErrText(code) {
  const map = {
    "auth/user-not-found": "Username belum terdaftar.",
    "auth/wrong-password": "Password salah.",
    "auth/invalid-credential": "Username atau password salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan, coba lagi sebentar."
  };
  return map[code] || "Gagal pindah akun, coba lagi.";
}

let switchModalProfile = null;

function ensureSwitchModal() {
  let modal = document.getElementById("switchAccountModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "switchAccountModal";
  modal.className = "modal-backdrop hidden";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px;" role="dialog" aria-modal="true" aria-labelledby="switchTitle">
      <h3 id="switchTitle">Switch account</h3>
      <p class="sub" style="margin-bottom:10px;">Pilih akun tujuan. Kamu tidak akan logout dulu — akun sekarang tetap aktif sampai login akun baru berhasil.</p>
      <div id="switchList" class="switch-list"></div>
      <div class="error-msg" id="switchErr"></div>
      <div class="modal-actions" style="margin-top:14px;">
        <button type="button" class="btn btn-outline" id="switchCloseBtn">Tutup</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.classList.add("hidden");
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector("#switchCloseBtn").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });

  const list = modal.querySelector("#switchList");
  const errEl = modal.querySelector("#switchErr");

  list.addEventListener("click", (e) => {
    const forget = e.target.closest("[data-switch-forget]");
    if (forget) {
      forgetAccount(forget.dataset.switchForget);
      renderSwitchList(modal);
      return;
    }
    const pick = e.target.closest("[data-switch-pick]");
    if (pick) {
      errEl.textContent = "";
      // buka form password di bawah baris yang diklik, tutup yang lain
      list.querySelectorAll(".switch-form").forEach((f) => f.classList.add("hidden"));
      const form = list.querySelector(`.switch-form[data-for="${pick.dataset.switchPick}"]`);
      if (form) {
        form.classList.remove("hidden");
        const inp = form.querySelector("input[name=username]") || form.querySelector("input[type=password]");
        if (inp) inp.focus();
        // daftar bisa discroll -> pastikan form yang baru dibuka kelihatan
        form.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  });

  list.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target.closest("form");
    if (!form) return;
    const btn = form.querySelector("button[type=submit]");
    const usernameEl = form.querySelector("input[name=username]");
    const username = normalizeUsername(usernameEl ? usernameEl.value : form.dataset.for);
    const password = form.querySelector("input[type=password]").value;
    errEl.textContent = "";
    if (!username || !password) {
      errEl.textContent = "Isi username dan password dulu.";
      return;
    }
    if (!isValidUsername(username)) {
      errEl.textContent = "Username 3-20 karakter: huruf kecil, angka, titik, atau underscore saja.";
      return;
    }
    btn.disabled = true;
    try {
      const indexedEmail = await findLoginEmailByUsername(username);
      // Login ke akun tujuan LANGSUNG (tanpa signOut). Kalau ini gagal,
      // sesi akun sekarang tidak tersentuh.
      const cred = await signInWithEmailAndPassword(auth, indexedEmail || usernameToEmail(username), password);
      await ensureUserDoc(cred.user, null, username);
      if (!indexedEmail) {
        claimUsernameIndex(cred.user.uid, username, cred.user.email).catch(() => {});
      }
      let meta = null;
      try {
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        if (snap.exists()) meta = snap.data();
      } catch (_) {}
      rememberAccount(username, meta);
      window.location.reload();
    } catch (err) {
      errEl.textContent = switchErrText(err && err.code);
      btn.disabled = false;
    }
  });

  return modal;
}

function renderSwitchList(modal) {
  const list = modal.querySelector("#switchList");
  const p = switchModalProfile || {};
  const meUsername = normalizeUsername(p.username || usernameLabel(p.email || ""));
  const metaAll = getKnownAccountsMeta();
  const others = getKnownAccounts().filter((u) => normalizeUsername(u) !== meUsername);

  const currentRow = `
    <div class="switch-row is-current">
      ${avatarHtml(p, "sm")}
      <div class="switch-row-info">
        <div class="switch-row-name">${escapeHtml(p.displayName || p.username || meUsername || "Akun kamu")}</div>
        <div class="switch-row-sub">@${escapeHtml(meUsername)}</div>
      </div>
      <span class="switch-current-tag">Aktif</span>
    </div>`;

  const otherRows = others.map((u) => {
    const m = metaAll[u] || {};
    const uAttr = escapeHtml(u);
    return `
    <div class="switch-item">
      <div class="switch-row">
        <button type="button" class="switch-row-btn" data-switch-pick="${uAttr}">
          ${avatarHtml(m, "sm")}
          <span class="switch-row-info">
            <span class="switch-row-name">${escapeHtml(m.displayName || u)}</span>
            <span class="switch-row-sub">@${uAttr}</span>
          </span>
        </button>
        <button type="button" class="switch-forget" data-switch-forget="${uAttr}" aria-label="Hapus dari daftar" title="Hapus dari daftar">×</button>
      </div>
      <form class="switch-form hidden" data-for="${uAttr}" autocomplete="off">
        <input type="password" placeholder="Password @${uAttr}" autocomplete="current-password">
        <button type="submit" class="btn btn-primary">Pindah</button>
      </form>
    </div>`;
  }).join("");

  const addRow = `
    <div class="switch-item">
      <div class="switch-row">
        <button type="button" class="switch-row-btn" data-switch-pick="__new__">
          <span class="switch-add-icon">+</span>
          <span class="switch-row-info"><span class="switch-row-name">Masuk dengan akun lain</span></span>
        </button>
      </div>
      <form class="switch-form hidden" data-for="__new__" autocomplete="off">
        <input type="text" name="username" placeholder="Username" autocomplete="username" autocapitalize="none" spellcheck="false">
        <input type="password" placeholder="Password" autocomplete="current-password">
        <button type="submit" class="btn btn-primary">Masuk</button>
      </form>
    </div>`;

  list.innerHTML = currentRow + otherRows + addRow;
}

function openSwitchAccountModal(profile) {
  switchModalProfile = profile || switchModalProfile;
  const modal = ensureSwitchModal();
  // pastikan akun yang lagi aktif ikut tercatat di daftar
  if (switchModalProfile && switchModalProfile.username) {
    rememberAccount(switchModalProfile.username, switchModalProfile);
  }
  modal.querySelector("#switchErr").textContent = "";
  renderSwitchList(modal);
  modal.classList.remove("hidden");
}
export { openSwitchAccountModal };

// ---------------------------------------------------------------------
// Modal Settings: dibikin sekali (ditempel ke <body>), dibuka dari menu
// titik-tiga. Isinya dua saklar yang dulu ada di kaki panel lonceng:
// Suara & Notifikasi browser. Nilainya dibaca ulang tiap modal dibuka
// (getNotifPrefs) supaya selalu sesuai kondisi terbaru.
// ---------------------------------------------------------------------
function ensureSettingsModal() {
  let modal = document.getElementById("settingsModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "settingsModal";
  modal.className = "modal-backdrop hidden";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px;" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
      <h3 id="settingsTitle">Settings</h3>
      <p class="sub" style="margin-bottom:6px;">Atur notifikasi di perangkat ini.</p>
      <label class="settings-row" for="setSound">
        <span class="settings-row-text">
          <span class="settings-row-title">Suara</span>
          <span class="settings-row-desc">Bunyi pendek saat ada notifikasi atau toast baru.</span>
        </span>
        <input type="checkbox" id="setSound" class="settings-switch">
      </label>
      <label class="settings-row" for="setBrowser">
        <span class="settings-row-text">
          <span class="settings-row-title">Notifikasi browser</span>
          <span class="settings-row-desc" id="setBrowserDesc">Popup di perangkatmu saat tab sedang di background.</span>
        </span>
        <input type="checkbox" id="setBrowser" class="settings-switch">
      </label>
      <div class="modal-actions" style="margin-top:16px;">
        <button type="button" class="btn btn-primary" id="settingsCloseBtn">Selesai</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.classList.add("hidden");
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector("#settingsCloseBtn").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });

  modal.querySelector("#setSound").addEventListener("change", (e) => {
    setSoundPref(e.target.checked);
  });
  modal.querySelector("#setBrowser").addEventListener("change", async (e) => {
    const box = e.target;
    box.disabled = true;
    try {
      box.checked = await setBrowserPref(box.checked);
    } finally {
      box.disabled = !getNotifPrefs().browserSupported;
    }
  });
  return modal;
}

function openSettingsModal() {
  const modal = ensureSettingsModal();
  const p = getNotifPrefs();
  const sound = modal.querySelector("#setSound");
  const browser = modal.querySelector("#setBrowser");
  const desc = modal.querySelector("#setBrowserDesc");
  sound.checked = p.sound;
  browser.checked = p.browser;
  browser.disabled = !p.browserSupported;
  desc.textContent = p.browserSupported
    ? "Popup di perangkatmu saat tab sedang di background."
    : "Browser ini tidak mendukung notifikasi.";
  modal.classList.remove("hidden");
}


// ---------------------------------------------------------------------
// Modal RECOVERY — menu titik-tiga > General > Recovery. Isinya BEDA untuk
// tamu dan akun login:
//  - TAMU: hanya melihat & menyalin KODE PEMULIHAN (dibuat/disinkronkan
//    otomatis tiap tamu mengubah data, kirim file, dan tiap modal dibuka).
//    Tamu TIDAK bisa memulihkan data tamu lain (tidak ada kolom kode).
//  - AKUN LOGIN: memasukkan kode tamu -> "Cek kode" membaca cadangan tanpa
//    mengubah apa pun, lalu hanya menampilkan yang berguna (isian akun kosong
//    -> Tambah, beda -> Timpa; yang sudah sama tidak muncul). Pilihan dipindah
//    ke akun lewat "Terapkan pilihan" atau "Timpa semuanya".
// Modul guest-sync.js dimuat malas (dynamic import) supaya halaman lain
// tidak ikut terbebani.
// ---------------------------------------------------------------------
function ensureRecoveryModal() {
  let modal = document.getElementById("recoveryModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "recoveryModal";
  modal.className = "modal-backdrop hidden";
  modal.innerHTML = `
    <div class="modal-box recovery-box" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle">
      <h3 id="recoveryTitle">Recovery</h3>
      <p class="sub" id="recoverySub" style="margin:0 0 14px;"></p>

      <div id="recoveryGuestSec" class="hidden">
        <div class="recovery-sec-title">Kode pemulihanmu</div>
        <div id="recoveryCodeArea"></div>
      </div>

      <div id="recoveryAccountSec" class="hidden">
        <div class="recovery-sec-title">Kode dari akun tamu</div>
        <div class="recovery-input-row">
          <input type="text" id="recoveryInput" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false">
          <button type="button" class="btn btn-outline" id="recoveryCheckBtn">Cek kode</button>
        </div>
        <div class="error-msg" id="recoveryErr"></div>
        <div id="recoveryResult" class="hidden"></div>
      </div>

      <div class="modal-actions" style="margin-top:14px;" id="recoveryCloseRow">
        <button type="button" class="btn btn-outline" id="recoveryCloseBtn">Tutup</button>
      </div>

      <!-- Hanya tampil di mode WAJIB (popup setelah login, lihat openForcedRecovery). -->
      <div class="recovery-page-skip hidden" id="recoverySkipRow">
        <p class="recovery-note" style="margin:0 0 6px !important;">Data tamumu <b>tidak hilang</b> sebelum kamu memindahkannya.</p>
        <button type="button" id="recoverySkipBtn">Lewati dulu (kamu akan diminta lagi saat login berikutnya)</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // Mode WAJIB: tidak bisa ditutup lewat klik latar / Escape / tombol Tutup.
  const close = () => { if (modal.dataset.forced === "1") return; modal.classList.add("hidden"); };
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector("#recoveryCloseBtn").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });
  return modal;
}

async function openRecoveryModal() {
  const modal = ensureRecoveryModal();
  modal.dataset.forced = "";
  modal.querySelector("#recoveryCloseRow").classList.remove("hidden");
  modal.querySelector("#recoverySkipRow").classList.add("hidden");
  const isGuest = !auth.currentUser || auth.currentUser.isAnonymous;
  const sub = modal.querySelector("#recoverySub");
  const guestSec = modal.querySelector("#recoveryGuestSec");
  const accountSec = modal.querySelector("#recoveryAccountSec");
  guestSec.classList.toggle("hidden", !isGuest);
  accountSec.classList.toggle("hidden", isGuest);
  sub.textContent = isGuest
    ? "Data diri & riwayat pesananmu dicadangkan otomatis. Kode di bawah dipakai untuk memindahkan datamu ke akun login."
    : (deviceHasGuestData()
        ? "Perangkat ini masih menyimpan data tamu. Tempel kode pemulihan yang kamu salin sebelum login untuk memindahkannya ke akunmu — datanya tidak hilang sebelum dipindah."
        : "Pindahkan data dari akun tamu (mis. di perangkat lain) ke akunmu dengan kode pemulihan tamu.");
  modal.classList.remove("hidden");

  let gs;
  try { gs = await import("./guest-sync.js"); }
  catch (e) {
    console.error(e);
    sub.textContent = "Fitur Recovery gagal dimuat. Muat ulang halaman lalu coba lagi.";
    return;
  }
  if (isGuest) openGuestRecovery(modal, gs);
  else openAccountRecovery(modal, gs);
}

// ---- WAJIB: popup setelah login (akun masih kosong + data tamu masih di perangkat) ----
// Dipanggil guest-gate.js#enforceRecoveryGate. Isinya sama dengan modal Recovery akun
// login, tapi tidak bisa ditutup biasa: harus tempel kode & pindahkan, atau "Lewati dulu"
// (hanya untuk sesi tab ini; data tamu tidak dihapus & popup muncul lagi di login berikutnya).
export async function openForcedRecovery(user) {
  const modal = ensureRecoveryModal();
  modal.dataset.forced = "1";
  modal.querySelector("#recoveryTitle").textContent = "Pindahkan data tamu";
  modal.querySelector("#recoverySub").textContent =
    "Perangkat ini masih menyimpan data tamu. Tempel kode pemulihan yang kamu salin sebelum login untuk memindahkannya ke akunmu. Datanya tidak hilang sebelum kamu memindahkannya.";
  modal.querySelector("#recoveryGuestSec").classList.add("hidden");
  modal.querySelector("#recoveryAccountSec").classList.remove("hidden");
  modal.querySelector("#recoveryCloseRow").classList.add("hidden");
  modal.querySelector("#recoverySkipRow").classList.remove("hidden");
  modal.classList.remove("hidden");

  let gs, gate;
  try { [gs, gate] = await Promise.all([import("./guest-sync.js"), import("./guest-gate.js")]); }
  catch (e) {
    console.error(e);
    modal.querySelector("#recoverySub").textContent = "Fitur Recovery gagal dimuat. Muat ulang halaman lalu coba lagi.";
    return;
  }
  const finish = () => { modal.dataset.forced = ""; modal.classList.add("hidden"); };
  openAccountRecovery(modal, gs, {
    // Berhasil dipindah: toast tampil, lalu halaman dimuat ulang (default) supaya profil & riwayat baru terpakai.
    // Kode valid tapi tidak ada yang perlu dipindah: anggap beres supaya tidak terkunci di popup ini.
    onEmpty: () => { gate.markRecoveryDone(user.uid); finish(); }
  });
  modal.querySelector("#recoverySkipBtn").onclick = () => { gate.skipRecoveryThisSession(); finish(); };
  setTimeout(() => { const i = modal.querySelector("#recoveryInput"); if (i) i.focus(); }, 50);
}

// ---- TAMU: lihat & salin kode ----
function openGuestRecovery(modal, gs) {
  const codeArea = modal.querySelector("#recoveryCodeArea");
  codeArea.innerHTML = `<p class="recovery-note">Menyiapkan kode…</p>`;

  const renderCode = (code, warn) => {
    codeArea.innerHTML = `
      <div class="recovery-code-row">
        <code class="recovery-code" id="recoveryCodeText">${escapeHtml(gs.formatRecoveryCode(code))}</code>
        <button type="button" class="btn btn-primary" id="recoveryCopyBtn">Salin</button>
      </div>
      ${warn ? `<p class="recovery-note is-warn">${warn}</p>` : ""}
      <p class="recovery-note"><b>Jangan dibagikan</b> — siapa pun yang punya kode ini bisa memindahkan datamu ke akunnya.</p>
      <p class="recovery-note"><b>Salin kode ini sebelum daftar / masuk.</b> Datamu <b>tidak</b> dipindah otomatis: setelah login kamu diminta menempelkan kode ini di halaman Recovery, dan data tamumu tetap tersimpan sampai kamu memindahkannya. Bisa juga dari perangkat lain: masuk ke akunmu, buka <b>Recovery</b>, lalu masukkan kode ini. Tamu tidak bisa memulihkan data tamu lain.</p>`;
    const copyBtn = codeArea.querySelector("#recoveryCopyBtn");
    copyBtn.addEventListener("click", async () => {
      const ok = await copyText(gs.formatRecoveryCode(code));
      copyBtn.textContent = ok ? "Tersalin ✓" : "Salin manual";
      setTimeout(() => { copyBtn.textContent = "Salin"; }, 1800);
    });
  };
  // Petunjuk penyebab kalau cadangan ke cloud gagal.
  const failHint = () => {
    const c = gs.getLastBackupError();
    if (c === "permission-denied") return "Server menolak cadangan — <b>firestore.rules</b> terbaru belum dipublish di Firebase.";
    if (c === "auth/operation-not-allowed" || c === "auth/admin-restricted-operation") return "<b>Anonymous Auth</b> belum diaktifkan di Firebase Console.";
    return "Cadangan terbaru belum bisa dikirim ke cloud (cek koneksi).";
  };

  const existing = gs.getRecoveryCode();
  if (!gs.hasGuestData()) {
    if (existing) renderCode(existing);
    else codeArea.innerHTML = `<p class="recovery-note">Belum ada data yang dicadangkan. Kode dibuat <b>otomatis</b> begitu kamu menyimpan data diri atau mengirim file.</p>`;
    return;
  }
  gs.backupGuestProfile().then((ok) => {
    const code = gs.getRecoveryCode();
    if (ok && code) renderCode(code);
    else if (code) renderCode(code, failHint() + " Kode ini mungkin belum memuat perubahan terakhir.");
    else codeArea.innerHTML = `<p class="recovery-note is-warn">${failHint()}</p>`;
  });
}

// ---- AKUN LOGIN: pindahkan data tamu lewat kode ----
function openAccountRecovery(modal, gs, opts = {}) {
  const input = modal.querySelector("#recoveryInput");
  const checkBtn = modal.querySelector("#recoveryCheckBtn");
  const errEl = modal.querySelector("#recoveryErr");
  const resultEl = modal.querySelector("#recoveryResult");
  input.value = ""; errEl.textContent = ""; resultEl.classList.add("hidden"); resultEl.innerHTML = "";

  const labelOf = { tambah: "Tambah", timpa: "Timpa" };
  const renderResult = (preview) => {
    const items = preview.items;
    if (!items.length) {
      resultEl.innerHTML = `<p class="recovery-note">Tidak ada yang perlu dipindahkan — data akunmu sudah sama dengan cadangan tamu ini.</p>
        ${opts.onEmpty ? `<div class="recovery-actions"><button type="button" class="btn btn-primary" id="recoveryContinueBtn">Lanjutkan</button></div>` : ""}`;
      resultEl.classList.remove("hidden");
      const cont = resultEl.querySelector("#recoveryContinueBtn");
      if (cont) cont.addEventListener("click", () => opts.onEmpty());
      return;
    }
    resultEl.innerHTML = `
      <p class="recovery-note" style="margin:10px 0 6px;">Pilih yang mau dipindahkan ke akunmu. Yang sudah sama tidak ditampilkan. Username akunmu tidak pernah ditimpa — hanya nama tampilan yang bisa dipindah.</p>
      <div class="recovery-list">
        ${items.map((it) => `
          <label class="recovery-item">
            <input type="checkbox" class="recovery-check" data-rid="${escapeHtml(it.id)}" ${it.mode === "tambah" ? "checked" : ""}>
            <span class="recovery-item-text">
              <span class="recovery-item-title">${escapeHtml(it.label)} <span class="recovery-tag is-${it.mode}">${labelOf[it.mode]}</span></span>
              <span class="recovery-item-desc">${it.mode === "timpa" && it.local ? `${escapeHtml(it.local)} → ` : ""}${escapeHtml(it.remote)}</span>
            </span>
          </label>`).join("")}
      </div>
      <div class="recovery-actions">
        <button type="button" class="btn btn-outline" id="recoveryAllBtn">Timpa semuanya</button>
        <button type="button" class="btn btn-primary" id="recoveryApplyBtn">Terapkan pilihan</button>
      </div>`;
    resultEl.classList.remove("hidden");
    const boxes = [...resultEl.querySelectorAll("input[data-rid]")];
    const applyBtn = resultEl.querySelector("#recoveryApplyBtn");
    const allBtn = resultEl.querySelector("#recoveryAllBtn");
    const syncApply = () => { applyBtn.disabled = !boxes.some((b) => b.checked); };
    boxes.forEach((b) => b.addEventListener("change", syncApply));
    syncApply();

    const run = async (ids) => {
      errEl.textContent = "";
      applyBtn.disabled = true; allBtn.disabled = true;
      const r = await gs.applyAccountMigration(preview, ids);
      if (!r.ok) { errEl.textContent = r.error; applyBtn.disabled = false; allBtn.disabled = false; syncApply(); return; }
      const extra = r.failed ? ` ${r.failed} pesanan gagal dipindah.` : "";
      showToast({
        type: r.failed ? "warning" : "success",
        title: "Data dipindahkan",
        message: `${r.applied} bagian data tamu sudah masuk ke akunmu.${extra}`
      });
      // Muat ulang supaya profil & riwayat langsung memakai data baru.
      setTimeout(() => window.location.reload(), 900);
    };
    applyBtn.addEventListener("click", () => run(boxes.filter((b) => b.checked).map((b) => b.dataset.rid)));
    allBtn.addEventListener("click", async () => {
      // Modal Recovery disembunyikan sementara supaya dialog konfirmasi tidak tertutup.
      modal.classList.add("hidden");
      const ok = await askConfirm({
        title: "Timpa semuanya?",
        body: "Semua bagian di atas akan diganti dengan isi cadangan tamu. Data akunmu untuk bagian tersebut akan tertimpa.",
        confirmLabel: "Ya, timpa semuanya"
      });
      modal.classList.remove("hidden");
      if (!ok) return;
      run(items.map((it) => it.id));
    });
  };

  checkBtn.onclick = async () => {
    errEl.textContent = ""; resultEl.classList.add("hidden"); resultEl.innerHTML = "";
    checkBtn.disabled = true;
    const prev = await gs.fetchAccountMigrationPreview(input.value);
    checkBtn.disabled = false;
    if (!prev.ok) { errEl.textContent = prev.error; return; }
    renderResult(prev);
  };
  input.onkeydown = (e) => { if (e.key === "Enter") checkBtn.click(); };
}

// ===================================================================
// Bubble menu mengambang (khusus role "developer") — lingkaran bulat
// di pojok kanan bawah dengan ikon. Diklik -> menu muncul KE ATAS dari
// bubble-nya dengan animasi slide+fade, isinya "Kelola User", "Kirim Notifikasi" & "Dashboard Printing".
// Idempotent: aman dipanggil berkali-kali (mis. dari initShell tiap
// halaman) — kalau elemennya sudah ada, tidak dibuat ulang.
// ===================================================================
export function initBubbleMenu(profile) {
  const existing = document.getElementById("devBubble");
  if (existing) existing.remove();
  if (!profile || profile.role !== "developer") return;

  const root = document.getElementById("bubbleMenuRoot") || document.body;
  const wrap = document.createElement("div");
  wrap.id = "devBubble";
  wrap.className = "dev-bubble-wrap";
  wrap.innerHTML = `
    <div class="dev-bubble-menu hidden" id="devBubbleMenu">
      <a class="dev-bubble-item" href="users.html">
        <span class="side-icon">${iconImg("Members", "Kelola User")}</span> Kelola User
      </a>
      <a class="dev-bubble-item" href="notify.html">
        <span class="side-icon">${iconImg("Notify", "Kirim Notifikasi")}</span> Kirim Notifikasi
      </a>
      <a class="dev-bubble-item" href="printer.html">
        <span class="side-icon">${iconImg("Printer", "Dashboard Printing")}</span> Dashboard Printing
      </a>
    </div>
    <button type="button" class="dev-bubble-fab" id="devBubbleFab" aria-label="Menu developer">${iconImg("Settings", "Menu", "icon-img icon-lg")}</button>
  `;
  root.appendChild(wrap);

  const fab = wrap.querySelector("#devBubbleFab");
  const menu = wrap.querySelector("#devBubbleMenu");
  fab.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
    fab.classList.toggle("is-open");
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      menu.classList.add("hidden");
      fab.classList.remove("is-open");
    }
  });
}
