import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "FSD Sim — Model 3",
  description: "A closer look at the Tesla Model 3 simulation model.",
}

export const viewport: Viewport = {
  themeColor: "#101112",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
