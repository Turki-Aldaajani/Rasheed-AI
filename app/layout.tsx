import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import "../styles/tokens.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "رشيد — مدربك الذكي لاستهلاك المنزل",
  description:
    "افهم استهلاك منزلك من الكهرباء والمياه، اكتشف أين تذهب فاتورتك، وشاهد كم يمكنك توفيره قبل أن تغيّر أي شيء.",
};

export const viewport: Viewport = {
  themeColor: "#1f6549",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body>{children}</body>
    </html>
  );
}
