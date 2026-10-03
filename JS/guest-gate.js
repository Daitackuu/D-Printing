// ===================================================================
// D'Printing — PENJAGA pemulihan data tamu.
//
// Aturan sekarang (menggantikan pindah-otomatis saat daftar/masuk):
//  1) Data tamu TIDAK pernah dipindah / dihapus otomatis. Tamu daftar atau
//     masuk -> data tamunya tetap utuh di perangkat (localStorage) sampai
//     dia sendiri memasukkan KODE PEMULIHAN di halaman Recovery dan memindahkannya.
//  2) Sebelum login/daftar, login.html menampilkan kode pemulihan + ajakan
//     menyalinnya (lihat login.html).
//  3) Setelah login, kalau perangkat ini masih menyimpan data tamu DAN akun
//     yang baru login masih kosong (belum ada No. WA & wilayah), muncul POPUP
//     Recovery yang wajib diisi di atas halaman yang sedang dibuka
//     (enforceRecoveryGate -> shell.js#openForcedRecovery). Popup tidak bisa
//     ditutup biasa; selama belum dipindah, muncul lagi di tiap muat halaman.
//
// Modul ini sengaja TIDAK mengimpor app.js / guest.js / guest-sync.js / shell.js secara statis
// supaya aman diimpor dari mana saja (tanpa import melingkar). Kunci localStorage
// di bawah HARUS sama dengan yang dipakai guest.js, guest-jobs.js, guest-sync.js.
// ===================================================================

const INFO_KEY = "dcp_guestInfo";
const JOBS_KEY = "dcp_guestJobs";
const RECOVERY_KEY = "dcp_guestRecovery";
const SKIP_KEY = "dcp_recoverySkip";       // sessionStorage: "Lewati dulu" (hanya sesi tab ini)
const DONE_PREFIX = "dcp_recoveryDone:";   // localStorage per uid: pemindahan sudah dilakukan

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

// true kalau perangkat ini masih menyimpan sesuatu milik tamu
// (data diri, riwayat pesanan, atau kode pemulihan).
export function deviceHasGuestData() {
  if (lsGet(INFO_KEY) !== null) return true;
  if (lsGet(RECOVERY_KEY)) return true;
  try {
    const arr = JSON.parse(lsGet(JOBS_KEY) || "[]");
    return Array.isArray(arr) && arr.length > 0;
  } catch (e) { return false; }
}

// Akun dianggap "masih kosong" kalau belum ada No. WhatsApp dan belum ada wilayah.
export function accountIsEmpty(profile) {
  if (!profile) return true;
  return !String(profile.waNumber || "").trim() && !profile.regionKey;
}

export function markRecoveryDone(uid) {
  try { if (uid) localStorage.setItem(DONE_PREFIX + uid, "1"); } catch (e) { /* abaikan */ }
}
function isDone(uid) { return !!uid && lsGet(DONE_PREFIX + uid) === "1"; }

// "Lewati dulu": hanya berlaku di tab/sesi ini. Data tamu TIDAK dihapus,
// dan pengguna diminta lagi saat login berikutnya.
export function skipRecoveryThisSession() {
  try { sessionStorage.setItem(SKIP_KEY, "1"); } catch (e) { /* abaikan */ }
}
export function clearRecoverySkip() {
  try { sessionStorage.removeItem(SKIP_KEY); } catch (e) { /* abaikan */ }
}
function isSkipped() {
  try { return sessionStorage.getItem(SKIP_KEY) === "1"; } catch (e) { return false; }
}

// Akun asli + perangkat masih menyimpan data tamu + akun masih kosong + belum dipindah.
export function needsRecovery(user, profile) {
  if (!user || user.isAnonymous) return false;
  if (!deviceHasGuestData()) return false;
  if (isDone(user.uid) || isSkipped()) return false;
  return accountIsEmpty(profile);
}

// Dipanggil tiap halaman utama setelah profil akun diketahui. Kalau perlu, membuka
// POPUP Recovery yang wajib (shell.js#openForcedRecovery) DI ATAS halaman yang sedang
// dibuka — tidak ada pindah halaman. Aman dipanggil berkali-kali (popup dibuka sekali per
// muat halaman). Return true kalau popup baru saja dibuka.
let gateOpened = false;
export function enforceRecoveryGate(user, profile) {
  if (gateOpened || !needsRecovery(user, profile)) return false;
  gateOpened = true;
  // shell.js dimuat malas supaya modul ini tidak saling mengimpor secara melingkar.
  import("./shell.js")
    .then((m) => m.openForcedRecovery(user))
    .catch((e) => { gateOpened = false; console.error("Gagal membuka popup Recovery:", e); });
  return true;
}

// Salin teks ke clipboard (dengan cadangan untuk browser yang menolak Clipboard API).
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}
