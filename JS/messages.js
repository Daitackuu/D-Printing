import { db } from "./firebase-config.js";
import { requireAuth, fmtDate, conversationId, usernameLabel, avatarHtml, describeFirestoreError, showToast, askConfirm, normalizeUsername, isValidUsername, usernameToEmail } from "./app.js";
import { initShell, showGuestGateToast, showGuestLockBanner } from "./shell.js";
import {
  sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend
} from "./friends.js";
import {
  doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where,
  orderBy, onSnapshot, serverTimestamp, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const convList = document.getElementById("convList");
const chatLayout = document.getElementById("chatLayout");
const chatBackBtn = document.getElementById("chatBackBtn");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const chatInputRow = document.getElementById("chatInputRow");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const userSearch = document.getElementById("userSearch");
const searchResults = document.getElementById("searchResults");

const tabBtnObrolan = document.getElementById("tabBtnObrolan");
const tabBtnTeman = document.getElementById("tabBtnTeman");
const tabObrolan = document.getElementById("tabObrolan");
const tabTeman = document.getElementById("tabTeman");
const friendReqBadge = document.getElementById("friendReqBadge");
const incomingRequests = document.getElementById("incomingRequests");
const friendsList = document.getElementById("friendsList");
const addFriendSearch = document.getElementById("addFriendSearch");
const addFriendResults = document.getElementById("addFriendResults");
const addFriendUsername = document.getElementById("addFriendUsername");
const addFriendBtn = document.getElementById("addFriendBtn");
const addFriendStatus = document.getElementById("addFriendStatus");

const params = new URLSearchParams(window.location.search);
let me = null;
let myProfile = null;
let activeConvId = null;
let unsubMessages = null;
let currentOtherProfile = null;
let lastConvRows = [];
let allUsersCache = null; // dimuat sekali, dipakai buat filter pencarian client-side
const userCache = new Map();

requireAuth(async (user, profile) => {
  // Tamu: tampilan Pesan sebagai PREVIEW; isinya butuh akun.
  if (!user) { initGuestMessages(); return; }
  me = user;
  myProfile = profile;
  initShell({ user, profile, active: "messages" });

  // Kalau dibuka dengan ?with=uid (dari tombol "Kirim pesan" di profil),
  // langsung buka/bikin percakapan itu.
  const withUid = params.get("with");
  if (withUid && withUid !== me.uid) {
    await openConversation(withUid);
  }

  // Daftar percakapan aku, urut dari yang terakhir aktif.
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", me.uid),
    orderBy("updatedAt", "desc")
  );
  onSnapshot(q, async (snap) => {
    try {
      const rows = await Promise.all(snap.docs.map(async (d) => {
        const c = d.data();
        const otherUid = c.participants.find((p) => p !== me.uid);
        const other = await getUserCached(otherUid);
        return { id: d.id, otherUid, other, lastMessage: c.lastMessage || "", updatedAt: c.updatedAt };
      }));
      lastConvRows = rows;
      renderConvList(rows);
    } catch (e) {
      console.error(e);
      convList.innerHTML = `<div class="empty-state">Gagal memuat percakapan (coba refresh halaman).</div>`;
    }
  }, (err) => {
    // Tanpa handler ini, kalau firestore.rules belum dipublish ulang,
    // daftar percakapan akan diam selamanya di "Memuat percakapan…".
    console.error(err);
    convList.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat percakapan")}</div>`;
  });

  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });

  // Mobile ala Discord: begitu satu percakapan dibuka, daftar percakapan
  // disembunyikan dan panel chat tampil satu layar penuh (lihat CSS
  // .chat-layout.conv-open). Tombol ini cuma kelihatan di mobile untuk
  // balik ke daftar percakapan.
  if (chatBackBtn) {
    chatBackBtn.addEventListener("click", () => chatLayout.classList.remove("conv-open"));
  }

  // ---- search bar: cari pengguna buat mulai chat baru ----
  userSearch.addEventListener("input", () => {
    const term = userSearch.value.trim().toLowerCase();
    if (!term) {
      searchResults.classList.add("hidden");
      searchResults.innerHTML = "";
      return;
    }
    runUserSearch(term, searchResults, async (uid) => {
      userSearch.value = "";
      searchResults.classList.add("hidden");
      searchResults.innerHTML = "";
      await openConversation(uid);
    });
  });

  // ---- tab switching: Obrolan <-> Teman (sistem yang sudah ada di atas
  // TIDAK berubah sama sekali — ini cuma nambah panel baru di sebelahnya) ----
  tabBtnObrolan.addEventListener("click", () => switchTab("obrolan"));
  tabBtnTeman.addEventListener("click", () => switchTab("teman"));

  // ---- tab Teman: permintaan masuk, daftar teman, cari & tambah teman ----
  loadIncomingRequests();
  loadFriendsList();

  // ---- tambah teman lewat username (cocok persis -> request terkirim) ----
  addFriendBtn.addEventListener("click", addFriendByUsername);
  addFriendUsername.addEventListener("keydown", (e) => { if (e.key === "Enter") addFriendByUsername(); });
  addFriendUsername.addEventListener("input", () => setAddFriendStatus(""));

  addFriendSearch.addEventListener("input", () => {
    const term = addFriendSearch.value.trim().toLowerCase();
    if (!term) {
      addFriendResults.classList.add("hidden");
      addFriendResults.innerHTML = "";
      return;
    }
    runUserSearch(term, addFriendResults, async (uid, displayName) => {
      addFriendSearch.value = "";
      addFriendResults.classList.add("hidden");
      addFriendResults.innerHTML = "";
      try {
        await sendFriendRequest(me.uid, myProfile.displayName || me.email.split("@")[0], me.email, uid);
        showToast(`Permintaan pertemanan terkirim ke ${displayName}.`, "success");
      } catch (e) {
        console.error(e);
        showToast("Gagal kirim permintaan, coba lagi.", "error");
      }
    });
  });
}, null, { allowGuest: true });

