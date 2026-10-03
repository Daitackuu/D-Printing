import { db, auth } from "./firebase-config.js";
import { fmtDate, fmtRupiah, fmtFileSize, watchOwnAccount, usernameLabel, describeFirestoreError, generateJobCode, jobCodeLabel, openReasonPrompt, iconImg, regionKeyFrom, regionLabel, regionSnapshot, customSelectHtml, wireCustomSelect, askConfirm, showToast, animateJobRows } from "./app.js";

import { initShell } from "./shell.js";
import { getGuestInfo, guestLocation, guestWaNumber, guestInfoError } from "./guest.js";
import { backupGuestProfile } from "./guest-sync.js";
import { enforceRecoveryGate } from "./guest-gate.js";
import { loadGuestJobs, guestJobDocs, upsertGuestJobs, patchGuestJob, removeGuestJob, FINAL_STATUSES } from "./guest-jobs.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, addDoc, query, where, getDocs, onSnapshot,
  orderBy, serverTimestamp, doc, updateDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./cloudinary-config.js";

// Upload file ke Cloudinary (unsigned preset) lewat XHR supaya progress
// bar tetap jalan. Return-nya URL publik file yang bisa dibuka operator.
function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error("Cloudinary upload gagal: " + xhr.status));
      }
    };
    xhr.onerror = () => reject(new Error("Koneksi upload gagal"));
    xhr.send(form);
  });
}

const typeLabel = document.getElementById("typeLabel");
const dropzone = document.getElementById("dropzone");
const dzHint = document.getElementById("dzHint");
const stagedList = document.getElementById("stagedList");
const sendActions = document.getElementById("sendActions");
const stagedCancelBtn = document.getElementById("stagedCancelBtn");
const stagedSendBtn = document.getElementById("stagedSendBtn");
const caretBtn = document.getElementById("caretBtn");
const caretArrowBtn = document.getElementById("caretArrowBtn");
const filetypeMenu = document.getElementById("filetypeMenu");
const fileInput = document.getElementById("fileInput");
const customerNoteInput = document.getElementById("customerNoteInput");
const customerNoteWrap = document.getElementById("customerNoteWrap");
const helperText = document.getElementById("helperText");
const errMsg = document.getElementById("errMsg");
const progressTrack = document.getElementById("progressTrack");
const progressFill = document.getElementById("progressFill");
const jobList = document.getElementById("jobList");
const printerCtaCard = document.getElementById("printerCtaCard");
const paperSizeWrap = document.getElementById("paperSizeWrap");
const paperSizeSelect = document.getElementById("paperSizeSelect");
const paperSizeCustomInput = document.getElementById("paperSizeCustomInput");
const paperSizeManageBtn = document.getElementById("paperSizeManageBtn");
const paperSizeModal = document.getElementById("paperSizeModal");
const paperSizeManageList = document.getElementById("paperSizeManageList");
const paperSizeNewInput = document.getElementById("paperSizeNewInput");
const paperSizeAddBtn = document.getElementById("paperSizeAddBtn");
const paperSizeManageErr = document.getElementById("paperSizeManageErr");
const paperSizeManageClose = document.getElementById("paperSizeManageClose");
const typeWarnModal = document.getElementById("typeWarnModal");
const typeWarnCancel = document.getElementById("typeWarnCancel");
const typeWarnPick = document.getElementById("typeWarnPick");

let currentAccept = null;
let staged = []; // file yang sudah dipilih tapi BELUM dikonfirmasi (belum Kirim)
let sending = false;
const MAX_STAGED = 10;
let currentUser = null;
let currentProfile = null;
let unsubscribeJobs = null;
let isDeveloper = false;

// ---------------------------------------------------------------------
// MODE TAMU. Orang yang belum login/daftar BOLEH upload seperti biasa
// (halaman lain tetap butuh akun, lihat requireAuth() di app.js +
// firestore.rules). Nama, No. WhatsApp, dan wilayah tamu diambil dari
// PROFIL TAMU (profile.html, disimpan di browser — lihat guest.js).
// Identitasnya = sesi Firebase Anonymous Auth yang baru dibuat pas dia
// menekan Kirim (bukan pas halaman dibuka).
// ---------------------------------------------------------------------
function isGuestSession() {
  return !currentUser || currentUser.isAnonymous;
}
// Tamu: kalau data diri belum lengkap, munculkan popup notifikasi (toast) —
// sama persis kayak user login. Kalau yang kurang cuma wilayah, isinya IDENTIK
// dengan popup "Lokasi belum lengkap" milik user login.
function ensureGuestInfo() {
  const msg = guestInfoError();
  if (!msg) return true;
  const info = getGuestInfo();
  const personalOk = String(info.name || "").trim() && /^\d{9,15}$/.test(guestWaNumber(info));
  if (personalOk) {
    showLocationIncompletePopup();
  } else {
    showToast({
      type: "warning", icon: "Warning", duration: 8000,
      title: "Data diri belum lengkap",
      message: msg,
      actionLabel: "Lengkapi di Profil →",
      onAction: () => { window.location.href = "profile.html"; }
    });
  }
  return false;
}

