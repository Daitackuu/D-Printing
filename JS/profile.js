import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { backupGuestProfile } from "./guest-sync.js";
import { getGuestInfo, saveGuestInfo, guestInfoError, guestWaNumber, guestUsername, cleanGuestUsername, hasGuestInfo } from "./guest.js";
import { requireAuth, normalizeUsername, isUsernameTaken, fmtDate, fmtRupiah, countDocs, usernameLabel, avatarHtml, iconImg, describeFirestoreError, jobCodeLabel, normalizeRegionPart, regionKeyFrom, regionLabel, REGION_LABELS, REGION_LEVELS, PRESENCE_STATUSES, effectivePresence, showToast, askConfirm } from "./app.js";
import { initShell } from "./shell.js";
import { uploadToCloudinary } from "./cloudinary.js";
import { sendFriendRequest, cancelFriendRequest, acceptFriendRequest, removeFriend } from "./friends.js";
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc, addDoc, collection,
  query, where, orderBy, getDocs, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const profileCard = document.getElementById("profileCard");
const editCard = document.getElementById("editCard");
const displayNameInput = document.getElementById("displayNameInput");
const bioInput = document.getElementById("bioInput");
const waNumberInput = document.getElementById("waNumberInput");
const waNumberLabel = document.getElementById("waNumberLabel");
const detectLocationBtn = document.getElementById("detectLocationBtn");
const locationErr = document.getElementById("locationErr");
const locationMapWrap = document.getElementById("locationMapWrap");
const locationMapEl = document.getElementById("locationMap");
const locationMapToggle = document.getElementById("locationMapToggle");
const locationMapHint = document.getElementById("locationMapHint");
const locationMapArrow = document.getElementById("locationMapArrow");
const locProvinceSelect = document.getElementById("locProvinceSelect");
const locProvinceCustomInput = document.getElementById("locProvinceCustomInput");
const locCitySelect = document.getElementById("locCitySelect");
const locCityCustomInput = document.getElementById("locCityCustomInput");
const locDistrictSelect = document.getElementById("locDistrictSelect");
const locDistrictCustomInput = document.getElementById("locDistrictCustomInput");
const locVillageSelect = document.getElementById("locVillageSelect");
const locVillageCustomInput = document.getElementById("locVillageCustomInput");
const locPostalCodeInput = document.getElementById("locPostalCodeInput");
const locStreetInput = document.getElementById("locStreetInput");
const locRtRwInput = document.getElementById("locRtRwInput");
const locLandmarkInput = document.getElementById("locLandmarkInput");
const streetDetailToggleBtn = document.getElementById("streetDetailToggleBtn");
const streetDetailCollapse = document.getElementById("streetDetailCollapse");
const streetDetailToggleArrow = document.getElementById("streetDetailToggleArrow");
const editErr = document.getElementById("editErr");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const postGrid = document.getElementById("postGrid");
const historyCard = document.getElementById("historyCard");
const historyTitle = document.getElementById("historyTitle");
const earningsBox = document.getElementById("earningsBox");
const historyList = document.getElementById("historyList");
const avatarInput = document.getElementById("avatarInput");

const newPostModal = document.getElementById("newPostModal");
const newPostText = document.getElementById("newPostText");
const newPostPreviewWrap = document.getElementById("newPostPreviewWrap");
const newPostPreview = document.getElementById("newPostPreview");
const newPostImageInput = document.getElementById("newPostImageInput");
const newPostAddImageBtn = document.getElementById("newPostAddImageBtn");
const newPostErr = document.getElementById("newPostErr");
const newPostCancel = document.getElementById("newPostCancel");
const newPostSubmit = document.getElementById("newPostSubmit");

const postDetailModal = document.getElementById("postDetailModal");
const postDetailBody = document.getElementById("postDetailBody");

const statusModal = document.getElementById("statusModal");
const statusMenuList = document.getElementById("statusMenuList");

const params = new URLSearchParams(window.location.search);
let currentUser = null;
let currentUserProfile = null;
let selectedPostImageFile = null;

// ===================================================================
// Fitur "Isi otomatis dari peta" (deteksi lokasi + pin geser) dipakai
// di kartu Edit profil. Pakai Leaflet (peta, lib JS biasa, dimuat lewat
// tag <script> di profile.html) + Nominatim/OpenStreetMap (reverse-
// geocode alamat lewat fetch biasa) — dua-duanya gratis penuh, tanpa
// API key & tanpa billing apapun, beda dari Google Maps yang tetap
// wajib billing aktif meski masih di kuota gratis.
// ===================================================================
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/reverse";

let locMap = null;
let locMarker = null;
let locLat = null;
let locLng = null;

// Isi Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan/Desa & Kode Pos dari
// hasil reverse-geocode Nominatim (OpenStreetMap). Detail alamat lengkap
// (jalan, RT/RW, patokan) SENGAJA tidak diminta di form ini sama sekali —
// itu nanti diisi oleh operator, bukan sama customer di sini.
// Nominatim balikin objek "address" yang key-nya nggak seketat Google —
// kadang nama kelurahan malah ke-tag di field yang "harusnya" kecamatan
// atau sebaliknya (data OSM diisi komunitas, bukan lembaga resmi tunggal).
// Makanya tiap tingkat dikasih BEBERAPA kandidat key sekaligus (bukan cuma
// satu), diurut dari yang biasanya paling akurat — applyLocationSelection
// yang nyoba cocokkan tiap kandidat ke daftar wilayah resmi, dari yang
// pertama, dan berhenti begitu ketemu yang cocok.
function fillAddressFromGeocode(result) {
  const a = result.address || {};
  const names = {
    province: [a.state, a.province],
    city: [a.city, a.county, a.regency, a.city_district],
    district: [a.city_district, a.suburb, a.district, a.municipality, a.town],
    village: [a.village, a.suburb, a.hamlet, a.neighbourhood, a.quarter]
  };
  const postalCode = a.postcode || "";
  applyLocationSelection(names, postalCode).catch((e) => console.error(e));
}

// ===================================================================
// Dropdown bertingkat Provinsi -> Kota/Kabupaten -> Kecamatan ->
// Kelurahan/Desa pakai data wilayah resmi Indonesia dari API statis
// publik (emsifa/api-wilayah-indonesia). Kalau nama dari data tersimpan/
// hasil geocode nggak ketemu di daftar, tingkat itu (dan yang di
// bawahnya) tetap di "Pilih …" — kotak tulis sendiri baru muncul setelah
// user memilih sendiri opsi "Tidak ada di daftar (tulis sendiri)".
// ===================================================================
// Sumber data: API statis emsifa v2 (https://www.emsifa.com/api-wilayah-indonesia/).
// Repo lama emsifa sudah pindah — dua alamat lama yang dulu dipakai
// (cdn.jsdelivr.net/gh/emsifa/...@master/api/ dan emsifa.github.io/...) sudah
// nggak berfungsi lagi. Format v2: { data: [...], meta: {...} } dan ID pakai
// titik (mis. "35.73"); format lama (cadangan) langsung berupa array.
// Endpoint: /provinces.json, /regencies/{province_id}.json,
// /districts/{regency_id}.json, /villages/{district_id}.json.
const WILAYAH_API_BASES = [
  "https://www.emsifa.com/api-wilayah-indonesia/v2/",
  // Cadangan: API versi lama di domain yang sama (data 34 provinsi, format array).
  "https://www.emsifa.com/api-wilayah-indonesia/api/"
];
const WILAYAH_TIMEOUT_MS = 6000;
const CUSTOM_VALUE = "__custom__";
const CUSTOM_LABEL = "Tidak ada di daftar (tulis sendiri)";

// Urutan tingkat WAJIB sama dengan REGION_LEVELS di app.js. `path(idInduk)`
// = alamat daftar pilihan tingkat ini; `lock` = teks saat masih terkunci.
const LEVELS = [
  { key: "province", noun: "provinsi", sel: locProvinceSelect, custom: locProvinceCustomInput,
    path: () => "provinces.json", lock: "Pilih provinsi dulu" },
  { key: "city", noun: "kota/kabupaten", sel: locCitySelect, custom: locCityCustomInput,
    path: (id) => `regencies/${id}.json`, lock: "Pilih provinsi dulu" },
  { key: "district", noun: "kecamatan", sel: locDistrictSelect, custom: locDistrictCustomInput,
    path: (id) => `districts/${id}.json`, lock: "Pilih kota/kabupaten dulu" },
  { key: "village", noun: "kelurahan/desa", sel: locVillageSelect, custom: locVillageCustomInput,
    path: (id) => `villages/${id}.json`, lock: "Pilih kecamatan dulu" }
];
const listCache = {};
let chainToken = 0; // naik tiap ada perubahan pilihan/pengisian otomatis baru — hasil async yang basi dibuang

