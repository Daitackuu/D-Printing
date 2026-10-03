// ===================================================================
// D'Printing — CADANGAN CLOUD profil tamu + PEMINDAHAN ke akun terdaftar.
//
// 1) Cadangan: profil tamu (nama, username, No. WA, wilayah) + daftar id
//    pesanannya disalin ke Firestore `guestProfiles/{kodePemulihan}`.
//    Kuncinya KODE PEMULIHAN acak 20 karakter (disimpan di perangkat,
//    ditampilkan di menu Recovery & di halaman Masuk/Daftar) — BUKAN id
//    sesi anonymous, karena sesi itu hilang saat keluar/ganti perangkat.
//    Siapa pun yang memegang kodenya bisa membaca cadangan itu: rahasiakan.
// 2) Pindah akun: TIDAK ADA lagi pemindahan otomatis saat daftar/masuk.
//    Pengguna yang sudah login WAJIB memasukkan kode pemulihan di halaman
//    Recovery (popup wajib / menu Recovery). Data tamu di perangkat
//    TIDAK dihapus sebelum pemindahan berhasil (lihat applyAccountMigration).
//    Gerbang yang memaksa ke halaman Recovery ada di guest-gate.js.
// ===================================================================
import { db, auth } from "./firebase-config.js";
import { regionKeyFrom } from "./app.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getGuestInfo, saveGuestInfo, hasGuestInfo, clearGuestInfo, guestWaNumber, cleanGuestUsername } from "./guest.js";
import { loadGuestJobs, clearGuestJobs } from "./guest-jobs.js";
import { markRecoveryDone } from "./guest-gate.js";

const RECOVERY_KEY = "dcp_guestRecovery";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 huruf/angka, tanpa yang mirip (0/O, 1/I)
const CODE_LEN = 20; // 20 x 5 bit = 100 bit — tidak bisa ditebak

// Alasan gagal terakhir saat mencadangkan (buat petunjuk di modal Recovery).
let lastBackupError = "";
export function getLastBackupError() { return lastBackupError; }

export function getRecoveryCode() {
  try { return localStorage.getItem(RECOVERY_KEY) || ""; } catch (e) { return ""; }
}
function setRecoveryCode(code) {
  try { localStorage.setItem(RECOVERY_KEY, code); } catch (e) { /* abaikan */ }
}
function newRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LEN));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
// "ABCDEFGHJKLMNPQRSTUV" -> "ABCDE-FGHJK-LMNPQ-RSTUV"
export function formatRecoveryCode(code) {
  return (code || "").replace(/(.{5})(?=.)/g, "$1-");
}
// Input pengguna (boleh pakai strip/spasi/huruf kecil) -> kode murni, atau "" kalau tidak valid.
export function parseRecoveryCode(input) {
  const c = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === CODE_LEN && [...c].every((ch) => ALPHABET.includes(ch)) ? c : "";
}