// ---------------------------------------------------------------------
// Kelola daftar pilihan "Ukuran kertas" — bisa ditambah, diubah nama,
// dan dihapus (KHUSUS developer) lewat tombol gigi di sebelah dropdown.
// Opsi "Custom…" SENGAJA tidak masuk daftar ini (dia opsi tetap) supaya
// selalu ada jalan buat customer nulis ukuran bebas.
//
// SUMBER KEBENARAN = dokumen Firestore `settings/paperSizes` ({ sizes: [...] }),
// jadi daftarnya SAMA untuk semua orang (tamu maupun akun terdaftar) dan
// berubah real-time begitu developer mengubahnya. localStorage cuma cache
// supaya dropdown langsung terisi sebelum server menjawab / saat offline.
// ---------------------------------------------------------------------
const PAPER_SIZE_STORAGE_KEY = "dcp_paperSizes";
const DEFAULT_PAPER_SIZES = ["A4", "A5", "A3", "F4 / Legal", "Letter"];
const isStringList = (a) => Array.isArray(a) && a.every((v) => typeof v === "string");

function loadPaperSizes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PAPER_SIZE_STORAGE_KEY) || "null");
    return isStringList(parsed) ? parsed : DEFAULT_PAPER_SIZES.slice();
  } catch (e) {
    return DEFAULT_PAPER_SIZES.slice();
  }
}
function cachePaperSizes() {
  try { localStorage.setItem(PAPER_SIZE_STORAGE_KEY, JSON.stringify(paperSizes)); } catch (e) { /* abaikan */ }
}
let paperSizes = loadPaperSizes();
let paperDocMissing = false; // true kalau server belum punya dokumen daftar ukuran

// Simpan daftar BARU ke Firestore (hanya developer yang lolos rules).
// Return true kalau berhasil; kalau gagal, pesan alasan ditaruh di modal kelola.
async function savePaperSizes(next) {
  try {
    await setDoc(doc(db, "settings", "paperSizes"), {
      sizes: next, updatedAt: serverTimestamp(), updatedBy: currentUser.uid
    });
    paperDocMissing = false;
    return true;
  } catch (e) {
    console.error(e);
    paperSizeManageErr.innerHTML = describeFirestoreError(e, "menyimpan pilihan ukuran kertas");
    return false;
  }
}

// Terapkan daftar ke layar (dropdown + daftar kelola) & cache. preferValue =
// pilihan yang mau dipertahankan di dropdown.
function applyPaperSizes(next, preferValue) {
  paperSizes = next;
  cachePaperSizes();
  if (!paperSizeModal.classList.contains("hidden")) renderPaperSizeManageList();
  renderPaperSizeSelect(preferValue);
}

// Ubah daftar secara optimistis, lalu simpan; kalau gagal, kembalikan.
async function commitPaperSizes(next, preferValue) {
  const prev = paperSizes;
  applyPaperSizes(next, preferValue);
  if (await savePaperSizes(next)) return true;
  const err = paperSizeManageErr.innerHTML;
  applyPaperSizes(prev);
  paperSizeManageErr.innerHTML = err; // renderPaperSizeManageList menghapus pesan; tampilkan lagi
  return false;
}

// Value yang lagi aktif di dropdown custom "Ukuran kertas" — disimpan di
// data-value milik #paperSizeCustomSelect (lihat customSelectHtml() di
// JS/app.js), bukan di #paperSizeSelect sendiri (itu cuma <div>
// pembungkus kosong dari HTML).
function currentPaperSizeValue() {
  return document.getElementById("paperSizeCustomSelect")?.dataset.value;
}

// Bangun ulang dropdown custom (JS/app.js#customSelectHtml/wireCustomSelect)
// dari array paperSizes + opsi "Custom…" yang selalu ditaruh terakhir dan
// tidak pernah ikut dihapus/diubah. Dulu ini <select> bawaan browser;
// sekarang dropdown custom beranimasi biar senada sama menu "Pilih tipe
// file" & menu ganti status di Profil (lihat CSS/style.css #custom-select).
// preferValue: value yang mau dipertahankan terpilih kalau masih ada
// setelah dibangun ulang (dipakai pas nambah/ubah/hapus daftar).
function renderPaperSizeSelect(preferValue) {
  const wanted = preferValue !== undefined ? preferValue : currentPaperSizeValue();
  const options = [
    ...paperSizes.map((s) => ({ value: s, label: s })),
    { value: "custom", label: "Custom…" }
  ];
  const stillExists = options.some((o) => o.value === wanted);
  const nextValue = stillExists ? wanted : (paperSizes[0] || "custom");
  // #paperSizeSelect di upload.html cuma <div> pembungkus kosong —
  // markup dropdown custom-nya (tombol + menu beranimasi) ditaruh di
  // dalamnya lewat customSelectHtml() dari JS/app.js.
  paperSizeSelect.innerHTML = customSelectHtml("paperSizeCustomSelect", options, nextValue);
  wirePaperSizeSelect();
  paperSizeCustomInput.classList.toggle("hidden", nextValue !== "custom");
}

function wirePaperSizeSelect() {
  const root = document.getElementById("paperSizeCustomSelect");
  if (!root) return;
  wireCustomSelect(root, (value) => {
    paperSizeCustomInput.classList.toggle("hidden", value !== "custom");
    if (value === "custom") paperSizeCustomInput.focus();
  });
}
renderPaperSizeSelect(paperSizes[0] || "custom");

// Berlangganan daftar resmi dari server — jalan juga untuk tamu tanpa sesi
// (rules: settings boleh dibaca siapa saja). Tiap developer mengubah daftar,
// dropdown semua orang ikut berubah.
onSnapshot(doc(db, "settings", "paperSizes"), (snap) => {
  if (!snap.exists()) {
    paperDocMissing = true;
    seedPaperSizesIfDeveloper();
    return;
  }
  paperDocMissing = false;
  const sizes = snap.data().sizes;
  if (!isStringList(sizes)) return;
  if (JSON.stringify(sizes) === JSON.stringify(paperSizes)) return; // tidak berubah
  applyPaperSizes(sizes.slice());
}, (err) => console.error("Gagal memuat daftar ukuran kertas (pakai cache):", err));

