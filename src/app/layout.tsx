import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "고구마 마켓",
  description: "중고거래와 경매 MVP",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
