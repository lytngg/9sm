import type { Metadata } from "next";
import "./globals.css";

// Every page is per-user, so pages render on the server at request time.
export const instant = false;

export const metadata: Metadata = {
  title: "9SM Platform",
  description: "Client workspaces for 9th Street Media",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Loaded in the root layout, so it applies to every page. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cal+Sans&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
