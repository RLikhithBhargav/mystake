import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyStake",
  description: "Personal investment coaching copilot — US + India markets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