async function ensureAnonUser() {
  if (auth.authStateReady) await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

// Salin profil tamu + daftar id pesanan ke cloud. Aman dipanggil berulang;
// return true kalau berhasil. Gagal diam-diam (data tetap ada di perangkat).
export async function backupGuestProfile() {
  try {
    const jobIds = loadGuestJobs().map((e) => e.id).slice(0, 100);
    if (!hasGuestInfo() && !jobIds.length) return false;
    const user = await ensureAnonUser();
    if (!user.isAnonymous) return false; // akun asli: tidak ada yang perlu dicadangkan
    let code = getRecoveryCode();
    if (!code) { code = newRecoveryCode(); setRecoveryCode(code); }
    const i = getGuestInfo();
    await setDoc(doc(db, "guestProfiles", code), {
      name: i.name, username: i.username, wa: i.wa,
      province: i.province, city: i.city, district: i.district, village: i.village,
      jobIds, updatedAt: serverTimestamp()
    });
    lastBackupError = "";
    return true;
  } catch (e) {
    console.error("Cadangan profil tamu gagal:", e);
    lastBackupError = (e && e.code) || "unknown";
    return false;
  }
}

// true kalau tamu sudah punya sesuatu yang layak dicadangkan (data diri / riwayat pesanan).
export function hasGuestData() {
  return hasGuestInfo() || loadGuestJobs().length > 0;
}

// ---------------------------------------------------------------------
// RECOVERY = memindahkan data TAMU ke AKUN LOGIN (bukan antar-tamu).
// Tamu hanya MELIHAT & MENYALIN kodenya (menu Recovery) — tamu tidak bisa
// memulihkan data tamu lain, dan rules menutup `get` guestProfiles untuk
// sesi anonymous. Yang bisa memakai kode: pengguna yang sudah LOGIN, lewat
// menu Recovery di sidebar akunnya (mis. data tamu di perangkat lain).
//
// Tahap 1 — fetchAccountMigrationPreview(kode): baca cadangan TANPA mengubah
//   apa pun, bandingkan dengan profil akun, hasilkan pilihan yang berguna:
//     - "Tambah" = isian akun masih kosong, cadangan punya isi.
//     - "Timpa"  = isian akun sudah ada tapi beda dengan cadangan.
//     - yang sudah sama / kosong di cadangan TIDAK muncul.
//     - Nama tampilan, No. WhatsApp, Wilayah. USERNAME tidak pernah ditimpa
//       (identitas login akun) — hanya nama tampilan yang bisa dipindah.
//     - Riwayat pesanan = pesanan tamu yang masih berstatus tamu (belum
//       dipindah) -> diklaim jadi pesanan akun.
// Tahap 2 — applyAccountMigration(preview, ids): terapkan yang dipilih.
// ---------------------------------------------------------------------
const REGION_FIELDS = ["province", "city", "district", "village"];
const norm = (v) => String(v || "").trim().toLowerCase();
const joinRegion = (o) => REGION_FIELDS.map((k) => String((o && o[k]) || "").trim()).filter(Boolean).join(", ");

async function currentRealUser() {
  if (auth.authStateReady) await auth.authStateReady();
  const u = auth.currentUser;
  return u && !u.isAnonymous ? u : null;
}

export async function fetchAccountMigrationPreview(input) {
  const code = parseRecoveryCode(input);
  if (!code) return { ok: false, error: "Kode pemulihan tidak valid (20 huruf/angka)." };
  try {
    const user = await currentRealUser();
    if (!user) return { ok: false, error: "Masuk ke akunmu dulu. Kode tamu hanya bisa dipakai oleh akun yang sudah login." };
    const snap = await getDoc(doc(db, "guestProfiles", code));
    if (!snap.exists()) return { ok: false, error: "Kode tidak ditemukan, atau data tamu itu sudah dipindahkan." };
    const d = snap.data() || {};
    const prof = (await getDoc(doc(db, "users", user.uid))).data() || {};
    const items = [];

    // --- Nama tampilan (displayName). USERNAME TIDAK PERNAH ikut dipindah/ditimpa:
    // itu identitas login akun & unik, jadi cuma nama tampilan yang boleh berubah.
    // Akun baru otomatis berdisplayName = username -> dianggap "belum diisi" (Tambah). ---
    const remoteName = String(d.name || "").trim();
    const localName = String(prof.displayName || "").trim();
    const nameIsDefault = !localName || norm(localName) === norm(prof.username);
    if (remoteName && norm(remoteName) !== norm(localName)) {
      items.push({ id: "name", kind: "name", label: "Nama tampilan", mode: nameIsDefault ? "tambah" : "timpa", remote: remoteName, local: nameIsDefault ? "" : localName });
    }

    // --- No. WhatsApp ---
    const remoteWa = guestWaNumber({ wa: d.wa });
    const localWa = guestWaNumber({ wa: prof.waNumber });
    if (remoteWa && remoteWa !== localWa) {
      items.push({ id: "wa", kind: "wa", label: "No. WhatsApp", mode: localWa ? "timpa" : "tambah", remote: remoteWa, local: localWa });
    }

    // --- Wilayah (4 tingkat jadi satu baris; harus lengkap supaya bisa dipakai mencocokkan operator) ---
    const remoteLoc = {};
    REGION_FIELDS.forEach((k) => { remoteLoc[k] = String(d[k] || "").trim(); });
    const remoteKey = regionKeyFrom(remoteLoc);
    const localKey = prof.regionKey || "";
    if (remoteKey && remoteKey !== localKey) {
      items.push({
        id: "region", kind: "region", label: "Wilayah", mode: localKey ? "timpa" : "tambah",
        remote: joinRegion(remoteLoc) + (localKey ? " (detail alamat direset)" : ""),
        local: localKey ? joinRegion(prof.location) : "", regionKey: remoteKey, loc: remoteLoc
      });
    }

    // --- Riwayat pesanan: hanya yang masih berstatus tamu (bisa diklaim) ---
    const claimIds = [];
    for (const id of (d.jobIds || []).slice(0, 100)) {
      try {
        const js = await getDoc(doc(db, "printJobs", id));
        if (js.exists() && js.data().isGuest === true) claimIds.push(id);
      } catch (e) { console.error("Gagal membaca pesanan", id, e); }
    }
    if (claimIds.length) {
      items.push({ id: "jobs", kind: "jobs", label: "Riwayat pesanan", mode: "tambah", remote: claimIds.length + " pesanan tamu akan dipindah ke riwayat akunmu", local: "" });
    }
    return { ok: true, code, items, claimIds };
  } catch (e) {
    console.error(e);
    const denied = e && e.code === "permission-denied";
    return { ok: false, error: denied ? "Akses ditolak server. Pastikan firestore.rules terbaru sudah dipublish." : "Gagal membaca cadangan, coba lagi." };
  }
}

// selectedIds: id dari preview.items yang mau diterapkan.
// Return { ok, applied, moved, failed, cleared }.
export async function applyAccountMigration(preview, selectedIds) {
  try {
    const user = await currentRealUser();
    if (!user) return { ok: false, error: "Sesi login tidak ditemukan. Masuk lagi lalu coba ulang." };
    const picked = new Set(selectedIds || []);
    const items = (preview.items || []).filter((it) => picked.has(it.id));
    if (!items.length) return { ok: false, error: "Pilih minimal satu bagian." };

    const patch = {};
    items.forEach((it) => {
      if (it.kind === "name") patch.displayName = it.remote; // username sengaja TIDAK disentuh
      if (it.kind === "wa") patch.waNumber = it.remote;
      if (it.kind === "region") {
        patch.regionKey = it.regionKey;
        patch.location = { ...it.loc, postalCode: "", street: "", rtRw: "", landmark: "", lat: null, lng: null };
      }
    });
    if (Object.keys(patch).length) await updateDoc(doc(db, "users", user.uid), patch);

    let moved = 0, failed = 0;
    if (items.some((it) => it.kind === "jobs")) {
      for (const id of preview.claimIds) {
        try {
          await updateDoc(doc(db, "printJobs", id), {
            customerId: user.uid, customerEmail: user.email || null,
            isGuest: false, migratedFromGuest: true
          });
          moved++;
        } catch (err) {
          try {
            const s2 = await getDoc(doc(db, "printJobs", id));
            if (s2.exists() && s2.data().customerId === user.uid) moved++; // sudah milik akun ini
            else { failed++; console.error("Gagal memindah pesanan", id, err); }
          } catch (e2) { failed++; console.error("Gagal memindah pesanan", id, err); }
        }
      }
    }
    // Kalau SEMUA bagian dipindahkan dan tidak ada yang gagal, cadangan di cloud dihapus
    // (kodenya jadi tidak berlaku lagi). Kalau cuma sebagian, kode tetap berlaku.
    const cleared = items.length === preview.items.length && failed === 0;
    if (cleared) {
      deleteDoc(doc(db, "guestProfiles", preview.code)).catch(() => {});
      // Kode ini = kode tamu di PERANGKAT INI dan semuanya sudah pindah -> baru
      // sekarang data tamu di perangkat boleh dibuang. Kode dari perangkat lain
      // tidak menyentuh data tamu lokal.
      if (preview.code === getRecoveryCode()) resetGuestLocalData();
    }
    // Pemindahan sudah dilakukan untuk akun ini -> gerbang Recovery tidak memaksa lagi
    // (sebagian yang tidak dicentang tetap bisa dipindah nanti lewat menu Recovery).
    markRecoveryDone(user.uid);
    return { ok: true, applied: items.length, moved, failed, cleared };
  } catch (e) {
    console.error(e);
    const denied = e && e.code === "permission-denied";
    return { ok: false, error: denied ? "Akses ditolak server. Pastikan firestore.rules terbaru sudah dipublish." : "Gagal memindahkan data, coba lagi." };
  }
}

// Hapus semua jejak tamu di perangkat ini (profil, riwayat, kode, notifikasi tamu).
// HANYA dipanggil setelah data tamu perangkat ini BERHASIL dipindah ke akun lewat kode.
export function resetGuestLocalData() {
  clearGuestInfo();
  clearGuestJobs();
  try {
    localStorage.removeItem(RECOVERY_KEY);
    Object.keys(localStorage)
      .filter((k) => /^dp_.+_guest$/.test(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* abaikan */ }
}
