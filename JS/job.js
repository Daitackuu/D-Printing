// ===================================================================
// D'Printing — Detail Pesanan Print (job.html)
// Diakses lewat tombol "Detail Info" di halaman Upload (customer) MAUPUN
// Dashboard Printing (printer) — isinya menyesuaikan siapa yang lihat:
// - Kalau customer yang buka: kartu bio OPERATOR yang mengerjakan.
// - Kalau operator yang buka: kartu bio CUSTOMER pemesan.
// Isinya juga beda-beda TERGANTUNG STATUS pesanannya:
// - "waiting"/"pending" (belum ada operator yang resmi menerima & isi
//   harga) -> cuma teks status, disesuaikan siapa yang lihat.
// - "queued"/"printing"/"done" (sudah diterima operator) -> tampilkan
//   bio pihak satunya (foto, nama, bio, No. WA) + harga.
// Detail dokumen (nama, ukuran, tanggal upload/diterima/diprint/selesai)
// selalu ditampilkan, tapi baris tanggal yang belum terjadi disembunyikan.
// ===================================================================
import { db, auth } from "./firebase-config.js";
import { requireAuth, fmtDate, fmtRupiah, fmtFileSize, avatarHtml, usernameLabel, describeFirestoreError, downloadUrl, jobCodeLabel, openReasonPrompt, regionLabel, showToast } from "./app.js";
import { initShell } from "./shell.js";
import { waLinkTo } from "./support-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { hasGuestJob, upsertGuestJobs, patchGuestJob, removeGuestJob } from "./guest-jobs.js";

const jobFileName = document.getElementById("jobFileName");
const jobStatusBadge = document.getElementById("jobStatusBadge");
const jobBody = document.getElementById("jobBody");

const params = new URLSearchParams(window.location.search);
const jobId = params.get("id");

function stampClass(status) {
  return { queued: "stamp-queued", printing: "stamp-printing", done: "stamp-done", waiting: "stamp-waiting", pending: "stamp-waiting", cancelled: "stamp-cancelled", rejected: "stamp-cancelled" }[status] || "stamp-queued";
}
function stampLabel(status) {
  return { queued: "Antre", printing: "Diprint", done: "Selesai", waiting: "Menunggu operator", pending: "Menunggu konfirmasi operator", cancelled: "Dibatalkan", rejected: "Ditolak semua operator" }[status] || status;
}
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

// ===================================================================
// Toggle tampilan grid/list buat kartu "Detail dokumen" — sama kayak
// toggle di halaman Printer (printer.html/printer.js), diingat sendiri-
// sendiri (localStorage) karena beda halaman. Default di sini "grid".
// ===================================================================
const DETAIL_VIEW_KEY = "dcnp:jobDetailView";
function getDetailView() {
  try {
    return localStorage.getItem(DETAIL_VIEW_KEY) === "list" ? "list" : "grid";
  } catch (e) {
    return "grid";
  }
}
function setDetailView(v) {
  try { localStorage.setItem(DETAIL_VIEW_KEY, v); } catch (e) { /* storage nggak tersedia — nggak fatal */ }
}
const VIEW_TOGGLE_HTML = `
  <div class="view-toggle" id="detailViewToggle" role="group" aria-label="Tampilan detail dokumen">
    <button type="button" data-view="list" title="Tampilan list" aria-label="Tampilan list">
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4.5" width="14" height="2" rx="1" fill="currentColor"/><rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor"/><rect x="3" y="13.5" width="14" height="2" rx="1" fill="currentColor"/></svg>
    </button>
    <button type="button" data-view="grid" title="Tampilan grid" aria-label="Tampilan grid">
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="6" height="6" rx="1.2" fill="currentColor"/><rect x="11" y="3" width="6" height="6" rx="1.2" fill="currentColor"/><rect x="3" y="11" width="6" height="6" rx="1.2" fill="currentColor"/><rect x="11" y="11" width="6" height="6" rx="1.2" fill="currentColor"/></svg>
    </button>
  </div>`;

// Satu "chip" info di grid detail kartu (label kecil di atas, value tebal
// di bawah) — dipakai kalau mode "grid". Dilewatkan (return "") kalau
// valuenya kosong — dipakai buat tanggal yang belum terjadi (mis. "Mulai
// diprint" sebelum statusnya beneran "printing").
function detailChip(label, value) {
  if (!value) return "";
  return `
    <div class="detail-chip">
      <div class="detail-chip-label">${escapeHtml(label)}</div>
      <div class="detail-chip-value">${escapeHtml(value)}</div>
    </div>`;
}
// Satu baris "label: value" — dipakai kalau mode "list". Sama aturannya:
// dilewatkan kalau valuenya kosong.
function detailRow(label, value) {
  if (!value) return "";
  return `
    <div class="detail-row">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${escapeHtml(value)}</span>
    </div>`;
}
// Satu blok teks bebas (catatan / alasan) — full-width di bawah grid chip,
// karena isinya bisa panjang dan nggak enak dipotong jadi kotak kecil.
function detailNote(label, value) {
  if (!value) return "";
  return `<div class="job-note-box" style="margin-top:10px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`;
}