// Fetch data wilayah dengan batas waktu per mirror. Tanpa timeout, kalau
// koneksi ke CDN macet, dropdown bakal nyangkut selamanya di "Memuat…"
// dan opsi "Lainnya (isi sendiri)" nggak pernah muncul buat dipilih.
async function fetchWilayah(path) {
  let lastErr;
  for (const base of WILAYAH_API_BASES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WILAYAH_TIMEOUT_MS);
    try {
      const r = await fetch(base + path, { signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      // v2 -> { data: [...] }, versi lama -> [...]
      const list = Array.isArray(json) ? json : (json && json.data);
      if (!Array.isArray(list) || list.length === 0) throw new Error("Format data wilayah tidak dikenali");
      return list;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// Daftar yang sudah berhasil dimuat disimpan (per alamat) supaya pindah-
// pindah pilihan tidak fetch ulang; yang gagal tidak disimpan.
function loadList(path) {
  if (!listCache[path]) {
    listCache[path] = fetchWilayah(path).catch((e) => {
      delete listCache[path];
      throw e;
    });
  }
  return listCache[path];
}

// Data wilayah dari API-nya dalam huruf kapital semua (mis. "JAWA TIMUR",
// "KABUPATEN ACEH SINGKIL") — dirapikan jadi Title Case, kecuali singkatan
// resmi kayak "DKI"/"DI" yang tetap kapital semua.
function toTitleCase(str) {
  const keepUpper = new Set(["DKI", "DI"]);
  return (str || "").toLowerCase().split(" ").map((w) => {
    const upper = w.toUpperCase();
    if (keepUpper.has(upper)) return upper;
    return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }).join(" ");
}

function makeOption(value, text) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = text;
  return opt;
}

// Isi dropdown tingkat ke-i. `list` boleh kosong (induknya "Lainnya" /
// daftar gagal dimuat) — dropdown tetap aktif dgn "Pilih…" + "Lainnya".
function populateLevel(i, list, selectedValue) {
  const L = LEVELS[i];
  L.sel.innerHTML = "";
  L.sel.appendChild(makeOption("", `Pilih ${L.noun}`));
  list.forEach((x) => L.sel.appendChild(makeOption(x.id, toTitleCase(x.name))));
  L.sel.appendChild(makeOption(CUSTOM_VALUE, CUSTOM_LABEL));
  L.sel.disabled = false;
  if (selectedValue) L.sel.value = selectedValue;
}

function setLevelLoading(i) {
  const L = LEVELS[i];
  L.sel.innerHTML = "";
  L.sel.appendChild(makeOption("", "Memuat…"));
  L.sel.disabled = true;
}

// Kunci tingkat ke-i dan semua yang di bawahnya ("Pilih … dulu").
function lockFrom(i) {
  for (let k = i; k < LEVELS.length; k++) {
    const L = LEVELS[k];
    L.sel.innerHTML = "";
    L.sel.appendChild(makeOption("", L.lock));
    L.sel.disabled = true;
    L.custom.value = "";
  }
  syncCustomInputs();
}

// SATU-SATUNYA tempat yang nentuin kotak "Tulis nama ... kamu" kelihatan
// atau nggak: kotaknya cuma muncul kalau dropdown-nya lagi di pilihan
// "Lainnya (isi sendiri)".
function syncCustomInputs() {
  LEVELS.forEach((L) => L.custom.classList.toggle("hidden", L.sel.value !== CUSTOM_VALUE));
}

function selectedName(i) {
  const L = LEVELS[i];
  if (L.sel.value === CUSTOM_VALUE) return L.custom.value.trim();
  if (!L.sel.value) return "";
  return L.sel.selectedOptions[0].textContent;
}

// Nilai wilayah yang lagi dipilih/diisi di form: { province, city, district, village }
function selectedRegion() {
  const out = {};
  LEVELS.forEach((L, i) => { out[L.key] = selectedName(i); });
  return out;
}

// Cocokkan nama (dari data tersimpan ATAU hasil geocode) ke pilihan
// dropdown, tingkat demi tingkat dari provinsi ke bawah. Kalau ketemu,
// dropdown-nya yang keisi dan daftar tingkat berikutnya dimuat; kalau
// nggak ketemu di daftar resmi, tingkat itu pindah ke "Lainnya (isi
// sendiri)" + kotaknya keisi (tingkat di bawahnya cuma nawarin "Lainnya").
// Tingkat yang namanya kosong berhenti di "Pilih …" dan tingkat di
// bawahnya dikunci. Kode pos cuma ditimpa kalau ada nilainya.
//
// `names[L.key]` boleh satu string (data tersimpan) ATAU array beberapa
// kandidat nama sekaligus (hasil geocode) — dicoba SATU-SATU dicocokkan ke
// daftar wilayah resmi, dari yang paling mungkin benar duluan. Ini penting
// khusus buat OpenStreetMap: beda dari Google yang tegas nge-tag tiap
// level administratif, OSM kadang salah nge-tag suatu tempat ke level yang
// salah (mis. nama kelurahan ke-tag sebagai field yang harusnya kecamatan).
// Dengan nyoba beberapa kandidat & baru pakai yang ketemu cocok di daftar
// resmi, kesalahan tagging OSM kayak gitu jadi nggak bikin gagal cocok.
async function applyLocationSelection(names, postalCode) {
  const token = ++chainToken;
  locationErr.textContent = "";
  if (postalCode) locPostalCodeInput.value = postalCode;

  let prev = "root"; // "root" | "id" (dipilih dari daftar) | "custom" | "empty"
  let parentId = null;
  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    if (i > 0 && prev === "empty") { lockFrom(i); return; }

    const raw = (names && names[L.key]) || "";
    const candidates = (Array.isArray(raw) ? raw : [raw])
      .map((s) => (s || "").trim())
      .filter(Boolean);
    let list = [];
    if (i === 0 || prev === "id") {
      setLevelLoading(i);
      try {
        list = await loadList(L.path(parentId));
      } catch (e) {
        console.error(e);
        if (token !== chainToken) return;
        locationErr.textContent = `Gagal memuat daftar ${L.noun} (cek koneksi internet kamu) — pilih "${CUSTOM_LABEL}" buat isi sendiri.`;
      }
      if (token !== chainToken) return; // user udah ganti pilihan / ada pengisian otomatis baru
    }

    // Coba tiap kandidat satu-satu, pakai yang pertama cocok ke daftar resmi.
    let match = null;
    for (const cand of candidates) {
      const wanted = normalizeRegionPart(L.key, cand);
      match = wanted ? list.find((x) => normalizeRegionPart(L.key, x.name) === wanted) : null;
      if (match) break;
    }
    const name = candidates[0] || ""; // dipakai buat pesan error / fallback kalau semua kandidat gagal cocok
    populateLevel(i, list, match ? match.id : undefined);
    if (match) {
      L.custom.value = "";
      parentId = match.id;
      prev = "id";
    } else if (name) {
      // Nama nggak ada di daftar resmi: kotak "tulis sendiri" TIDAK dibuka
      // otomatis. Dropdown dibiarkan di "Pilih …" dan user diminta memilih
      // sendiri opsi "tulis sendiri" dulu, baru kotaknya muncul.
      L.custom.value = "";
      if (!locationErr.textContent) {
        locationErr.textContent = `"${name}" (${L.noun}) tidak ada di daftar — pilih "${CUSTOM_LABEL}" di dropdown ${L.noun} lalu tulis sendiri.`;
      }
      prev = "empty";
    } else {
      L.custom.value = "";
      prev = "empty";
    }
  }
  syncCustomInputs();
}

// Pilihan diganti user: tingkat di bawahnya dikosongkan/dikunci lagi, lalu
// (kalau pilihan dari daftar) daftar tingkat berikutnya dimuat.
LEVELS.forEach((L, i) => {
  L.sel.addEventListener("change", async () => {
    const token = ++chainToken;
    const val = L.sel.value;
    L.custom.value = "";
    locationErr.textContent = "";
    if (i + 1 < LEVELS.length) lockFrom(i + 1);
    syncCustomInputs();
    if (val === CUSTOM_VALUE) L.custom.focus();
    if (i + 1 >= LEVELS.length || !val) return;

    const next = LEVELS[i + 1];
    if (val === CUSTOM_VALUE) {
      // Nggak ada daftar buat wilayah buatan sendiri — tingkat berikutnya
      // cuma nawarin "Lainnya (isi sendiri)".
      populateLevel(i + 1, []);
      return;
    }
    setLevelLoading(i + 1);
    try {
      const list = await loadList(next.path(val));
      if (token !== chainToken) return; // user udah ganti pilihan
      populateLevel(i + 1, list);
    } catch (e) {
      console.error(e);
      if (token !== chainToken) return;
      locationErr.textContent = `Gagal memuat daftar ${next.noun} — pilih "${CUSTOM_LABEL}" buat isi sendiri.`;
      populateLevel(i + 1, []);
    }
    syncCustomInputs();
  });
});

// Reverse-geocode lewat Nominatim (OpenStreetMap) — endpoint publik
// gratis, tanpa API key. Nominatim minta request nggak spam-cepat dan
// nggak butuh header khusus dari browser (aturan pemakaian wajarnya soal
// jeda antar-request itu buat kalau manggil banyak sekali berturut-turut,
// bukan buat satu kali klik/geser pin oleh user).
async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM_BASE}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) return null;
    const data = await r.json();
    return data && !data.error ? data : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Nampilin/pindahin peta preview ke satu titik + pasang marker yang bisa