// Server belum punya daftar resmi: developer yang pertama membuka halaman
// ini menjadikan daftar yang dia lihat (cache/bawaan) sebagai daftar resmi.
function seedPaperSizesIfDeveloper() {
  if (isDeveloper && paperDocMissing && currentUser) {
    paperDocMissing = false;
    savePaperSizes(paperSizes.slice());
  }
}

// Baca ukuran kertas yang lagi dipilih di dropdown — dipanggil pas file
// mau diupload (lihat uploadFile di bawah), bukan disimpan lebih awal,
// supaya selalu ambil pilihan TERBARU tepat sebelum upload jalan.
function currentPaperSize() {
  const value = currentPaperSizeValue();
  if (value === "custom") {
    return paperSizeCustomInput.value.trim() || "Custom";
  }
  return value || (paperSizes[0] || "Custom");
}

// ---- modal "Kelola pilihan ukuran kertas" (tambah / ubah / hapus) ----
function renderPaperSizeManageList() {
  paperSizeManageErr.textContent = "";
  const rows = paperSizes.map((s, i) => `
    <div class="job-row">
      <div class="job-name">${escapeHtml(s)}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="btn btn-outline btn-icon btn-icon-sm" data-edit="${i}" title="Ubah" aria-label="Ubah">${iconImg("Edit-Dark", "Ubah")}</button>
        <button type="button" class="btn btn-outline btn-icon btn-icon-sm" data-delete="${i}" title="Hapus" aria-label="Hapus">${iconImg("Trash-Dark", "Hapus")}</button>
      </div>
    </div>`).join("");
  // Baris "Custom…" ditampilkan biar kelihatan di daftar, tapi terkunci
  // (tanpa tombol Ubah/Hapus) — sesuai permintaan: opsi ini tidak boleh
  // diedit atau dihapus siapa pun.
  const lockedRow = `
    <div class="job-row">
      <div class="job-name">Custom…</div>
      <div class="job-meta">Terkunci — tidak bisa diubah/dihapus</div>
    </div>`;
  paperSizeManageList.innerHTML = rows + lockedRow;

  paperSizeManageList.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.edit);
      const oldVal = paperSizes[idx];
      const next = window.prompt("Ubah nama ukuran kertas:", oldVal);
      if (next === null) return; // batal
      const trimmed = next.trim();
      if (!trimmed) { paperSizeManageErr.textContent = "Nama ukuran tidak boleh kosong."; return; }
      if (trimmed.toLowerCase() === "custom" || trimmed.toLowerCase() === "custom…") {
        paperSizeManageErr.textContent = "Nama itu dipakai buat opsi Custom… bawaan, pakai nama lain ya.";
        return;
      }
      if (paperSizes.some((s, j) => j !== idx && s.toLowerCase() === trimmed.toLowerCase())) {
        paperSizeManageErr.textContent = "Sudah ada ukuran dengan nama itu.";
        return;
      }
      const wasSelected = currentPaperSizeValue() === oldVal;
      const nextList = paperSizes.slice();
      nextList[idx] = trimmed;
      commitPaperSizes(nextList, wasSelected ? trimmed : undefined);
    });
  });
  paperSizeManageList.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.delete);
      const val = paperSizes[idx];
      if (!(await askConfirm({ title: "Hapus pilihan ukuran", body: `Hapus pilihan ukuran "${val}"?`, confirmLabel: "Hapus" }))) return;
      const nextList = paperSizes.slice();
      nextList.splice(idx, 1);
      commitPaperSizes(nextList);
    });
  });
}

paperSizeManageBtn.addEventListener("click", () => {
  if (!isDeveloper) return; // jaga-jaga kalau tombolnya dipaksa ditampilkan lewat devtools
  renderPaperSizeManageList();
  paperSizeModal.classList.remove("hidden");
});
paperSizeAddBtn.addEventListener("click", () => {
  const val = paperSizeNewInput.value.trim();
  if (!val) { paperSizeManageErr.textContent = "Isi nama ukuran dulu."; return; }
  if (val.toLowerCase() === "custom" || val.toLowerCase() === "custom…") {
    paperSizeManageErr.textContent = "Nama itu dipakai buat opsi Custom… bawaan, pakai nama lain ya.";
    return;
  }
  if (paperSizes.some((s) => s.toLowerCase() === val.toLowerCase())) {
    paperSizeManageErr.textContent = "Sudah ada ukuran dengan nama itu.";
    return;
  }
  paperSizeNewInput.value = "";
  commitPaperSizes([...paperSizes, val], val);
});
paperSizeNewInput.addEventListener("keydown", (e) => { if (e.key === "Enter") paperSizeAddBtn.click(); });
paperSizeManageClose.addEventListener("click", () => paperSizeModal.classList.add("hidden"));
paperSizeModal.addEventListener("click", (e) => { if (e.target === paperSizeModal) paperSizeModal.classList.add("hidden"); });

