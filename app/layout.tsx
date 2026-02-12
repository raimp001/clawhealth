import type { Metadata, Viewport } from "next"
import { DM_Sans, Libre_Baskerville } from "next/font/google"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
})

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: "CureRx — AI Healthcare Agent | Powered by OpenClaw",
  description:
    "AI-powered healthcare clinic management platform. Smart scheduling, billing, prior auth, prescriptions, care coordination, and more.",
  metadataBase: new URL("https://curerx.ai"),
  openGraph: {
    title: "CureRx — AI Healthcare Agent",
    description: "Smart scheduling, billing, prior auth, prescriptions & care coordination.",
    type: "website",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C15F3C",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${libreBaskerville.variable}`}>
      <body>{children}</body>
    </html>
  )
}
