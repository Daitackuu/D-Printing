// ===================================================================
// D'Printing — shared auth guard & user profile helpers
// ===================================================================
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, getCountFromServer,
  runTransaction, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { enforceRecoveryGate } from "./guest-gate.js";

// ===================================================================
// Halaman terakhir yang dilihat — dipakai tombol "Kembali ke ..." di
// login.html supaya orang yang mampir ke Masuk/Daftar bisa balik ke halaman
// asalnya (bukan selalu Upload). app.js dimuat semua halaman KECUALI
// login.html, jadi halaman login/daftar tidak pernah menimpa nilai ini.
// Halaman khusus peran (Dashboard Printing, Kelola User, Kirim Notifikasi,
// Kotak Masuk) sengaja tidak diingat — tamu tidak bisa membukanya.
// Disimpan di sessionStorage (per tab), dihapus saat logout().
// ===================================================================
const LAST_PAGE_KEY = "dp:lastPage";
(function rememberLastPage() {
  try {
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    const skip = ["", "login.html", "printer.html", "users.html", "notify.html", "inbox.html"];
    if (skip.includes(file)) return;
    sessionStorage.setItem(LAST_PAGE_KEY, file + location.search);
  } catch (e) { /* sessionStorage tidak tersedia — tidak fatal */ }
})();

// ===================================================================
// Kode pesanan pendek & acak (Fase E) — dibikin sekali pas file
// diupload (lihat home.js), disimpan di field "code" pada dokumen
// printJobs. Tujuannya: customer & operator bisa saling nyebut/nanya
// soal SATU pesanan pakai kode pendek ini ("pesanan kode DP-A3K9X2"),
// bukan nama file asli yang kadang panjang/bikin bingung (apalagi kalau
// ada beberapa file dengan nama mirip/sama, mis. "WhatsApp Image...jpeg").
// Karakter yang gampang ketuker (O/0, I/1) sengaja dibuang dari alfabet.
// ===================================================================
const JOB_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateJobCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += JOB_CODE_CHARS[Math.floor(Math.random() * JOB_CODE_CHARS.length)];
  }
  return `DP-${code}`;
}

// Dipakai di semua tempat yang nampilin/nyebut kode pesanan — fallback
// ke ID dokumen Firestore (dipotong+uppercase) buat job LAMA yang dibuat
// sebelum fitur kode ini ada (belum punya field "code").
export function jobCodeLabel(job, docId) {
  return job && job.code ? job.code : `DP-${(docId || "").slice(0, 6).toUpperCase()}`;
}

// ===================================================================
// Pencocokan WILAYAH customer <-> operator
// Order cuma boleh sampai ke dashboard operator kalau SEMUA tingkat di
// REGION_LEVELS sama persis (setelah dirapikan: huruf kecil, spasi
// dirapikan, awalan "Kecamatan"/"Kelurahan"/"Desa" dibuang, alias
// provinsi disamakan). Kalau mau dilonggarkan (mis. cuma sampai
// kecamatan), cukup kurangi isi REGION_LEVELS di bawah ini — semua
// bagian lain (upload, penugasan, dashboard, firestore.rules lewat
// field regionKey) ikut otomatis, TAPI regionKey user & pesanan lama
// harus dibuat ulang (simpan ulang profil / upload ulang).
// ===================================================================
export const REGION_LEVELS = ["province", "city", "district", "village"];
export const REGION_LABELS = { province: "Provinsi", city: "Kota/Kabupaten", district: "Kecamatan", village: "Kelurahan/Desa" };
const REGION_PREFIXES = {
  district: /^(kecamatan|kec\.?)\s+/,
  village: /^(kelurahan|kel\.?|desa)\s+/
};
const PROVINCE_ALIASES = {
  "daerah khusus ibukota jakarta": "dki jakarta",
  "daerah khusus ibu kota jakarta": "dki jakarta",
  "daerah istimewa yogyakarta": "di yogyakarta"
};
export function normalizeRegionPart(level, value) {
  let s = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (REGION_PREFIXES[level]) s = s.replace(REGION_PREFIXES[level], "").trim();
  if (level === "province" && PROVINCE_ALIASES[s]) s = PROVINCE_ALIASES[s];
  return s;
}
// "jawa timur|kota malang|klojen|kauman". String kosong = lokasi belum
// lengkap (ada tingkat yang kosong) -> TIDAK BOLEH dicocokkan ke siapa pun.
export function regionKeyFrom(loc) {
  if (!loc) return "";
  const parts = REGION_LEVELS.map((lv) => normalizeRegionPart(lv, loc[lv]));
  return parts.some((p) => !p) ? "" : parts.join("|");
}
// Ringkasan wilayah buat ditampilkan: "Kauman, Klojen, Kota Malang, Jawa Timur"
export function regionLabel(loc) {
  if (!loc) return "";
  return [...REGION_LEVELS].reverse().map((lv) => loc[lv]).filter(Boolean).join(", ");
}
// Cuma ambil field wilayah (tanpa lat/lng) buat disalin ke dokumen pesanan.
export function regionSnapshot(loc) {
  const out = {};
  REGION_LEVELS.forEach((lv) => { out[lv] = (loc && loc[lv]) || ""; });
  return out;
}

// Kode "Web ID" rahasia yang dipakai pas daftar buat langsung dapet role
// tertentu (lihat login.html). Role ini DIPILIH DI SISI CLIENT lalu
// dikirim ke Firestore — siapa pun yang tahu kodenya bisa daftar jadi
// role itu. Ini keputusan yang sudah disadari risikonya oleh developer.
export function roleFromWebID(code) {
  const c = (code || "").trim().toUpperCase();
  if (c === "DP-DEV") return "developer";
  if (c === "DP-PRINTER") return "printer";
  return "customer";
}

// ===================================================================
// Login D'Printing pakai USERNAME + password saja (tanpa email). Firebase
// Auth aslinya cuma bisa email+password, jadi di balik layar kita bikin
// "email palsu" dari username (mis. "budi123" -> "budi123@dprinting.local").
// Uniqueness username otomatis kejamin dari Firebase Auth sendiri (kalau
// email palsu itu sudah kepakai, createUser bakal error
// auth/email-already-in-use — persis kayak "username sudah dipakai").
// ===================================================================
const USERNAME_DOMAIN = "@dprinting.local";

export function normalizeUsername(raw) {
  return (raw || "").trim().toLowerCase();
}

// Username: 3-20 karakter, huruf kecil/angka/titik/underscore saja.
export function isValidUsername(u) {
  return /^[a-z0-9_.]{3,20}$/.test(u);
}

export function usernameToEmail(username) {
  return `${username}${USERNAME_DOMAIN}`;
}

