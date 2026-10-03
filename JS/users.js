// ===================================================================
// D'Printing — Kelola User (khusus role "developer")
// UI ala Discord: baris per user (pfp, email, role dropdown, ban, hapus).
// ===================================================================
import { db, functions } from "./firebase-config.js";
import { requireAuth, usernameLabel, normalizeUsername, isValidUsername, avatarHtml, describeFirestoreError, renameUsername, customSelectHtml, wireCustomSelect, askConfirm } from "./app.js";
import { initShell, initBubbleMenu } from "./shell.js";
import {
  collection, collectionGroup, onSnapshot, doc, updateDoc, deleteDoc,
  getDocs, query, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";
import { waLinkTo } from "./support-config.js";

const userRows = document.getElementById("userRows");
const usersPageErr = document.getElementById("usersPageErr");
const searchInput = document.getElementById("userSearch");
const userTabs = document.getElementById("userTabs");
const editUsernameModal = document.getElementById("editUsernameModal");
const editUsernameInput = document.getElementById("editUsernameInput");
const editUsernameErr = document.getElementById("editUsernameErr");
const editUsernameCancelBtn = document.getElementById("editUsernameCancelBtn");
const editUsernameSaveBtn = document.getElementById("editUsernameSaveBtn");
const changePasswordModal = document.getElementById("changePasswordModal");
const changePasswordSub = document.getElementById("changePasswordSub");
const newPasswordInput = document.getElementById("newPasswordInput");
const newPasswordConfirmInput = document.getElementById("newPasswordConfirmInput");
const changePasswordErr = document.getElementById("changePasswordErr");
const changePasswordCancelBtn = document.getElementById("changePasswordCancelBtn");
const changePasswordSaveBtn = document.getElementById("changePasswordSaveBtn");

let allDocs = [];
let activeTab = "all"; // "all" | role

// Urutan tampil = urutan di sini. Tambah kategori baru cukup di array ini.
const CATEGORIES = [
  { role: "printer", label: "Operator Printer", empty: "Belum ada user dengan role printer." },
  { role: "customer", label: "Customer", empty: "Belum ada customer." },
  { role: "developer", label: "Developer", empty: "Belum ada developer." }
];
function roleOf(u) {
  return CATEGORIES.some((c) => c.role === u.role) ? u.role : "customer";
}
function nameOf(u) {
  return u.username || usernameLabel(u.email);
}
let myUid = null;

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

// Hapus banyak dokumen sekaligus pakai batch (maks 400 per batch, biar
// aman dari limit 500 operasi/batch Firestore). Delete pada dokumen yang
// sudah tidak ada juga aman (no-op), jadi ref yang overlap antar langkah
// di bawah tidak akan bikin error.
async function batchDeleteRefs(refs) {
  const CHUNK = 400;
  for (let i = 0; i < refs.length; i += CHUNK) {
    const chunk = refs.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

// Bersih-bersih semua "jejak" user ini di database sebelum dokumen
// users/{uid}-nya sendiri dihapus:
//  1) Postingan (+ gambar yang ditautkan) miliknya sendiri, sekalian like
//     & komentar YANG ADA DI postingan itu (siapapun yang like/komen di
//     situ, karena postingannya mau hilang total).
//  2) File/pesanan yang dia upload lewat menu Upload (printJobs).
//  3) Like yang dia kasih ke postingan ORANG LAIN (postingannya sendiri
//     tidak ikut hilang, cuma jejak like-nya).
//  4) Komentar yang dia tulis di postingan ORANG LAIN.
// Catatan: ini cuma menghapus RECORD di Firestore. File aslinya (gambar
// profil/postingan, file print) tersimpan di Cloudinary lewat unsigned
// upload preset — Cloudinary TIDAK BISA dihapus dari client tanpa API
// secret, jadi file fisiknya di Cloudinary tetap ada (cuma sudah tidak
// tertaut/kepakai lagi di aplikasi). Hapus manual dari dashboard
// Cloudinary kalau mau benar-benar bersih dari sana juga.
async function deleteUserContent(uid) {
  // 1) Postingan milik user ini.
  const postsSnap = await getDocs(query(collection(db, "posts"), where("authorId", "==", uid)));
  for (const postDoc of postsSnap.docs) {
    const [likesSnap, commentsSnap] = await Promise.all([
      getDocs(collection(db, "posts", postDoc.id, "likes")),
      getDocs(collection(db, "posts", postDoc.id, "comments"))
    ]);
    await batchDeleteRefs([
      ...likesSnap.docs.map((d) => d.ref),
      ...commentsSnap.docs.map((d) => d.ref)
    ]);
    await deleteDoc(postDoc.ref);
  }

  // 2) File yang diupload user ini lewat menu Upload (pesanan print).
  const jobsSnap = await getDocs(query(collection(db, "printJobs"), where("customerId", "==", uid)));
  await batchDeleteRefs(jobsSnap.docs.map((d) => d.ref));

  // 3) Like user ini di postingan orang lain.
  const likesElsewhere = await getDocs(query(collectionGroup(db, "likes"), where("uid", "==", uid)));
  await batchDeleteRefs(likesElsewhere.docs.map((d) => d.ref));

  // 4) Komentar user ini di postingan orang lain.
  const commentsElsewhere = await getDocs(query(collectionGroup(db, "comments"), where("authorId", "==", uid)));
  await batchDeleteRefs(commentsElsewhere.docs.map((d) => d.ref));
}

// Modal buat ganti username user manapun (khusus developer) — SEKARANG
// beneran full rename, bukan cuma benerin kapitalisasi/ejaan lagi: begitu
// disimpan, username LAMA langsung berhenti bisa dipakai login & orang
// itu WAJIB pakai username BARU buat Masuk lain kali (password-nya tidak
// berubah). Mekanismenya lewat index "usernames/" — lihat catatan
// lengkap di js/app.js#renameUsername soal kenapa ini bisa kejadian
// padahal client tidak bisa ganti email Firebase Auth akun orang lain.
let editingUid = null;
let editingUsername = null;
let editingAuthEmail = null;

function closeEditUsername() {
  editUsernameModal.classList.add("hidden");
  editingUid = null;
  editingUsername = null;
  editingAuthEmail = null;
}

function openEditUsername(uid, u) {
  editingUid = uid;
  editingUsername = u.username || usernameLabel(u.email) || "";
  editingAuthEmail = u.authEmail || null;
  editUsernameInput.value = editingUsername;
  editUsernameErr.textContent = "";
  editUsernameModal.classList.remove("hidden");
  editUsernameInput.focus();
  editUsernameInput.select();
}

editUsernameCancelBtn.addEventListener("click", closeEditUsername);
editUsernameModal.addEventListener("click", (e) => {
  if (e.target === editUsernameModal) closeEditUsername();
});

editUsernameSaveBtn.addEventListener("click", async () => {
  editUsernameErr.textContent = "";
  const newValue = editUsernameInput.value.trim();
  const newLower = normalizeUsername(newValue);
  if (!newValue) {
    editUsernameErr.textContent = "Username tidak boleh kosong.";
    return;
  }
  if (!isValidUsername(newLower)) {
    editUsernameErr.textContent = "Username 3-20 karakter: huruf, angka, titik, atau underscore saja.";
    return;
  }
  if (!editingAuthEmail) {
    // Edge case: akun ini dibikin sebelum fitur index "usernames/" ada,
    // dan belum pernah login lagi sejak update ini di-deploy, jadi
    // authEmail-nya belum ke-backfill otomatis (lihat js/app.js#ensureUserDoc).
    // Tanpa authEmail asli itu, rename tidak aman dilakukan (kita bisa
    // salah nebak email login aslinya). Minta orangnya login dulu sekali.
    editUsernameErr.textContent = "User ini belum pernah login sejak fitur ganti-username diperbarui — minta dia Masuk sekali dulu, baru bisa di-rename.";
    return;
  }
  editUsernameSaveBtn.disabled = true;
  try {
    await renameUsername(editingUid, editingUsername, newValue, editingAuthEmail);
    closeEditUsername();
  } catch (e) {
    console.error(e);
    if (e.message === "username-taken") {
      editUsernameErr.textContent = "Username itu sudah dipakai orang lain.";
    } else {
      editUsernameErr.textContent = "Gagal simpan (izin ditolak). Pastikan firestore.rules sudah dipublish & kamu login sebagai developer.";
    }
  } finally {
    editUsernameSaveBtn.disabled = false;
  }
});

// ---------------------------------------------------------------------
// Modal "Ganti password" (khusus developer, buat akun ORANG LAIN).
//
// KENAPA LEWAT CLOUD FUNCTION: Firebase Auth di client CUMA bisa ganti
// password akun yang LAGI LOGIN di browser itu sendiri (updatePassword()),
// bukan akun orang lain — sama kayak keterbatasan "tidak bisa ganti email
// Auth akun orang lain tanpa Admin SDK" yang sudah dicatat di
// js/app.js#renameUsername. Jadi tombol ini manggil Cloud Function
// "adminChangePassword" (Admin SDK di server, lihat functions/index.js)
// yang double-check role developer si pemanggil sebelum override password
// akun target. Firestore SENDIRI tidak pernah nyimpen password siapapun.
//
// Fitur ini OPSIONAL buat di-deploy — kalau folder functions/ belum
// di-deploy (lihat README.md bagian "Setup Cloud Function (opsional) —
// Ganti Password"), tombol Simpan bakal gagal dengan pesan yang jelas
// ("belum di-deploy"), BUKAN bikin halaman lain di web ini rusak.
// ---------------------------------------------------------------------
let changingPasswordUid = null;
let changingPasswordUser = null;
let adminChangePasswordCallable = null;

function closeChangePassword() {
  changePasswordModal.classList.add("hidden");
  newPasswordInput.value = "";
  newPasswordConfirmInput.value = "";
  changePasswordErr.textContent = "";
  changingPasswordUid = null;
  changingPasswordUser = null;
}

function openChangePassword(uid, u) {
  changingPasswordUid = uid;
  changingPasswordUser = u || {};
  const waDigits = (u.waNumber || "").replace(/[^0-9]/g, "");
  changePasswordSub.textContent =
    `Set password login baru buat "${u.username || usernameLabel(u.email) || "user ini"}". Dia bisa tetap pakai username yang sama, tapi wajib pakai password baru ini lain kali Masuk.` +
    (waDigits
      ? " Setelah disimpan, kamu akan diarahkan ke WhatsApp dia buat kirim password barunya langsung (nomor WA sudah diisi di profilnya)."
      : " User ini belum isi No. WhatsApp di profilnya, jadi kamu harus kabari password barunya sendiri lewat cara lain (chat langsung, dsb).");
  newPasswordInput.value = "";
  newPasswordConfirmInput.value = "";
  changePasswordErr.textContent = "";
  changePasswordModal.classList.remove("hidden");
  newPasswordInput.focus();
}

changePasswordCancelBtn.addEventListener("click", closeChangePassword);
changePasswordModal.addEventListener("click", (e) => {
  if (e.target === changePasswordModal) closeChangePassword();
});
[newPasswordInput, newPasswordConfirmInput].forEach((inp) => {
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") changePasswordSaveBtn.click(); });
});

changePasswordSaveBtn.addEventListener("click", async () => {
  changePasswordErr.textContent = "";
  const pass = newPasswordInput.value;
  const confirm = newPasswordConfirmInput.value;
  if (!pass || !confirm) {
    changePasswordErr.textContent = "Isi dulu password baru & ulangi di kolom keduanya.";
    return;
  }
  if (pass.length < 6) {
    changePasswordErr.textContent = "Password baru minimal 6 karakter (batasan Firebase Auth).";
    return;
  }
  if (pass !== confirm) {
    changePasswordErr.textContent = "Password baru & ulangannya tidak sama.";
    return;
  }
  const uid = changingPasswordUid;
  changePasswordSaveBtn.disabled = true;
  changePasswordSaveBtn.textContent = "Menyimpan…";
  try {
    if (!adminChangePasswordCallable) {
      adminChangePasswordCallable = httpsCallable(functions, "adminChangePassword");
    }
    await adminChangePasswordCallable({ uid, newPassword: pass });
    // Password baru CUMA lewat di memori browser sebentar buat bikin link
    // wa.me ini (bukan disimpan lagi ke mana pun, Firestore tetap tidak
    // pernah nyimpen password siapapun — lihat catatan di atas). Kalau
    // user targetnya sudah isi No. WhatsApp di profil, buka tab wa.me
    // dengan pesan siap kirim (operator/developer yang klik "Kirim" di
    // WhatsApp, sama kayak pola "Notif WA" di dashboard printer/JS/printer.js)
    // biar password barunya nggak perlu dikirim manual lewat email.
    const target = changingPasswordUser || {};
    const loginLabel = target.username || usernameLabel(target.email) || "kamu";
    const waLink = waLinkTo(
      target.waNumber,
      `Halo ${loginLabel}, password akun D'Printing kamu sudah diganti oleh admin. Password baru: ${pass}\n\nSegera login pakai password ini, lalu disarankan ganti lagi lewat menu Profil biar cuma kamu yang tahu.`
    );
    closeChangePassword();
    if (waLink) {
      window.open(waLink, "_blank", "noopener");
    } else {
      usersPageErr.innerHTML = `Password berhasil diganti. User ini belum isi No. WhatsApp di profilnya — kabari password barunya sendiri lewat cara lain.`;
    }
  } catch (e) {
    console.error(e);
    const code = e && e.code;
    if (code === "functions/not-found" || code === "not-found") {
      changePasswordErr.textContent = "Cloud Function \"adminChangePassword\" belum di-deploy di project Firebase ini — lihat README.md bagian \"Setup Cloud Function (opsional) — Ganti Password\".";
    } else if (code === "functions/permission-denied" || code === "permission-denied") {
      changePasswordErr.textContent = "Ditolak: akun kamu tidak terdaftar sebagai developer di server (Cloud Function double-check ini terpisah dari firestore.rules).";
    } else if (code === "functions/unauthenticated" || code === "unauthenticated") {
      changePasswordErr.textContent = "Sesi login kamu bermasalah — coba refresh halaman lalu login ulang.";
    } else if (code === "functions/invalid-argument" || code === "invalid-argument") {
      changePasswordErr.textContent = (e && e.message) || "Password baru tidak valid.";
    } else {
      changePasswordErr.textContent = `Gagal ganti password (${code || "error tak dikenal"}) — cek Console browser (F12) buat detail.`;
    }
  } finally {
    changePasswordSaveBtn.disabled = false;
    changePasswordSaveBtn.textContent = "Simpan";
  }
});

const ROLE_OPTIONS = [
  { value: "customer", label: "customer" },
  { value: "printer", label: "printer" },
  { value: "developer", label: "developer" }
];

function rowHtml(d) {
  const u = d.data();
  const isMe = d.id === myUid;
  const banned = !!u.banned;
  // Dropdown Role: dropdown custom beranimasi (JS/app.js#customSelectHtml),
  // senada sama menu "Pilih tipe file" di Upload & menu status di Profil.
  const roleDropdownHtml = customSelectHtml(
    `roleSelect-${d.id}`,
    ROLE_OPTIONS,
    u.role,
    `custom-select-sm user-mgmt-role${isMe ? " is-disabled" : ""}`
  );
  return `
      <div class="user-mgmt-row ${banned ? "is-banned" : ""} ${isMe ? "is-me" : ""}" data-uid="${d.id}">
        <a href="profile.html?uid=${encodeURIComponent(d.id)}" class="user-mgmt-identity" title="Lihat profil & riwayat">
          ${avatarHtml(u, "sm")}
          <div class="user-mgmt-info">
            <div class="user-mgmt-name-line">
              <span class="user-mgmt-name">${escapeHtml(nameOf(u))}</span>
              ${isMe ? '<span class="user-mgmt-me-tag">kamu</span>' : ""}
              ${banned ? '<span class="ban-badge">Diblokir</span>' : ""}
              <span class="status-pill ${u.online ? "is-online" : "is-offline"}">
                <span class="status-dot"></span>${u.online ? "Online" : "Offline"}
              </span>
            </div>
            <div class="user-mgmt-email">${escapeHtml(u.contactEmail || u.email || "-")}</div>
          </div>
        </a>
        <div class="user-mgmt-actions">
          <button type="button" class="btn btn-outline btn-sm edit-username-btn" data-uid="${d.id}" title="Ganti username user ini (dia harus login pakai nama baru lain kali)">Edit username</button>
          <button type="button" class="btn btn-outline btn-sm change-password-btn" data-uid="${d.id}" title="Paksa-ganti password login user ini">Ganti password</button>
          ${roleDropdownHtml}
          <button type="button" class="btn btn-outline btn-sm ban-btn" data-uid="${d.id}" ${isMe ? "disabled" : ""}>${banned ? "Buka blokir" : "Ban"}</button>
          <button type="button" class="btn btn-stamp btn-sm delete-btn" data-uid="${d.id}" ${isMe ? "disabled" : ""}>Hapus</button>
        </div>
      </div>`;
}

function renderTabs(counts, total) {
  const tabs = [{ role: "all", label: "Semua", count: total }]
    .concat(CATEGORIES.map((c) => ({ role: c.role, label: c.label, count: counts[c.role] || 0 })));
  userTabs.innerHTML = tabs.map((t) => `
    <button type="button" class="tab-btn ${t.role === activeTab ? "active" : ""}" data-tab="${t.role}" role="tab" aria-selected="${t.role === activeTab}">
      ${t.label} <span class="usercat-count">${t.count}</span>
    </button>`).join("");
}

function render() {
  const term = searchInput.value.trim().toLowerCase();
  const filtered = allDocs.filter((d) => {
    if (!term) return true;
    const u = d.data();
    return (u.username || "").toLowerCase().includes(term) ||
           (u.email || "").toLowerCase().includes(term) ||
           (u.contactEmail || "").toLowerCase().includes(term);
  });

  // Badge jumlah di tab ikut hasil pencarian.
  const counts = {};
  filtered.forEach((d) => { const r = roleOf(d.data()); counts[r] = (counts[r] || 0) + 1; });
  renderTabs(counts, filtered.length);

  const shown = []; // dokumen yang benar-benar dirender (buat pasang event)
  userRows.innerHTML = CATEGORIES
    .filter((c) => activeTab === "all" || activeTab === c.role)
    .map((c) => {
      const list = filtered
        .filter((d) => roleOf(d.data()) === c.role)
        // online dulu, lalu urut nama
        .sort((a, b) => (Number(!!b.data().online) - Number(!!a.data().online)) || nameOf(a.data()).localeCompare(nameOf(b.data())));
      shown.push(...list);
      const onlineCount = list.filter((d) => d.data().online).length;
      return `
      <section class="usercat-section">
        <h2 class="usercat-title">${c.label}
          <span class="usercat-count">${list.length}</span>
          ${list.length ? `<span class="usercat-online">${onlineCount} online</span>` : ""}
        </h2>
        <div class="user-mgmt-list">
          ${list.length ? list.map(rowHtml).join("") : `<div class="empty-state">${term ? "Tidak ada user yang cocok." : c.empty}</div>`}
        </div>
      </section>`;
    }).join("");

  const docs = shown;

  docs.forEach((d) => {
    const root = document.getElementById(`roleSelect-${d.id}`);
    if (!root) return;
    // isMe dikunci lewat class "is-disabled" (dicek di wireCustomSelect,
    // JS/app.js) — sama efeknya kayak atribut disabled di <select> lama,
    // supaya developer tidak bisa turunin role dirinya sendiri sendirian.
    wireCustomSelect(root, async (role) => {
      usersPageErr.innerHTML = "";
      try {
        await updateDoc(doc(db, "users", d.id), { role });
      } catch (e) {
        console.error(e);
        usersPageErr.innerHTML = describeFirestoreError(e, "ubah role");
      }
    });
  });

  userRows.querySelectorAll(".ban-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.uid;
      const target = allDocs.find((d) => d.id === uid);
      const banned = !!(target && target.data().banned);
      const ok = await askConfirm({
        title: banned ? "Buka blokir user?" : "Blokir user ini?",
        body: banned ? "User bisa login lagi setelah ini." : "User akan otomatis logout dan tidak bisa login lagi sampai dibuka blokirnya.",
        confirmLabel: banned ? "Buka blokir" : "Blokir user"
      });
      if (!ok) return;
      usersPageErr.innerHTML = "";
      try {
        await updateDoc(doc(db, "users", uid), { banned: !banned });
      } catch (e) {
        console.error(e);
        usersPageErr.innerHTML = describeFirestoreError(e, "ubah status blokir");
      }
    });
  });

  userRows.querySelectorAll(".edit-username-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = btn.dataset.uid;
      const target = allDocs.find((d) => d.id === uid);
      openEditUsername(uid, target ? target.data() : {});
    });
  });

  userRows.querySelectorAll(".change-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = btn.dataset.uid;
      const target = allDocs.find((d) => d.id === uid);
      openChangePassword(uid, target ? target.data() : {});
    });
  });

  userRows.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.uid;
      const ok = await askConfirm({
        title: "Hapus user ini?",
        body: "Ini menghapus profil & SEMUA datanya dari database (Firestore) secara permanen: postingan & gambar yang dia upload, file/pesanan yang dia upload lewat menu Upload, like yang dia kasih, dan komentar yang dia tulis (di postingan sendiri maupun punya orang lain) — semuanya ikut kehapus. Kalau dia lagi login sekarang, dia akan langsung otomatis logout saat ini juga (tidak perlu logout manual). Catatan: akun login (Firebase Auth) tidak otomatis ikut terhapus — kalau orang ini Masuk lagi, akunnya akan dibuatkan ulang otomatis dengan role \"customer\" (lihat README bagian Kelola User untuk detail & cara menutup akun login itu total lewat Cloud Function/Admin SDK).",
        confirmLabel: "Hapus user"
      });
      if (!ok) return;
      usersPageErr.innerHTML = "";
      btn.disabled = true;
      const originalLabel = btn.textContent;
      btn.textContent = "Menghapus…";
      try {
        await deleteUserContent(uid);
        await deleteDoc(doc(db, "users", uid));
      } catch (e) {
        console.error(e);
        // Sebelumnya cuma alert() generik "izin ditolak atau error" tanpa
        // alasan asli — jadi kalau gagalnya gara-gara index Firestore
        // (collection group index buat likes/comments, lihat
        // JSON/firestore.indexes.json) belum ke-deploy, orangnya nggak
        // pernah dikasih tau/link buat langsung bikin index-nya. Sekarang
        // pakai describeFirestoreError() yang sama kayak di tempat lain di
        // file ini, biar pesannya kasih tau alasan aslinya (izin/rules
        // belum publish, index belum jadi + link buatnya, dst).
        usersPageErr.innerHTML = describeFirestoreError(e, "hapus user");
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
}

requireAuth((user, profile) => {
  myUid = user.uid;
  initShell({ user, profile, active: "users" });
  initBubbleMenu(profile);
  searchInput.addEventListener("input", render);
  userTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    activeTab = btn.dataset.tab;
    render();
  });
  onSnapshot(collection(db, "users"), (snap) => {
    allDocs = snap.docs;
    render();
  }, (err) => {
    console.error(err);
    userRows.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat daftar user")}</div>`;
  });
}, "developer");