// --- dropdown: panah menampilkan 3 opsi tipe file ---
// Tombol label & tombol panah dipisah tampilannya, tapi fungsinya SAMA:
// klik yang mana pun membuka/menutup daftar tipe file.
function syncTypeMenuAria() {
  const open = filetypeMenu.classList.contains("open");
  caretBtn.setAttribute("aria-expanded", String(open));
  caretArrowBtn.setAttribute("aria-expanded", String(open));
}
function toggleTypeMenu(e) {
  e.stopPropagation();
  filetypeMenu.classList.toggle("open");
  syncTypeMenuAria();
}
caretBtn.addEventListener("click", toggleTypeMenu);
caretArrowBtn.addEventListener("click", toggleTypeMenu);
document.addEventListener("click", () => { filetypeMenu.classList.remove("open"); syncTypeMenuAria(); });

filetypeMenu.querySelectorAll("button[data-accept]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentAccept = btn.dataset.accept;
    fileInput.setAttribute("accept", currentAccept);
    typeLabel.textContent = btn.textContent.trim();
    helperText.textContent = `Tipe dipilih: ${btn.textContent.trim()}. Klik atau seret file/folder ke area upload, lalu tekan Kirim.`;
    clearStaged(); // ganti tipe = daftar lama dikosongkan biar tidak campur tipe
    updateDzHint();
    filetypeMenu.classList.remove("open");
    syncTypeMenuAria();
    // Kolom "Ukuran kertas" & "Catatan buat operator" sengaja disembunyikan
    // sampai tipe file dipilih dulu — baru relevan buat diisi kalau sudah
    // jelas mau upload apa.
    paperSizeWrap.classList.remove("hidden");
    customerNoteWrap.classList.remove("hidden");
  });
});

// Area upload (klik / drag & drop file ATAU folder). File cuma DITAMPUNG
// dulu ke daftar `staged` — baru benar-benar diupload setelah tekan Kirim,
// dan bisa dibatalkan (Batal) selama belum dikonfirmasi.
async function canPick() {
  if (isGuestSession()) {
    if (!(await ensureGuestInfo())) return false;
  } else if (!customerRegionKey()) {
    await showLocationIncompletePopup();
    return false;
  }
  setErrMsg("");
  if (!currentAccept) {
    typeWarnModal.classList.remove("hidden");
    return false;
  }
  return true;
}

function updateDzHint() {
  dzHint.innerHTML = currentAccept
    ? `Menerima <b>${escapeHtml(currentAccept.replace(/,/g, " "))}</b> · folder juga bisa`
    : "Pilih tipe file dulu di atas";
}

dropzone.addEventListener("click", async () => {
  if (sending) return;
  if (await canPick()) fileInput.click();
});
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dropzone.click(); }
});
["dragenter", "dragover"].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  if (!sending) dropzone.classList.add("dz-over");
}));
["dragleave", "dragend"].forEach((ev) => dropzone.addEventListener(ev, () => dropzone.classList.remove("dz-over")));
// Cegah browser buka file kalau salah drop di luar area.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

// Telusuri entry hasil drop (file / folder, rekursif) jadi array File.
function readEntry(entry) {
  return new Promise((resolve) => {
    if (entry.isFile) { entry.file((f) => resolve([f]), () => resolve([])); return; }
    const reader = entry.createReader();
    const all = [];
    const next = () => reader.readEntries(async (batch) => {
      if (!batch.length) { resolve((await Promise.all(all.map(readEntry))).flat()); return; }
      all.push(...batch);
      next(); // readEntries cuma balikin ±100 per panggilan
    }, () => resolve([]));
    next();
  });
}

dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropzone.classList.remove("dz-over");
  if (sending) return;
  // webkitGetAsEntry harus dipanggil SINKRON sebelum await apa pun.
  const entries = Array.from(e.dataTransfer.items || [])
    .map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
  const plain = Array.from(e.dataTransfer.files || []);
  if (!(await canPick())) return;
  const files = entries.length ? (await Promise.all(entries.map(readEntry))).flat() : plain;
  addFiles(files);
});

function fileMatchesAccept(file) {
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  return currentAccept.split(",").includes(ext);
}

function addFiles(files) {
  const ok = files.filter(fileMatchesAccept);
  const skipped = files.length - ok.length;
  let over = 0;
  for (const f of ok) {
    if (staged.some((s) => s.name === f.name && s.size === f.size && s.lastModified === f.lastModified)) continue;
    if (staged.length >= MAX_STAGED) { over++; continue; }
    staged.push(f);
  }
  const notes = [];
  if (skipped) notes.push(`${skipped} file dilewati karena bukan tipe ${currentAccept.replace(/,/g, "/")}.`);
  if (over) notes.push(`Maksimal ${MAX_STAGED} file sekali kirim, ${over} file tidak dimasukkan.`);
  setErrMsg(notes.join(" "));
  renderStaged();
}

function renderStaged() {
  stagedList.innerHTML = staged.map((f, i) => `
    <div class="staged-row">
      <div style="min-width:0;">
        <div class="staged-name">${escapeHtml(f.name)}</div>
        <div class="staged-meta">${fmtFileSize(f.size)}</div>
      </div>
      <button type="button" class="btn btn-outline btn-icon btn-icon-sm" data-remove="${i}" title="Hapus dari daftar" aria-label="Hapus dari daftar">${iconImg("Reject", "Hapus")}</button>
    </div>`).join("");
  sendActions.classList.toggle("hidden", staged.length === 0);
  stagedSendBtn.textContent = staged.length > 1 ? `Kirim ${staged.length} file` : "Kirim";
  stagedList.querySelectorAll("button[data-remove]").forEach((b) => {
    b.addEventListener("click", () => { staged.splice(Number(b.dataset.remove), 1); renderStaged(); });
  });
}
function clearStaged() { staged = []; renderStaged(); }