// Kebalikan dari usernameToEmail — dipakai buat NAMPILKAN identitas user
// di UI tanpa mengekspos "...@dprinting.local" yang jelek/membingungkan.
export function usernameLabel(value) {
  if (!value) return value;
  return value.endsWith(USERNAME_DOMAIN) ? value.slice(0, -USERNAME_DOMAIN.length) : value;
}

// ===================================================================
// Index publik "usernames/{namaTernormalisasi}" -> { uid, authEmail }.
// PENTING soal "authEmail" di sini: itu email palsu Firebase Auth yang
// PERMANEN nempel ke akun sejak pertama kali Daftar (dibikin dari
// usernameToEmail() atas username SAAT ITU) — client TIDAK BISA ganti
// email akun Firebase Auth org lain tanpa Admin SDK/Cloud Function, jadi
// authEmail ini TIDAK PERNAH berubah lagi walau field "username" di
// dokumen users/{uid} diganti berkali-kali oleh developer lewat Kelola
// User. Dokumen index inilah yang bikin rename beneran BISA kejadian:
// begitu di-rename, dokumen index lama dihapus & yang baru dibikin
// (nunjuk authEmail yang SAMA) — jadi nama LAMA otomatis berhenti bisa
// dipakai login, dan cuma nama BARU yang bisa (lihat findLoginEmailByUsername,
// dipanggil login.html, dan renameUsername di bawah, dipanggil js/users.js).
//
// CATATAN KETERBATASAN (tanpa Cloud Function/Admin SDK): kalau username
// "budi" di-rename jadi "budi2", nama "budi" jadi BEBAS di index ini,
// TAPI email "budi@dprinting.local" tetap selamanya terpakai di Firebase
// Auth oleh akun asli si budi — jadi orang LAIN tidak akan pernah bisa
// Daftar pakai username "budi" lagi (bakal kena "Username sudah dipakai"
// biarpun sebenarnya sudah "kosong" di index ini). Ini batasan bawaan
// Firebase Auth tanpa server admin, bukan bug.
function usernameIndexRef(username) {
  return doc(db, "usernames", normalizeUsername(username));
}

// Dipakai login.html SEBELUM orangnya login (makanya baca dari index
// publik ini, bukan dari users/{uid} yang butuh login). Fallback null
// kalau belum ke-index (akun lama dari sebelum fitur ini ada) — caller
// (login.html) sudah tahu harus fallback ke usernameToEmail() manual
// buat kompatibilitas akun lama itu.
export async function findLoginEmailByUsername(username) {
  const snap = await getDoc(usernameIndexRef(username));
  return snap.exists() ? snap.data().authEmail : null;
}

export async function isUsernameTaken(username, excludeUid = null) {
  const snap = await getDoc(usernameIndexRef(username));
  if (!snap.exists()) return false;
  return excludeUid ? snap.data().uid !== excludeUid : true;
}

// Dipanggil SEKALI pas Daftar (login.html), dan juga dipanggil ulang tiap
// kali akun LAMA (dari sebelum fitur index ini ada) berhasil login lewat
// jalur fallback deterministik — biar akun lama itu ke-"backfill" otomatis
// dan jadi bisa di-rename juga ke depannya. Aman dipanggil berkali-kali
// dengan username yang sama (no-op kalau index-nya sudah persis sama).
export async function claimUsernameIndex(uid, username, authEmail) {
  await setDoc(usernameIndexRef(username), { uid, authEmail });
}

// Rename BENERAN (bukan cuma benerin ejaan/kapitalisasi) — dipanggil dari
// Kelola User (js/users.js, khusus developer). authEmail-nya TETAP sama
// persis kayak sebelumnya (diambil dari users/{uid}.authEmail, BUKAN
// dihitung ulang dari username baru — soalnya beneran tidak bisa ganti
// email Firebase Auth akun orang lain tanpa Admin SDK, lihat catatan di
// atas), jadi yang berubah CUMA "nama mana yang valid dipakai buat login"
// (index lama dihapus, index baru dengan authEmail sama dibikin) + field
// tampilan "username" di dokumen profilnya.
export async function renameUsername(uid, oldUsername, newDisplayUsername, authEmail) {
  const oldNormalized = normalizeUsername(oldUsername);
  const newNormalized = normalizeUsername(newDisplayUsername);
  await runTransaction(db, async (tx) => {
    if (newNormalized !== oldNormalized) {
      // Beneran rename (nama login-nya ikut ganti): index lama dihapus,
      // index baru dibikin (bukan "update" dokumen yang sama — rules
      // sengaja larang update di collection ini, cuma boleh create/delete,
      // biar uniqueness kejamin lewat "allow create: resource == null").
      const newRef = usernameIndexRef(newDisplayUsername);
      const newSnap = await tx.get(newRef);
      if (newSnap.exists() && newSnap.data().uid !== uid) {
        throw new Error("username-taken");
      }
      tx.delete(usernameIndexRef(oldUsername));
      tx.set(newRef, { uid, authEmail });
    }
    // Kalau newNormalized === oldNormalized (cuma ganti kapitalisasi/ejaan
    // tampilan doang), dokumen index-nya TIDAK disentuh sama sekali — key-nya
    // (huruf kecil semua) memang tidak berubah, jadi tidak perlu di-set ulang
    // (itu bakal kena "update" yang diblokir rules, bukan "create").
    tx.update(doc(db, "users", uid), { username: newDisplayUsername });
  });
}

// Membuat / mengambil dokumen user di koleksi "users".
// roleOverride dipakai cuma saat daftar (signup), berdasarkan kode Web ID
// yang diisi user. Kalau tidak diisi / salah, default-nya tetap "customer".
// usernameOverride dipakai cuma saat daftar, dari input username di form.
// contactEmailOverride dipakai cuma saat daftar, dari input email di form
// signup — ini email BENERAN milik user (buat kontak), BEDA sama field
// "email" yang isinya email palsu "username@dprinting.local" buat Firebase
// Auth. Login tetap cuma pakai username + password, email TIDAK dipakai
// buat login sama sekali.
export async function ensureUserDoc(user, roleOverride = null, usernameOverride = null, contactEmailOverride = null) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const role = roleOverride || "customer";
    const username = usernameOverride || usernameLabel(user.email) || user.email.split("@")[0];
    await setDoc(ref, {
      username,
      email: user.email,
      authEmail: user.email,
      contactEmail: contactEmailOverride || "",
      displayName: username,
      bio: "",
      role,
      online: false,
      presenceStatus: "online",
      connected: false,
      banned: false,
      createdAt: serverTimestamp()
    });
    return { username, email: user.email, authEmail: user.email, contactEmail: contactEmailOverride || "", displayName: username, bio: "", role, online: false, presenceStatus: "online", connected: false, banned: false };
  }
  const data = snap.data();
  if (!data.authEmail) {
    // Migrasi data lama: dokumen dibikin sebelum field "authEmail" ada
    // (lihat js/app.js#renameUsername). "email" lama SUDAH PASTI persis
    // sama kayak authEmail asli (belum pernah ada cara ganti keduanya
    // beda dari user.email pas dokumen ini pertama dibikin), jadi aman
    // di-backfill dari situ. Diamkan kalau gagal (mis. lagi race sama
    // sesi lain) — bukan fatal, coba lagi di login berikutnya.
    data.authEmail = user.email;
    updateDoc(ref, { authEmail: user.email }).catch(() => {});
  }
  return data;
}

