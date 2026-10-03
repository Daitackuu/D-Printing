// ===================================================================
// D'Printing — Komunitas = direktori CHANNEL (ala Discord/WA), BUKAN
// feed postingan lagi (postingan sekarang ada di halaman Profil).
// Kalau belum ada channel sama sekali, tampil kosong tapi search bar
// & tombol "Buat channel" tetap ada.
// ===================================================================
import { db } from "./firebase-config.js";
import { requireAuth, fmtDate, describeFirestoreError, customSelectHtml, wireCustomSelect } from "./app.js";
import { initShell, showGuestGateToast, showGuestLockBanner } from "./shell.js";
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const channelSearch = document.getElementById("channelSearch");
const channelList = document.getElementById("channelList");
const createChannelBtn = document.getElementById("createChannelBtn");
const createChannelModal = document.getElementById("createChannelModal");
const channelNameInput = document.getElementById("channelNameInput");
const channelDescInput = document.getElementById("channelDescInput");
const createChannelErr = document.getElementById("createChannelErr");
const createChannelCancel = document.getElementById("createChannelCancel");
const createChannelSubmit = document.getElementById("createChannelSubmit");

let me = null;
let myProfile = null;
let allChannels = [];
let sortMode = "new";

// Warna avatar channel (kalau belum punya foto) — diturunkan dari nama,
// jadi channel yang sama selalu dapat warna yang sama.
const CH_COLORS = ["#1B2A4A", "#C1443C", "#3B7A57", "#3F6FB5", "#6B4FA0", "#B8862F"];
function channelColor(name) {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CH_COLORS[h % CH_COLORS.length];
}

requireAuth((user, profile) => {
  me = user;
  myProfile = profile;
  // Tamu (user === null) boleh melihat PREVIEW: jumlah & daftar channel.
  // Membuka channel / membuat channel memunculkan popup + tombol Masuk.
  const guest = !user;
  initShell({ user, profile, active: "community" });
  if (guest) showGuestLockBanner("Komunitas");

  const q = query(collection(db, "channels"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    allChannels = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderChannelList();
  }, (err) => {
    console.error(err);
    channelList.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat channel")}</div>`;
  });

  channelSearch.addEventListener("input", renderChannelList);
  // Dropdown urutan (custom-select, bukan <select> bawaan browser). "Channel milikku dulu"
  // cuma ada kalau sudah login (tamu tidak punya channel).
  const sortOptions = [
    { value: "new", label: "Terbaru" },
    { value: "old", label: "Terlama" },
    { value: "az", label: "Nama A–Z" },
    { value: "za", label: "Nama Z–A" },
    { value: "creator", label: "Pembuat A–Z" }
  ];
  if (!guest) sortOptions.push({ value: "mine", label: "Channel milikku dulu" });
  const sortWrap = document.getElementById("channelSortWrap");
  sortWrap.innerHTML = customSelectHtml("channelSort", sortOptions, sortMode, "comm-sort-dd");
  wireCustomSelect(sortWrap.querySelector(".custom-select"), (value) => {
    sortMode = value;
    renderChannelList();
  });

  if (guest) {
    createChannelBtn.addEventListener("click", () => {
      showGuestGateToast("Buat channel cuma bisa setelah masuk/daftar dulu.");
    });
    channelList.addEventListener("click", (e) => {
      if (!e.target.closest(".channel-card")) return;
      e.preventDefault();
      showGuestGateToast("Isi channel cuma bisa dibuka setelah masuk/daftar dulu.");
    });
    return;
  }

  createChannelBtn.addEventListener("click", () => {
    channelNameInput.value = "";
    channelDescInput.value = "";
    createChannelErr.textContent = "";
    createChannelModal.classList.remove("hidden");
  });
  createChannelCancel.addEventListener("click", () => createChannelModal.classList.add("hidden"));
  createChannelModal.addEventListener("click", (e) => {
    if (e.target === createChannelModal) createChannelModal.classList.add("hidden");
  });
  createChannelSubmit.addEventListener("click", submitCreateChannel);
  channelNameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitCreateChannel(); });
  channelDescInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitCreateChannel(); });
}, null, { allowGuest: true });