// Preview Pesan buat tamu: kerangka halaman (tab, pencarian, daftar obrolan)
// tampil, tapi tanpa data. Mengakses isinya (cari pengguna, buka obrolan,
// kirim pesan) memunculkan popup + tombol Masuk / Daftar — tidak dipaksa
// pindah ke halaman login.
function initGuestMessages() {
  initShell({ user: null, profile: null, active: "messages" });
  showGuestLockBanner("Pesan");
  const gate = (what) => showGuestGateToast(`${what} cuma bisa dipakai setelah masuk/daftar dulu.`);

  convList.innerHTML = emptyBlock("chat", "Belum ada obrolan", "Obrolanmu akan muncul di sini setelah kamu masuk.");
  incomingRequests.innerHTML = emptyBlock("mail", "Belum ada permintaan", "Permintaan pertemanan muncul di sini setelah kamu masuk.");
  friendsList.innerHTML = emptyBlock("users", "Belum ada teman", "Daftar temanmu muncul di sini setelah kamu masuk.");

  tabBtnObrolan.addEventListener("click", () => switchTab("obrolan"));
  tabBtnTeman.addEventListener("click", () => switchTab("teman"));

  userSearch.addEventListener("focus", () => { userSearch.blur(); gate("Mencari pengguna & mulai chat"); });
  addFriendSearch.addEventListener("focus", () => { addFriendSearch.blur(); gate("Menambah teman"); });
  addFriendUsername.addEventListener("focus", () => { addFriendUsername.blur(); gate("Menambah teman"); });
  addFriendBtn.addEventListener("click", () => gate("Menambah teman"));
  convList.addEventListener("click", () => gate("Obrolan"));
  document.getElementById("chatPane").addEventListener("click", () => gate("Obrolan"));
}

// ---------------------------------------------------------------------
// Tab Teman: tambah teman lewat username
// Alur: username -> index publik usernames/{nama} -> uid -> users/{uid}.
// Akun lama yang belum ke-index dicari lewat field email (username@dprinting.local).
// Cuma akun terdaftar yang bisa kirim (tamu ditolak di client + firestore.rules).
// ---------------------------------------------------------------------
function setAddFriendStatus(message, type = "") {
  addFriendStatus.textContent = message;
  addFriendStatus.classList.toggle("hidden", !message);
  addFriendStatus.classList.toggle("is-error", type === "error");
  addFriendStatus.classList.toggle("is-success", type === "success");
}

async function findUserByUsername(uname) {
  let uid = null;
  const idx = await getDoc(doc(db, "usernames", uname));
  if (idx.exists()) uid = idx.data().uid;

  if (!uid) {
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", usernameToEmail(uname)), limit(1)));
    if (!snap.empty) uid = snap.docs[0].id;
  }
  if (!uid) return null;

  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists() || userSnap.data().banned) return null;
  return { uid, data: userSnap.data() };
}