// Hitung jumlah dokumen di sebuah collection/subcollection tanpa perlu
// download semua dokumennya (dipakai buat jumlah follower/following/like).
export async function countDocs(colRef) {
  const snap = await getCountFromServer(colRef);
  return snap.data().count;
}

// Path ke gambar avatar default (ala Discord) — dipakai kalau user belum
// upload foto profil sendiri. File-nya nanti ditaruh di folder
// Resources/Images/. Semua halaman HTML ada di folder HTML/, jadi path
// relatifnya "naik satu folder dulu" (../) baru masuk ke Resources/Images/.
export const DEFAULT_AVATAR_PATH = "../Resources/Images/Default-Avatar.png";

// ===================================================================
// Status profil ala Discord: Online (default) / Do Not Disturb / Offline.
// Ini status yang user PILIH SENDIRI (field "presenceStatus"), BEDA sama
// field "online" (toggle manual operator "lagi nerima pesanan print apa
// nggak", lihat printer.js) — dua-duanya sengaja independen.
//
// "connected" = tab lagi kebuka apa nggak (lihat requireAuth di atas).
// Kalau tab lagi TERTUTUP, apapun status yang dipilih user bakal
// ditampilkan sebagai Offline ke orang lain (persis kayak Discord: nutup
// app = keliatan offline, biarpun status yang dipilih terakhir tetap
// kesimpen & bakal balik lagi pas buka lagi). Kalau tab kebuka, status
// yang dipilih (online/dnd/offline) ditampilkan apa adanya.
export const PRESENCE_STATUSES = [
  { code: "online", label: "Online", dotClass: "is-online" },
  { code: "dnd", label: "Do Not Disturb", dotClass: "is-dnd" },
  { code: "offline", label: "Offline", dotClass: "is-offline" }
];

// profileLike: objek user apa saja yang MUNGKIN punya "presenceStatus" &
// "connected" (mis. dari dokumen koleksi "users"). User lama (dibikin
// sebelum fitur ini ada) belum punya field "presenceStatus" — default-nya
// dianggap "online".
export function effectivePresence(profileLike) {
  const chosen = (profileLike && PRESENCE_STATUSES.some((s) => s.code === profileLike.presenceStatus))
    ? profileLike.presenceStatus
    : "online";
  const code = (profileLike && profileLike.connected) ? chosen : "offline";
  return PRESENCE_STATUSES.find((s) => s.code === code);
}

// Render avatar bulat: pakai foto profil (photoURL) kalau ada, kalau tidak
// ada pakai gambar placeholder default di atas — BUKAN inisial huruf lagi.
// profileLike: objek apa saja yang MUNGKIN punya field "photoURL".
// sizeClass (opsional): "lg" buat avatar besar di halaman profil.
export function avatarHtml(profileLike, sizeClass = "") {
  const cls = `avatar-circle ${sizeClass}`.trim();
  const src = (profileLike && profileLike.photoURL) ? profileLike.photoURL : DEFAULT_AVATAR_PATH;
  return `<img src="${src}" class="${cls}" style="object-fit:cover;">`;
}

// ID percakapan DM selalu sama utk sepasang user berapa kalipun dipanggil,
// dibikin dari dua uid yang diurutkan biar konsisten.
export function conversationId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

export { collection };

// Pasang listener REAL-TIME (onSnapshot, bukan getDoc sekali doang) ke
// dokumen users/{uid} milik user yang lagi login. Dipakai di halaman
// manapun yang perlu tahu SAAT ITU JUGA (tanpa nunggu reload/pindah
// halaman) kalau akunnya dihapus atau di-ban developer lewat Kelola User
// sementara tab ini masih kebuka.
//
// onChange(profile) dipanggil tiap dokumennya ada/berubah (akun masih
// aktif). onGone(reason) — "removed" atau "banned" — dipanggil TEPAT
// SEKALI kalau akunnya hilang/diblokir; auth SUDAH di-signOut() duluan
// sebelum onGone dipanggil, jadi pemanggilnya cuma perlu urus tampilan
// (requireAuth lempar ke login.html, halaman guest cukup render ulang
// jadi tampilan guest). Return-nya fungsi unsubscribe.
export function watchOwnAccount(user, onChange, onGone) {
  let goneAlready = false;
  return onSnapshot(doc(db, "users", user.uid), (snap) => {
    if (goneAlready) return;
    if (!snap.exists()) {
      goneAlready = true;
      signOut(auth).finally(() => onGone("removed"));
      return;
    }
    const profile = snap.data();
    if (profile.banned) {
      goneAlready = true;
      signOut(auth).finally(() => onGone("banned"));
      return;
    }
    if (!profile.authEmail) {
      // Migrasi data lama, lihat catatan di ensureUserDoc().
      updateDoc(doc(db, "users", user.uid), { authEmail: user.email }).catch(() => {});
    }
    onChange(profile);
  }, (err) => {
    console.error(err);
  });
}