stagedCancelBtn.addEventListener("click", () => {
  clearStaged();
  setErrMsg("");
  resetTypeState(false); // tipe file kosong lagi, catatan dipertahankan
  helperText.textContent = "Dibatalkan. Pilih tipe file dulu lewat tombol di atas, lalu seret file ke area upload.";
});
stagedSendBtn.addEventListener("click", () => sendStaged());

typeWarnCancel.addEventListener("click", () => {
  typeWarnModal.classList.add("hidden");
});
typeWarnPick.addEventListener("click", () => {
  typeWarnModal.classList.add("hidden");
  filetypeMenu.classList.add("open");
  syncTypeMenuAria();
});
typeWarnModal.addEventListener("click", (e) => {
  if (e.target === typeWarnModal) typeWarnModal.classList.add("hidden");
});

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []);
  fileInput.value = "";
  if (files.length) addFiles(files);
});

// Wilayah customer (Provinsi + Kota/Kab + Kecamatan + Kelurahan/Desa) harus
// lengkap dulu — order cuma bisa sampai ke operator yang wilayahnya sama
// persis, jadi tanpa wilayah lengkap pesanan tidak akan pernah kelihatan
// di dashboard operator mana pun.
const REGION_INCOMPLETE_MSG = "Lengkapi dulu lokasi kamu (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan/Desa) di menu Profil → Edit profil. Pesanan cuma dikirim ke operator yang wilayahnya sama denganmu.";

// Kecil ini buat 1 pintu keluar-masuk errMsg — pesan error biasa (upload
// gagal, dst.) langsung ditulis di sini. Khusus wilayah belum lengkap,
// PAKAI showLocationIncompletePopup() di bawah (popup, bukan pesan +
// tombol yang nempel di form ini lagi).
function setErrMsg(text) {
  errMsg.textContent = text;
}

// Popup "lokasi belum lengkap" — SAMA buat user login & tamu: popup notifikasi
// (toast, gaya yang sama kayak notifikasi lain di app ini), BUKAN modal konfirmasi.
// Isinya sama persis; tombol "Lengkapi di Profil" langsung membawa ke
// profile.html (form terbuka & di-scroll ke bagian Lokasi). Ditutup lewat tanda
// x atau hilang sendiri — tidak memblokir halaman.
function showLocationIncompletePopup() {
  showToast({
    type: "warning", icon: "Warning", duration: 8000,
    title: "Lokasi belum lengkap",
    message: REGION_INCOMPLETE_MSG,
    actionLabel: "Lengkapi di Profil →",
    onAction: () => { window.location.href = "profile.html#locationLabel"; }
  });
}

function customerLocation() {
  return isGuestSession() ? guestLocation() : (currentProfile && currentProfile.location);
}
function customerRegionKey() {
  return regionKeyFrom(customerLocation());
}

// Cari operator print yang sedang online DAN wilayahnya sama persis dengan
// customer (field regionKey), pilih salah satu secara acak (load balancing
// sederhana). Kalau tidak ada yang online di wilayah itu, job disimpan
// dengan status "waiting" dan akan diambil otomatis oleh operator
// pertama di wilayah yang sama yang online (lihat js/printer.js).
// excludeUid: siapapun yang lagi upload (customer/developer/operator SEKALIPUN
// dia sendiri juga punya role "printer") TIDAK BOLEH ke-pilih buat ngeprint
// pesanannya sendiri — jadi selalu dikecualikan dari calon operator di sini.
async function pickOnlinePrinter(regionKey, excludeUid) {
  const q = query(
    collection(db, "users"),
    where("role", "==", "printer"),
    where("online", "==", true),
    where("regionKey", "==", regionKey)
  );
  const snap = await getDocs(q);
  const printers = snap.docs.filter((d) => d.id !== excludeUid);
  if (printers.length === 0) return null;
  const chosen = printers[Math.floor(Math.random() * printers.length)];
  return { id: chosen.id, ...chosen.data() };
}

// Upload 1 file + bikin dokumen printJobs-nya. Return {printer, jobCode}.
async function uploadFile(file, regionKey, onPct) {
  const guest = isGuestSession();
  const loc = customerLocation();
  const fileURL = await uploadToCloudinary(file, onPct);
  // Tamu dan user login diperlakukan SAMA: cari operator online di wilayah
  // yang sama, lalu tugaskan langsung. Kalau pencarian gagal (mis. rules
  // lama belum dipublish) pesanan tetap terkirim dengan status "waiting"
  // dan diambil operator lewat dashboard.
  let printer = null;
  try {
    printer = await pickOnlinePrinter(regionKey, currentUser.uid);
  } catch (e) {
    console.error("Gagal mencari operator online, pesanan masuk antrean:", e);
  }
  const jobCode = generateJobCode();

  // Job yang langsung ketemu operator online statusnya "pending" (nunggu
  // operator Terima/Tolak); kalau tidak ada operator online tetap "waiting".
  const jobData = {
    customerId: currentUser.uid,
    customerEmail: guest ? null : currentUser.email,
    ...(guest ? { customerName: getGuestInfo().name.trim(), isGuest: true } : {}),
    customerWaNumber: guest ? guestWaNumber() : ((currentProfile && currentProfile.waNumber) || null),
    regionKey,
    customerLocation: regionSnapshot(loc),
    printerId: printer ? printer.id : null,
    printerEmail: printer ? printer.email : null,
    code: jobCode,
    fileName: file.name,
    fileURL,
    fileType: currentAccept,
    fileSize: file.size,
    paperSize: currentPaperSize(),
    note: customerNoteInput.value.trim() || null,
    price: null,
    status: printer ? "pending" : "waiting",
    createdAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, "printJobs"), jobData);
  // Tamu: simpan salinan di perangkat SEKARANG JUGA, supaya riwayatnya tetap
  // ada walau sesi anonymous hilang (keluar/ganti akun/hapus data sesi).
  if (guest) upsertGuestJobs([[ref.id, { ...jobData, createdAt: Date.now() }]]);
  return { printer, jobCode, jobId: ref.id };
}

