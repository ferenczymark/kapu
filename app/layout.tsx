import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css"; // Ez tölti be a Tailwind CSS-t és a globális stílusokat

// 2. Globális kinézet és betűtípusok betöltése
const inter = Inter({ subsets: ["latin"] });

// 3. Keresőoptimalizálás (SEO) és böngésző metaadatok
export const metadata: Metadata = {
  title: "Okos Kapunyitó Vezérlőpult",
  description: "Hardveres megkerüléssel működő, felhő alapú IoT beléptető rendszer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 1. HTML alapok + Hydration warning elnyomása a böngészőbővítmények miatt
    <html lang="hu" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        
        {/* 4. Tartalom betöltése (Az éppen aktuális aloldal kerül ide) */}
        {children}
        
      </body>
    </html>
  );
}