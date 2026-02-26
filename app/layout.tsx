import type { Metadata } from "next";

import Navbar from "@/components/Navbar";

import "./globals.css";

export const metadata: Metadata = {
  title: "SHA — Student Housing Archive",
  description: "Student Housing Archive platform for students and landlords.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