// Dipanggil tombol Kirim (konfirmasi). Tiap file jadi 1 pesanan sendiri
// dengan kode sendiri. File yang gagal tetap ada di daftar buat dicoba lagi.
async function sendStaged() {
  if (sending || !staged.length) return;
  if (isGuestSession()) {
    if (!(await ensureGuestInfo())) return;
  }
  const regionKey = customerRegionKey();
  if (!regionKey) { await showLocationIncompletePopup(); return; }
  sending = true;
  setErrMsg("");
  stagedSendBtn.disabled = stagedCancelBtn.disabled = true;
  progressTrack.classList.remove("hidden");
  progressFill.style.width = "0%";

  // Tamu: buat sesi anonymous dulu (sekali; sesi ini disimpan browser jadi
  // riwayat upload tamu tetap ada saat halaman dibuka lagi).
  if (!currentUser) {
    try {
      const cred = await signInAnonymously(auth);
      currentUser = cred.user;
    } catch (e) {
      console.error(e);
      const notEnabled = e && (e.code === "auth/operation-not-allowed" || e.code === "auth/admin-restricted-operation");
      // Cara mengaktifkan (Firebase Console) cuma ditampilkan ke role developer.
      // Tamu / user biasa cukup dapat pesan netral tanpa detail setup server.
      setErrMsg(notEnabled
        ? (isDeveloper
            ? "Mode tamu belum aktif di server. Aktifkan Anonymous di Firebase Console → Authentication → Sign-in method."
            : "Mode tamu sedang tidak tersedia. Silakan masuk / daftar dulu, atau coba lagi nanti.")
        : "Gagal menyiapkan sesi tamu, coba lagi.");
      sending = false;
      progressTrack.classList.add("hidden");
      stagedSendBtn.disabled = stagedCancelBtn.disabled = false;
      renderStaged();
      return;
    }
  }

  const batch = staged.slice();
  const sent = [];
  let failed = 0;
  for (let i = 0; i < batch.length; i++) {
    stagedSendBtn.textContent = `Mengirim ${i + 1}/${batch.length}…`;
    try {
      const r = await uploadFile(batch[i], regionKey, (pct) => {
        progressFill.style.width = (((i + pct / 100) / batch.length) * 100) + "%";
      });
      sent.push({ ...r, name: batch[i].name });
      staged = staged.filter((f) => f !== batch[i]);
    } catch (e) {
      console.error(e);
      failed++;
    }
  }

  sending = false;
  progressTrack.classList.add("hidden");
  stagedSendBtn.disabled = stagedCancelBtn.disabled = false;
  renderStaged();

  // Tamu: perbarui cadangan cloud (daftar id pesanan ikut tersimpan).
  if (sent.length && isGuestSession()) backupGuestProfile();

  if (sent.length) {
    const codes = sent.map((r) => `<strong class="job-code">#${escapeHtml(r.jobCode)}</strong>`).join(", ");
    const where = sent.length > 1
      ? `${sent.length} file terkirim (operator dipilih per file).`
      : (sent[0].printer
        ? `Terkirim ke operator online (${escapeHtml(usernameLabel(sent[0].printer.email))}) — menunggu dia konfirmasi terima pesanan.`
        : `Belum ada operator online di wilayahmu (${escapeHtml(regionLabel(customerLocation()))}) — file akan diambil otomatis begitu ada operator di wilayah yang sama yang online.`);
    helperText.innerHTML = `${where} Kode pesanan kamu: ${codes} — simpan/sebutkan kode ini kalau mau tanya ke operator, biar gampang & nggak salah pesanan. Pilih tipe file lagi buat upload berikutnya.`;
    showToast({
      type: "success",
      title: "Upload berhasil",
      message: sent.length > 1
        ? `${sent.length} file terkirim. Kode: ${sent.map((r) => "#" + r.jobCode).join(", ")}.`
        : `${sent[0].name} terkirim. Kode pesanan #${sent[0].jobCode}.`
    });
  }
  if (failed) {
    // Catatan yang sudah diketik jangan hilang kalau ada yang gagal.
    setErrMsg(`${failed} file gagal terkirim, masih ada di daftar — coba tekan Kirim lagi.`);
    return;
  }
  // Semua sukses: paksa pilih tipe lagi buat upload berikutnya.
  resetTypeState(true);
}

// Balikin form ke kondisi "belum pilih tipe file". clearNote=false dipakai
// pas Batal: tipe & ukuran kertas di-reset, tapi catatan yang sudah diketik
// TETAP ada (cuma kolomnya disembunyikan sampai tipe dipilih lagi).
function resetTypeState(clearNote) {
  currentAccept = null;
  fileInput.removeAttribute("accept");
  typeLabel.textContent = "Pilih tipe file";
  updateDzHint();
  paperSizeWrap.classList.add("hidden");
  customerNoteWrap.classList.add("hidden");
  if (clearNote) customerNoteInput.value = "";
  renderPaperSizeSelect(paperSizes[0] || "custom");
  paperSizeCustomInput.classList.add("hidden");
  paperSizeCustomInput.value = "";
}