let addingFriend = false;
async function addFriendByUsername() {
  if (addingFriend || !me) return;
  const uname = normalizeUsername(addFriendUsername.value.replace(/^@+/, ""));
  if (!uname) {
    setAddFriendStatus("Isi username temanmu dulu.", "error");
    return;
  }
  if (!isValidUsername(uname)) {
    setAddFriendStatus("Username 3–20 karakter: huruf kecil, angka, titik, atau underscore.", "error");
    return;
  }

  addingFriend = true;
  addFriendBtn.disabled = true;
  setAddFriendStatus("Mencari…");
  try {
    const found = await findUserByUsername(uname);
    if (!found) {
      setAddFriendStatus(`Username @${uname} tidak ditemukan. Cek lagi ejaannya.`, "error");
      return;
    }
    const { uid, data } = found;
    const label = "@" + (data.username || uname);

    if (uid === me.uid) {
      setAddFriendStatus("Itu akun kamu sendiri.", "error");
      return;
    }
    const [friendSnap, outgoingSnap, incomingSnap] = await Promise.all([
      getDoc(doc(db, "users", me.uid, "friends", uid)),
      getDoc(doc(db, "users", uid, "friendRequests", me.uid)),
      getDoc(doc(db, "users", me.uid, "friendRequests", uid))
    ]);
    if (friendSnap.exists()) {
      setAddFriendStatus(`Kamu sudah berteman dengan ${label}.`, "error");
      return;
    }
    if (outgoingSnap.exists()) {
      setAddFriendStatus(`Permintaan ke ${label} sudah terkirim, tinggal tunggu dia menerima.`, "error");
      return;
    }
    if (incomingSnap.exists()) {
      setAddFriendStatus(`${label} sudah mengirim permintaan ke kamu. Terima di bagian "Permintaan pertemanan masuk" di bawah.`, "error");
      return;
    }

    await sendFriendRequest(me.uid, myProfile.displayName || usernameLabel(me.email) || me.email, me.email, uid);
    addFriendUsername.value = "";
    setAddFriendStatus(`Permintaan pertemanan terkirim ke ${label}.`, "success");
    showToast(`Permintaan pertemanan terkirim ke ${label}.`, "success");
  } catch (e) {
    console.error(e);
    setAddFriendStatus(describeFirestoreError(e, "mengirim permintaan"), "error");
  } finally {
    addingFriend = false;
    addFriendBtn.disabled = false;
  }
}

function switchTab(tab) {
  const isObrolan = tab === "obrolan";
  tabObrolan.classList.toggle("hidden", !isObrolan);
  tabTeman.classList.toggle("hidden", isObrolan);
  tabBtnObrolan.classList.toggle("active", isObrolan);
  tabBtnTeman.classList.toggle("active", !isObrolan);
}

// ---------------------------------------------------------------------
// Tab Teman: permintaan pertemanan masuk
// ---------------------------------------------------------------------
function loadIncomingRequests() {
  const q = query(collection(db, "users", me.uid, "friendRequests"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    friendReqBadge.textContent = String(rows.length);
    friendReqBadge.classList.toggle("hidden", rows.length === 0);

    if (rows.length === 0) {
      incomingRequests.innerHTML = emptyBlock("mail", "Tidak ada permintaan", "Permintaan pertemanan yang masuk akan muncul di sini.");
      return;
    }
    incomingRequests.innerHTML = rows.map((r) => `
      <div class="friend-row">
        <div class="friend-row-info">
          ${avatarHtml(r, "sm")}
          <span class="friend-row-name">${escapeHtml(r.fromDisplayName || r.fromEmail)}<small>Ingin berteman denganmu</small></span>
        </div>
        <div class="friend-row-actions">
          <button class="btn btn-primary btn-sm" data-accept="${r.uid}">Terima</button>
          <button class="btn btn-outline btn-sm" data-decline="${r.uid}">Tolak</button>
        </div>
      </div>
    `).join("");

    incomingRequests.querySelectorAll("[data-accept]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await acceptFriendRequest(me.uid, btn.dataset.accept);
          loadFriendsList();
        } catch (e) {
          console.error(e);
          showToast("Gagal menerima permintaan, coba lagi.", "error");
        }
      });
    });
    incomingRequests.querySelectorAll("[data-decline]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await declineFriendRequest(me.uid, btn.dataset.decline);
        } catch (e) {
          console.error(e);
          showToast("Gagal menolak permintaan, coba lagi.", "error");
        }
      });
    });
  }, (err) => {
    console.error(err);
    incomingRequests.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat permintaan")}</div>`;
  });
}

