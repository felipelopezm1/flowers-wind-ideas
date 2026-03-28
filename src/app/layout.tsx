import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Flower Wind — Generative Flower Globe",
  description:
    "Describe your flowers and watch them bloom across a living globe. AI-powered 2.5D procedural flower generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full overflow-hidden font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
