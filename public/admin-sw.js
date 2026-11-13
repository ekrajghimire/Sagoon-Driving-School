/* Sagoon Admin service worker: shows booking alerts and opens the right page when tapped.
   Scope: /admin. No offline caching — the admin always shows live data. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Sagoon Admin", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Sagoon Admin";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/192",
      badge: "/icons/badge",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Reuse an open admin window if there is one; otherwise open the app/a new tab.
      const open = windows.find((w) => w.url.startsWith(self.location.origin + "/admin"));
      if (open) {
        return open
          .focus()
          .then(() => open.navigate(target))
          .catch(() => self.clients.openWindow(target));
      }
      return self.clients.openWindow(target);
    }),
  );
});