// ---------------------------------------------------------------------
// Tab Teman: daftar teman
// ---------------------------------------------------------------------
function loadFriendsList() {
  onSnapshot(collection(db, "users", me.uid, "friends"), async (snap) => {
    if (snap.empty) {
      friendsList.innerHTML = emptyBlock("users", "Belum ada teman", "Cari pengguna atau ketik username di atas buat kirim permintaan.");
      return;
    }
    try {
      const rows = await Promise.all(snap.docs.map(async (d) => {
        const other = await getUserCached(d.id);
        return { uid: d.id, other };
      }));
      friendsList.innerHTML = rows.map((r) => `
        <div class="friend-row">
          <div class="friend-row-info">
            ${avatarHtml(r.other, "sm")}
            <a class="friend-row-name" href="profile.html?uid=${r.uid}">${escapeHtml(r.other.displayName || usernameLabel(r.other.email) || "user")}</a>
          </div>
          <div class="friend-row-actions">
            <button class="btn btn-primary btn-sm" data-chat="${r.uid}">Chat</button>
            <button class="btn btn-outline btn-sm" data-unfriend="${r.uid}">Hapus</button>
          </div>
        </div>
      `).join("");

      friendsList.querySelectorAll("[data-chat]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          switchTab("obrolan");
          await openConversation(btn.dataset.chat);
        });
      });
      friendsList.querySelectorAll("[data-unfriend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!(await askConfirm({ title: "Hapus pertemanan", body: "Hapus pertemanan ini?", confirmLabel: "Hapus" }))) return;
          try {
            await removeFriend(me.uid, btn.dataset.unfriend);
          } catch (e) {
            console.error(e);
            showToast("Gagal hapus, coba lagi.", "error");
          }
        });
      });
    } catch (e) {
      console.error(e);
      friendsList.innerHTML = `<div class="empty-state">Gagal memuat daftar teman.</div>`;
    }
  }, (err) => {
    console.error(err);
    friendsList.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat daftar teman")}</div>`;
  });
}

// Dipakai bareng oleh search bar "mulai chat baru" (tab Obrolan) dan
// search bar "tambah teman" (tab Teman) — resultsEl beda, onPick beda.
async function runUserSearch(term, resultsEl, onPick) {
  try {
    if (!allUsersCache) {
      // Dimuat sekali (maks 200 user), lalu difilter di client — cukup
      // buat skala komunitas kecil-menengah tanpa perlu index pencarian teks.
      const snap = await getDocs(query(collection(db, "users"), limit(200)));
      allUsersCache = snap.docs
        .filter((d) => d.id !== me.uid)
        .map((d) => ({ uid: d.id, ...d.data() }));
    }
    const matches = allUsersCache.filter((u) => {
      const name = (u.displayName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return name.includes(term) || username.includes(term) || email.includes(term);
    }).slice(0, 8);

    if (matches.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">Tidak ada pengguna dengan nama/email itu.</div>`;
    } else {
      resultsEl.innerHTML = matches.map((u) => `
        <div class="search-result-item" data-uid="${u.uid}" data-name="${escapeHtml(u.displayName || usernameLabel(u.email))}">
          ${avatarHtml(u)}
          <span>${escapeHtml(u.displayName || usernameLabel(u.email))}</span>
        </div>
      `).join("");
      resultsEl.querySelectorAll(".search-result-item").forEach((el) => {
        el.addEventListener("click", () => onPick(el.dataset.uid, el.dataset.name));
      });
    }
    resultsEl.classList.remove("hidden");
  } catch (e) {
    console.error(e);
    resultsEl.innerHTML = `<div class="empty-state">Gagal mencari pengguna, coba lagi.</div>`;
    resultsEl.classList.remove("hidden");
  }
}

async function getUserCached(uid) {
  if (userCache.has(uid)) return userCache.get(uid);
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.exists() ? snap.data() : { displayName: "(user dihapus)", email: "" };
  userCache.set(uid, data);
  return data;
}

function renderConvList(rows) {
  if (rows.length === 0) {
    convList.innerHTML = emptyBlock("chat", "Belum ada percakapan", "Cari pengguna di kolom atas, atau kirim pesan lewat halaman profil seseorang.");
    return;
  }
  convList.innerHTML = rows.map((r) => `
    <a class="conv-item ${r.id === activeConvId ? "active" : ""}" data-id="${r.id}" data-uid="${r.otherUid}">
      ${avatarHtml(r.other, "sm")}
      <div class="conv-item-info">
        <div class="conv-item-name">${escapeHtml(r.other.displayName || usernameLabel(r.other.email) || "user")}</div>
        <span class="conv-preview">${escapeHtml(r.lastMessage)}</span>
      </div>
    </a>
  `).join("");
  convList.querySelectorAll(".conv-item").forEach((el) => {
    el.addEventListener("click", () => openConversation(el.dataset.uid, el.dataset.id));
  });
}

async function openConversation(otherUid, knownConvId = null) {
  const convId = knownConvId || conversationId(me.uid, otherUid);
  activeConvId = convId;
  if (chatLayout) chatLayout.classList.add("conv-open");

  try {
    const ref = doc(db, "conversations", convId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: [me.uid, otherUid].sort(),
        lastMessage: "",
        updatedAt: serverTimestamp()
      });
    }

    const other = await getUserCached(otherUid);
    currentOtherProfile = other;
    chatHeader.innerHTML = `
      <a href="profile.html?uid=${encodeURIComponent(otherUid)}" class="chat-header-identity" title="Lihat profil">
        ${avatarHtml(other, "sm")}
        <span class="chat-header-text"><b>${escapeHtml(other.displayName || usernameLabel(other.email) || "user")}</b><small>Lihat profil</small></span>
      </a>`;
    chatInputRow.classList.remove("hidden");

    if (unsubMessages) unsubMessages();
    const mq = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc"));
    unsubMessages = onSnapshot(mq, (msnap) => {
      renderMessages(msnap.docs.map((d) => d.data()));
    }, (err) => {
      console.error(err);
      chatMessages.innerHTML = `<div class="empty-state">${describeFirestoreError(err, "memuat pesan")}</div>`;
    });

    convList.querySelectorAll(".conv-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === convId);
    });
  } catch (e) {
    console.error(e);
    chatHeader.textContent = "Gagal membuka percakapan, coba lagi.";
  }
}

