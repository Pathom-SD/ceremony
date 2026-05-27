import type { Metadata } from "next";
import { Noto_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-latin",
});

const thai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AIT – Ceremony Activity",
  description:
    "กระดานนำเสนอหัวข้อตามแผนกและเอกสารประกอบการประชุม Ceremony",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${sans.variable} ${thai.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full font-sans antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