// digeser tangan. Dipanggil baik dari tombol deteksi maupun (kalau
// profil ini sudah pernah punya lokasi tersimpan) otomatis pas halaman
// Edit profil dibuka, biar user langsung lihat & bisa koreksi titiknya.
async function placeLocationMapAt(lat, lng) {
  // Wrap (berisi tombol Tampilkan/Sembunyikan peta) selalu muncul, tapi
  // petanya sendiri TETAP TERTUTUP sampai user menekan tombolnya — supaya
  // tidak memenuhi layar HP setelah lokasi cocok.
  locationMapWrap.classList.remove("hidden");
  const wasHidden = locationMapEl.classList.contains("hidden");
  // Leaflet butuh kontainer yang kelihatan buat mengukur ukurannya, jadi
  // peta dibuat/digeser sambil dibuka sebentar (tidak terlihat: sinkron).
  locationMapEl.classList.remove("hidden");
  if (!locMap) {
    locMap = L.map(locationMapEl).setView([lat, lng], 17);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(locMap);
    locMarker = L.marker([lat, lng], { draggable: true }).addTo(locMap);
    locMarker.on("dragend", async () => {
      const pos = locMarker.getLatLng();
      locLat = pos.lat;
      locLng = pos.lng;
      locationErr.textContent = "";
      const result = await reverseGeocode(locLat, locLng);
      if (result) { fillAddressFromGeocode(result); setLocationMapOpen(false); }
      else locationErr.textContent = "Titik lokasinya kepindah, tapi alamatnya nggak kebaca otomatis — isi manual aja bagian yang masih kosong.";
    });
  } else {
    locMap.setView([lat, lng], 17);
    locMarker.setLatLng([lat, lng]);
  }
  locMap.invalidateSize();
  // Pin cuma boleh digeser selama mode edit profil aktif (lihat setEditMode).
  if (locMarker && locMarker.dragging) {
    if (isEditing) locMarker.dragging.enable(); else locMarker.dragging.disable();
  }
  if (wasHidden) setLocationMapOpen(false);
}

// Buka/tutup peta preview. Ditutup = display:none (bukan cuma disembunyikan
// visual), jadi tidak ada lagi lapisan peta yang bisa nimpa elemen lain.
function setLocationMapOpen(open) {
  locationMapEl.classList.toggle("hidden", !open);
  if (locationMapToggle) {
    // Tombolnya sekarang bar tipis (judul + panah), teksnya tidak lagi
    // ganti-ganti "Tampilkan/Sembunyikan" — cukup panahnya yang berputar.
    locationMapToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (locationMapArrow) locationMapArrow.classList.toggle("open", open);
    if (locationMapHint) locationMapHint.textContent = open ? "Geser pin buat koreksi" : "Lihat & geser pin";
  }
  if (open && locMap) setTimeout(() => locMap.invalidateSize(), 0);
}
if (locationMapToggle) {
  locationMapToggle.addEventListener("click", () => {
    setLocationMapOpen(locationMapEl.classList.contains("hidden"));
  });
}

if (detectLocationBtn) {
  detectLocationBtn.addEventListener("click", () => {
    locationErr.textContent = "";
    if (!navigator.geolocation) {
      locationErr.textContent = "Browser kamu tidak mendukung deteksi lokasi otomatis — isi manual aja di bawah.";
      return;
    }
    detectLocationBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      locLat = pos.coords.latitude;
      locLng = pos.coords.longitude;
      try {
        await placeLocationMapAt(locLat, locLng);
        const result = await reverseGeocode(locLat, locLng);
        if (result) fillAddressFromGeocode(result);
        else locationErr.textContent = "Titik lokasinya ketemu, tapi alamatnya nggak kebaca otomatis — isi manual aja bagian yang masih kosong.";
      } catch (e) {
        console.error(e);
        locationErr.textContent = "Gagal memuat peta. Coba lagi.";
      } finally {
        detectLocationBtn.disabled = false;
      }
    }, (err) => {
      console.error(err);
      locationErr.textContent = "Gagal ambil lokasi — pastikan izin lokasi browser/perangkat kamu sudah diaktifkan.";
      detectLocationBtn.disabled = false;
    });
  });
}
let postsCache = [];

// ---- kolom Detail alamat (jalan/nomor rumah/RT-RW/patokan): opsional,
// disembunyikan (collapsed) secara default buat semua role, sama kayak
// kolom Kode Web ID di halaman Masuk/Daftar — diklik dulu baru kebuka ----
streetDetailToggleBtn.addEventListener("click", () => {
  const isOpen = streetDetailCollapse.classList.toggle("open");
  streetDetailToggleArrow.classList.toggle("open", isOpen);
  streetDetailToggleBtn.setAttribute("aria-expanded", String(isOpen));
});

