import "olivine/styles.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Olivine · Next.js smoke test",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="washi">
      <body>{children}</body>
    </html>
  );
}
