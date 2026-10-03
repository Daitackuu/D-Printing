// ===================================================================
// D'Printing — Kirim Notifikasi (khusus role "developer")
// Halaman sendiri (sebelumnya modal di Kelola User). Developer bisa:
//   • Tab "User" -> cari & centang satu atau beberapa user
// Dokumen ditulis ke users/{uid}/notifications (rules: cuma developer
// yang boleh bikin) dan dibaca notifications.js -> muncul di lonceng
// user, tab "Sistem" (pesan biasa) atau "Masalah" (kendala/gangguan).
// Bisa dibuka langsung dengan penerima terpilih: notify.html?uid=<uid>
// ===================================================================
import { db } from "./firebase-config.js";
import { requireAuth, usernameLabel, avatarHtml, describeFirestoreError, askConfirm, showToast } from "./app.js";
import { initShell, initBubbleMenu } from "./shell.js";
import {
  collection, onSnapshot, doc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const searchInput = document.getElementById("notifyUserSearch");
const pickedBox = document.getElementById("notifyPicked");
const userList = document.getElementById("notifyUserList");
const pickShownBtn = document.getElementById("notifyPickShown");
const clearPickedBtn = document.getElementById("notifyClearPicked");
const catSel = document.getElementById("notifyCat");
const titleInput = document.getElementById("notifyTitle");
const msgInput = document.getElementById("notifyMessage");
const countEl = document.getElementById("notifyCount");
const errEl = document.getElementById("notifyErr");
const summaryEl = document.getElementById("notifySummary");
const sendBtn = document.getElementById("notifySendBtn");

let allDocs = [];
let myUid = null;
let myName = "Developer";
const picked = new Set();
let preselect = new URLSearchParams(location.search).get("uid");

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function nameOf(d) {
  const u = d.data();
  return u.username || usernameLabel(u.email) || "user";
}

// ---------- penerima ----------
function recipients() {
  // Hanya id yang masih ada di daftar user (bisa saja sudah dihapus).
  const alive = new Set(allDocs.map((d) => d.id));
  return Array.from(picked).filter((id) => alive.has(id));
}

function renderPicked() {
  const ids = recipients();
  // "Kosongkan pilihan" cuma relevan kalau yang dipilih lebih dari 1.
  clearPickedBtn.classList.toggle("hidden", ids.length <= 1);
  if (!ids.length) {
    pickedBox.innerHTML = `<span class="notify-picked-empty">Belum ada user dipilih.</span>`;
    return;
  }
  pickedBox.innerHTML = ids.map((id) => {
    const d = allDocs.find((x) => x.id === id);
    return `<span class="notify-chip">${escapeHtml(d ? nameOf(d) : id)}<button type="button" data-remove="${escapeHtml(id)}" aria-label="Hapus dari pilihan">×</button></span>`;
  }).join("");
}

function shownDocs() {
  const term = searchInput.value.trim().toLowerCase();
  return allDocs.filter((d) => {
    if (!term) return true;
    const u = d.data();
    return (u.username || "").toLowerCase().includes(term) ||
           (u.email || "").toLowerCase().includes(term) ||
           (u.contactEmail || "").toLowerCase().includes(term);
  });
}

function renderList() {
  const docs = shownDocs();
  if (!docs.length) {
    userList.innerHTML = `<div class="empty-state">Tidak ada user yang cocok.</div>`;
    return;
  }
  userList.innerHTML = docs.map((d) => {
    const u = d.data();
    const isMe = d.id === myUid;
    const checked = picked.has(d.id);
    return `
      <label class="notify-user-row ${checked ? "is-checked" : ""}">
        <input type="checkbox" data-uid="${escapeHtml(d.id)}" ${checked ? "checked" : ""}>
        ${avatarHtml(u, "sm")}
        <span class="notify-user-info">
          <span class="notify-user-name">${escapeHtml(nameOf(d))}${isMe ? " (kamu)" : ""}${u.banned ? ' <span class="ban-badge">Diblokir</span>' : ""}</span>
          <span class="notify-user-email">${escapeHtml(u.contactEmail || u.email || "-")} · ${escapeHtml(u.role || "customer")}</span>
        </span>
      </label>`;
  }).join("");
}

function renderSummary() {
  const n = recipients().length;
  summaryEl.textContent = n === 0
    ? "Belum ada penerima"
    : `Akan dikirim ke ${n} user terpilih`;
}

function renderAll() {
  renderPicked();
  renderList();
  renderSummary();
}

// ---------- interaksi ----------
searchInput.addEventListener("input", renderList);

userList.addEventListener("change", (e) => {
  const box = e.target.closest("input[data-uid]");
  if (!box) return;
  if (box.checked) picked.add(box.dataset.uid); else picked.delete(box.dataset.uid);
  box.closest(".notify-user-row").classList.toggle("is-checked", box.checked);
  renderPicked();
  renderSummary();
});

pickedBox.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-remove]");
  if (!b) return;
  picked.delete(b.dataset.remove);
  renderPicked();
  renderList();
  renderSummary();
});

