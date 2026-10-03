// ===================================================================
// D'Printing — Cloud Function "adminChangePassword"
//
// OPSIONAL. Web ini (HTML/CSS/JS di root repo) jalan penuh TANPA folder
// ini — cuma satu tombol yang butuh function ini: "Ganti password" di
// Kelola User (HTML/users.html, khusus role developer). Lihat
// README.md bagian "Setup Cloud Function (opsional) — Ganti Password"
// buat cara deploy-nya.
//
// KENAPA HARUS LEWAT CLOUD FUNCTION (bukan langsung dari browser):
// Firebase Auth di sisi client cuma punya updatePassword() buat akun yang
// SEDANG login di browser itu sendiri — tidak ada API buat ganti password
// akun ORANG LAIN dari client, dengan alasan keamanan (kalau ada, siapa
// pun yang sekadar tahu UID orang lain bisa embat akunnya). Satu-satunya
// cara sah ganti password akun lain adalah Admin SDK (admin.auth().updateUser),
// yang cuma boleh jalan di server tepercaya (bukan browser) — makanya
// dibungkus jadi Cloud Function "callable" yang dipanggil dari
// JS/users.js lewat httpsCallable().
//
// KEAMANAN: function ini ecek ULANG (bukan cuma percaya rules Firestore)
// bahwa (1) si pemanggil beneran sedang login (context.auth), dan (2)
// dokumen users/{pemanggil}.role beneran "developer" — soalnya Admin SDK
// yang dipakai di sini BYPASS firestore.rules & Auth rules sepenuhnya,
// jadi pengecekan role WAJIB dilakukan manual di sini.
// ===================================================================
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.adminChangePassword = functions.https.onCall(async (data, context) => {
  // 1) Harus login.
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Harus login dulu buat manggil ini."
    );
  }
  const callerUid = context.auth.uid;

  // 2) Harus role "developer" di Firestore (dicek manual, LIHAT catatan
  //    keamanan di atas kenapa ini wajib meski ada firestore.rules).
  const callerSnap = await admin.firestore().doc(`users/${callerUid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "developer") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Cuma akun dengan role developer yang boleh ganti password user lain."
    );
  }

  // 3) Validasi input dasar (Firebase Auth sendiri minta minimal 6 karakter).
  const uid = data && data.uid;
  const newPassword = data && data.newPassword;
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "uid target kosong/tidak valid.");
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Password baru minimal 6 karakter.");
  }

  // 4) Eksekusi lewat Admin SDK — ini bagian yang TIDAK BISA dilakukan
  //    dari browser sama sekali, harus di sini.
  try {
    await admin.auth().updateUser(uid, { password: newPassword });
  } catch (err) {
    // Terusin kode error Firebase Auth aslinya (mis. akun uid itu sudah
    // tidak ada lagi di Firebase Auth) biar pesannya jelas di client.
    throw new functions.https.HttpsError(
      "internal",
      `Gagal ganti password di Firebase Auth: ${err.message || err.code || "error tak dikenal"}`
    );
  }

  return { ok: true };
});