// ---- Mode edit profil ----
// Form "Edit profil" (termasuk peta & pin lokasi) TERSEMBUNYI secara
// default dan baru muncul setelah tombol "Edit profil" di kartu profil
// diklik. Pin peta juga cuma bisa digeser selama mode edit aktif.
let isEditing = false;
function syncEditButton() {
  const btn = document.getElementById("editProfileBtn");
  if (!btn) return;
  btn.classList.toggle("is-active", isEditing);
  btn.setAttribute("aria-expanded", String(isEditing));
}
function setEditMode(open, { scroll = true } = {}) {
  isEditing = open;
  editCard.classList.toggle("hidden", !open);
  syncEditButton();
  if (locMarker && locMarker.dragging) {
    if (open) locMarker.dragging.enable(); else locMarker.dragging.disable();
  }
  if (open) {
    // peta dibuat waktu kartunya masih tersembunyi (ukuran 0) — ukur ulang
    // sekarang setelah kelihatan.
    if (locMap && !locationMapEl.classList.contains("hidden")) {
      setTimeout(() => { locMap.invalidateSize(); if (locMarker) locMap.setView(locMarker.getLatLng(), locMap.getZoom()); }, 0);
    }
    if (scroll) editCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (scroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => setEditMode(false));
const secLocEl = document.getElementById("secLoc");
if (secLocEl) secLocEl.addEventListener("toggle", () => {
  if (secLocEl.open && locMap) setTimeout(() => { locMap.invalidateSize(); if (locMarker) locMap.setView(locMarker.getLatLng(), locMap.getZoom()); }, 0);
});

// ---- Sosial & foto di form Edit profil ----
const cleanHandle = (v) => String(v || "").trim().replace(/^https?:\/\/[^/]+\//i, "").replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
const cleanYoutube = (v) => String(v || "").trim().replace(/^https?:\/\/[^/]+\//i, "").replace(/^@+/, "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 30);
let pendingAvatarFile = null;
const socialLinksHtml = (soc) => {
  soc = soc || {};
  const items = [
    soc.instagram && ["Instagram", "https://instagram.com/" + encodeURIComponent(soc.instagram)],
    soc.tiktok && ["TikTok", "https://tiktok.com/@" + encodeURIComponent(soc.tiktok)],
    soc.facebook && ["Facebook", "https://facebook.com/" + encodeURIComponent(soc.facebook)],
    soc.youtube && ["YouTube", "https://youtube.com/@" + encodeURIComponent(soc.youtube)]
  ].filter(Boolean);
  if (!items.length) return "";
  return `<p class="job-meta" style="margin:0 0 10px;">${items.map(([n, u]) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">${n}</a>`).join(" &nbsp;·&nbsp; ")}</p>`;
};

// Profil akun terdaftar (tidak diubah) — dijalankan kalau yang buka BUKAN tamu.
function initRegisteredProfile() {
requireAuth(async (me, myProfile) => {
  currentUser = me;
  currentUserProfile = myProfile;
  currentUserProfile.connected = true; // tab ini jelas lagi kebuka
  initShell({ user: me, profile: myProfile, active: "profile" });

  const targetUid = params.get("uid") || me.uid;
  const isMe = targetUid === me.uid;

  // Semua di bawah ini dibungkus try/catch supaya kalau ada error izin
  // Firestore (mis. firestore.rules belum dipublish ulang), halaman
  // menampilkan pesan yang jelas, bukan diam selamanya di "Memuat profil…".
  try {
    const targetSnap = await getDoc(doc(db, "users", targetUid));
    if (!targetSnap.exists()) {
      profileCard.innerHTML = `<div class="empty-state">User tidak ditemukan.</div>`;
      postGrid.innerHTML = "";
      return;
    }
    const target = targetSnap.data();
    // Lihat profil sendiri: tab ini SUDAH PASTI kebuka (requireAuth barusan
    // nulis connected:true), jangan sampai badge kelihatan "Offline" sesaat
    // gara-gara tulisan connected:true ke Firestore belum kelar pas baris
    // ini jalan (race condition async biasa, bukan bug).
    if (isMe) target.connected = true;

    const [followersCount, followingCount] = await Promise.all([
      countDocs(collection(db, "users", targetUid, "followers")),
      countDocs(collection(db, "users", targetUid, "following"))
    ]);

    let iFollow = false;
    let friendStatus = "me";
    if (!isMe) {
      const [followDoc, friendDoc, sentReqDoc, receivedReqDoc] = await Promise.all([
        getDoc(doc(db, "users", targetUid, "followers", me.uid)),
        getDoc(doc(db, "users", targetUid, "friends", me.uid)),
        getDoc(doc(db, "users", targetUid, "friendRequests", me.uid)),
        getDoc(doc(db, "users", me.uid, "friendRequests", targetUid))
      ]);
      iFollow = followDoc.exists();
      if (friendDoc.exists()) friendStatus = "friends";
      else if (sentReqDoc.exists()) friendStatus = "sentByMe";
      else if (receivedReqDoc.exists()) friendStatus = "receivedByMe";
      else friendStatus = "none";
    }

    renderProfile(target, targetUid, isMe, followersCount, followingCount, iFollow, friendStatus);
    loadPosts(targetUid, isMe);

    // Riwayat upload HANYA boleh dilihat developer, dan hanya lewat profil
    // orang lain (dibuka dari halaman Kelola User) — profil sendiri
    // tidak menampilkannya lagi. Pengecualian: operator print tetap lihat
    // "Riwayat dikerjakan & pendapatan" miliknya sendiri di profilnya.
    const viewerIsDeveloper = myProfile && myProfile.role === "developer";
    if ((viewerIsDeveloper && !isMe) || (isMe && target.role === "printer")) {
      loadHistory(targetUid, target.role);
    }

    if (isMe) {
      // Form edit TIDAK lagi langsung tampil — muncul lewat tombol
      // "Edit profil" (lihat setEditMode). Pengecualian: kalau kesini lewat
      // link "Lengkapi Lokasi di Profil" (dari halaman Upload, waktu
      // wilayah customer belum lengkap — lihat js/upload.js) yang pakai
      // anchor #locationLabel, mode edit dibuka otomatis & di-scroll ke
      // bagian Lokasi (editCard sebelumnya hidden, jadi scroll bawaan
      // browser gagal — makanya di-scroll manual di sini).
      if (window.location.hash === "#locationLabel") {
        setEditMode(true, { scroll: false });
        setTimeout(() => {
          document.getElementById("locationLabel").scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
      }
      displayNameInput.value = target.displayName || "";
      bioInput.value = target.bio || "";
      const soc = target.socials || {};
      document.getElementById("socInstagram").value = soc.instagram || "";
      document.getElementById("socTiktok").value = soc.tiktok || "";
      document.getElementById("socFacebook").value = soc.facebook || "";
      document.getElementById("socYoutube").value = soc.youtube || "";
      document.getElementById("editPhotoPreview").innerHTML = avatarHtml(target, "lg");
      document.getElementById("editPhotoBtn").addEventListener("click", () => avatarInput.click());
      avatarInput.addEventListener("change", () => {
        const f = avatarInput.files[0];
        if (!f) return;
        pendingAvatarFile = f;
        document.getElementById("editPhotoPreview").innerHTML = `<img src="${URL.createObjectURL(f)}" class="avatar-circle lg" style="object-fit:cover;">`;
        document.getElementById("editPhotoHint").textContent = "Foto baru dipilih — klik Simpan untuk memakainya.";
      });
      waNumberInput.value = target.waNumber || "";
      // No. WhatsApp WAJIB diisi buat role "printer" (operator print) —
      // customer nemu kontak operator dari sini (lihat job.html), jadi
      // kalau kosong operator nggak bisa dihubungi sama sekali. Untuk
      // role lain (customer/developer) tetap opsional seperti biasa.
      const waRequired = target.role === "printer";
      waNumberLabel.textContent = waRequired ? "No. WhatsApp (wajib diisi)" : "No. WhatsApp (opsional)";
      const locationLabelEl = document.getElementById("locationLabel");
      if (locationLabelEl) {
        locationLabelEl.textContent = "Lokasi";
        const locationSubEl = document.getElementById("locationSub");
        if (locationSubEl) {
          locationSubEl.textContent = waRequired
            ? "Wajib lengkap — pesanan cuma masuk dari wilayah yang sama."
            : "Wajib lengkap sebelum upload pesanan.";
        }
      }
      const loc = target.location || {};
      locPostalCodeInput.value = loc.postalCode || "";
      locStreetInput.value = loc.street || "";
      locRtRwInput.value = loc.rtRw || "";
      locLandmarkInput.value = loc.landmark || "";
      // Kompatibilitas data lama: sebelum kolomnya dipecah tiga, semuanya
      // disimpan gabung di satu field "streetDetail". Kalau field baru masih
      // kosong tapi data lama itu ada, taruh apa adanya di kolom "Jalan &
      // nomor rumah" biar datanya nggak keliatan hilang — user tinggal
      // pindah-pindahin sendiri ke kolom yang sesuai lalu Simpan lagi.
      if (!loc.street && !loc.rtRw && !loc.landmark && loc.streetDetail) {
        locStreetInput.value = loc.streetDetail;
      }
      // Kalau sebelumnya udah pernah diisi, langsung buka kolomnya biar
      // kelihatan — bukan malah ketutup lagi tiap buka halaman Profil.
      if (locStreetInput.value || locRtRwInput.value || locLandmarkInput.value) {
        streetDetailCollapse.classList.add("open");
        streetDetailToggleArrow.classList.add("open");
        streetDetailToggleBtn.setAttribute("aria-expanded", "true");
      }
      applyLocationSelection(loc, "").catch((e) => console.error(e));
      // Kalau sebelumnya udah pernah nyimpen titik lokasi, langsung
      // tampilin peta preview-nya (nggak perlu klik tombol deteksi lagi)
      // biar user bisa langsung lihat/koreksi pin-nya kalau perlu.
      if (typeof loc.lat === "number" && typeof loc.lng === "number") {
        locLat = loc.lat;
        locLng = loc.lng;
        placeLocationMapAt(locLat, locLng).catch((e) => {
          console.error(e);
          locationErr.textContent = "Gagal memuat peta.";
        });
      }
      saveProfileBtn.addEventListener("click", async () => {
        editErr.textContent = "";
        const waDigits = waNumberInput.value.trim().replace(/[^0-9]/g, "");
        if (waRequired && !waDigits) {
          editErr.textContent = "No. WhatsApp wajib diisi buat akun Operator Print, biar customer bisa menghubungi kamu.";
          waNumberInput.focus();
          return;
        }
        // Wilayah lengkap (4 tingkat) WAJIB buat operator — order cuma masuk
        // ke dashboard operator yang wilayahnya sama dengan customer. Buat
        // customer tetap boleh dikosongkan di sini, tapi baru bisa upload
        // pesanan kalau wilayahnya sudah lengkap (lihat home.js).
        const region = selectedRegion();
        const newRegionKey = regionKeyFrom(region);
        if (target.role === "printer" && !newRegionKey) {
          const missing = REGION_LEVELS.filter((lv) => !normalizeRegionPart(lv, region[lv])).map((lv) => REGION_LABELS[lv]);
          editErr.textContent = `Lokasi wajib lengkap buat akun Operator Print supaya pesanan dari wilayahmu bisa masuk. Belum diisi: ${missing.join(", ")}.`;
          return;
        }
        saveProfileBtn.disabled = true;
        try {
          let newPhotoURL = null;
          if (pendingAvatarFile) newPhotoURL = await uploadToCloudinary(pendingAvatarFile);
          await updateDoc(doc(db, "users", me.uid), {
            ...(newPhotoURL ? { photoURL: newPhotoURL } : {}),
            socials: {
              instagram: cleanHandle(document.getElementById("socInstagram").value),
              tiktok: cleanHandle(document.getElementById("socTiktok").value),
              facebook: cleanHandle(document.getElementById("socFacebook").value),
              youtube: cleanYoutube(document.getElementById("socYoutube").value)
            },
            displayName: displayNameInput.value.trim() || me.email.split("@")[0],
            bio: bioInput.value.trim(),
            waNumber: waDigits,
            // regionKey = versi ternormalisasi dari 4 tingkat wilayah, dipakai
            // buat mencocokkan customer <-> operator (query & firestore.rules).
            // Kosong ("") kalau wilayah belum lengkap -> tidak dicocokkan.
            regionKey: newRegionKey,
            location: {
              province: region.province,
              city: region.city,
              district: region.district,
              village: region.village,
              postalCode: locPostalCodeInput.value.trim(),
              street: locStreetInput.value.trim(),
              rtRw: locRtRwInput.value.trim(),
              landmark: locLandmarkInput.value.trim(),
              lat: locLat,
              lng: locLng
            }
          });
          location.reload();
        } catch (e) {
          console.error(e);
          // Sebelumnya cuma pesan generik "Gagal simpan, coba lagi." tanpa
          // alasan — jadi susah dibedain ini gara-gara firestore.rules belum
          // di-deploy ulang, permission role salah, index belum jadi, atau
          // sebab lain. Pakai describeFirestoreError() (sudah dipakai di
          // tempat lain di file ini) biar pesannya kelihatan alasan aslinya.
          editErr.innerHTML = describeFirestoreError(e, "simpan profil");
        } finally {
          saveProfileBtn.disabled = false;
        }
      });
      [
        displayNameInput, bioInput, waNumberInput,
        locProvinceCustomInput, locCityCustomInput, locDistrictCustomInput, locVillageCustomInput, locPostalCodeInput,
        locStreetInput, locRtRwInput, locLandmarkInput
      ].forEach((inp) => {
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") saveProfileBtn.click(); });
      });

    }
  } catch (e) {
    console.error(e);
    profileCard.innerHTML = `<div class="empty-state">${describeFirestoreError(e, "memuat profil")}</div>`;
    postGrid.innerHTML = "";
  }

  // ---- modal postingan baru ----
  newPostAddImageBtn.addEventListener("click", () => newPostImageInput.click());
  newPostImageInput.addEventListener("change", () => {
    const file = newPostImageInput.files[0];
    if (!file) return;
    selectedPostImageFile = file;
    newPostPreview.src = URL.createObjectURL(file);
    newPostPreviewWrap.classList.remove("hidden");
  });
  newPostCancel.addEventListener("click", closeNewPostModal);
  newPostModal.addEventListener("click", (e) => { if (e.target === newPostModal) closeNewPostModal(); });
  newPostSubmit.addEventListener("click", () => submitNewPost(targetUid));

  postDetailModal.addEventListener("click", (e) => { if (e.target === postDetailModal) postDetailModal.classList.add("hidden"); });
  statusModal.addEventListener("click", (e) => { if (e.target === statusModal) statusModal.classList.add("hidden"); });
});
}

// Catatan: tombol Keluar & Switch account TIDAK ada lagi di halaman Profil —
// dua-duanya sekarang cuma lewat menu titik-tiga di panel profil sidebar
// (lihat js/shell.js#initAccountMenu).

function renderProfile(target, targetUid, isMe, followersCount, followingCount, iFollow, friendStatus) {
  const presence = effectivePresence(target);
  profileCard.innerHTML = `
    <div class="profile-head-row" style="margin-bottom:6px;">
      <div class="avatar-edit-wrap" id="avatarWrap">
        ${avatarHtml(target, "lg")}
        <span class="status-dot-badge ${presence.dotClass} ${isMe ? "status-dot-badge-clickable" : ""}" id="statusDotBadge" title="${escapeHtml(presence.label)}${isMe ? " (klik buat ganti status)" : ""}"></span>
        ${isMe ? `<div class="avatar-edit-overlay">Ganti foto</div>` : ""}
      </div>
      <div style="flex:1;min-width:0;">
        <div class="post-head" style="margin-bottom:2px;">
          <h1 style="margin:0;">${escapeHtml(target.displayName || target.email)}</h1>
          <span class="role-pill">${escapeHtml(target.role)}</span>
        </div>
        <p class="sub" style="margin:0 0 6px;">@${escapeHtml(target.username || usernameLabel(target.email))}</p>
        <p style="margin:0 0 10px;">${target.bio ? escapeHtml(target.bio) : `<span class="job-meta">Belum ada bio.</span>`}</p>
        ${socialLinksHtml(target.socials)}
        ${target.location && regionLabel(target.location) ? `<p class="job-meta" style="margin:0 0 10px;">📍 ${escapeHtml(regionLabel(target.location))}</p>` : ""}
        <div class="job-meta">
          <strong>${followersCount}</strong> pengikut &nbsp;·&nbsp; <strong>${followingCount}</strong> mengikuti
          &nbsp;·&nbsp; <span class="status-pill ${presence.dotClass} ${isMe ? "status-pill-clickable" : ""}" id="statusPill" style="display:inline-flex;"><span class="status-dot"></span>${escapeHtml(presence.label)}${isMe ? ` <span class="status-pill-arrow">▾</span>` : ""}</span>
        </div>
      </div>
      ${isMe ? `<button type="button" class="btn btn-outline profile-edit-btn" id="editProfileBtn" aria-expanded="false" aria-controls="editCard">${iconImg("Edit", "", "icon-img")}<span>Edit profil</span></button>` : ""}
    </div>
    ${isMe ? "" : `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
        <button class="btn ${iFollow ? "btn-outline" : "btn-primary"}" id="followBtn" data-following="${iFollow}">
          ${iFollow ? "Berhenti mengikuti" : "Ikuti"}
        </button>
        ${friendBtnHtml(friendStatus)}
        <a class="btn btn-outline" href="messages.html?with=${targetUid}">Kirim pesan</a>
      </div>
    `}
  `;

  if (isMe) {
    document.getElementById("avatarWrap").addEventListener("click", (e) => {
      if (e.target.closest("#statusDotBadge")) return;
      setEditMode(true, { scroll: false });
      const sec = document.getElementById("secSocial");
      sec.open = true;
      sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    initStatusMenu(targetUid);
    const editBtn = document.getElementById("editProfileBtn");
    if (editBtn) {
      editBtn.addEventListener("click", () => setEditMode(true));
      syncEditButton();
    }
  }

  const followBtn = document.getElementById("followBtn");
  if (followBtn) {
    followBtn.addEventListener("click", () => toggleFollow(targetUid, followBtn.dataset.following === "true"));
  }
  const friendBtn = document.getElementById("friendBtn");
  if (friendBtn) {
    friendBtn.addEventListener("click", () => handleFriendClick(targetUid, friendStatus));
  }
}

// ===================================================================
// Modal ganti status profil (Online / Do Not Disturb / Offline) — cuma
// muncul di profil sendiri. Klik titik status di pojok avatar ATAU pill
// status di sebelah jumlah follower, dua-duanya buka modal yang sama
// (modal-backdrop/modal-box bawaan app: sudah ada animasi fade+pop &
// sudah responsive di HP — lihat CSS/style.css — jadi ikut kepakai
// otomatis, tidak perlu bikin lagi dari nol). Pilihan langsung disimpan
// ke field "presenceStatus" di Firestore & badge/pill di halaman ini
// ikut update seketika, TANPA reload — beda & independen sama toggle
// "lagi nerima pesanan print" yang cuma ada buat role printer (lihat
// printer.html/printer.js).
// ===================================================================
function initStatusMenu(uid) {
  const badge = document.getElementById("statusDotBadge");
  const pill = document.getElementById("statusPill");
  if (!badge || !pill) return;

  function renderMenu() {
    const current = currentUserProfile.presenceStatus || "online";
    statusMenuList.innerHTML = PRESENCE_STATUSES.map((s) => `
      <button type="button" class="status-menu-item ${s.code === current ? "active" : ""}" data-code="${s.code}">
        <span class="status-dot ${s.dotClass}"></span>
        <span>${escapeHtml(s.label)}</span>
        ${s.code === current ? `<span class="status-menu-check">✓</span>` : ""}
      </button>
    `).join("");
    statusMenuList.querySelectorAll(".status-menu-item").forEach((btn) => {
      btn.addEventListener("click", () => pickStatus(btn.dataset.code));
    });
  }

  function openMenu() {
    renderMenu();
    statusModal.classList.remove("hidden");
  }

  badge.addEventListener("click", openMenu);
  pill.addEventListener("click", openMenu);

  async function pickStatus(code) {
    statusModal.classList.add("hidden");
    if (code === currentUserProfile.presenceStatus) return;
    const prev = currentUserProfile.presenceStatus;
    currentUserProfile.presenceStatus = code; // optimistic
    applyPresenceToDom();
    try {
      await updateDoc(doc(db, "users", uid), { presenceStatus: code });
    } catch (e) {
      console.error(e);
      currentUserProfile.presenceStatus = prev;
      applyPresenceToDom();
      showToast("Gagal ganti status, coba lagi.", "error");
    }
  }

  function applyPresenceToDom() {
    const presence = effectivePresence(currentUserProfile);
    badge.className = `status-dot-badge ${presence.dotClass} status-dot-badge-clickable`;
    badge.title = `${presence.label} (klik buat ganti status)`;
    pill.className = `status-pill ${presence.dotClass} status-pill-clickable`;
    pill.innerHTML = `<span class="status-dot"></span>${escapeHtml(presence.label)} <span class="status-pill-arrow">▾</span>`;
  }
}

function friendBtnHtml(status) {
  if (status === "friends") return `<button class="btn btn-outline" id="friendBtn">Berteman ${iconImg("Check", "✓", "icon-img icon-sm")} (klik buat hapus)</button>`;
  if (status === "sentByMe") return `<button class="btn btn-outline" id="friendBtn">Permintaan terkirim (batalkan)</button>`;
  if (status === "receivedByMe") return `<button class="btn btn-primary" id="friendBtn">Terima permintaan teman</button>`;
  return `<button class="btn btn-outline" id="friendBtn">${iconImg("Plus", "Tambah")} Tambah teman</button>`;
}

async function handleFriendClick(targetUid, status) {
  const me = currentUser;
  try {
    if (status === "friends") {
      if (!(await askConfirm({ title: "Hapus pertemanan", body: "Hapus pertemanan ini?", confirmLabel: "Hapus" }))) return;
      await removeFriend(me.uid, targetUid);
    } else if (status === "sentByMe") {
      await cancelFriendRequest(me.uid, targetUid);
    } else if (status === "receivedByMe") {
      await acceptFriendRequest(me.uid, targetUid);
    } else {
      await sendFriendRequest(me.uid, currentUserProfile.displayName || me.email.split("@")[0], me.email, targetUid);
    }
    location.reload();
  } catch (e) {
    console.error(e);
    showToast("Gagal memproses, coba lagi.", "error");
  }
}

async function toggleFollow(targetUid, following) {
  if (!currentUser) return;
  const followerRef = doc(db, "users", targetUid, "followers", currentUser.uid);
  const followingRef = doc(db, "users", currentUser.uid, "following", targetUid);
  try {
    if (following) {
      await Promise.all([deleteDoc(followerRef), deleteDoc(followingRef)]);
    } else {
      const now = serverTimestamp();
      await Promise.all([
        setDoc(followerRef, { createdAt: now }),
        setDoc(followingRef, { createdAt: now })
      ]);
    }
    location.reload();
  } catch (e) {
    console.error(e);
  }
}

async function uploadAvatar(uid) {
  try {
    const file = avatarInput.files[0];
    if (!file) return;
    const url = await uploadToCloudinary(file);
    await updateDoc(doc(db, "users", uid), { photoURL: url });
    location.reload();
  } catch (e) {
    console.error(e);
    showToast("Gagal upload foto profil, coba lagi.", "error");
  } finally {
    avatarInput.value = "";
  }
}

// ---------------------------------------------------------------------
// Feed postingan ala Discord (card per post, avatar+nama di atas) +
// Instagram (gambar, like, jumlah komentar).
// ---------------------------------------------------------------------
async function loadPosts(targetUid, isMe) {
  try {
    const q = query(
      collection(db, "posts"),
      where("authorId", "==", targetUid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    postsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Ambil jumlah like & jumlah komentar + status "aku sudah like belum"
    // buat tiap post sekaligus, biar feed-nya nggak nunggu satu-satu.
    await Promise.all(postsCache.map(async (p) => {
      const [likeCount, commentCount, myLikeDoc] = await Promise.all([
        countDocs(collection(db, "posts", p.id, "likes")),
        countDocs(collection(db, "posts", p.id, "comments")),
        getDoc(doc(db, "posts", p.id, "likes", currentUser.uid))
      ]);
      p.likeCount = likeCount;
      p.commentCount = commentCount;
      p.iLiked = myLikeDoc.exists();
    }));
    renderPostFeed(isMe);
  } catch (e) {
    console.error(e);
    postGrid.innerHTML = `<div class="empty-state">Gagal memuat postingan.</div>`;
  }
}

// ---------------------------------------------------------------------
// Fase C — Riwayat & Pendapatan. Untuk role "printer": riwayat job yang
// DIA KERJAKAN (printerId == uid) + total pendapatan dari job yang
// sudah "done" (dijumlah dari field price). Untuk role lain (customer/
// developer): riwayat job yang DIA UPLOAD (customerId == uid), tanpa
// kotak pendapatan.
// ---------------------------------------------------------------------
function jobStampClass(status) {
  return { queued: "stamp-queued", printing: "stamp-printing", done: "stamp-done", waiting: "stamp-waiting", pending: "stamp-waiting", cancelled: "stamp-cancelled", rejected: "stamp-cancelled" }[status] || "stamp-queued";
}
function jobStampLabel(status) {
  return { queued: "Antre", printing: "Diprint", done: "Selesai", waiting: "Menunggu operator", pending: "Menunggu konfirmasi", cancelled: "Dibatalkan", rejected: "Ditolak semua operator" }[status] || status;
}

async function loadHistory(targetUid, role) {
  if (role !== "printer") {
    historyTitle.textContent = "Riwayat upload";
  } else {
    historyTitle.textContent = "Riwayat dikerjakan & pendapatan";
  }
  historyCard.classList.remove("hidden");

  try {
    const field = role === "printer" ? "printerId" : "customerId";
    const q = query(
      collection(db, "printJobs"),
      where(field, "==", targetUid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);
    const allJobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Buat role "printer": "Riwayat dikerjakan & pendapatan" cuma nampilin
    // pesanan yang statusnya SUDAH "done" — pesanan yang masih pending
    // (menunggu konfirmasi) atau masih diproses (antre/diprint) TIDAK ikut
    // ditampilin di sini (itu cukup keliatan di Dashboard Printing).
    const jobs = role === "printer" ? allJobs.filter((j) => j.status === "done") : allJobs;

    if (role === "printer") {
      const doneJobs = jobs.filter((j) => j.price);
      const total = doneJobs.reduce((sum, j) => sum + (Number(j.price) || 0), 0);
      earningsBox.classList.remove("hidden");
      earningsBox.innerHTML = `
        <div class="ticket" style="background:var(--paper-2);margin:0;padding:14px 16px;">
          <div class="job-meta">Total pendapatan (${doneJobs.length} pesanan selesai)</div>
          <div style="font-size:22px;font-weight:700;">${fmtRupiah(total)}</div>
        </div>`;
    }

    if (jobs.length === 0) {
      historyList.innerHTML = `<div class="empty-state">${role === "printer" ? "Belum ada pesanan yang selesai dikerjakan." : "Belum ada file yang diupload."}</div>`;
      return;
    }

    historyList.innerHTML = jobs.map((j) => `
      <div class="job-row">
        <div>
          <div class="job-name">${escapeHtml(j.fileName)}</div>
          <div class="job-meta"><span class="job-code">#${escapeHtml(jobCodeLabel(j, j.id))}</span> · ${fmtDate(j.createdAt)}${j.price ? " · " + fmtRupiah(j.price) : ""}</div>
        </div>
        <span class="stamp-badge ${jobStampClass(j.status)}">${jobStampLabel(j.status)}</span>
      </div>`).join("");
  } catch (e) {
    console.error(e);
    historyCard.classList.remove("hidden");
    historyList.innerHTML = `<div class="empty-state">${describeFirestoreError(e, "memuat riwayat")}</div>`;
  }
}

function renderPostFeed(isMe) {
  const composeBar = isMe ? `
    <button type="button" class="ticket post-compose-bar" id="addPostTile">
      ${avatarHtml(currentUserProfile, "sm")}
      <span>Lagi ngapain, gan?</span>
      <span class="plus">+</span>
    </button>` : "";

  if (postsCache.length === 0) {
    postGrid.innerHTML = composeBar + `<div class="empty-state">Belum ada postingan.</div>`;
  } else {
    const cards = postsCache.map((p) => `
      <div class="ticket post-card" data-id="${p.id}">
        <div class="post-head">
          ${avatarHtml({ photoURL: p.authorPhotoURL }, "sm")}
          <div style="flex:1;min-width:0;">
            <span class="post-author">${escapeHtml(p.authorDisplayName || "user")}</span>
            <div class="job-meta">${fmtDate(p.createdAt)}</div>
          </div>
        </div>
        ${p.text ? `<p class="post-text">${escapeHtml(p.text)}</p>` : ""}
        ${p.imageURL ? `<img src="${p.imageURL}" class="post-card-img" loading="lazy" data-open="${p.id}">` : ""}
        <div class="post-actions">
          <button type="button" class="btn btn-outline btn-sm like-btn" data-liked="${p.iLiked}" data-id="${p.id}">
            ${iconImg(p.iLiked ? "Heart-Filled" : "Heart-Outline", "Like", "icon-img icon-sm")} <span class="like-count">${p.likeCount}</span>
          </button>
          <button type="button" class="btn btn-outline btn-sm comment-open-btn" data-open="${p.id}">
            ${iconImg("Community", "Komentar", "icon-img icon-sm")} <span>${p.commentCount}</span>
          </button>
        </div>
      </div>
    `).join("");
    postGrid.innerHTML = composeBar + cards;
  }

  const addTileEl = document.getElementById("addPostTile");
  if (addTileEl) addTileEl.addEventListener("click", openNewPostModal);

  postGrid.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => openPostDetail(el.dataset.open));
  });
  postGrid.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLike(btn.dataset.id, btn.dataset.liked === "true");
    });
  });
}

async function toggleLike(postId, currentlyLiked) {
  const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
  const post = postsCache.find((p) => p.id === postId);
  try {
    if (currentlyLiked) {
      await deleteDoc(likeRef);
      if (post) { post.iLiked = false; post.likeCount = Math.max(0, (post.likeCount || 1) - 1); }
    } else {
      await setDoc(likeRef, { uid: currentUser.uid, createdAt: serverTimestamp() });
      if (post) { post.iLiked = true; post.likeCount = (post.likeCount || 0) + 1; }
    }
    renderPostFeed(post && post.authorId === currentUser.uid);
  } catch (e) {
    console.error(e);
    showToast("Gagal like, coba lagi.", "error");
  }
}

function openNewPostModal() {
  newPostText.value = "";
  newPostErr.textContent = "";
  newPostPreviewWrap.classList.add("hidden");
  newPostPreview.src = "";
  selectedPostImageFile = null;
  newPostImageInput.value = "";
  newPostModal.classList.remove("hidden");
}
function closeNewPostModal() {
  newPostModal.classList.add("hidden");
}

async function submitNewPost(targetUid) {
  const text = newPostText.value.trim();
  if (!text && !selectedPostImageFile) {
    newPostErr.textContent = "Tulis sesuatu atau tambahkan gambar dulu.";
    return;
  }
  newPostSubmit.disabled = true;
  newPostErr.textContent = "";
  try {
    let imageURL = null;
    if (selectedPostImageFile) {
      imageURL = await uploadToCloudinary(selectedPostImageFile);
    }
    await addDoc(collection(db, "posts"), {
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      authorDisplayName: currentUserProfile.displayName || currentUser.email.split("@")[0],
      authorPhotoURL: currentUserProfile.photoURL || null,
      text,
      imageURL,
      createdAt: serverTimestamp()
    });
    closeNewPostModal();
    loadPosts(targetUid, true);
  } catch (e) {
    console.error(e);
    newPostErr.textContent = "Gagal posting, coba lagi.";
  } finally {
    newPostSubmit.disabled = false;
  }
}

// ---------------------------------------------------------------------
// Detail postingan + komentar
// ---------------------------------------------------------------------
async function openPostDetail(postId) {
  const post = postsCache.find((p) => p.id === postId);
  if (!post) return;

  postDetailBody.innerHTML = `
    <div class="post-head" style="margin-bottom:10px;">
      ${avatarHtml({ photoURL: post.authorPhotoURL }, "sm")}
      <div style="flex:1;min-width:0;">
        <span class="post-author">${escapeHtml(post.authorDisplayName || "user")}</span>
        <div class="job-meta">${fmtDate(post.createdAt)}</div>
      </div>
    </div>
    ${post.imageURL ? `<img src="${post.imageURL}" class="post-detail-img">` : ""}
    <p class="post-detail-text">${escapeHtml(post.text || "")}</p>
    ${post.authorId === currentUser.uid ? `<button class="btn btn-outline" id="deletePostBtn" style="margin-bottom:14px;">Hapus postingan</button>` : ""}
    <h2 style="font-size:14px;">Komentar</h2>
    <div class="comment-list" id="commentList"><div class="empty-state">Memuat komentar…</div></div>
    <div class="comment-form">
      <input type="text" id="commentInput" placeholder="Tulis komentar…">
      <button class="btn btn-primary" id="commentSendBtn">Kirim</button>
    </div>
  `;
  postDetailModal.classList.remove("hidden");

  const deleteBtn = document.getElementById("deletePostBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!(await askConfirm({ title: "Hapus postingan", body: "Postingan yang dihapus tidak bisa dikembalikan.", confirmLabel: "Hapus" }))) return;
      try {
        await deleteDoc(doc(db, "posts", postId));
        postDetailModal.classList.add("hidden");
        loadPosts(post.authorId, post.authorId === currentUser.uid);
      } catch (e) {
        console.error(e);
        showToast("Gagal hapus, coba lagi.", "error");
      }
    });
  }

  await loadComments(postId);

  document.getElementById("commentSendBtn").addEventListener("click", () => submitComment(postId));
  document.getElementById("commentInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitComment(postId);
  });
}

async function loadComments(postId) {
  const commentList = document.getElementById("commentList");
  try {
    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      commentList.innerHTML = `<div class="empty-state">Belum ada komentar. Jadi yang pertama!</div>`;
      return;
    }
    commentList.innerHTML = snap.docs.map((d) => {
      const c = d.data();
      return `
        <div class="comment-item">
          ${avatarHtml({ photoURL: c.authorPhotoURL }, "sm")}
          <div style="flex:1;min-width:0;">
            <span class="comment-author">${escapeHtml(c.authorDisplayName || c.authorEmail || "user")}</span>
            <span class="job-meta">${fmtDate(c.createdAt)}</span>
            <div>${escapeHtml(c.text)}</div>
          </div>
        </div>`;
    }).join("");
  } catch (e) {
    console.error(e);
    commentList.innerHTML = `<div class="empty-state">Gagal memuat komentar (izin ditolak). Pastikan firestore.rules sudah dipublish.</div>`;
  }
}

async function submitComment(postId) {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try {
    await addDoc(collection(db, "posts", postId, "comments"), {
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      authorDisplayName: currentUserProfile.displayName || currentUser.email.split("@")[0],
      authorPhotoURL: currentUserProfile.photoURL || null,
      text,
      createdAt: serverTimestamp()
    });
    await loadComments(postId);
  } catch (e) {
    console.error(e);
    showToast("Gagal kirim komentar, coba lagi.", "error");
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

// ===================================================================
// PROFIL TAMU (belum login / sesi anonymous).
// UI-nya DIGABUNG dari dua sisi: kerangka & form yang sama persis kayak
// profil akun terdaftar (kartu kepala, kartu data diri dengan dropdown
// wilayah bertingkat + peta + "Isi otomatis"), tapi dengan batasan tamu:
// avatar selalu default (tanpa ganti foto), tanpa status Online/DND,
// tanpa bio/postingan/pengikut/riwayat/detail alamat, dan datanya
// disimpan di browser (guest.js), bukan Firestore. Data ini dipakai
// upload.html waktu tamu mengirim file.
// ===================================================================
function renderGuestHead(info, canEdit) {
  const loc = { province: info.province, city: info.city, district: info.district, village: info.village };
  // Susunan SAMA kayak kartu profil akun terdaftar: nama tampilan + pill role,
  // @username, lokasi (baris 📍 cuma muncul kalau sudah diisi), lalu info tamu.
  // Tombol "Edit profil" baru ada setelah data diri pernah tersimpan.
  profileCard.innerHTML = `
    <div class="profile-head-row" style="margin-bottom:6px;">
      <div class="avatar-edit-wrap" id="avatarWrap">
        ${avatarHtml(null, "lg")}
      </div>
      <div style="flex:1;min-width:0;">
        <div class="post-head" style="margin-bottom:2px;">
          <h1 style="margin:0;">${escapeHtml(info.name || "Customer")}</h1>
          <span class="role-pill">unassigned</span>
        </div>
        <p class="sub" style="margin:0 0 6px;">@${escapeHtml(guestUsername(info))}</p>
        ${regionLabel(loc) ? `<p class="job-meta" style="margin:0 0 10px;">📍 ${escapeHtml(regionLabel(loc))}</p>` : ""}
        <div class="job-meta">
          ${iconImg("Lock", "", "icon-img icon-sm")} Foto profil &amp; status (Online / Do Not Disturb) khusus akun terdaftar.
          <a href="login.html?mode=signup">Daftar / masuk</a>
        </div>
      </div>
      ${canEdit ? `<button type="button" class="btn btn-outline profile-edit-btn" id="editProfileBtn" aria-expanded="false" aria-controls="editCard">${iconImg("Edit", "", "icon-img")}<span>Edit profil</span></button>` : ""}
    </div>`;
  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => setEditMode(true));
    syncEditButton();
  }
}

// Username tamu TIDAK BOLEH sama dengan username akun terdaftar. Dicek ke
// index publik "usernames/" di Firebase (boleh dibaca siapa saja). Sama
// persis (tak peduli kapitalisasi) = itu akun terdaftar lain -> ditolak.
// Beda satu huruf pun = user lain, jadi boleh. Kalau pengecekan gagal
// (offline dsb) tidak memblokir — return false.
async function guestUsernameTaken(username) {
  const n = normalizeUsername(username);
  if (!n) return false;
  try { return await isUsernameTaken(n); } catch (e) { console.warn("Cek username tamu gagal:", e); return false; }
}
const GUEST_USERNAME_TAKEN_MSG = "Username ini sudah dipakai akun terdaftar. Ganti dengan yang lain (beda satu huruf pun dianggap user lain).";

function initGuestProfile() {
  initShell({ user: null, profile: null, active: "profile" });
  const info = getGuestInfo();
  // Sudah pernah menyimpan data diri? -> form tertutup & tombol "Edit profil"
  // muncul (sama kayak akun terdaftar). Belum pernah -> form langsung terbuka.
  let hasSaved = hasGuestInfo();
  renderGuestHead(info, hasSaved);

  // Bagian yang tidak berlaku buat tamu.
  const postsTicket = postGrid.closest(".ticket");
  if (postsTicket) postsTicket.classList.add("hidden");
  historyCard.classList.add("hidden");
  streetDetailToggleBtn.classList.add("hidden");
  streetDetailCollapse.classList.add("hidden");
  bioInput.classList.add("hidden");
  const secSocialEl = document.getElementById("secSocial"); if (secSocialEl) secSocialEl.classList.add("hidden");
  const bioLabel = document.querySelector('label[for="bioInput"]');
  if (bioLabel) bioLabel.classList.add("hidden");
  // Batal cuma berguna kalau form bisa ditutup (data sudah pernah tersimpan).
  if (cancelEditBtn) cancelEditBtn.classList.toggle("hidden", !hasSaved);

  // Label khusus tamu + field Username (hanya ada di profil tamu).
  editCard.querySelector("h2").textContent = "Profil Pelanggan";
  const nameLabel = document.getElementById("displayNameLabel");
  if (nameLabel) nameLabel.textContent = "Nama";
  const userLabel = document.getElementById("guestUsernameLabel");
  const userInput = document.getElementById("guestUsernameInput");
  if (userLabel) userLabel.classList.remove("hidden");
  if (userInput) userInput.classList.remove("hidden");
  waNumberLabel.textContent = "No. WhatsApp (wajib diisi)";
  const locSub = document.getElementById("locationSub");
  if (locSub) locSub.textContent = "Wajib lengkap sebelum upload pesanan.";

  // Banner tamu di atas kartu data diri.
  editCard.insertAdjacentHTML("beforebegin", `
    <div class="ticket preview-banner">
      <span class="icon-img icon-sm" role="img" aria-label="" style="--icon:url('../Resources/Icons/Lock-Dark.png')"></span>
      <span>Kamu belum terdaftar (role: <b>unassigned</b>). Bio, postingan, dan status cuma untuk akun terdaftar — <a href="login.html?mode=signup">daftar / masuk</a> untuk membukanya.</span>
    </div>`);

  // Cadangan & pemulihan sekarang ada di menu titik-tiga sidebar > General > Recovery (shell.js).

  // Isi form dari data tersimpan.
  function fillForm(data) {
    displayNameInput.value = data.name;
    if (userInput) userInput.value = data.username || "";
    waNumberInput.value = data.wa;
  }
  const regionOf = (data) => ({ province: data.province, city: data.city, district: data.district, village: data.village });
  fillForm(info);
  applyLocationSelection(regionOf(info), "").catch((e) => console.error(e));
  setEditMode(!hasSaved || window.location.hash === "#locationLabel", { scroll: false });
  // Username tersimpan ternyata sudah dipakai akun terdaftar (mis. baru
  // didaftarkan orang lain) -> buka form & minta ganti.
  if (hasSaved) {
    guestUsernameTaken(guestUsername(info)).then((taken) => {
      if (!taken) return;
      setEditMode(true, { scroll: false });
      editErr.textContent = GUEST_USERNAME_TAKEN_MSG;
    });
  }
  if (window.location.hash === "#locationLabel") {
    // Datang dari popup "Lokasi belum lengkap" di halaman Upload.
    setTimeout(() => {
      const el = document.getElementById("locationLabel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  // Batal: tutup form & kembalikan isinya ke data yang terakhir tersimpan.
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      editErr.textContent = "";
      const data = getGuestInfo();
      fillForm(data);
      applyLocationSelection(regionOf(data), "").catch((e) => console.error(e));
    });
  }

  saveProfileBtn.addEventListener("click", async () => {
    editErr.textContent = "";
    const region = selectedRegion();
    const draft = {
      name: displayNameInput.value,
      username: cleanGuestUsername(userInput ? userInput.value : ""),
      wa: waNumberInput.value,
      ...region
    };
    // Username akhir yang akan disimpan (kalau kosong diturunkan dari nama).
    const finalUsername = draft.username || cleanGuestUsername(draft.name);
    saveProfileBtn.disabled = true;
    const taken = await guestUsernameTaken(finalUsername);
    saveProfileBtn.disabled = false;
    if (taken) {
      editErr.textContent = GUEST_USERNAME_TAKEN_MSG;
      return;
    }
    let saved;
    try {
      saved = saveGuestInfo({ ...draft, wa: guestWaNumber(draft) });
    } catch (e) {
      editErr.textContent = "Gagal menyimpan di browser ini (penyimpanan dinonaktifkan?).";
      return;
    }
    waNumberInput.value = saved.wa;
    if (userInput) userInput.value = guestUsername(saved);
    hasSaved = true;
    if (cancelEditBtn) cancelEditBtn.classList.remove("hidden");
    renderGuestHead(saved, true);
    const sideName = document.querySelector(".sidebar-user-panel-name");
    if (sideName) sideName.textContent = saved.name || "Customer";
    // Cadangkan ke cloud (diam-diam) tiap ada perubahan, walau datanya belum lengkap —
    // kode pemulihannya otomatis dibuat/diperbarui (lihat menu Recovery di sidebar).
    backupGuestProfile();
    const msg = guestInfoError(saved);
    if (msg) {
      editErr.textContent = "Tersimpan, tapi belum lengkap untuk upload: " + msg;
      return;
    }
    showToast({ type: "success", title: "Tersimpan", message: "Data diri tamu sudah siap dipakai buat upload." });
    setEditMode(false);
  });
  [displayNameInput, userInput, waNumberInput, locProvinceCustomInput, locCityCustomInput, locDistrictCustomInput, locVillageCustomInput]
    .filter(Boolean)
    .forEach((inp) => inp.addEventListener("keydown", (e) => { if (e.key === "Enter") saveProfileBtn.click(); }));
}

// Pilih mode SEKALI dari status auth pertama yang resolve: akun asli ->
// profil lengkap; belum login / sesi anonymous -> profil tamu.
let profileModeDecided = false;
onAuthStateChanged(auth, (user) => {
  if (profileModeDecided) return;
  profileModeDecided = true;
  if (user && !user.isAnonymous) initRegisteredProfile();
  else initGuestProfile();
});
