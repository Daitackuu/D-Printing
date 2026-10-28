// ===================================================================
// D'Printing — Kotak Masuk (inbox.html)
// Arsip notifikasi bergaya email: semua kabar yang masuk ke lonceng
// (pesanan, pesan, komunitas, developer, masalah) dikumpulkan di sini
// dan bisa disortir lewat LABEL di kiri, dicari, diurutkan, dibintangi,
// ditandai dibaca/belum dibaca, dan dibuang ke Sampah (otomatis kosong
// setelah 30 hari).
//
// Datanya SAMA dengan panel lonceng — dibaca & diubah lewat fungsi export
// di notifications.js (getNotifHistory, patchNotifs, purgeNotifs,
// subscribeNotifs), jadi tidak ada salinan data kedua yang bisa
// bertabrakan. Perubahan dari sini langsung tampil di lonceng & badge
// sidebar, dan sebaliknya.
//
// Ganti nama halaman? Cukup ubah INBOX_LABEL di notifications.js.
//
// KATEGORI "Sistem" = kabar dari developer/sistem, termasuk BALASAN atas
// pesan Kontak CS. KATEGORI "Bantuan" (cuma tampil buat developer) =
// pesan Kontak CS yang dikirim user; developer membalasnya langsung dari
// panel baca di sini -> balasan ditulis ke users/{uid pengirim}/
// notifications (category "sistem") dan tiketnya ditandai "replied".
// ===================================================================
import { requireAuth, iconImg, iconChip, showToast, askConfirm, customSelectHtml, wireCustomSelect } from "./app.js";
import { initShell } from "./shell.js";
import { auth, db } from "./firebase-config.js";
import {
  collection, doc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  INBOX_LABEL, NOTIF_CATS, isDevViewer, getNotifHistory, patchNotifs, purgeNotifs, subscribeNotifs
} from "./notifications.js";

const CAT_BY_ID = Object.fromEntries(NOTIF_CATS.map((c) => [c.id, c]));

// Label ala Gmail. `total: true` = angka di sebelahnya jumlah semua (bukan
// cuma yang belum dibaca).
const LABELS = [
  { id: "inbox",   name: INBOX_LABEL,    icon: "Inbox",       test: (n) => !n.trashed },
  { id: "unread",  name: "Belum dibaca", icon: "Bell",        test: (n) => !n.trashed && !n.read },
  { id: "starred", name: "Berbintang",   icon: "Star-Filled", test: (n) => !n.trashed && n.starred },
  { sep: true },
  ...NOTIF_CATS.map((c) => ({ id: c.id, name: c.label, icon: c.icon, devOnly: !!c.devOnly, test: (n) => !n.trashed && n.cat === c.id })),
  { sep: true },
  { id: "trash",   name: "Sampah",       icon: "Trash",       test: (n) => n.trashed, total: true }
];
const LABEL_BY_ID = Object.fromEntries(LABELS.filter((l) => !l.sep).map((l) => [l.id, l]));

const EMPTY = {
  inbox: "Belum ada kabar.<br>Pesanan, pesan, komunitas, dan kabar dari sistem/developer akan muncul di sini.",
  unread: "Semua kabar sudah dibaca.",
  starred: "Belum ada kabar berbintang.<br>Klik bintang di sebuah kabar supaya mudah dicari lagi.",
  pesanan: "Kabar status pesananmu muncul di sini.",
  pesan: "Pesan baru & permintaan pertemanan muncul di sini.",
  komunitas: "Pengikut baru & komentar di postinganmu muncul di sini.",
  sistem: "Kabar dari developer/sistem & balasan Kontak CS muncul di sini.",
  masalah: "Kabar kendala & gangguan muncul di sini.",
  bantuan: "Pesan Kontak CS dari user muncul di sini.<br>Buka salah satunya untuk membalas.",
  trash: "Sampah kosong.<br>Kabar yang kamu hapus disimpan di sini selama 30 hari."
};

const layoutEl = document.getElementById("mailLayout");
const labelsEl = document.getElementById("mailLabels");
const toolbarEl = document.getElementById("mailToolbar");
const listEl = document.getElementById("mailList");
const readEl = document.getElementById("mailRead");
const searchEl = document.getElementById("mailSearch");
const sortWrapEl = document.getElementById("mailSortWrap");