// Jaga halaman: kalau belum login → lempar ke login.html.
// Kalau sudah login, jalankan callback(user, profile).
// requiredRole (opsional): "customer" | "printer" | "developer",
// atau array kalau lebih dari satu role boleh akses (mis. ["printer","developer"]).
// Kalau role user tidak cocok, lempar ke home.html.
//
// PENTING — kick REAL-TIME, bukan cuma dicek sekali pas halaman dibuka:
// dipasang onSnapshot() (bukan getDoc() sekali doang) ke dokumen
// users/{uid} milik sendiri, jadi dia terus "nyala" selama tab ini
// kebuka. Begitu developer BAN atau HAPUS akun ini lewat Kelola User
// (users.js), snapshot berikutnya langsung nangkep perubahan itu SAAT
// ITU JUGA (tanpa orangnya perlu reload/pindah halaman dulu) → dia
// otomatis di-signOut() dan dilempar ke login.html. Jadi orang yang
// belum sempat logout TIDAK bisa lanjut pakai sesi lamanya — begitu
// balik lagi dia wajib Masuk (kalau cuma dihapus dari Kelola User,
// akun Firebase Auth-nya tetap ada) atau Daftar ulang (kalau akun
// Firebase Auth-nya juga betulan dihapus dari Firebase Console/Admin
// SDK, login lama otomatis gagal).
//
// Dokumen yang TIDAK ADA di sini sengaja dianggap "akun ini baru saja
// dihapus", BUKAN "biar dibikinin otomatis" lagi (beda dari perilaku
// ensureUserDoc yang dipakai pas Daftar/Masuk) — soalnya akun yang
// beneran baru selalu sudah punya dokumennya duluan lewat ensureUserDoc()
// di login.html SEBELUM sempat mendarat ke halaman manapun yang pakai
// requireAuth ini.
//
// Catatan soal akun yang dihapus LANGSUNG dari Firebase Console/Admin
// SDK (bukan lewat tombol Hapus di Kelola User): ID token yang sudah
// terlanjur dipegang browser tetap dianggap valid oleh Firestore
// sampai token itu kedaluwarsa sendiri (~1 jam) — Firestore TIDAK tahu
// akun Auth-nya sudah hilang, cuma tahu tanda tangan tokennya masih
// sah. Supaya kick real-time ini juga jalan buat kasus itu, dokumen
// users/{uid}-nya perlu ikut dihapus/ditandai pas itu juga (misal ikut
// hapus manual di Firestore Console, atau — kalau nanti mau setup
// Cloud Functions — pasang trigger functions.auth.user().onDelete()
// yang otomatis hapus dokumennya). Kalau cuma hapus akunnya di
// Firebase Console TANPA sentuh dokumen Firestore-nya, sesi yang lagi
// aktif baru bakal ke-kick pas token itu kedaluwarsa/refresh gagal,
// bukan seketika.
// MODE TAMU: tamu (belum login/daftar) dikasih sesi Firebase ANONYMOUS
// (cuma dibuat pas dia benar-benar kirim file di upload.html). Sesi itu
// punya `user` tapi BUKAN akun asli — jadi di semua tempat yang nanya
// "sudah login?", pakai isRealUser(user), bukan `if (user)`.
export function isRealUser(user) {
  return !!user && !user.isAnonymous;
}

// options.allowGuest = true: halaman ini boleh dibuka tamu (belum login /
// sesi anonymous) — callback dipanggil dengan (null, null, anonUser|null)
// alih-alih dilempar ke form Daftar. Dipakai Kotak Masuk (inbox.html).
export function requireAuth(callback, requiredRole = null, options = {}) {
  let unsubProfile = null;
  let started = false;

  // Jaga-jaga tambahan buat kasus bfcache yang lolos dari perbaikan
  // replace() di atas (mis. balik dari halaman LAIN yang bukan hasil
  // redirect kita sendiri, tapi tetap memulihkan halaman terproteksi ini
  // dalam kondisi beku dari cache browser). "pageshow" dengan
  // event.persisted === true = halaman ini dipulihkan dari bfcache,
  // bukan dimuat baru — paksa reload biar semua status login/data
  // dicek ulang dari awal, bukan nampilin snapshot beku yang bisa
  // kelihatan "ngebug" (sidebar kosong, data macet loading, dst).
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) window.location.reload();
  });

  function stopWatching() {
    if (unsubProfile) {
      unsubProfile();
      unsubProfile = null;
    }
  }

  onAuthStateChanged(auth, (user) => {
    stopWatching();
    started = false;
    // Sesi tamu (anonymous) diperlakukan SAMA kayak belum login: semua
    // halaman yang lewat requireAuth() (Komunitas, Pesan, Profil, Detail
    // pesanan, Dashboard Printing, Kelola User, dst.) tertutup buat tamu.
    // Sesi anonymous-nya sendiri TIDAK di-signOut di sini — biar riwayat
    // upload tamu di upload.html tidak hilang.
    if ((!user || user.isAnonymous) && options.allowGuest) {
      callback(null, null, user || null);
      return;
    }
    if (!user || user.isAnonymous) {
      // Halaman-halaman yang lewat requireAuth() ini (semua KECUALI home.html
      // & upload.html, yang sengaja punya alur guest-preview sendiri) tidak
      // punya versi "lihat-lihat dulu" — begitu ketauan belum login, LANGSUNG
      // diarahkan ke form DAFTAR (bukan cuma Masuk), soalnya kalau orang ini
      // nyasar ke sini dari link Komunitas/Pesan/dll di preview guest, dia
      // memang belum pernah punya akun sama sekali.
      //
      // PAKAI replace(), BUKAN href/assign() — biar halaman terproteksi ini
      // (yang isinya masih kosong/setengah jadi karena belum sempat dapat
      // data, kayak sidebar kosong + "Memuat channel..." macet di
      // community.html) TIDAK numpuk di history. Kalau pakai href, klik
      // tombol Back dari form Daftar akan balik ke snapshot halaman
      // terproteksi itu apa adanya (dipulihkan browser dari bfcache dalam
      // kondisi beku persis sebelum redirect ini jalan — makanya kelihatan
      // "ngebug"/macet). Dengan replace(), entry halaman ini digantikan
      // langsung oleh login.html, jadi tombol Back cuma balik ke halaman
      // SEBELUM ini (mis. home.html), bukan ke versi setengah-jadi tadi.
      window.location.replace("login.html?mode=signup");
      return;
    }
    unsubProfile = watchOwnAccount(user, (profile) => {
      if (started) {
        // Snapshot susulan (mis. role/username berubah sambil tab ini
        // kebuka) — kick di watchOwnAccount tetap jalan tiap kali, tapi
        // callback halaman sendiri cuma dipanggil sekali di awal biar
        // tidak nge-render ulang dari nol tiap ada perubahan kecil.
        return;
      }
      started = true;
      // Perangkat masih menyimpan data TAMU + akun ini masih kosong -> munculkan POPUP
      // Recovery wajib di atas halaman ini (halaman tetap dimuat di belakangnya).
      // Data tamu tidak dihapus sebelum dipindah.
      enforceRecoveryGate(user, profile);
      // "connected": penanda tab ini lagi kebuka apa nggak (best-effort —
      // bukan realtime presence beneran, butuh Firebase Realtime Database
      // onDisconnect() untuk itu). SEMUA role dapat ini, termasuk "printer" —
      // beda sama field "online" yang KHUSUS toggle manual "lagi nerima
      // pesanan print apa nggak" (lihat printer.js), sengaja tidak disentuh
      // di sini biar dua hal itu independen: status profil (Online/Do Not
      // Disturb/Offline, field "presenceStatus", diatur sendiri di profile.html)
      // TIDAK ada hubungannya sama status "lagi buka lapak print" itu.
      updateDoc(doc(db, "users", user.uid), { connected: true }).catch(() => {});
      window.addEventListener("pagehide", () => {
        updateDoc(doc(db, "users", user.uid), { connected: false }).catch(() => {});
      });
      if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowed.includes(profile.role)) {
          stopWatching();
          window.location.replace("upload.html");
          return;
        }
      }
      callback(user, profile);
    }, (reason) => {
      // Akunnya baru dihapus ("removed") atau di-ban ("banned") developer
      // lewat Kelola User — TEPAT SAAT ITU JUGA, bukan pas reload
      // berikutnya. Auth sudah di-signOut() duluan (lihat watchOwnAccount),
      // jadi orangnya wajib Masuk/Daftar lagi buat lanjut, tidak bisa
      // nerusin sesi lama begitu saja.
      stopWatching();
      window.location.replace(`login.html?${reason}=1`);
    });
  });
}

