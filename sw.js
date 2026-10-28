// ===================================================================
// D'Printing — service worker (khusus notifikasi browser)
//
// Kenapa perlu: Chrome di Android TIDAK mengizinkan `new Notification()`
// dari halaman (error "Illegal constructor") — di HP notifikasi hanya bisa
// ditampilkan lewat ServiceWorkerRegistration.showNotification(). Di laptop
// `new Notification()` masih jalan, makanya dulu cuma laptop yang bisa.
//
// File ini SENGAJA tidak punya handler `fetch` (tidak nge-cache apa pun),
// jadi tidak mengubah cara web dimuat. Letaknya harus di root project supaya
// scope-nya mencakup seluruh folder (/D-Printing/).
// ===================================================================
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Tap notifikasi -> fokuskan tab D'Printing yang sudah terbuka, atau buka baru.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && "focus" in c) {
        try { if ("navigate" in c) await c.navigate(target); } catch (e) { /* abaikan */ }
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