function renderMessages(msgs) {
  if (msgs.length === 0) {
    chatMessages.innerHTML = emptyBlock("chat", "Belum ada pesan", "Kirim sapaan pertama buat mulai obrolan!");
  } else {
    // Bubble berurutan dari orang yang sama dirapatkan (is-grouped) & avatar
    // cuma di bubble pertama; pemisah hari muncul tiap ganti tanggal.
    let prevSender = null;
    let prevDay = "";
    chatMessages.innerHTML = msgs.map((m) => {
      const when = toDate(m.createdAt);
      let divider = "";
      if (when.toDateString() !== prevDay) {
        divider = `<div class="chat-day-divider"><span>${dayLabel(when)}</span></div>`;
        prevDay = when.toDateString();
        prevSender = null;
      }
      const mine = m.senderId === me.uid;
      const grouped = prevSender === m.senderId;
      prevSender = m.senderId;
      const avatar = mine ? "" : (grouped
        ? `<span class="chat-avatar-spacer" aria-hidden="true"></span>`
        : `<span class="chat-avatar-link">${avatarHtml(currentOtherProfile, "sm")}</span>`);
      return `${divider}
        <div class="chat-bubble-row ${mine ? "is-mine" : "is-theirs"}${grouped ? " is-grouped" : ""}">
          ${avatar}
          <div class="chat-bubble">
            <div class="msg-text">${escapeHtml(m.text)}</div>
            <span class="msg-time">${fmtClock(when)}</span>
          </div>
        </div>`;
    }).join("");
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeConvId) return;
  chatInput.value = "";
  try {
    await addDoc(collection(db, "conversations", activeConvId, "messages"), {
      senderId: me.uid,
      text,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "conversations", activeConvId), {
      lastMessage: text,
      lastSenderId: me.uid, // dipakai notifications.js buat tahu pesan terakhir dari siapa
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error(e);
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

// ---------------------------------------------------------------------
// Empty state bergambar (dipakai daftar obrolan, teman, permintaan, chat
// kosong, dan preview tamu) — biar kosongnya tetap enak dilihat.
// ---------------------------------------------------------------------
const EMPTY_ICONS = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M17 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.7 2.7 2.4 3 5.2"/>',
  mail: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.1"/>'
};
function emptyBlock(icon, title, text) {
  return `<div class="msg-empty">
    <div class="msg-empty-icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EMPTY_ICONS[icon] || EMPTY_ICONS.chat}</svg></div>
    <strong>${title}</strong>
    <span>${text}</span>
  </div>`;
}

// Jam saja untuk di dalam bubble; label hari untuk pemisah antar hari.
function toDate(ts) {
  if (!ts) return new Date(); // serverTimestamp belum balik = pesan baru saja dikirim
  return ts.toDate ? ts.toDate() : new Date(ts);
}
function fmtClock(d) {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
}
function dayLabel(d) {
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hari ini";
  if (d.toDateString() === yest.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
