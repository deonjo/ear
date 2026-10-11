"use client";

import { useEffect } from "react";
import { asset } from "@/lib/basePath";

/** Registers the offline service worker in production builds only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Avoid stale caches while developing.
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }
    void navigator.serviceWorker.register(asset("/sw.js"), { scope: asset("/") }).catch(() => {
      // Offline support is a bonus; the app still works online without it.
    });
  }, []);
  return null;
}
