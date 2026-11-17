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
      <body>{children}</body>
    </html>
  );
}