// Halaman ini juga boleh dibuka TAMU (allowGuest) untuk pesanan miliknya
// sendiri — dikenali dari riwayat tersimpan di perangkat (guest-jobs.js).
requireAuth(async (user, profile, anonUser) => {
  initShell({ user, profile, active: "upload" });
  const guestView = !user;

  if (!jobId) {
    jobFileName.textContent = "Pesanan tidak ditemukan";
    jobBody.innerHTML = `<div class="empty-state">Link pesanan tidak valid.</div>`;
    return;
  }

  try {
    // Tamu butuh sesi (anonymous) supaya boleh membaca dokumen pesanannya.
    let viewerUid = user ? user.uid : null;
    if (guestView) {
      const u = anonUser || (await signInAnonymously(auth)).user;
      viewerUid = u.uid;
    }
    const snap = await getDoc(doc(db, "printJobs", jobId));
    if (!snap.exists()) {
      if (guestView) removeGuestJob(jobId);
      jobFileName.textContent = "Pesanan tidak ditemukan";
      jobBody.innerHTML = `<div class="empty-state">Pesanan ini mungkin sudah dihapus.</div>`;
      return;
    }
    const j = snap.data();

    // Tamu hanya boleh melihat pesanan yang ada di riwayat perangkat ini
    // (atau milik sesi anonymous-nya sekarang) — bukan pesanan tamu lain.
    const guestOwns = guestView && j.isGuest === true && (hasGuestJob(jobId) || j.customerId === viewerUid);
    if (guestView && !guestOwns) {
      jobFileName.textContent = "Pesanan tidak ditemukan";
      jobBody.innerHTML = `<div class="empty-state">Pesanan ini tidak ada di riwayat perangkat ini. <a href="login.html">Masuk</a> kalau pesanan ini milik akunmu.</div>`;
      return;
    }
    // SINKRON: perbarui salinan di perangkat dengan data terbaru dari server.
    if (guestOwns) upsertGuestJobs([[jobId, j]]);

    jobFileName.textContent = j.fileName || "(tanpa nama)";
    jobStatusBadge.textContent = stampLabel(j.status);
    jobStatusBadge.className = `stamp-badge ${stampClass(j.status)}`;

    // Kode pesanan pendek (Fase E) — sekarang jadi bagian dari kartu
    // "Detail dokumen" di bawah (bukan box terpisah lagi), biar satu
    // halaman ini konsisten gaya kartu kayak job-card di daftar/grid.
    const jobCode = jobCodeLabel(j, jobId);

    // Siapa yang lagi buka halaman ini: customer pemesan, operator yang
    // (mungkin) mengerjakan, atau pihak lain (mis. developer). Dipakai
    // buat nentuin kartu bio siapa yang ditampilkan & teks status mana.
    const viewerIsPrinter = !guestView && viewerUid === j.printerId;
    const viewerIsCustomer = guestView ? guestOwns : viewerUid === j.customerId;
    const otherPartyId = viewerIsPrinter ? j.customerId : j.printerId;
    const otherPartyRoleLabel = viewerIsPrinter ? "Customer" : "printer";

    const accepted = ["queued", "printing", "done"].includes(j.status);
    const cancellable = viewerIsCustomer && (j.status === "waiting" || j.status === "pending");

    let receiverSection;
    if (!accepted) {
      const notYetText = viewerIsPrinter
        ? `Kamu belum menerima pesanan ini — buka <a href="printer.html">Dashboard Printing</a> dan klik Terima dulu.`
        : j.status === "cancelled"
          ? `Pesanan ini sudah kamu batalkan.`
          : j.status === "rejected"
            ? `Pesanan ini sudah ditolak oleh semua operator di wilayahmu, jadi tidak bisa diterima lagi. Kamu bisa upload ulang nanti kalau ada operator baru atau file-nya sudah diperbaiki.`
            : `Belum ada yang mau menerima dokumen kamu untuk diprint.`;
      receiverSection = `
        <div class="ticket">
          <div class="empty-state"${cancellable ? " style=\"padding-bottom:14px;\"" : ""}>${notYetText}</div>
          ${cancellable ? `
            <div style="text-align:center;padding-bottom:10px;">
              <button type="button" class="btn btn-outline" id="cancelJobBtn">Batal pesanan</button>
            </div>` : ""}
        </div>`;
    } else {
      let partyCardHtml = "";
      if (viewerIsPrinter && j.isGuest) {
        // Customer tamu (upload tanpa akun): tidak punya profil/bio, jadi
        // tampilkan nama + kontak WA yang dia isi saat upload.
        const guestWa = waLinkTo(j.customerWaNumber, `Halo, saya mau tanya soal pesanan print kode #${jobCode}.`);
        partyCardHtml = `
          <div style="margin-top:14px;">
            <div class="post-head" style="margin-bottom:6px;">
              <h1 style="margin:0;font-size:20px;">${escapeHtml(j.customerName || "Customer")}</h1>
              <span class="role-pill">unassigned</span>
            </div>
            <p class="sub" style="margin:0 0 8px;">Upload tanpa akun.</p>
            <div class="job-meta">${guestWa ? `<a href="${guestWa}" target="_blank" rel="noopener">Chat No. WA customer</a>` : "No. WA customer tidak tersedia."}</div>
          </div>`;
      } else if (guestView) {
        // Profil operator tidak bisa dibaca tamu (rules) — tampilkan identitas
        // singkat dari data pesanan; kontak lewat kode pesanan / operator.
        partyCardHtml = `
          <div style="margin-top:14px;">
            <div class="post-head" style="margin-bottom:6px;">
              <h1 style="margin:0;font-size:20px;">${escapeHtml(usernameLabel(j.printerEmail) || "Operator")}</h1>
              <span class="role-pill">printer</span>
            </div>
            <p class="sub" style="margin:0;">Sebutkan kode pesanan #${escapeHtml(jobCode)} kalau menghubungi operator. Masuk / daftar untuk melihat profil lengkap operator.</p>
          </div>`;
      } else if (otherPartyId) {
        try {
          const partySnap = await getDoc(doc(db, "users", otherPartyId));
          if (partySnap.exists()) {
            const p = partySnap.data();
            const waNumber = viewerIsPrinter ? (j.customerWaNumber || p.waNumber) : p.waNumber;
            const waLink = waLinkTo(waNumber, `Halo, saya mau tanya soal pesanan print kode #${jobCode}.`);
            const profileHref = `profile.html?uid=${encodeURIComponent(otherPartyId)}`;
            partyCardHtml = `
              <div class="profile-head-row" style="margin-top:14px;">
                <a href="${profileHref}" class="chat-avatar-link" title="Lihat profil">${avatarHtml(p, "lg")}</a>
                <div style="flex:1;min-width:0;">
                  <div class="post-head" style="margin-bottom:2px;">
                    <h1 style="margin:0;font-size:20px;">${escapeHtml(p.displayName || p.username || otherPartyRoleLabel)}</h1>
                    <span class="role-pill">${escapeHtml(otherPartyRoleLabel.toLowerCase())}</span>
                  </div>
                  <p class="sub" style="margin:0 0 6px;">@${escapeHtml(p.username || "user")}</p>
                  <p style="margin:0 0 10px;">${p.bio ? escapeHtml(p.bio) : `<span class="job-meta">Belum ada bio.</span>`}</p>
                  <div class="job-meta">
                    ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener">Chat No. WA ${escapeHtml(otherPartyRoleLabel.toLowerCase())}</a>` : `No. WA ${escapeHtml(otherPartyRoleLabel.toLowerCase())} belum diisi.`}
                  </div>
                  <div style="margin-top:12px;">
                    <a class="btn btn-outline btn-sm" href="${profileHref}">Lihat detail profil</a>
                  </div>
                </div>
              </div>`;
          }
        } catch (e) {
          console.error(e);
          partyCardHtml = `<div class="empty-state" style="margin-top:10px;">${describeFirestoreError(e, `memuat profil ${otherPartyRoleLabel.toLowerCase()}`)}</div>`;
        }
      }
      const headTitle = viewerIsPrinter
        ? (j.status === "done" ? "Sudah kamu selesaikan" : "Sedang kamu kerjakan")
        : (j.status === "done" ? "Sudah selesai diprint" : "Sedang dalam proses print");
      receiverSection = `
        <div class="ticket">
          <h2>${headTitle}</h2>
          ${partyCardHtml || `<div class="empty-state">${escapeHtml(otherPartyRoleLabel)} tidak ditemukan.</div>`}
          ${j.price ? `
            <div class="ticket" style="background:var(--paper-2);margin-top:14px;">
              <div class="job-meta">Harga ditentukan operator</div>
              <div style="font-size:20px;font-weight:700;">${fmtRupiah(j.price)}</div>
            </div>` : ""}
        </div>`;
    }

    // Field-field "Detail dokumen" — disiapkan sebagai data (bukan HTML
    // langsung), biar bisa dipakai render ulang tiap toggle grid/list
    // diklik, tanpa perlu fetch ulang ke Firestore.
    const detailFields = [
      ["Ukuran file", fmtFileSize(j.fileSize)],
      ["Ukuran kertas", j.paperSize || "-"],
      ["Wilayah customer", regionLabel(j.customerLocation)],
      ["Diupload", fmtDate(j.createdAt)],
      ["Diterima operator", j.acceptedAt ? fmtDate(j.acceptedAt) : ""],
      ["Mulai diprint", j.printingAt ? fmtDate(j.printingAt) : ""],
      ["Selesai", j.doneAt ? fmtDate(j.doneAt) : ""]
    ];
    function detailFieldsHtml(view) {
      if (view === "list") return detailFields.map(([l, v]) => detailRow(l, v)).join("");
      return `<div class="detail-grid">${detailFields.map(([l, v]) => detailChip(l, v)).join("")}</div>`;
    }
    const notesHtml =
      detailNote("Catatan customer", j.note) +
      detailNote("Alasan dibatalkan", j.status === "cancelled" ? j.cancelReason : "") +
      detailNote("Alasan ditolak operator (terakhir)", (j.status === "waiting" || j.status === "pending" || j.status === "rejected") ? j.rejectReason : "");
    const actionsHtml = j.fileURL ? `<div class="job-card-actions">
      <a class="btn btn-outline btn-sm" href="${j.fileURL}" target="_blank" rel="noopener">Buka file</a>
      <a class="btn btn-outline btn-sm" href="${downloadUrl(j.fileURL, j.fileName)}">Simpan file</a>
    </div>` : "";

    const detailSection = `
      <div class="ticket">
        <div class="section-head-row">
          <h2>Detail dokumen</h2>
          ${VIEW_TOGGLE_HTML}
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">
          <span class="job-meta">Kode pesanan</span>
          <span class="job-code job-code-lg">#${escapeHtml(jobCode)}</span>
          <button type="button" class="btn btn-outline btn-sm" id="copyJobCodeBtn">Salin kode</button>
        </div>
        <hr class="job-card-divider">
        <div id="jobDetailFields">${detailFieldsHtml(getDetailView())}</div>
        ${notesHtml}
        ${actionsHtml}
      </div>`;

    jobBody.innerHTML = detailSection + receiverSection;

    const copyBtn = document.getElementById("copyJobCodeBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(`#${jobCode}`);
          copyBtn.textContent = "Tersalin!";
          setTimeout(() => { copyBtn.textContent = "Salin kode"; }, 1500);
        } catch (e) {
          console.error(e);
        }
      });
    }

    // Wiring toggle grid/list "Detail dokumen" — cuma render ulang bagian
    // field-nya (#jobDetailFields), nggak perlu fetch ulang ke Firestore.
    const detailViewToggle = document.getElementById("detailViewToggle");
    const jobDetailFields = document.getElementById("jobDetailFields");
    if (detailViewToggle && jobDetailFields) {
      const syncToggleActive = () => {
        const view = getDetailView();
        detailViewToggle.querySelectorAll("button[data-view]").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.view === view);
        });
      };
      syncToggleActive();
      detailViewToggle.querySelectorAll("button[data-view]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.view === getDetailView()) return;
          setDetailView(btn.dataset.view);
          syncToggleActive();
          jobDetailFields.innerHTML = detailFieldsHtml(getDetailView());
        });
      });
    }

    const cancelBtn = document.getElementById("cancelJobBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
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
            cancelBtn.disabled = true;
            cancelBtn.textContent = "Membatalkan...";
            try {
              await updateDoc(doc(db, "printJobs", jobId), { status: "cancelled", cancelReason: reason });
              if (guestView) patchGuestJob(jobId, { status: "cancelled", cancelReason: reason });
              jobStatusBadge.textContent = stampLabel("cancelled");
              jobStatusBadge.className = `stamp-badge ${stampClass("cancelled")}`;
              cancelBtn.remove();
              const emptyState = jobBody.querySelector(".empty-state");
              if (emptyState) emptyState.textContent = "Pesanan ini sudah kamu batalkan.";
            } catch (e) {
              console.error(e);
              const extra = (e && e.code === "permission-denied")
                ? " Kemungkinan besar pesanan ini sudah diterima operator (statusnya sudah bukan \"Menunggu operator\" lagi) sesaat sebelum kamu klik Batal — refresh halaman untuk lihat status terbarunya."
                : "";
              showToast(describeFirestoreError(e, "membatalkan pesanan") + extra, "error");
              cancelBtn.disabled = false;
              cancelBtn.textContent = "Batal pesanan";
              throw e;
            }
          }
        });
      });
    }
  } catch (e) {
    console.error(e);
    jobFileName.textContent = "Gagal memuat pesanan";
    // Tamu: kalau server tidak terjangkau, tetap tampilkan salinan di perangkat.
    jobBody.innerHTML = `<div class="empty-state">${describeFirestoreError(e, "memuat detail pesanan")}</div>`;
  }
}, null, { allowGuest: true });