// Ikon versi "Fit" (Resources/Icons/{nama}-Fit.png): PNG yang sama tapi
// sudah dipotong rapat & diseragamkan ukuran visualnya, jadi semua ikon
// label kelihatan sama besar & lurus. (Kalau PNG aslinya diganti, jalankan
// ulang pemotongan itu / timpa file -Fit juga.)
function fitIcon(name, cls = "icon-img icon-sm") {
  return `<span class="${cls} icon-fit" role="img" aria-hidden="true" style="--icon:url('../Resources/Icons/${name}-Fit.png')"></span>`;
}

let all = [];
const state = { label: "inbox", q: "", sort: "new", sel: new Set(), openId: null };
let myName = "Developer";
const replyDrafts = new Map(); // id kabar -> teks balasan yang belum terkirim

// ---------- util ----------
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  // textContent->innerHTML tidak meng-escape tanda kutip; dipakai juga di
  // dalam atribut (data-id, href), jadi kutip ikut di-escape.
  return d.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Sama seperti safeHref di notifications.js: hanya alamat relatif di web ini.
function safeHref(h) {
  if (typeof h !== "string") return "";
  const t = h.trim();
  if (!t || t.length > 200 || t.startsWith("//") || !/^[A-Za-z0-9_\-./?=&%#]+$/.test(t)) return "";
  return t;
}

function shortTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  const opts = d.getFullYear() === now.getFullYear()
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleDateString("id-ID", opts);
}

function fullTime(ts) {
  return new Date(ts).toLocaleString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function catOf(n) { return CAT_BY_ID[n.cat] || NOTIF_CATS[0]; }

// ---------- data ----------
function visibleRows() {
  const label = LABEL_BY_ID[state.label] || LABELS[0];
  const term = state.q.trim().toLowerCase();
  const rows = all.filter((n) =>
    label.test(n) && (!term || `${n.title} ${n.message}`.toLowerCase().includes(term)));
  if (state.sort === "old") rows.sort((a, b) => a.ts - b.ts);
  else if (state.sort === "unread") rows.sort((a, b) => (a.read - b.read) || (b.ts - a.ts));
  else rows.sort((a, b) => b.ts - a.ts);
  return rows;
}

function selectedIds(rows) {
  const ids = new Set(rows.map((n) => n.id));
  return Array.from(state.sel).filter((id) => ids.has(id));
}

function refreshData() {
  all = getNotifHistory();
  const alive = new Set(all.map((n) => n.id));
  state.sel.forEach((id) => { if (!alive.has(id)) state.sel.delete(id); });
  if (state.openId && !alive.has(state.openId)) closeRead();
  renderAll();
}

// ---------- render ----------
function renderLabels() {
  const showDev = isDevViewer();
  labelsEl.innerHTML = LABELS.map((l) => {
    if (l.devOnly && !showDev) return "";
    if (l.sep) return `<div class="mail-label-sep" role="separator"></div>`;
    const count = all.filter((n) => l.test(n) && (l.total || (!n.read && !n.trashed))).length;
    const active = state.label === l.id;
    return `<button type="button" class="mail-label ${active ? "is-active" : ""}" data-label="${l.id}" aria-current="${active}">
      ${fitIcon(l.icon, "icon-img icon-fit")}
      <span class="mail-label-name">${esc(l.name)}</span>
      ${count > 0 ? `<span class="mail-label-count ${l.total ? "is-total" : ""}">${count > 99 ? "99+" : count}</span>` : ""}
    </button>`;
  }).join("");
}

function renderToolbar(rows) {
  const ids = selectedIds(rows);
  const has = ids.length > 0;
  const allChecked = rows.length > 0 && ids.length === rows.length;
  const dis = has ? "" : "disabled";
  const inTrash = state.label === "trash";
  const btn = (action, label, title = "") =>
    `<button type="button" class="btn btn-outline btn-sm" data-action="${action}" ${dis} ${title ? `title="${title}"` : ""}>${label}</button>`;
  toolbarEl.innerHTML = `
    <label class="mail-check-all">
      <input type="checkbox" id="mailCheckAll" ${allChecked ? "checked" : ""} ${rows.length ? "" : "disabled"} aria-label="Pilih semua">
      <span>${has ? `${ids.length} dipilih` : "Pilih semua"}</span>
    </label>
    <div class="mail-toolbar-actions">
      ${inTrash
        ? btn("restore", "Pulihkan") + btn("purge", "Hapus permanen")
        : btn("read", "Dibaca", "Tandai dibaca") + btn("unread", "Belum dibaca", "Tandai belum dibaca") + btn("star", "Bintangi", "Beri bintang") + btn("trash", "Hapus", "Pindahkan ke Sampah")}
    </div>
    ${inTrash && rows.length ? `<button type="button" class="notif-link-btn mail-empty-trash" data-action="emptyTrash">Kosongkan Sampah</button>` : ""}
  `;
  const chk = document.getElementById("mailCheckAll");
  if (chk) chk.indeterminate = has && !allChecked;
}

function renderList(rows) {
  if (!rows.length) {
    const msg = state.q.trim() ? "Tidak ada kabar yang cocok dengan pencarianmu." : EMPTY[state.label];
    listEl.innerHTML = `<div class="notif-empty">${fitIcon("Inbox", "icon-img icon-fit notif-empty-icon")}<p>${msg}</p></div>`;
    return;
  }
  listEl.innerHTML = rows.map((n) => {
    const cat = catOf(n);
    const cls = ["mail-row", n.read ? "" : "is-unread", n.id === state.openId ? "is-open" : "", state.sel.has(n.id) ? "is-checked" : ""].join(" ");
    return `
    <div class="${cls}" data-id="${esc(n.id)}">
      <input type="checkbox" class="mail-check" data-check aria-label="Pilih kabar" ${state.sel.has(n.id) ? "checked" : ""}>
      <button type="button" class="mail-star ${n.starred ? "is-on" : ""}" data-star aria-pressed="${!!n.starred}" aria-label="${n.starred ? "Hapus bintang" : "Beri bintang"}">
        ${fitIcon(n.starred ? "Star-Filled" : "Star-Outline")}
      </button>
      <div class="mail-row-main" data-open tabindex="0" role="button">
        <div class="mail-row-top">
          <span class="notif-cat-tag notif-cat-${esc(n.cat)}">${esc(cat.label)}</span>
          <span class="mail-row-title">${esc(n.title)}</span>
          <span class="mail-row-time">${esc(shortTime(n.ts))}</span>
        </div>
        <div class="mail-row-snippet">${esc(n.message)}</div>
      </div>
    </div>`;
  }).join("");
}

function renderRead() {
  const n = all.find((x) => x.id === state.openId);
  if (!n) {
    readEl.innerHTML = `
      <div class="mail-read-empty">
        ${fitIcon("Mail", "icon-img icon-fit notif-empty-icon")}
        <p>Pilih sebuah kabar di kiri untuk membacanya.</p>
      </div>`;
    return;
  }
  const cat = catOf(n);
  const href = safeHref(n.href);
  // Pesan Kontak CS (khusus developer): info pengirim + kotak balasan.
  const isTicket = n.cat === "bantuan" && n.ticket && n.ticket.uid && isDevViewer();
  const ticketMeta = isTicket
    ? `<div class="mail-ticket-meta">Dari: <strong>${esc(n.ticket.username || "-")}</strong>${n.ticket.email ? ` · ${esc(n.ticket.email)}` : ""}${n.replied ? ` <span class="mail-ticket-done">Sudah dibalas</span>` : ""}</div>`
    : "";
  const draft = replyDrafts.get(n.id) || "";
  const replyBox = isTicket && !n.trashed
    ? `<div class="mail-reply">
        <label for="mailReplyText">${n.replied ? "Balas lagi" : "Balas"} — muncul di Kotak Masuk user, kategori Sistem <span class="notify-count" id="mailReplyCount">${draft.length}/300</span></label>
        ${n.replied && n.reply ? `<div class="mail-reply-last">Balasan terakhir: ${esc(n.reply)}</div>` : ""}
        <textarea id="mailReplyText" class="post-textarea" rows="4" maxlength="300" placeholder="Tulis balasan untuk user...">${esc(draft)}</textarea>
        <div class="error-msg" id="mailReplyErr"></div>
        <button type="button" class="btn btn-primary btn-sm" data-r="reply" id="mailReplyBtn">Kirim balasan</button>
      </div>`
    : "";
  const actions = n.trashed
    ? `<button type="button" class="btn btn-primary btn-sm" data-r="restore">Pulihkan</button>
       <button type="button" class="btn btn-outline btn-sm" data-r="purge">Hapus permanen</button>`
    : `${href ? `<a class="btn btn-primary btn-sm" href="${esc(href)}">${esc(cat.action)}</a>` : ""}
       <button type="button" class="btn btn-outline btn-sm" data-r="star">${n.starred ? "Hapus bintang" : "Bintangi"}</button>
       <button type="button" class="btn btn-outline btn-sm" data-r="unread">Tandai belum dibaca</button>
       <button type="button" class="btn btn-outline btn-sm" data-r="trash">Hapus</button>`;
  readEl.innerHTML = `
    <button type="button" class="mail-back" data-r="back">‹ Kembali ke daftar</button>
    <div class="mail-read-head">
      ${iconChip(n.icon || cat.icon, n.color || cat.color)}
      <div class="mail-read-headtext">
        <h2>${esc(n.title)}</h2>
        <div class="mail-read-meta"><span class="notif-cat-tag notif-cat-${esc(n.cat)}">${esc(cat.label)}</span> ${esc(fullTime(n.ts))}</div>
      </div>
    </div>
    ${ticketMeta}
    <div class="mail-read-body">${esc(n.message)}</div>
    ${replyBox}
    <div class="mail-read-actions">${actions}</div>`;
}

function renderAll() {
  const rows = visibleRows();
  renderLabels();
  renderToolbar(rows);
  renderList(rows);
  renderRead();
}

// ---------- aksi ----------
function closeRead() {
  state.openId = null;
  layoutEl.classList.remove("show-read");
}

function openMail(id) {
  const n = all.find((x) => x.id === id);
  if (!n) return;
  state.openId = id;
  layoutEl.classList.add("show-read");
  // Membuka = dianggap dibaca. patchNotifs memicu render ulang lewat
  // subscribeNotifs; kalau sudah dibaca, render manual.
  if (!n.read && !n.trashed) patchNotifs([id], { read: true });
  else renderAll();
}

function trashIds(ids) {
  if (!ids.length) return;
  state.sel.clear();
  if (ids.includes(state.openId)) closeRead();
  patchNotifs(ids, { trashed: true, trashedAt: Date.now() });
  showToast({
    type: "info", icon: "Trash", sound: false, duration: 6000,
    title: ids.length === 1 ? "Kabar dipindah ke Sampah" : `${ids.length} kabar dipindah ke Sampah`,
    message: "Dihapus otomatis setelah 30 hari.",
    actionLabel: "Urungkan",
    onAction: () => patchNotifs(ids, { trashed: false, trashedAt: 0 })
  });
}

async function purgeIds(ids, title) {
  if (!ids.length) return;
  const ok = await askConfirm({
    title: title || (ids.length === 1 ? "Hapus permanen kabar ini?" : `Hapus permanen ${ids.length} kabar?`),
    body: "Kabar yang dihapus permanen tidak bisa dikembalikan.",
    confirmLabel: "Hapus permanen",
    danger: true
  });
  if (!ok) return;
  state.sel.clear();
  if (ids.includes(state.openId)) closeRead();
  purgeNotifs(ids);
}

function runAction(action, ids) {
  switch (action) {
    case "read":    patchNotifs(ids, { read: true }); break;
    case "unread":  patchNotifs(ids, { read: false }); break;
    case "star":    patchNotifs(ids, { starred: true }); break;
    case "trash":   trashIds(ids); return;
    case "restore": patchNotifs(ids, { trashed: false, trashedAt: 0 }); break;
    case "purge":   purgeIds(ids); return;
    default: return;
  }
  state.sel.clear();
  renderAll();
}

// ---------- event ----------
labelsEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-label]");
  if (!b) return;
  state.label = b.dataset.label;
  state.sel.clear();
  closeRead();
  renderAll();
});

