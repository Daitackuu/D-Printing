// ===================================================================
// D'Printing — sesi multi-akun (buat modal "Switch account")
//
// MASALAH: Firebase Auth Web cuma punya SATU sesi aktif per browser. Dulu
// pindah akun berarti ketik password lagi (password memang tidak pernah kita
// simpan).
//
// CARA SEKARANG: tiap akun yang pernah aktif di perangkat ini disimpan sebagai
// SESI FIREBASE TERPISAH — satu instance Firebase Auth bernama "acct-<username>"
// (SDK menyimpannya sendiri di storage browser, di kunci yang beda dari sesi
// utama). "Pindah akun" = menyalin sesi tersimpan itu jadi sesi utama lewat
// updateCurrentUser() (API resmi Firebase), jadi TANPA password.
//
// Yang disimpan = persis jenis data yang SUDAH disimpan Firebase untuk sesi
// utama (refresh token milik Firebase), BUKAN password. Tokennya bisa dicabut
// dari server (ganti password / akun dihapus / dinonaktifkan), dan kalau
// sudah tidak berlaku, pindah akun otomatis minta password lagi.
//
// KEAMANAN — kapan sesi tersimpan dihapus:
//   - Log out dari akun itu  -> sesi akun itu dihapus (js/app.js logout()).
//   - Tombol × di daftar     -> sesi akun itu dihapus.
//   - Akun tidak ada lagi    -> dihapus bersama entrinya dari daftar.
// Akun yang TIDAK sedang aktif dan belum di-log out tetap tersimpan — itu
// intinya fitur ini (kayak daftar akun Google). Hapus (×) kalau perangkatnya
// dipakai bersama orang lain.
//
// Modul ini dimuat malas (dynamic import) supaya halaman biasa tidak
// menanggung bebannya.
// ===================================================================
import { app, auth, db } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, updateCurrentUser, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, getDocs, collection, query, where, limit } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { usernameToEmail } from "./app.js";

const norm = (u) => String(u || "").trim().toLowerCase();

// Auth instance khusus satu akun (dibuat sekali per nama, dipakai ulang).
function slotAuth(username) {
  const name = "acct-" + norm(username);
  const existing = getApps().find((a) => a.name === name);
  return getAuth(existing || initializeApp(app.options, name));
}
// Tunggu SDK selesai memuat sesi yang tersimpan (async, dari IndexedDB).
async function ready(a) {
  try { await a.authStateReady(); } catch (e) { /* abaikan */ }
  return a;
}

// Simpan sesi akun yang SEDANG aktif ke slot-nya. Aman dipanggil berulang:
// kalau slot sudah memegang user yang sama, tidak ngapa-ngapain.
export async function stashSession(user, username) {
  if (!user || user.isAnonymous || !username) return;
  const a = await ready(slotAuth(username));
  if (a.currentUser && a.currentUser.uid === user.uid) return;
  await updateCurrentUser(a, user);
}

export async function hasStash(username) {
  const a = await ready(slotAuth(username));
  return !!a.currentUser;
}

// Hapus sesi tersimpan (cuma di slot ini; sesi utama tidak tersentuh).
export async function dropStash(username) {
  if (!username) return;
  try {
    const a = await ready(slotAuth(username));
    if (a.currentUser) await signOut(a);
  } catch (e) { /* abaikan */ }
}

// Hasil: "ok" | "none" | "gone" | "expired" | "offline"
//   gone    = Firebase Auth bilang akunnya sudah tidak ada
//   expired = sesi tersimpan tidak berlaku lagi (password diganti, dicabut,
//             dinonaktifkan) — akun mungkin masih ada, tapi butuh password
//   offline = tidak bisa memastikan (jaringan/error sementara) — JANGAN
//             dianggap hilang
async function classify(user) {
  try {
    await user.reload();
    return "ok";
  } catch (e) {
    const c = (e && e.code) || "";
    if (c === "auth/user-not-found") return "gone";
    if (c === "auth/user-token-expired" || c === "auth/invalid-user-token" || c === "auth/user-disabled" || c === "auth/requires-recent-login") return "expired";
    return "offline";
  }
}
export async function verifyStash(username) {
  const a = await ready(slotAuth(username));
  if (!a.currentUser) return "none";
  return classify(a.currentUser);
}

// Pindah ke akun tersimpan TANPA password.
// before: dipanggil sesaat sebelum sesi utama diganti (masih login sebagai akun
// lama) — dipakai buat menandai akun lama offline.
// Hasil: { ok:true } atau { ok:false, reason: "none"|"gone"|"expired"|"offline"|"error" }
export async function switchToStash(username, { before } = {}) {
  const a = await ready(slotAuth(username));
  const user = a.currentUser;
  if (!user) return { ok: false, reason: "none" };
  const state = await classify(user);
  if (state !== "ok") return { ok: false, reason: state };
  try {
    if (before) { try { await before(); } catch (e) { /* jangan menggagalkan perpindahan */ } }
    await updateCurrentUser(auth, user);
    return { ok: true };
  } catch (e) {
    console.error("pindah akun gagal:", e);
    return { ok: false, reason: "error" };
  }
}

// Apakah akun ini sudah tidak punya data di Firestore? true = hilang,
// false = masih ada. Melempar error kalau jaringan bermasalah (jadi pemanggil
// bisa membedakan "hilang" dari "tidak tahu").
// Urutan cek: index username -> users/{uid}; kalau index tidak ada (akun lama),
// cari lewat field username lalu email login.
export async function accountMissingInFirestore(username) {
  const u = norm(username);
  const idx = await getDoc(doc(db, "usernames", u));
  if (idx.exists() && idx.data().uid) {
    const p = await getDoc(doc(db, "users", idx.data().uid));
    return !p.exists();
  }
  const byName = await getDocs(query(collection(db, "users"), where("username", "==", u), limit(1)));
  if (!byName.empty) return false;
  const byEmail = await getDocs(query(collection(db, "users"), where("email", "==", usernameToEmail(u)), limit(1)));
  return byEmail.empty;
}

// Satu pemeriksaan lengkap buat satu akun di daftar.
// Hasil: { state: "gone" } atau { state: "exists", fast: boolean }
//   fast = bisa pindah langsung (ada sesi tersimpan yang masih berlaku).
// Aturan: dihapus dari daftar HANYA kalau ada bukti akunnya hilang — error
// jaringan tidak pernah menghapus apa pun.
export async function checkAccount(username) {
  let auth_ = "none";
  try { auth_ = (await hasStash(username)) ? await verifyStash(username) : "none"; } catch (e) { auth_ = "offline"; }

  if (auth_ === "ok") return { state: "exists", fast: true };   // Auth mengonfirmasi: akunnya ada
  if (auth_ === "gone") return { state: "gone" };               // Auth mengonfirmasi: akunnya hilang
  if (auth_ === "expired") await dropStash(username);           // sesi basi, bukan berarti akun hilang

  // Tidak ada konfirmasi dari Auth -> cek data akun di Firestore.
  let missing = null;
  try { missing = await accountMissingInFirestore(username); } catch (e) { missing = null; }
  if (missing === true) return { state: "gone" };
  return { state: "exists", fast: auth_ === "offline" };
}
