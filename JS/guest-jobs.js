// ===================================================================
// D'Printing — RIWAYAT PRINT TAMU yang disimpan di perangkat (localStorage).
// Kenapa perlu: identitas tamu = sesi Firebase Anonymous Auth, dan sesi itu
// HILANG kalau tamu keluar (signOut), ganti akun, atau data sesi terhapus.
// Dengan menyimpan salinan pesanan di sini, riwayat tamu tetap ada walau
// sesinya berganti, lalu DISINKRONKAN ke Firestore (status, harga, tanggal)
// lewat id dokumennya (lihat upload.js & job.js).
// Hanya data pesanan sendiri yang disimpan — bukan data operator.
// ===================================================================
const KEY = "dcp_guestJobs";
const MAX_ENTRIES = 100;
export const FINAL_STATUSES = ["done", "cancelled", "rejected"];

// Timestamp Firestore / angka / {seconds} -> milidetik (atau null).
export function toMs(ts) {
  if (!ts) return null;
  if (typeof ts === "number") return ts;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return null;
}

// Dokumen printJobs (data mentah) -> objek polos yang aman disimpan JSON.
export function entryFromJob(id, j, prev = {}) {
  return {
    ...prev,
    id,
    code: j.code || prev.code || null,
    fileName: j.fileName || prev.fileName || "",
    fileURL: j.fileURL || prev.fileURL || "",
    fileType: j.fileType || prev.fileType || null,
    fileSize: j.fileSize != null ? j.fileSize : (prev.fileSize || 0),
    paperSize: j.paperSize || prev.paperSize || null,
    note: j.note != null ? j.note : (prev.note || null),
    status: j.status || prev.status || "waiting",
    price: j.price != null ? j.price : null,
    customerName: j.customerName || prev.customerName || "",
    customerLocation: j.customerLocation || prev.customerLocation || null,
    printerId: j.printerId || null,
    printerEmail: j.printerEmail || null,
    regionKey: j.regionKey || prev.regionKey || "",
    cancelReason: j.cancelReason || null,
    rejectReason: j.rejectReason || null,
    createdAt: toMs(j.createdAt) || prev.createdAt || Date.now(),
    acceptedAt: toMs(j.acceptedAt) || prev.acceptedAt || null,
    printingAt: toMs(j.printingAt) || prev.printingAt || null,
    doneAt: toMs(j.doneAt) || prev.doneAt || null,
    isGuest: true,
    syncedAt: Date.now()
  };
}

function readAll() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(arr) ? arr.filter((e) => e && typeof e.id === "string") : [];
  } catch (e) {
    return []; // data rusak = anggap kosong
  }
}
function writeAll(list) {
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES))); } catch (e) { /* penyimpanan penuh/dimatikan — tidak fatal */ }
}

// Terbaru di atas.
export function loadGuestJobs() {
  const list = readAll();
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}
export function getGuestJob(id) { return readAll().find((e) => e.id === id) || null; }
export function hasGuestJob(id) { return !!getGuestJob(id); }

// Tambah/gabung banyak pesanan sekaligus (satu kali tulis).
export function upsertGuestJobs(pairs) {
  const list = readAll();
  const byId = new Map(list.map((e) => [e.id, e]));
  pairs.forEach(([id, j]) => { byId.set(id, entryFromJob(id, j, byId.get(id) || {})); });
  writeAll(Array.from(byId.values()));
}
export function patchGuestJob(id, patch) {
  const list = readAll();
  const e = list.find((x) => x.id === id);
  if (!e) return;
  Object.assign(e, patch, { syncedAt: Date.now() });
  writeAll(list);
}
export function removeGuestJob(id) {
  writeAll(readAll().filter((e) => e.id !== id));
}

// Bentuk yang sama dengan DocumentSnapshot (id + data()) supaya renderJobs() bisa dipakai ulang.
export function guestJobDocs() {
  return loadGuestJobs().map((e) => ({ id: e.id, data: () => e }));
}

export function removeGuestJobs(ids) {
  const set = new Set(ids);
  writeAll(readAll().filter((e) => !set.has(e.id)));
}
export function clearGuestJobs() {
  try { localStorage.removeItem(KEY); } catch (e) { /* abaikan */ }
}