searchEl.addEventListener("input", () => {
  state.q = searchEl.value;
  const rows = visibleRows();
  renderToolbar(rows);
  renderList(rows);
});

// Dropdown urutan: pakai dropdown buatan kita (custom-select di app.js),
// bukan <select> bawaan browser.
sortWrapEl.innerHTML = customSelectHtml("mailSort", [
  { value: "new", label: "Terbaru" },
  { value: "old", label: "Terlama" },
  { value: "unread", label: "Belum dibaca dulu" }
], state.sort, "mail-sort");
wireCustomSelect(sortWrapEl.querySelector(".custom-select"), (value) => {
  state.sort = value;
  const rows = visibleRows();
  renderToolbar(rows);
  renderList(rows);
});

toolbarEl.addEventListener("change", (e) => {
  if (e.target.id !== "mailCheckAll") return;
  const rows = visibleRows();
  if (e.target.checked) rows.forEach((n) => state.sel.add(n.id));
  else rows.forEach((n) => state.sel.delete(n.id));
  renderToolbar(rows);
  renderList(rows);
});

toolbarEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || b.disabled) return;
  if (b.dataset.action === "emptyTrash") {
    purgeIds(all.filter((n) => n.trashed).map((n) => n.id), "Kosongkan Sampah?");
    return;
  }
  runAction(b.dataset.action, selectedIds(visibleRows()));
});

