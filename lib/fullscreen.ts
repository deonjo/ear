"use client";

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

/** Best effort: iPhone Safari has no fullscreen API (install the app to the home screen instead). */
export function enterFullscreen(): void {
  const el = document.documentElement as FsElement;
  try {
    if (document.fullscreenElement || (document as FsDocument).webkitFullscreenElement) return;
    const result = el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen?.();
    if (result instanceof Promise) result.catch(() => {});
  } catch {
    // Not supported.
  }
}

export function exitFullscreen(): void {
  const doc = document as FsDocument;
  try {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else if (doc.webkitFullscreenElement) void doc.webkitExitFullscreen?.();
  } catch {
    // Not supported.
  }
}
