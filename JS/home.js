// ===================================================================
// D'Printing — landing page publik (home.html). SEKARANG pakai
// initShell/app-shell sidebar yang sama kayak halaman lain (dulu
// sengaja tidak, lihat riwayat git) — jadi alurnya disamakan dengan
// upload.html: render state guest dulu (biar sidebar langsung
// kelihatan tanpa nunggu Firebase Auth resolve), lalu render ulang
// begitu status login diketahui.
// ===================================================================
import { auth } from "./firebase-config.js";
import { watchOwnAccount } from "./app.js";
import { initShell } from "./shell.js";
import { enforceRecoveryGate } from "./guest-gate.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const footerAuthLink = document.getElementById("footerAuthLink");

// Link "Masuk / Daftar" di footer itu KHUSUS guest — kalau orangnya sudah
// login (sidebar aja sudah nunjukkin nama+role dia di panel bawah), link
// ini ganti jadi "Profil" ke profile.html. Aneh soalnya kalau orang yang
// sudah login masih diajak "Masuk / Daftar" lagi di footer yang sama.
function syncFooterAuthLink(user) {
  if (!footerAuthLink) return;
  if (user) {
    footerAuthLink.textContent = "Profil";
    footerAuthLink.href = "profile.html";
  } else {
    footerAuthLink.textContent = "Masuk / Daftar";
    footerAuthLink.href = "login.html";
  }
}

initShell({ user: null, profile: null, active: "home" });
syncFooterAuthLink(null);

// Halaman ini boleh diakses guest, jadi bukan pakai requireAuth() —
// tapi tetap pasang watchOwnAccount() (bukan ensureUserDoc() biasa) buat
// kasus orangnya kebetulan lagi login di sini pas developer hapus/ban
// akunnya lewat Kelola User: begitu ketauan (real-time), langsung
// di-signOut() dan sidebar-nya balik ke tampilan guest SAAT ITU JUGA,
// bukan dibikinin lagi profil baru diam-diam kayak dulu.
let unsubProfile = null;
onAuthStateChanged(auth, (user) => {
  if (unsubProfile) { unsubProfile(); unsubProfile = null; }
  // Sesi anonymous (tamu yang pernah upload tanpa akun) = tetap guest.
  if (user && user.isAnonymous) user = null;
  syncFooterAuthLink(user);
  document.body.dataset.me = user ? "member" : "guest";
  if (!audManual) setAud(user ? "member" : "guest");
  if (!user) {
    initShell({ user: null, profile: null, active: "home" });
    return;
  }
  unsubProfile = watchOwnAccount(user, (profile) => {
    // Data tamu masih di perangkat + akun masih kosong -> popup Recovery wajib (halaman tetap dimuat).
    enforceRecoveryGate(user, profile);
    initShell({ user, profile, active: "home" });
  }, () => {
    unsubProfile = null;
    syncFooterAuthLink(null);
    initShell({ user: null, profile: null, active: "home" });
  });
});

// Animasi masuk yang ringan buat kartu fitur & step, sekali per elemen
// begitu kelihatan di viewport (IntersectionObserver, bukan on-scroll
// listener manual biar hemat).
const animatedEls = document.querySelectorAll(".landing-feature-card, .landing-step-card");
if ("IntersectionObserver" in window && animatedEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  animatedEls.forEach((el) => io.observe(el));
} else {
  animatedEls.forEach((el) => el.classList.add("in-view"));
}

// Panduan & Perbandingan: tampilkan isi sesuai status (tamu / sudah login).
// Otomatis mengikuti status login; kalau pengunjung memilih sendiri lewat
// tombol, pilihannya dipakai (supaya bisa membandingkan).
let audManual = false;
function setAud(aud) {
  ["panduan", "perbandingan"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.dataset.aud = aud;
  });
  document.querySelectorAll("[data-set-aud]").forEach((b) => {
    const on = b.dataset.setAud === aud;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-selected", String(on));
  });
}
document.querySelectorAll("[data-set-aud]").forEach((b) => {
  b.addEventListener("click", () => { audManual = true; setAud(b.dataset.setAud); });
});
setAud("guest");