// redirectTo (opsional): halaman tujuan setelah keluar. Default ke
// login.html (mode Masuk) — dipakai tombol "Switch akun". Tombol "Keluar"
// di halaman Profil sengaja kirim "login.html?mode=signup" biar orang
// yang baru keluar diarahkan ke form Daftar, bukan form Masuk (lihat
// js/profile.js#logoutBtn).
export async function logout(redirectTo = "login.html") {
  try { sessionStorage.removeItem(LAST_PAGE_KEY); } catch (e) { /* abaikan */ }
  await signOut(auth);
  window.location.href = redirectTo;
}

// ===================================================================
// "Akun yang diingat" di browser ini — CUMA nyimpen daftar username
// (BUKAN password/token), dipakai buat nentuin kapan tombol "Switch akun"
// di halaman Profil perlu ditampilkan: kalau di browser/perangkat ini
// pernah login/daftar LEBIH DARI 1 akun, tombolnya muncul; kalau cuma 1
// akun yang pernah dipakai di sini, tombolnya disembunyikan (cuma tombol
// Keluar yang tampil) karena "ganti akun" nggak ada gunanya.
// ===================================================================
const KNOWN_ACCOUNTS_KEY = "pf_known_accounts";

// meta (opsional): { displayName, photoURL } — cuma buat mempercantik daftar
// di modal Switch account (nama & foto), BUKAN data sensitif. Password/token
// tetap TIDAK PERNAH disimpan.
const KNOWN_ACCOUNTS_META_KEY = "pf_known_accounts_meta";

export function rememberAccount(username, meta = null) {
  if (!username) return;
  try {
    const list = getKnownAccounts();
    if (!list.includes(username)) {
      list.push(username);
      localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(list));
    }
    if (meta) {
      const all = getKnownAccountsMeta();
      all[username] = {
        displayName: meta.displayName || "",
        photoURL: meta.photoURL || ""
      };
      localStorage.setItem(KNOWN_ACCOUNTS_META_KEY, JSON.stringify(all));
    }
  } catch (e) {
    // localStorage penuh/diblokir browser — diamkan, ini cuma fitur kosmetik.
  }
}

