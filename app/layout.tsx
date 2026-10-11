import type { Metadata, Viewport } from "next";
import { ParentGateProvider } from "@/components/ParentGate";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chord Flags",
  description: "A calm, private trainer for running the Eguchi Chord Identification Method at home.",
  applicationName: "Chord Flags",
  appleWebApp: { capable: true, title: "Chord Flags", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#131519" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <ParentGateProvider>{children}</ParentGateProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
