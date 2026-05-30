import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEU-Pass Admin",
  description: "Prototype web admin dashboard for NEU-Pass"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
