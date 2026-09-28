import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MasteryMap AI",
  description: "Understand how you learn. Adapt what comes next.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
