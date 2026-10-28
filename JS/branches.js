// ===================================================================
// D'Printing — "Lihat cabang": SATU popup untuk SEMUA role.
//
// Tombolnya ada di topbar (sebelah "Kontak CS", lihat shell.js) di setiap
// halaman, sama persis untuk tamu, customer, operator, maupun developer.
// Yang beda cuma ISI popup-nya, mengikuti siapa yang membuka:
//
//   MODE PUBLIK (tamu / belum login / customer):
//     Hanya MELIHAT. Sumber datanya koleksi "branches" — koleksi terpisah yang
//     boleh dibaca siapa saja & cuma berisi data aman (nama, username, foto,
//     role, 4 tingkat wilayah); ditulis oleh tiap operator sendiri lewat
//     syncBranchMirror di js/app.js. Tidak butuh login/sesi, jadi membuka
//     popup ini TIDAK membuat akun tamu apa pun. Sengaja BUKAN membaca
//     "users": dokumen itu memuat email, WhatsApp, alamat jalan, titik peta.
//
//   MODE OPERATOR (printer / developer):
//     Versi lengkap. Sumber datanya "users" (boleh dibaca user login), jadi
//     ada status online di web, tanda "Menerima pesanan", link ke profil,
//     dan tombol "Cocokkan" yang menyalin 4 tingkat wilayah operator itu ke
//     profilmu sendiri supaya kamu menerima pesanan dari wilayah itu.
//     Yang TIDAK pernah ditampilkan / disalin dari operator lain: jalan,
//     RT/RW, patokan, titik peta.
//
// PEMBARUAN: tombol "Cocokkan" + tanda "Wilayah sama" sekarang ada untuk SEMUA
// pengunjung, termasuk tamu & customer. Akun login (role apa pun) memakai tampilan
// lengkap; tamu memakai daftar publik. Cocokkan akun login mengubah wilayah di
// profilnya (users/{uid}); Cocokkan tamu mengubah wilayah di profil tamu
// (localStorage) — datanya tetap cuma 4 tingkat wilayah.
//
// Dimuat malas (dynamic import dari shell.js) — baru diunduh saat tombol
// pertama kali ditekan. Setelah "Cocokkan", halaman yang peduli (printer.html)
// diberi tahu lewat event cancelable "dcnp:region-changed"; kalau ada yang
// memanggil preventDefault() berarti dia yang menampilkan toast-nya.
// ===================================================================
import { db } from "./firebase-config.js";
import { collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { avatarHtml, regionLabel, regionKeyFrom, regionSnapshot, isWebLive, usernameLabel, askConfirm, showToast, describeFirestoreError } from "./app.js";
import { guestLocation, guestInfoError, getGuestInfo, saveGuestInfo } from "./guest.js";

const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

let ctx = { user: null, profile: null };
let mode = "public";     // "public" | "operator" — ditentukan tiap popup dibuka
let modal = null;        // elemen popup (dibuat sekali, dipakai ulang)
let unsub = null;        // pemutus onSnapshot selama popup terbuka
let timer = null;        // pemeriksa "basi" berkala (mode operator)
let docs = [];           // hasil snapshot terakhir
let rows = [];           // baris yang sedang ditampilkan
let sig = "";            // tanda tangan tampilan, buat melewati render yang tidak perlu
let matching = false;

// Tampilan LENGKAP ("operator" di variabel mode) = semua akun yang sudah login,
// apa pun role-nya (customer pun). Tamu = tampilan publik.
const isOperatorCtx = () => !!(ctx.user && !ctx.user.isAnonymous && ctx.profile);
// Role operator beneran (printer/developer): punya urusan lanjutan saat ganti wilayah.
const isOpRole = () => isOperatorCtx() && (ctx.profile.role === "printer" || ctx.profile.role === "developer");

// Tamu = belum login atau sesi anonymous.
const isGuestCtx = () => !(ctx.user && !ctx.user.isAnonymous);

const nameOf = (u) => u.displayName || u.username || usernameLabel(u.email) || "Tanpa nama";
const handleOf = (u) => { const h = u.username || usernameLabel(u.email); return h ? `@${h}` : ""; };

// Wilayah orang yang membuka popup — buat menandai "Wilayahmu".
function myRegionKey() {
  // Tamu yang data dirinya belum lengkap (nama / WA / wilayah) belum dianggap punya wilayah.
  if (mode === "public" && isGuestCtx()) {
    try { if (guestInfoError()) return ""; } catch (e) { return ""; }
  }
  if (mode === "operator") {
    const me = docs.find((d) => d.id === ctx.user.uid);
    return regionKeyFrom(me ? me.data().location : ctx.profile.location);
  }
  if (ctx.user && !ctx.user.isAnonymous) return regionKeyFrom(ctx.profile && ctx.profile.location);
  try { return regionKeyFrom(guestLocation()); } catch (e) { return ""; }
}

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement("div");
  modal.className = "modal-backdrop hidden";
  modal.id = "branchModal";
  modal.innerHTML = `
    <div class="modal-box pb-modal" role="dialog" aria-modal="true" aria-labelledby="pbTitle">
      <div class="pb-head">
        <h3 id="pbTitle">Cabang yang ada</h3>
        <button type="button" class="pb-close" aria-label="Tutup">&times;</button>
      </div>
      <p class="sub pb-sub"></p>
      <input type="text" class="pb-search" placeholder="Cari nama atau wilayah…" autocomplete="off" aria-label="Cari cabang">
      <div class="pb-summary" aria-live="polite"></div>
      <div class="pb-list"></div>
      <div class="pb-foot hidden"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".pb-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector(".pb-search").addEventListener("input", () => render());
  modal.querySelector(".pb-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-match]");
    if (!btn) return;
    const row = rows.find((r) => r.uid === btn.dataset.match);
    if (row) matchBranch(row);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !modal || modal.classList.contains("hidden")) return;
    // Dialog konfirmasi (di atas popup ini) punya Esc-nya sendiri.
    const c = document.getElementById("askConfirmModal");
    if (c && !c.classList.contains("hidden")) return;
    close();
  });
  return modal;
}

// Bangun daftar baris dari snapshot, sesuai mode.
function buildRows() {
  if (mode === "operator") {
    return docs
      .filter((d) => d.id !== ctx.user.uid && !d.data().banned)
      .map((d) => {
        const u = d.data();
        const live = isWebLive(u);
        return { uid: d.id, u, key: regionKeyFrom(u.location), label: regionLabel(u.location), live, working: !!u.online && live };
      })
      .filter((r) => r.key); // lokasi belum lengkap -> bukan cabang
  }
  return docs
    .map((d) => { const u = d.data(); return { uid: d.id, u, key: u.regionKey || "", label: regionLabel(u) }; })
    .filter((r) => r.key);
}

function rowHtml(r, myKey) {
  const u = r.u;
  const op = mode === "operator";
  const handle = handleOf(u);
  const who = `
    ${avatarHtml(u, "sm")}
    <div class="pb-who">
      <div class="pb-name">${escapeHtml(nameOf(u))}</div>
      ${handle ? `<div class="pb-handle">${escapeHtml(handle)}</div>` : ""}
    </div>`;
  const tags = `<span class="pb-chip">${u.role === "developer" ? "Developer" : "Printer"}</span>`
    + (op ? `<span class="status-pill ${r.live ? "is-online" : "is-offline"}"><span class="status-dot"></span>${r.live ? "Online" : "Offline"}</span>` : "")
    + (op && r.working ? `<span class="work-tag" title="Online di web dan sedang menerima pesanan print">Menerima pesanan</span>` : "");
  const action = (myKey && r.key === myKey
    ? `<span class="pb-chip pb-chip-mine">Wilayah sama</span>`
    : `<button type="button" class="btn btn-primary btn-sm" data-match="${escapeHtml(r.uid)}">Cocokkan</button>`);
  return `
    <div class="pb-row">
      ${op
        ? `<a class="pb-link" href="profile.html?uid=${encodeURIComponent(r.uid)}" title="Lihat profil">${who}</a>`
        : `<div class="pb-link">${who}</div>`}
      <div class="pb-tags">${tags}</div>
      ${action}
    </div>`;
}

const rank = (r) => (r.working ? 2 : (r.live ? 1 : 0));

function render() {
  const list = modal.querySelector(".pb-list");
  const summary = modal.querySelector(".pb-summary");
  const search = modal.querySelector(".pb-search");
  const needle = search.value.trim().toLowerCase();
  const myKey = myRegionKey();

  if (rows.length === 0) {
    summary.textContent = "";
    list.innerHTML = `<div class="empty-state"><div>${mode === "operator"
      ? "Belum ada operator lain yang mengisi alamat lengkap."
      : "Belum ada cabang yang terdaftar."}</div></div>`;
    return;
  }
  const shown = needle
    ? rows.filter((r) => `${nameOf(r.u)} ${handleOf(r.u)} ${r.label}`.toLowerCase().includes(needle))
    : rows;
  if (shown.length === 0) {
    summary.textContent = `Tidak ada hasil untuk "${search.value.trim()}".`;
    list.innerHTML = "";
    return;
  }

  // Kelompokkan per regionKey. Wilayahmu paling atas, sisanya urut abjad;
  // di dalam kelompok: yang menerima pesanan / online dulu, lalu urut nama.
  const groups = new Map();
  shown.forEach((r) => {
    if (!groups.has(r.key)) groups.set(r.key, { key: r.key, label: r.label, items: [] });
    groups.get(r.key).items.push(r);
  });
  const ordered = [...groups.values()].sort((a, b) => {
    if ((a.key === myKey) !== (b.key === myKey)) return a.key === myKey ? -1 : 1;
    return a.label.localeCompare(b.label, "id");
  });
  ordered.forEach((g) => g.items.sort((a, b) =>
    (rank(b) - rank(a)) || nameOf(a.u).localeCompare(nameOf(b.u), "id")));

  const mine = myKey && groups.get(myKey);
  // Status pencocokan (mode publik) — aturannya SAMA untuk tamu & akun terdaftar:
  // wilayah 4 tingkat harus lengkap (peta TIDAK diperlukan). Khusus tamu, nama &
  // No. WhatsApp juga harus terisi (guestInfoError), sama seperti data diri akun.
  let matchNote = "";
  if (!isOpRole()) {
    const guestMsg = isGuestCtx() ? guestInfoError() : "";
    if (guestMsg) matchNote = " — lengkapi data dirimu di Profil dulu (nama, No. WhatsApp, wilayah) supaya pesananmu bisa dicocokkan";
    else if (!myKey) matchNote = " — lengkapi wilayahmu di Profil supaya pesananmu bisa dicocokkan";
    else if (mine) matchNote = ` — ada ${mine.items.length} operator di wilayahmu`;
    else matchNote = " — belum ada operator di wilayahmu";
  }
  summary.textContent = `${ordered.length} wilayah · ${shown.length} operator` + matchNote;

  const top = list.scrollTop;
  list.innerHTML = ordered.map((g) => `
    <section class="pb-group">
      <div class="pb-group-head">
        <span class="pb-group-name">${escapeHtml(g.label)}</span>
        <span class="pb-count">${g.items.length}</span>
        ${g.key === myKey ? `<span class="pb-chip pb-chip-mine">Wilayahmu</span>` : ""}
      </div>
      ${g.items.map((r) => rowHtml(r, myKey)).join("")}
    </section>`).join("");
  list.scrollTop = top;
}

// Tiap operator online menulis heartbeat berkala; daftar cuma digambar ulang
// kalau ada yang BERUBAH secara tampilan (termasuk user yang jadi basi/offline),
// supaya scroll & pencarian tidak ke-reset terus.
function refresh(force) {
  const next = buildRows();
  const s = next.map((r) => [r.uid, r.u.role, r.live ? 1 : 0, r.working ? 1 : 0, r.key, r.u.displayName || "", r.u.username || "", r.u.photoURL || ""].join("~")).join("|")
    + "#" + myRegionKey();
  if (!force && s === sig) return;
  sig = s;
  rows = next;
  render();
}

function open() {
  ensureModal();
  mode = isOperatorCtx() ? "operator" : "public";
  const signedIn = !!(ctx.user && !ctx.user.isAnonymous);

  modal.querySelector(".pb-sub").innerHTML = mode === "operator"
    ? `Operator (printer &amp; developer) yang sudah mengisi alamat lengkap. Klik <strong>Cocokkan</strong> untuk menyamakan Provinsi, Kota/Kabupaten, Kecamatan, dan Kelurahan/Desa-mu dengan mereka.`
    : `Operator print yang sudah mengisi wilayahnya. Pesananmu otomatis dikirim ke operator di wilayah yang sama dengan wilayah yang kamu isi. Klik <strong>Cocokkan</strong> untuk menyamakan wilayahmu dengan cabang itu.`;
  const foot = modal.querySelector(".pb-foot");
  foot.classList.toggle("hidden", signedIn);
  foot.innerHTML = signedIn ? "" : `Ingin jadi operator print? <a href="login.html?mode=signup">Daftar atau masuk</a>, lalu lengkapi profil dan alamatmu.`;

  modal.querySelector(".pb-search").value = "";
  modal.querySelector(".pb-summary").textContent = "";
  modal.querySelector(".pb-list").innerHTML = `<div class="skeleton-list" aria-busy="true" aria-label="Memuat"><div class="skeleton-row"><div class="skeleton-col"><span class="skeleton sk-title"></span><span class="skeleton sk-line"></span></div><span class="skeleton sk-pill"></span></div><div class="skeleton-row"><div class="skeleton-col"><span class="skeleton sk-title"></span><span class="skeleton sk-line"></span></div><span class="skeleton sk-pill"></span></div></div>`;
  modal.classList.remove("hidden");

  stopWatch();
  docs = []; rows = []; sig = "";
  const src = mode === "operator"
    ? query(collection(db, "users"), where("role", "in", ["printer", "developer"]))
    : collection(db, "branches");
  let first = true;
  unsub = onSnapshot(src, (snap) => {
    docs = snap.docs;
    refresh(first);
    if (first) { first = false; modal.querySelector(".pb-search").focus({ preventScroll: true }); }
  }, (err) => {
    console.error("daftar cabang gagal dimuat:", err);
    const denied = err && err.code === "permission-denied";
    modal.querySelector(".pb-summary").textContent = "";
    modal.querySelector(".pb-list").innerHTML = `<div class="empty-state"><div>${mode === "public" && denied
      ? "Daftar cabang belum bisa dibuka (aturan Firestore belum diperbarui)."
      : describeFirestoreError(err, "memuat daftar cabang")}</div></div>`;
  });
  // User yang tab-nya mati mendadak tidak memicu event Firestore -> cek basi tiap 15 detik.
  if (mode === "operator") timer = setInterval(() => refresh(false), 15000);
}

function stopWatch() {
  if (unsub) { unsub(); unsub = null; }
  if (timer) { clearInterval(timer); timer = null; }
}
function close() {
  stopWatch();
  if (modal) modal.classList.add("hidden");
}

// "Cocokkan": salin 4 tingkat wilayah cabang ke profil sendiri.
async function matchBranch(row) {
  if (matching) return;
  const target = regionSnapshot(row.u.location);   // teks asli (bukan yang dinormalisasi)
  const newKey = regionKeyFrom(target);
  if (!newKey) {
    showToast("Lokasi cabang itu ternyata belum lengkap, tidak bisa dicocokkan.", "error");
    return;
  }
  // ---- TAMU: wilayah disimpan di profil tamu (localStorage), bukan Firestore ----
  if (isGuestCtx()) {
    const info = getGuestInfo();
    const gOld = { province: info.province, city: info.city, district: info.district, village: info.village };
    const gOldKey = regionKeyFrom(gOld);
    if (newKey === gOldKey) {
      showToast("Wilayahmu sudah sama dengan cabang itu.", "info");
      return;
    }
    const gOldLabel = regionLabel(gOld);
    const gOk = await askConfirm({
      title: "Cocokkan wilayah?",
      body: `Wilayahmu akan diubah ${gOldLabel ? `dari "${gOldLabel}" ` : ""}menjadi "${regionLabel(target)}" (sama dengan ${nameOf(row.u)}). Data diri tamu lainnya tidak berubah.`,
      confirmLabel: "Ya, cocokkan",
      danger: false
    });
    if (!gOk) return;
    matching = true;
    try {
      saveGuestInfo({ ...info, ...target });
      // Cadangkan ke cloud diam-diam, sama seperti saat menyimpan profil tamu.
      import("./guest-sync.js").then((m) => m.backupGuestProfile()).catch(() => {});
      close();
      showToast({ type: "success", title: "Wilayah dicocokkan", message: `Wilayahmu sekarang ${regionLabel(target)}.` });
      // Form profil yang masih terbuka berisi wilayah lama -> muat ulang supaya tidak menimpanya.
      if (/profile\.html$/i.test(location.pathname)) setTimeout(() => location.reload(), 900);
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan di browser ini (penyimpanan dinonaktifkan?).", "error");
    } finally {
      matching = false;
    }
    return;
  }

  // Wilayah sendiri diambil dari snapshot terbaru (bukan objek profil yang bisa basi).
  const meDoc = docs.find((d) => d.id === ctx.user.uid);
  const myLoc = meDoc ? meDoc.data().location : ctx.profile.location;
  const oldKey = regionKeyFrom(myLoc);
  if (newKey === oldKey) {
    showToast("Wilayahmu sudah sama dengan cabang itu.", "info");
    return;
  }

  const oldLabel = regionLabel(myLoc);
  const ok = await askConfirm({
    title: "Cocokkan wilayah?",
    body: `Wilayahmu akan diubah ${oldLabel ? `dari "${oldLabel}" ` : ""}menjadi "${regionLabel(target)}" (sama dengan ${nameOf(row.u)}). Alamat jalan dan titik petamu tidak ikut berubah.${oldKey && isOpRole() ? " Pesanan di \"Pesanan masuk\" yang berasal dari wilayah lama akan dilepas ke operator lain; antrean yang sudah kamu terima tetap jadi tanggunganmu." : ""}`,
    confirmLabel: "Ya, cocokkan",
    danger: false
  });
  if (!ok) return;

  matching = true;
  try {
    // 4 tingkat diganti; jalan/RT-RW/patokan/lat-lng milik sendiri tetap.
    // Kode pos ikut disalin kalau cabang punya.
    const merged = { ...(myLoc || {}), ...target };
    if (row.u.location && row.u.location.postalCode) merged.postalCode = row.u.location.postalCode;
    await updateDoc(doc(db, "users", ctx.user.uid), { location: merged, regionKey: newKey });

    ctx.profile.location = merged;
    ctx.profile.regionKey = newKey;
    close();
    // Halaman yang punya urusan lanjutan (printer.html: status kerja, antrean,
    // ambil pesanan menunggu) menangani sendiri + toast-nya, lalu preventDefault().
    const handledByPage = !window.dispatchEvent(new CustomEvent("dcnp:region-changed", {
      cancelable: true, detail: { location: merged, regionKey: newKey, previousKey: oldKey }
    }));
    if (!handledByPage) {
      showToast({ type: "success", title: "Wilayah dicocokkan", message: `Wilayahmu sekarang ${regionLabel(merged)}.` });
      if (/profile\.html$/i.test(location.pathname)) setTimeout(() => location.reload(), 900);
    }
  } catch (e) {
    console.error(e);
    showToast(describeFirestoreError(e, "mencocokkan wilayah"), "error");
  } finally {
    matching = false;
  }
}

// Dipanggil dari tombol topbar (shell.js) dengan siapa yang sedang membuka.
export function openBranches({ user, profile } = {}) {
  ctx = { user: user || null, profile: profile || null };
  open();
}
