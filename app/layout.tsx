import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./immersive.css";

export const metadata: Metadata = {
  title: "Semester — NJIT Planner",
  description: "A focused Fall 2026 planner that combines Canvas and syllabus dates.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
