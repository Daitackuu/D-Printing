// ===================================================================
// D'Printing — profil TAMU (user yang belum login/daftar).
// Tamu punya profil sederhana (nama, No. WhatsApp, wilayah) yang diisi di
// profile.html dan DISIMPAN DI BROWSER (localStorage) — bukan di Firestore,
// karena tamu tidak punya dokumen users/{uid}. Data ini dipakai upload.html
// saat tamu mengirim file. TIDAK ada foto profil, status (Online/DND/dst),
// bio, postingan, atau teman buat tamu — itu khusus akun terdaftar.
// ===================================================================
import { regionKeyFrom } from "./app.js";

const GUEST_INFO_KEY = "dcp_guestInfo";
// name = NAMA TAMPILAN (dipakai sidebar, pesanan, dan judul profil);
// username = tampil sebagai "@username" di profil, sama kayak akun terdaftar.
const FIELDS = ["name", "username", "wa", "province", "city", "district", "village"];

// Username: huruf/angka/titik/garis bawah saja, tanpa "@" & spasi.
export function cleanGuestUsername(v) {
  return String(v || "").replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 20);
}

// Username yang ditampilkan: yang diisi tamu, kalau kosong diturunkan dari
// nama tampilan (mis. "Satya Wira" -> "SatyaWira"), kalau itu pun kosong "customer".
export function guestUsername(info = getGuestInfo()) {
  return cleanGuestUsername(info.username) || cleanGuestUsername(info.name) || "customer";
}

// true kalau tamu SUDAH pernah menyimpan data dirinya di browser ini.
export function hasGuestInfo() {
  try { return localStorage.getItem(GUEST_INFO_KEY) !== null; } catch (e) { return false; }
}

// Hapus profil tamu dari perangkat (dipakai setelah tamu mendaftar — datanya sudah pindah ke akun).
export function clearGuestInfo() {
  try { localStorage.removeItem(GUEST_INFO_KEY); } catch (e) { /* abaikan */ }
}

export function getGuestInfo() {
  const out = {};
  FIELDS.forEach((k) => { out[k] = ""; });
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_INFO_KEY) || "{}");
    FIELDS.forEach((k) => { if (typeof raw[k] === "string") out[k] = raw[k]; });
  } catch (e) { /* abaikan: data rusak = anggap kosong */ }
  return out;
}

export function saveGuestInfo(info) {
  const clean = {};
  FIELDS.forEach((k) => { clean[k] = String((info && info[k]) || "").trim(); });
  clean.username = cleanGuestUsername(clean.username) || cleanGuestUsername(clean.name);
  localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(clean));
  return clean;
}

export function guestLocation(info = getGuestInfo()) {
  return { province: info.province, city: info.city, district: info.district, village: info.village };
}

// Format internasional tanpa "+" (62812...), sama kayak No. WA di akun terdaftar
// — wa.me butuh format ini. Awalan "0" (08123...) otomatis jadi "62".
export function guestWaNumber(info = getGuestInfo()) {
  let d = String(info.wa || "").replace(/[^0-9]/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  return d;
}

// Return pesan error (string) kalau profil tamu belum valid, "" kalau beres.
export function guestInfoError(info = getGuestInfo()) {
  if (!String(info.name || "").trim()) return "Isi nama tampilan kamu dulu.";
  if (!/^\d{9,15}$/.test(guestWaNumber(info))) return "Isi No. WhatsApp yang valid (9–15 digit) supaya operator bisa menghubungi kamu.";
  if (!regionKeyFrom(guestLocation(info))) return "Lengkapi Provinsi, Kota/Kabupaten, Kecamatan, dan Kelurahan/Desa. Pesanan cuma dikirim ke operator yang wilayahnya sama denganmu.";
  return "";
}