// Pembanding urutan daftar channel. Urutan dasar dari server = terbaru dulu; pembanding
// cadangan (nama) dipakai kalau nilai utamanya sama.
const createdMs = (c) => (c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : 0);
const byText = (x, y) => String(x || "").localeCompare(String(y || ""), "id", { sensitivity: "base" });
function channelComparator(mode) {
  const newest = (a, b) => createdMs(b) - createdMs(a);
  switch (mode) {
    case "old":     return (a, b) => createdMs(a) - createdMs(b);
    case "az":      return (a, b) => byText(a.name, b.name) || newest(a, b);
    case "za":      return (a, b) => byText(b.name, a.name) || newest(a, b);
    case "creator": return (a, b) => byText(a.creatorName, b.creatorName) || byText(a.name, b.name);
    case "mine":    return (a, b) => {
      const am = me && a.creatorId === me.uid ? 1 : 0;
      const bm = me && b.creatorId === me.uid ? 1 : 0;
      return (bm - am) || newest(a, b);
    };
    default:        return newest; // "new"
  }
}

function isNewChannel(c) {
  const ms = c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : 0;
  return ms && Date.now() - ms < 24 * 60 * 60 * 1000;
}

function renderChannelList() {
  const term = channelSearch.value.trim().toLowerCase();
  let filtered = term
    ? allChannels.filter((c) => (c.name || "").toLowerCase().includes(term) || (c.description || "").toLowerCase().includes(term))
    : allChannels.slice();
  filtered.sort(channelComparator(sortMode));

  const total = document.getElementById("channelTotal");
  if (total) total.textContent = allChannels.length;
  const note = document.getElementById("channelResultNote");
  if (note) note.textContent = term && allChannels.length ? `${filtered.length} dari ${allChannels.length} channel cocok` : "";

  if (allChannels.length === 0) {
    channelList.innerHTML = `
      <div class="comm-empty">
        <span class="comm-empty-icon">#</span>
        <strong>Belum ada channel</strong>
        <span>Jadi yang pertama bikin channel dan ajak yang lain ngobrol!</span>
      </div>`;
    return;
  }
  if (filtered.length === 0) {
    channelList.innerHTML = `
      <div class="comm-empty">
        <span class="comm-empty-icon">?</span>
        <strong>Nggak ada yang cocok</strong>
        <span>Coba kata kunci lain, atau bikin channel baru.</span>
      </div>`;
    return;
  }

  channelList.innerHTML = filtered.map((c) => {
    const color = channelColor(c.name);
    return `
    <a class="channel-card" href="${me ? `channel.html?id=${c.id}` : "#"}" style="--ch:${color};">
      <div class="channel-card-banner"><span class="channel-card-banner-hash" aria-hidden="true">#</span></div>
      <div class="channel-card-body">
        <div class="channel-card-top">
          ${c.photoURL ? `<img src="${c.photoURL}" class="channel-hash-icon channel-card-avatar" alt="" style="object-fit:cover;">` : `<span class="channel-hash-icon channel-card-avatar" style="background:${color};">#</span>`}
          ${isNewChannel(c) ? `<span class="channel-new-badge">Baru</span>` : ""}
        </div>
        <div class="channel-card-name">${escapeHtml(c.name)}</div>
        <div class="channel-card-desc">${c.description ? escapeHtml(c.description) : "Belum ada deskripsi."}</div>
        <div class="channel-card-foot">
          <span class="job-meta">oleh ${escapeHtml(c.creatorName || "user")} · ${fmtDate(c.createdAt)}</span>
          <span class="channel-open-pill">Buka →</span>
        </div>
      </div>
    </a>`;
  }).join("");
}

async function submitCreateChannel() {
  const name = channelNameInput.value.trim();
  if (!name) {
    createChannelErr.textContent = "Nama channel wajib diisi.";
    return;
  }
  createChannelSubmit.disabled = true;
  createChannelErr.textContent = "";
  try {
    const docRef = await addDoc(collection(db, "channels"), {
      name,
      description: channelDescInput.value.trim(),
      creatorId: me.uid,
      creatorName: myProfile.displayName || me.email.split("@")[0],
      createdAt: serverTimestamp()
    });
    createChannelModal.classList.add("hidden");
    window.location.href = `channel.html?id=${docRef.id}`;
  } catch (e) {
    console.error(e);
    createChannelErr.textContent = "Gagal bikin channel, coba lagi.";
  } finally {
    createChannelSubmit.disabled = false;
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}