export function getKnownAccounts() {
  try {
    const raw = localStorage.getItem(KNOWN_ACCOUNTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export function getKnownAccountsMeta() {
  try {
    const raw = localStorage.getItem(KNOWN_ACCOUNTS_META_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch (e) {
    return {};
  }
}

// Hapus satu akun dari daftar "akun yang diingat" di browser ini (cuma
// menghapus ingatan di daftar, BUKAN menghapus akunnya).
export function forgetAccount(username) {
  try {
    const list = getKnownAccounts().filter((u) => u !== username);
    localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(list));
    const all = getKnownAccountsMeta();
    delete all[username];
    localStorage.setItem(KNOWN_ACCOUNTS_META_KEY, JSON.stringify(all));
  } catch (e) {}
}

export function fmtDate(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

// Format angka jadi "Rp 15.000" — dipakai buat harga job print & pendapatan.
export function fmtRupiah(n) {
  const num = Number(n) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

// Format ukuran file dari bytes jadi "245 KB" / "1.2 MB" — dipakai di
// halaman detail pesanan print (job.html).
export function fmtFileSize(bytes) {
  const n = Number(bytes);
  if (!n || n <= 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Ubah URL file Cloudinary jadi URL "paksa download" (bukan cuma dibuka
// di tab baru) pakai flag transformasi fl_attachment — Cloudinary yang
// nge-set header Content-Disposition: attachment di responnya, jadi
// browser otomatis download filenya, TANPA perlu atribut HTML `download`
// (yang gak reliable buat URL beda origin kayak Cloudinary). Nama file
// hasil download juga di-set balik ke nama asli file yang diupload
// (fileName), bukan random public_id bawaan Cloudinary.
export function downloadUrl(fileURL, fileName) {
  if (!fileURL) return "#";
  if (!fileURL.includes("/upload/")) return fileURL;
  const dotIdx = (fileName || "").lastIndexOf(".");
  const base = dotIdx > 0 ? fileName.slice(0, dotIdx) : (fileName || "file");
  // fl_attachment:<nama> tidak boleh ada karakter aneh/slash, jadi
  // dibersihkan dulu.
  const safeName = base.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 100) || "file";
  return fileURL.replace("/upload/", `/upload/fl_attachment:${safeName}/`);
}

// ===================================================================
// Semua emoji di UI diganti gambar (Fase D) — helper ini yang bikin
// <img>-nya, biar konsisten satu tempat. File-nya ditaruh di
// Resources/Icons/{name}.png. Semua halaman HTML ada di folder HTML/,
// jadi path relatifnya "naik satu folder dulu" (../) baru masuk ke
// Resources/Icons/ — SAMA kayak DEFAULT_AVATAR_PATH di atas.
// Daftar lengkap nama file yang harus disiapkan ada di README.md.
// ===================================================================
export function iconImg(name, alt = "", cls = "icon-img") {
  // Ikon dirender sebagai MASK (bukan <img>) — warnanya otomatis ikut
  // warna teks (currentColor) tempat ikon itu berada, jadi selalu
  // kelihatan di background terang maupun gelap. Cukup timpa PNG-nya
  // (bentuk/transparansi yang dipakai, warna aslinya nggak masalah).
  return `<span class="${cls}" role="img" aria-label="${alt}" style="--icon:url('../Resources/Icons/${name}.png')"></span>`;
}

// ===================================================================
// Pesan error Firestore yang lebih jelas buat ditampilkan di UI —
// membedakan "permission-denied" (firestore.rules belum dipublish/salah)
// dari "failed-precondition" (index composite di firestore.indexes.json
// belum dipublish — biasanya query yang gabung where()+orderBy() field
// berbeda butuh ini). Dua-duanya sering ketuker jadi "izin ditolak" doang,
// padahal solusinya beda: rules vs indexes.
//
// Kalau errornya soal index, Firebase SDK SENDIRI biasanya sudah nyelipin
// link siap-pakai ke Firebase Console (dalam err.message) buat langsung
// bikin index yang kurang itu — nggak perlu install/pakai Firebase CLI
// sama sekali. Fungsi ini nyari link itu dan nampilinnya sebagai tombol
// klik langsung di UI, bukan cuma nyuruh buka Console manual.
// ===================================================================
export function describeFirestoreError(err, whatFailed = "memuat data") {
  const code = err && err.code;
  const message = (err && err.message) || "";
  const linkMatch = message.match(/https:\/\/console\.firebase\.google\.com\/\S+/);

  if (linkMatch) {
    // Buang tanda kutip/kurung tutup yang kadang nempel di ujung link
    // hasil regex (Firebase suka nutup kalimat pesan errornya pakai itu).
    const link = linkMatch[0].replace(/[)."']+$/, "");
    return `Gagal ${whatFailed}: butuh Firestore index composite yang belum dibuat — ` +
      `<a href="${link}" target="_blank" rel="noopener" style="font-weight:600;text-decoration:underline;">klik di sini buat langsung bikin index-nya di Firebase Console</a>, ` +
      `tunggu status-nya jadi "Enabled" (biasanya 1-2 menit), lalu refresh halaman ini.`;
  }

  let hint;
  if (code === "failed-precondition" || /index/i.test(message)) {
    hint = `butuh Firestore index composite yang belum dibuat/dipublish — jalankan "firebase deploy --only firestore:indexes" (isinya sudah ada di firestore.indexes.json), atau buka Console browser (F12) buat cari link "create it here" di pesan error aslinya`;
  } else if (code === "permission-denied") {
    hint = `firestore.rules di project Firebase kamu belum dipublish ulang (atau kamu login dengan role yang tidak diizinkan) — jalankan "firebase deploy --only firestore:rules"`;
  } else {
    hint = `error tak terduga (${code || "tanpa kode"}) — buka Console browser (F12) buat detail lengkapnya`;
  }
  return `Gagal ${whatFailed}: ${hint}.`;
}

// ===================================================================
// Modal "alasan" — dipakai bareng buat 2 tempat: customer Batal pesanan
// (home.js/job.js) & operator Tolak pesanan (printer.js). Dropdown isi
// alasan siap-pakai (beda-beda per pemanggil, dikirim lewat parameter
// "reasons") + satu opsi "Alasan lain (tulis sendiri)" yang munculin
// textarea custom. Modal-nya dibikin SEKALI, ditempel ke <body>, dipakai
// ulang tiap openReasonPrompt() dipanggil (idempotent, style modal reuse
// pattern yang sama kayak modal Kontak CS di shell.js).
// ===================================================================
const REASON_CUSTOM_VALUE = "__custom__";

function ensureReasonModal() {
  let modal = document.getElementById("reasonPromptModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.className = "modal-backdrop hidden";
  modal.id = "reasonPromptModal";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px;">
      <h3 id="reasonPromptTitle">Alasan</h3>
      <p class="sub" id="reasonPromptSubtitle" style="margin-bottom:14px;"></p>
      <label for="reasonPromptSelect">Pilih alasan</label>
      <select id="reasonPromptSelect"></select>
      <div id="reasonPromptCustomWrap" style="margin-top:10px;">
        <label for="reasonPromptCustom">Tulis alasan kamu</label>
        <textarea id="reasonPromptCustom" rows="3" placeholder="Tulis alasannya di sini..." style="width:100%;font-family:var(--sans);padding:8px 10px;border-radius:6px;border:1px solid var(--line);"></textarea>
      </div>
      <div class="error-msg" id="reasonPromptErr"></div>
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn btn-outline" id="reasonPromptCancel" type="button">Batal</button>
        <button class="btn btn-primary" id="reasonPromptConfirm" type="button">Lanjutkan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function escapeHtmlForReason(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

// title/subtitle: teks di kepala modal. reasons: array string alasan
// siap-pilih. confirmLabel: teks tombol konfirmasi (mis. "Batalkan
// pesanan" / "Tolak pesanan"). onConfirm(reason): dipanggil dengan
// alasan terpilih (string, dari dropdown ATAU dari textarea custom kalau
// yang dipilih "Alasan lain") — kalau onConfirm melempar error, modal
// TETAP kebuka (biar user bisa coba lagi / pesan error-nya keliatan
// lewat alert dari pemanggil), tombol Lanjutkan-nya di-re-enable lagi.
export function openReasonPrompt({ title = "Alasan", subtitle = "", reasons = [], confirmLabel = "Lanjutkan", onConfirm }) {
  const modal = ensureReasonModal();
  const titleEl = document.getElementById("reasonPromptTitle");
  const subEl = document.getElementById("reasonPromptSubtitle");
  const select = document.getElementById("reasonPromptSelect");
  const customWrap = document.getElementById("reasonPromptCustomWrap");
  const customInput = document.getElementById("reasonPromptCustom");
  const errEl = document.getElementById("reasonPromptErr");
  const cancelBtn = document.getElementById("reasonPromptCancel");
  const confirmBtn = document.getElementById("reasonPromptConfirm");

  titleEl.textContent = title;
  subEl.textContent = subtitle;
  subEl.style.display = subtitle ? "" : "none";
  errEl.textContent = "";
  customInput.value = "";
  select.innerHTML = [
    `<option value="" disabled selected>— pilih alasan —</option>`,
    ...reasons.map((r) => `<option value="${escapeHtmlForReason(r)}">${escapeHtmlForReason(r)}</option>`),
    `<option value="${REASON_CUSTOM_VALUE}">Alasan lain (tulis sendiri)</option>`
  ].join("");
  customWrap.style.display = "none";

  const syncCustomVisibility = () => {
    customWrap.style.display = select.value === REASON_CUSTOM_VALUE ? "" : "none";
  };
  select.onchange = syncCustomVisibility;

  confirmBtn.textContent = confirmLabel;
  confirmBtn.disabled = false;

  const close = () => modal.classList.add("hidden");
  cancelBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  confirmBtn.onclick = async () => {
    errEl.textContent = "";
    if (!select.value) {
      errEl.textContent = "Pilih salah satu alasan dulu.";
      return;
    }
    let reason = select.value;
    if (reason === REASON_CUSTOM_VALUE) {
      reason = customInput.value.trim();
      if (!reason) {
        errEl.textContent = "Tulis alasannya dulu.";
        return;
      }
    }
    confirmBtn.disabled = true;
    try {
      await onConfirm(reason);
      close();
    } catch (e) {
      // Pemanggil (home.js/job.js/printer.js) yang tanggung jawab
      // nampilin alert error-nya — di sini cuma re-enable tombolnya lagi
      // supaya user bisa coba ulang tanpa nutup-buka modal dari awal.
    } finally {
      confirmBtn.disabled = false;
    }
  };

  modal.classList.remove("hidden");
}

// ===================================================================
// Dropdown custom beranimasi — gantiin <select> bawaan browser di
// tempat-tempat yang butuh di-style & dianimasikan penuh (browser tidak
// kasih akses buat animasikan buka/tutup <select> asli). Gayanya samain
// sama menu "Pilih tipe file" di Upload (.filetype-menu) & animasinya
// samain sama modal ganti status di Profil (fade + geser dikit + scale,
// lihat @keyframes customDropdownOpen di CSS/style.css) — biar terasa
// satu bahasa desain di seluruh app.
//
// Dipakai di:
//  - JS/upload.js  -> dropdown "Ukuran kertas"
//  - JS/users.js   -> dropdown "Role" di baris Kelola User
//
// customSelectHtml(id, options, selectedValue, extraClass) balikin
// markup-nya (options: [{value,label}]). wireCustomSelect(root, onChange)
// nyalain interaksinya — panggil ini SETELAH markup-nya ditaruh di DOM.
// onChange(value) dipanggil tiap kali user pilih opsi BEDA dari yang
// lagi aktif, sama kayak event "change" di <select> asli.
// ===================================================================
function escapeHtmlForSelect(s) {
  const d = document.createElement("div");
  d.textContent = s === undefined || s === null ? "" : String(s);
  return d.innerHTML;
}

// Ikon panah & centang dropdown = SVG garis (ikut warna teks), bukan
// karakter teks "▾"/"✓" yang bentuknya beda-beda tiap font/browser.
const SELECT_CHEVRON = `<svg class="custom-select-arrow" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg>`;
const SELECT_CHECK = `<svg class="custom-select-check" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>`;

export function customSelectHtml(id, options, selectedValue, extraClass = "") {
  const sel = options.find((o) => o.value === selectedValue) || options[0] || { value: "", label: "" };
  return `
    <div class="custom-select ${extraClass}" id="${id}" data-value="${escapeHtmlForSelect(sel.value)}">
      <button type="button" class="custom-select-btn" aria-haspopup="listbox" aria-expanded="false">
        <span class="custom-select-btn-label">${escapeHtmlForSelect(sel.label)}</span>
        ${SELECT_CHEVRON}
      </button>
      <div class="custom-select-menu" role="listbox">
        ${options.map((o) => `
          <button type="button" class="custom-select-option ${o.value === sel.value ? "active" : ""}" data-value="${escapeHtmlForSelect(o.value)}" role="option">
            <span>${escapeHtmlForSelect(o.label)}</span>${o.value === sel.value ? SELECT_CHECK : ""}
          </button>`).join("")}
      </div>
    </div>`;
}

function closeCustomSelect(root) {
  root.classList.remove("open");
  const btn = root.querySelector(".custom-select-btn");
  const menu = root.querySelector(".custom-select-menu");
  if (btn) btn.setAttribute("aria-expanded", "false");
  if (menu) menu.classList.remove("open");
}

// Klik di luar mana pun -> tutup semua dropdown custom yang lagi kebuka
// (sama kayak perilaku .filetype-menu di js/upload.js).
document.addEventListener("click", () => {
  document.querySelectorAll(".custom-select.open").forEach(closeCustomSelect);
});

export function wireCustomSelect(root, onChange) {
  const btn = root.querySelector(".custom-select-btn");
  const menu = root.querySelector(".custom-select-menu");
  const label = root.querySelector(".custom-select-btn-label");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (root.classList.contains("is-disabled")) return;
    const willOpen = !root.classList.contains("open");
    document.querySelectorAll(".custom-select.open").forEach((el) => { if (el !== root) closeCustomSelect(el); });
    root.classList.toggle("open", willOpen);
    menu.classList.toggle("open", willOpen);
    btn.setAttribute("aria-expanded", String(willOpen));
  });
  menu.querySelectorAll(".custom-select-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const value = opt.dataset.value;
      const changed = value !== root.dataset.value;
      root.dataset.value = value;
      label.textContent = opt.querySelector("span").textContent;
      menu.querySelectorAll(".custom-select-option").forEach((o) => {
        const isActive = o === opt;
        o.classList.toggle("active", isActive);
        const check = o.querySelector(".custom-select-check");
        if (isActive && !check) o.insertAdjacentHTML("beforeend", SELECT_CHECK);
        if (!isActive && check) check.remove();
      });
      closeCustomSelect(root);
      if (changed) onChange(value);
    });
  });
}

// ===================================================================
// Modal konfirmasi generic — dipakai gantiin window.confirm() bawaan
// browser (yang tampilannya beda sendiri, tidak bisa di-style/animasi,
// dan suka keblokir sama pop-up blocker di beberapa browser) di
// tempat-tempat kayak "Kick/Ban anggota" & "Hapus saluran" (JS/channel.js),
// biar konsisten sama modal konfirmasi lain di app ini (mis. Ban/Hapus
// user di Kelola User). Modal-nya dibikin SEKALI, ditempel ke <body>,
// dipakai ulang tiap askConfirm() dipanggil — pola yang sama kayak
// ensureReasonModal() di atas.
//
// Pakainya: `if (!(await askConfirm({ title: "...", body: "..." }))) return;`
// — resolve `true` kalau user pencet tombol konfirmasi, `false` kalau
// Batal ATAU klik di luar modal.
// ===================================================================
function ensureConfirmModal() {
  let modal = document.getElementById("askConfirmModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.className = "modal-backdrop hidden";
  modal.id = "askConfirmModal";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px;">
      <h3 id="askConfirmTitle">Konfirmasi</h3>
      <p id="askConfirmBody" class="sub" style="margin-top:-4px;"></p>
      <div class="modal-actions">
        <button class="btn btn-outline" id="askConfirmCancelBtn" type="button">Batal</button>
        <button class="btn btn-stamp" id="askConfirmOkBtn" type="button">Ya, lanjutkan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

// title/body: teks di kepala & isi modal. confirmLabel: teks tombol
// konfirmasi (default "Ya, lanjutkan" — bisa diganti mis. "Hapus
// saluran", "Kick anggota", dst biar lebih jelas maksudnya). danger:
// false -> tombol konfirmasi dibikin .btn-outline (bukan merah/.btn-stamp),
// dipakai buat aksi yang tidak destruktif tapi tetap perlu konfirmasi.
export function askConfirm({ title = "Konfirmasi", body = "", confirmLabel = "Ya, lanjutkan", danger = true } = {}) {
  const modal = ensureConfirmModal();
  const titleEl = document.getElementById("askConfirmTitle");
  const bodyEl = document.getElementById("askConfirmBody");
  const cancelBtn = document.getElementById("askConfirmCancelBtn");
  const okBtn = document.getElementById("askConfirmOkBtn");

  titleEl.textContent = title;
  bodyEl.textContent = body;
  okBtn.textContent = confirmLabel;
  okBtn.className = danger ? "btn btn-stamp" : "btn btn-primary";

  modal.classList.remove("hidden");
  return new Promise((resolve) => {
    const cleanup = (result) => {
      modal.classList.add("hidden");
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
      resolve(result);
    };
    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
  });
}

// ===================================================================
// Toast umum — pengganti window.alert() bawaan browser.
// Memakai wadah (#pendingToastWrap) & kartu (.pending-toast) yang sama
// dengan toast "pesanan belum diterima" di shell.js, jadi satu bahasa
// visual. type: "success" | "error" | "info" | "warning".
// Pakainya: showToast("Berhasil disimpan", "success")
//           showToast({ title: "Gagal", message: "...", type: "error" })
//           showToast({ ..., sound: "Notif" }) / sound: false -> suara lain / diam
// Mengembalikan fungsi close() kalau mau ditutup manual.
// ===================================================================
// Ikon notifikasi = PNG di Resources/Icons/ (sama seperti ikon lain).
// Aturan: kalau tujuannya sama dengan ikon di Dashboard Printing, boleh
// pakai ikon yang sama (Accept, Print-Start, Print-Done, Reject, Bell, Lock,
// Check). Yang belum ada padanannya punya PNG sendiri: Info, Warning,
// Redirect, Stack. Tiap ikon punya animasi sendiri di style.css (.ni-*).
const TOAST_ICONS = { success: "Check", error: "Reject", info: "Info", warning: "Warning" };
// Ikon di toast/panel dipasang di lingkaran berwarna dengan glyph putih
// (CSS .icon-chip): sebagian ikon di Resources/Icons berwarna putih (untuk
// sidebar gelap) sehingga tak terlihat di kartu putih. Warna ikut jenis ikon.
const CHIP_COLORS = {
  Check: "green", Accept: "green", "Print-Done": "green",
  "Print-Start": "gold", Warning: "gold",
  Reject: "red",
  Bell: "navy", Info: "navy", Redirect: "navy", Lock: "navy", Stack: "navy"
};
export function iconChip(icon, color) {
  const c = color || CHIP_COLORS[icon] || "navy";
  return `<span class="icon-chip chip-${c} ni-${String(icon).toLowerCase()}">${iconImg(icon, "", "icon-img")}</span>`;
}
// ---------------------------------------------------------------------
// Efek suara (SFX) — file MP3 di Resources/Audios/ (bisa langsung diganti
// dengan file lain, asal nama & ekstensi sama). Kalau file hilang, suara
// dilewati diam-diam (tidak ada error). Browser bisa memblokir suara
// sebelum user berinteraksi dengan halaman — itu juga dilewati diam-diam.
// Semua suara mengikuti toggle "Suara" di Settings (setSfxEnabled).
//   Success / Error / Info / Warning -> toast umum showToast()
//   Notif   -> kabar status pesanan customer
//   Pending -> popup "pesanan belum diterima" (operator/developer)
//   Gate    -> toast "perlu masuk dulu" (guest)
// ---------------------------------------------------------------------
const SFX_DIR = "../Resources/Audios/";
const SFX_VOLUME = 0.7;
const sfxCache = {};
let sfxEnabled = true;
export function setSfxEnabled(on) { sfxEnabled = !!on; }
export function playSfx(name) {
  if (!sfxEnabled || !name) return;
  try {
    let base = sfxCache[name];
    if (!base) {
      base = new Audio(`${SFX_DIR}${name}.mp3`);
      base.preload = "auto";
      sfxCache[name] = base;
    }
    // clone supaya dua suara yang sama bisa tumpang tindih tanpa terpotong
    const a = base.cloneNode();
    a.volume = SFX_VOLUME;
    const pr = a.play();
    if (pr && pr.catch) pr.catch(() => { /* diblokir browser / file hilang — abaikan */ });
  } catch (e) { /* abaikan */ }
}
const TOAST_SFX = { success: "Success", error: "Error", info: "Info", warning: "Warning" };

const TOAST_TITLES = { success: "Berhasil", error: "Gagal", info: "Info", warning: "Perhatian" };

function toastEscape(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

export function showToast(arg, type = "info", duration) {
  const opts = typeof arg === "string" ? { message: arg, type } : { type, ...arg };
  const t = TOAST_ICONS[opts.type] ? opts.type : "info";
  const ms = opts.duration != null ? opts.duration : (duration != null ? duration : (t === "error" ? 6000 : 4000));

  let wrap = document.getElementById("pendingToastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "pendingToastWrap";
    wrap.className = "pending-toast-wrap";
    document.body.appendChild(wrap);
  }
  wrap.setAttribute("aria-live", "polite");

  const toast = document.createElement("div");
  toast.className = `pending-toast toast-${t}`;
  toast.setAttribute("role", t === "error" ? "alert" : "status");
  const icon = opts.icon || TOAST_ICONS[t];
  toast.innerHTML = `
    ${iconChip(icon)}
    <div class="pending-toast-body">
      <p class="pending-toast-title">${toastEscape(opts.title || TOAST_TITLES[t])}</p>
      ${opts.message ? `<p class="pending-toast-text">${toastEscape(opts.message)}</p>` : ""}
      ${opts.actionLabel ? `<div class="pending-toast-actions"><button type="button" class="btn btn-primary" data-toast-action>${toastEscape(opts.actionLabel)}</button></div>` : ""}
    </div>
    <button type="button" class="pending-toast-close" aria-label="Tutup" data-toast-close>&times;</button>
  `;
  wrap.appendChild(toast);
  // opts.sound: nama file di Resources/Audios (tanpa .mp3), atau false = diam
  playSfx(opts.sound === undefined ? TOAST_SFX[t] : opts.sound);

  const close = () => {
    if (!toast.isConnected) return;
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 180);
  };
  toast.querySelector("[data-toast-close]").addEventListener("click", close);
  const actionBtn = toast.querySelector("[data-toast-action]");
  if (actionBtn) actionBtn.addEventListener("click", () => { if (opts.onAction) opts.onAction(); close(); });
  if (ms > 0) setTimeout(close, ms);
  return close;
}

// ===================================================================
// Animasi baris pesanan — dipanggil SETELAH list pesanan di-render ulang
// lewat innerHTML (karena tiap snapshot Firestore me-render ulang semua
// baris, animasi CSS biasa akan diputar ulang di SEMUA baris; helper ini
// menandai hanya yang benar-benar baru / berubah status).
//  - baris baru            -> class "is-new"     (slide-in + highlight)
//  - status badge berubah  -> class "is-changed" (efek cap "ditempel")
// Render pertama tidak dianimasikan (cuma mencatat kondisi awal).
// Baris dikenali lewat link "job.html?id=..." di dalamnya.
// ===================================================================
const rowAnimState = new WeakMap();
export function animateJobRows(container) {
  if (!container) return;
  const prev = rowAnimState.get(container);
  const cur = new Map();
  container.querySelectorAll(".job-row, .job-card").forEach((row) => {
    const link = row.querySelector('a[href*="job.html?id="]');
    if (!link) return;
    const id = link.getAttribute("href").split("id=")[1];
    const badge = row.querySelector(".stamp-badge");
    const status = badge ? badge.textContent.trim() : "";
    cur.set(id, status);
    if (!prev) return;
    if (!prev.has(id)) row.classList.add("is-new");
    else if (prev.get(id) !== status && badge) badge.classList.add("is-changed");
  });
  rowAnimState.set(container, cur);
}
