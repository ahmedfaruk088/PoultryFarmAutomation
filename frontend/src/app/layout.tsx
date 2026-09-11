import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kümes Otomasyonu",
  description: "Endüstriyel IoT Alarmlı Kümes Otomasyonu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