listEl.addEventListener("change", (e) => {
  const box = e.target.closest("[data-check]");
  if (!box) return;
  const id = box.closest(".mail-row").dataset.id;
  if (box.checked) state.sel.add(id); else state.sel.delete(id);
  const rows = visibleRows();
  box.closest(".mail-row").classList.toggle("is-checked", box.checked);
  renderToolbar(rows);
});

listEl.addEventListener("click", (e) => {
  const row = e.target.closest(".mail-row");
  if (!row) return;
  const id = row.dataset.id;
  if (e.target.closest("[data-star]")) {
    const n = all.find((x) => x.id === id);
    if (n) patchNotifs([id], { starred: !n.starred });
    return;
  }
  if (e.target.closest("[data-open]")) openMail(id);
});

listEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const main = e.target.closest("[data-open]");
  if (!main) return;
  e.preventDefault();
  openMail(main.closest(".mail-row").dataset.id);
});

// Simpan draf balasan supaya tidak hilang saat panel baca dirender ulang
// (mis. ada kabar baru masuk waktu developer sedang mengetik).
readEl.addEventListener("input", (e) => {
  if (e.target.id !== "mailReplyText" || !state.openId) return;
  replyDrafts.set(state.openId, e.target.value);
  const c = document.getElementById("mailReplyCount");
  if (c) c.textContent = `${e.target.value.length}/300`;
});