pickShownBtn.addEventListener("click", () => {
  shownDocs().forEach((d) => picked.add(d.id));
  renderPicked();
  renderList();
  renderSummary();
});
clearPickedBtn.addEventListener("click", () => {
  picked.clear();
  renderPicked();
  renderList();
  renderSummary();
});

msgInput.addEventListener("input", () => {
  countEl.textContent = `${msgInput.value.length}/300`;
});

sendBtn.addEventListener("click", async () => {
  errEl.textContent = "";
  const title = titleInput.value.trim();
  const message = msgInput.value.trim();
  const category = catSel.value === "masalah" ? "masalah" : "sistem";
  if (!title) { errEl.textContent = "Judul wajib diisi."; return; }
  if (!message) { errEl.textContent = "Pesan wajib diisi."; return; }
  const ids = recipients();
  if (!ids.length) {
    errEl.textContent = "Pilih minimal satu user dulu.";
    return;
  }
  if (ids.length > 1) {
    const ok = await askConfirm({
      title: `Kirim ke ${ids.length} user?`,
      body: "Notifikasi ini akan muncul di lonceng semua penerima dan tidak bisa ditarik kembali.",
      confirmLabel: "Kirim",
      danger: false
    });
    if (!ok) return;
  }
  sendBtn.disabled = true;
  sendBtn.textContent = "Mengirim…";
  try {
    // Firestore membatasi 500 operasi per batch.
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((uid) => {
        batch.set(doc(collection(db, "users", uid, "notifications")), {
          category, title, message,
          fromUid: myUid, fromName: myName,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    }
    showToast(`Notifikasi terkirim ke ${ids.length} user.`, "success");
    titleInput.value = "";
    msgInput.value = "";
    countEl.textContent = "0/300";
    picked.clear();
    renderAll();
  } catch (e) {
    console.error(e);
    errEl.innerHTML = describeFirestoreError(e, "mengirim notifikasi");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Kirim notifikasi";
  }
});

requireAuth((user, profile) => {
  myUid = user.uid;
  myName = (profile && (profile.displayName || profile.username)) || "Developer";
  initShell({ user, profile, active: "notify" });
  initBubbleMenu(profile);
  onSnapshot(collection(db, "users"), (snap) => {
    allDocs = snap.docs.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b), "id", { sensitivity: "base" }));
    // ?uid=... -> langsung terpilih (sekali saja, kalau user-nya ada).
    if (preselect && allDocs.some((d) => d.id === preselect)) {
      picked.add(preselect);
      preselect = null;
    }
    renderAll();
  }, (err) => {
    console.error(err);
    userList.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat daftar user")}</div>`;
  });
  renderPicked();
  renderSummary();
}, "developer");