function stampClass(status) {
  return { queued: "stamp-queued", printing: "stamp-printing", done: "stamp-done", waiting: "stamp-waiting", pending: "stamp-waiting", cancelled: "stamp-cancelled", rejected: "stamp-cancelled" }[status] || "stamp-queued";
}
function stampLabel(status) {
  return { queued: "Antre", printing: "Diprint", done: "Selesai", waiting: "Menunggu operator", pending: "Menunggu konfirmasi operator", cancelled: "Dibatalkan", rejected: "Ditolak semua operator" }[status] || status;
}

function renderJobs(docs) {
  if (docs.length === 0) {
    jobList.innerHTML = `<div class="empty-state">${iconImg("Empty-Upload", "", "icon-img empty-state-icon")}<div>Belum ada file yang diupload.</div></div>`;
    animateJobRows(jobList);
    return;
  }
  // "Batal" cuma boleh selama pesanan BELUM diterima resmi sama operator
  // (masih "waiting" — belum ketemu operator online, atau "pending" —
  // sudah ditugaskan tapi operatornya belum klik Terima). Begitu sudah
  // "queued"/"printing"/"done" tidak bisa dibatalkan sendiri lewat sini
  // lagi (lihat firestore.rules — di level database juga dikunci sama).
  const cancellable = (status) => status === "waiting" || status === "pending";
  jobList.innerHTML = docs.map((d) => {
    const j = d.data();
    return `
      <div class="job-row">
        <div>
          <div class="job-name">${escapeHtml(j.fileName)}</div>
          <div class="job-meta"><span class="job-code">#${escapeHtml(jobCodeLabel(j, d.id))}</span> · ${fmtDate(j.createdAt)} · ${fmtFileSize(j.fileSize)}${j.price ? " · " + fmtRupiah(j.price) : ""}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span class="stamp-badge ${stampClass(j.status)}">${stampLabel(j.status)}</span>
          <a class="btn btn-outline btn-sm" href="job.html?id=${d.id}">Detail Info</a>
          ${cancellable(j.status) ? `<button type="button" class="btn btn-outline btn-icon btn-icon-sm job-cancel-btn" data-cancel="${d.id}" title="Batal" aria-label="Batal">${iconImg("Reject", "Batal")}</button>` : ""}
        </div>
      </div>`;
  }).join("");
  animateJobRows(jobList);

  jobList.querySelectorAll("button[data-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openReasonPrompt({
        title: "Batalkan pesanan?",
        subtitle: "File tidak akan diproses lagi. Kasih tau alasannya ya.",
        reasons: [
          "Salah upload file",
          "Gak jadi print",
          "Ketemu operator/toko lain",
          "Kelamaan nunggu operator",
          "Harga kemahalan"
        ],
        confirmLabel: "Batalkan pesanan",
        onConfirm: async (reason) => {
          btn.disabled = true;
          try {
            await updateDoc(doc(db, "printJobs", btn.dataset.cancel), { status: "cancelled", cancelReason: reason });
            if (isGuestSession()) {
              patchGuestJob(btn.dataset.cancel, { status: "cancelled", cancelReason: reason });
              renderJobs(guestJobDocs());
            }
          } catch (e) {
            console.error(e);
            // Kasus paling umum: pesanan ini sudah keburu diterima operator
            // (status sudah pindah dari waiting/pending ke queued) tepat
            // sebelum klik Batal diproses — firestore.rules memang sengaja
            // menolak customer membatalkan pesanan yang sudah "queued".
            const extra = (e && e.code === "permission-denied")
              ? " Kemungkinan besar pesanan ini sudah diterima operator (statusnya sudah bukan \"Menunggu operator\" lagi) sesaat sebelum kamu klik Batal — refresh halaman untuk lihat status terbarunya."
              : "";
            showToast(describeFirestoreError(e, "membatalkan pesanan") + extra, "error");
            btn.disabled = false;
            throw e; // biar modal alasan tetap kebuka & tombolnya re-enable
          }
        }
      });
    });
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function renderGuestState() {
  initShell({ user: null, profile: null, active: "upload" });
  helperText.textContent = "Pilih tipe file dulu lewat tombol di atas, lalu seret file ke area upload.";
  isDeveloper = false;
  paperSizeManageBtn.classList.add("hidden");
  printerCtaCard.classList.add("hidden");
}

function renderLoggedInState(user, profile) {
  initShell({ user, profile, active: "upload" });
  helperText.textContent = "Pilih tipe file dulu lewat tombol di atas, lalu seret file ke area upload.";
  // Kalau role-nya "printer", kasih tombol menu tambahan ke Dashboard
  // Operator langsung di halaman Upload ini (bukan cuma link di sidebar) —
  // soalnya halaman Upload memang ditujukan buat customer, jadi operator
  // yang nyasar ke sini butuh jalan pintas balik ke dashboard-nya sendiri.
  const ctaRole = profile && profile.role;
  const showCta = ctaRole === "printer" || ctaRole === "developer";
  printerCtaCard.classList.toggle("hidden", !showCta);
  if (showCta) {
    const isDevRole = ctaRole === "developer";
    document.getElementById("dashCtaRole").textContent = isDevRole ? "Developer" : "Operator Print";
    document.getElementById("dashCtaDesc").textContent = isDevRole
      ? "Halaman ini tampilan customer. Buka Dashboard Printing buat cek pesanan masuk, antrean, dan riwayat print."
      : "Halaman ini tampilan customer. Buka Dashboard Printing buat kelola pesanan masuk, antrean, dan pendapatan kamu.";
  }
  // Tombol "Kelola pilihan ukuran" (tambah/ubah/hapus opsi di dropdown)
  // KHUSUS role "developer" — customer/printer biasa cuma boleh PILIH
  // dari dropdown, bukan ubah daftarnya.
  isDeveloper = !!(profile && profile.role === "developer");
  paperSizeManageBtn.classList.toggle("hidden", !isDeveloper);
  seedPaperSizesIfDeveloper();
}

