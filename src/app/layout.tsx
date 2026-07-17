import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Crux", template: "%s | Crux" },
  description: "A shared home for climbing gyms and their communities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