async function sendReply(n) {
  const ta = document.getElementById("mailReplyText");
  const errEl = document.getElementById("mailReplyErr");
  const btn = document.getElementById("mailReplyBtn");
  if (!ta || !n.ticket) return;
  const text = ta.value.trim();
  errEl.textContent = "";
  if (!text) { errEl.textContent = "Isi balasan dulu."; return; }
  const me = auth.currentUser;
  if (!me) { errEl.textContent = "Kamu belum login."; return; }
  btn.disabled = true;
  btn.textContent = "Mengirim…";
  try {
    const batch = writeBatch(db);
    // 1) Balasan masuk ke Kotak Masuk si user, kategori "sistem".
    batch.set(doc(collection(db, "users", n.ticket.uid, "notifications")), {
      category: "sistem",
      title: "Balasan dari Developer",
      message: text,
      fromUid: me.uid, fromName: myName,
      ticketId: n.ticket.id,
      createdAt: serverTimestamp()
    });
    // 2) Tiket ditandai sudah dibalas.
    batch.update(doc(db, "supportTickets", n.ticket.id), {
      status: "replied", repliedAt: serverTimestamp(), repliedBy: me.uid, replyMessage: text
    });
    await batch.commit();
    replyDrafts.delete(n.id);
    patchNotifs([n.id], { replied: true, reply: text, read: true });
    showToast({
      type: "success", icon: "Check", sound: false, duration: 5000,
      title: "Balasan terkirim",
      message: "User akan melihatnya di Kotak Masuk, kategori Sistem."
    });
  } catch (err) {
    console.error(err);
    errEl.textContent = "Gagal mengirim balasan. Cek koneksi atau pastikan firestore.rules sudah dipublish ulang.";
    btn.disabled = false;
    btn.textContent = "Kirim balasan";
  }
}

readEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-r]");
  if (!b) return;
  const id = state.openId;
  const n = all.find((x) => x.id === id);
  if (!n) return;
  switch (b.dataset.r) {
    case "back":    closeRead(); renderAll(); break;
    case "star":    patchNotifs([id], { starred: !n.starred }); break;
    case "unread":  closeRead(); patchNotifs([id], { read: false }); break;
    case "trash":   trashIds([id]); break;
    case "restore": patchNotifs([id], { trashed: false, trashedAt: 0 }); break;
    case "purge":   purgeIds([id]); break;
    case "reply":   sendReply(n); break;
  }
});

// ---------- mulai ----------
requireAuth((user, profile) => {
  // Tamu (user === null): Kotak Masuk tetap terbuka, isinya riwayat lokal
  // browser ini (lihat initGuestNotifications di notifications.js).
  myName = (profile && (profile.displayName || profile.username)) || (user ? "Developer" : "Customer");
  document.title = `${INBOX_LABEL} — D'Printing`;
  const eyebrow = document.getElementById("inboxEyebrow");
  if (eyebrow) eyebrow.textContent = INBOX_LABEL;
  // initShell -> initNotifications memuat riwayat; getNotifHistory() baru
  // berisi data SETELAH ini.
  initShell({ user, profile, active: "inbox" });
  subscribeNotifs(refreshData);
  refreshData();
}, null, { allowGuest: true });