// Halaman ini boleh diakses guest juga, jadi bukan requireAuth() — tapi
// tetap pakai watchOwnAccount() (real-time), bukan ensureUserDoc() biasa,
// buat kasus orangnya kebetulan lagi di halaman ini pas developer
// hapus/ban akunnya lewat Kelola User: langsung ke-signOut() & balik ke
// tampilan guest saat itu juga (bukan dibuatkan lagi profil baru diam-diam).
// ---------------------------------------------------------------------
// SINKRONISASI RIWAYAT TAMU. Sumber utama tampilan = salinan di perangkat
// (guest-jobs.js). Di atasnya:
//  1) query pesanan milik sesi anonymous sekarang -> digabung ke salinan
//     (menangkap pesanan lama yang belum tersimpan di perangkat);
//  2) listener per-dokumen untuk pesanan yang BELUM final (menunggu/antre/
//     diprint), termasuk yang dibuat sesi sebelumnya — status, harga, dan
//     tanggalnya ikut ter-update real-time. Pesanan yang sudah final
//     (selesai/dibatalkan/ditolak) tidak berubah lagi.
// Kalau server tidak bisa dihubungi, riwayat lokal tetap tampil.
// ---------------------------------------------------------------------
let guestUnsubs = [];
let guestSessionTried = false;
let guestSyncErrShown = false;
function stopGuestSync() {
  guestUnsubs.forEach((u) => { try { u(); } catch (e) { /* abaikan */ } });
  guestUnsubs = [];
}
function guestSyncError(err) {
  console.error(err);
  if (guestSyncErrShown) return;
  guestSyncErrShown = true;
  showToast({
    type: "warning", duration: 7000,
    title: "Riwayat belum tersinkron",
    message: "Riwayat tersimpan di perangkat ini, tapi status terbaru belum bisa diambil dari server. " + describeFirestoreError(err, "menyinkronkan riwayat print")
  });
}
function startGuestSync(user) {
  guestUnsubs.push(onSnapshot(
    query(collection(db, "printJobs"), where("customerId", "==", user.uid), orderBy("createdAt", "desc")),
    (snap) => {
      upsertGuestJobs(snap.docs.map((d) => [d.id, d.data()]));
      renderJobs(guestJobDocs());
    },
    guestSyncError
  ));
  loadGuestJobs()
    .filter((e) => !FINAL_STATUSES.includes(e.status))
    .slice(0, 30)
    .forEach((e) => {
      guestUnsubs.push(onSnapshot(doc(db, "printJobs", e.id), (snap) => {
        if (!snap.exists()) removeGuestJob(e.id); // sudah dihapus dari server
        else upsertGuestJobs([[e.id, snap.data()]]);
        renderJobs(guestJobDocs());
      }, guestSyncError));
    });
}

let unsubProfile = null;
onAuthStateChanged(auth, (user) => {
  if (unsubscribeJobs) { unsubscribeJobs(); unsubscribeJobs = null; }
  if (unsubProfile) { unsubProfile(); unsubProfile = null; }
  currentUser = user;

  stopGuestSync();
  if (!user || user.isAnonymous) {
    currentProfile = null;
    renderGuestState();
    // Tampilkan dulu riwayat yang tersimpan di perangkat (langsung, tanpa
    // menunggu server) — tetap ada walau tamu baru keluar / sesinya berganti.
    renderJobs(guestJobDocs());
    if (!user) {
      // Ada riwayat tersimpan tapi belum ada sesi (mis. baru keluar akun):
      // buat sesi anonymous diam-diam supaya statusnya bisa disinkronkan.
      if (loadGuestJobs().length && !guestSessionTried) {
        guestSessionTried = true;
        signInAnonymously(auth).catch((e) => console.error("Sesi tamu untuk sinkronisasi gagal:", e));
      }
      return;
    }
    startGuestSync(user);
    return;
  }

  let jobsStarted = false;
  unsubProfile = watchOwnAccount(user, (profile) => {
    // Data tamu masih di perangkat + akun masih kosong -> popup Recovery wajib (halaman tetap dimuat).
    enforceRecoveryGate(user, profile);
    currentProfile = profile;
    renderLoggedInState(user, profile);
    if (jobsStarted) return;
    jobsStarted = true;
    const q = query(
      collection(db, "printJobs"),
      where("customerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    unsubscribeJobs = onSnapshot(q, (snap) => renderJobs(snap.docs), (err) => {
      console.error(err);
      jobList.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat riwayat print")}</div>`;
    });
  }, () => {
    if (unsubscribeJobs) { unsubscribeJobs(); unsubscribeJobs = null; }
    unsubProfile = null;
    currentUser = null;
    currentProfile = null;
    renderGuestState();
    renderJobs(guestJobDocs());
  });
});
